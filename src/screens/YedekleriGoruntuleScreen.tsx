import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, SectionList, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import {
  Alert,
  AppCard,
  AppDialog,
  AppHeader,
  AppIconButton,
  AppScreen,
  AppSelect,
  DangerButton,
  DateField,
  EmptyState,
  FormRow,
  Icon,
  InfoBox,
  PrimaryButton,
  SearchBar,
  StatusBadge,
  TextButton,
  ToggleRow,
  type StatusBadgeDurum,
} from '../components/ui';
import {
  KLASOR_SECILEBILIR,
  aktifMukellef,
  klasorGorunenAdi,
  yedegiAc,
  yedegiPaylas,
  yedekKlasoru,
  yedekleriListele,
  yedekleriSil,
  type MukellefYedegi,
  type YedekDosyasi,
} from '../services/yedekDeposu';
import { useAuthStore } from '../store/useAuthStore';
import { TOUCH_MIN, colors, radius, spacing, typography } from '../theme';
import {
  YEDEK_SIRALAMALARI,
  mukellefKlasoruMu,
  siralanabilirTarihiGoster,
  yedekAramayaUyarMi,
  yedekDosyaAdiniCoz,
  yedekFiltreSecenekleri,
  yedekFiltresiBosMu,
  yedekFiltreyeUyarMi,
  yedekleriSirala,
  type Mukellef,
  type YedekFiltresi,
  type YedekSiralama,
} from '../utils/yedekleme';

type Props = NativeStackScreenProps<RootStackParamList, 'YedekleriGoruntule'>;

function boyutMetni(bayt: number | null): string {
  if (bayt === null || !Number.isFinite(bayt)) return '';
  if (bayt < 1024) return `${bayt} B`;
  if (bayt < 1024 * 1024) return `${Math.round(bayt / 1024)} KB`;
  return `${(bayt / (1024 * 1024)).toFixed(1)} MB`;
}

/** Date → "YYYY-AA-GG" (filtre değerleri bu biçimde, dosya adlarıyla aynı). */
function siralanabilir(d: Date): string {
  const aa = String(d.getMonth() + 1).padStart(2, '0');
  const gg = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${aa}-${gg}`;
}

function tariheCevir(t: string | undefined): Date {
  const m = t ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(t) : null;
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
}

/**
 * İptal/itiraz talebi durum metni ("İptal Kabul Edildi" …) → rozet rengi.
 * Metin faturaFiligran.iptalItirazDurumMetni'nin ürettiğidir.
 */
function talepRozeti(metin: string): StatusBadgeDurum {
  if (metin.includes('Kabul Edildi')) return 'cancelAccepted';
  if (metin.includes('Reddedildi')) return 'rejected';
  return 'pending';
}

/** Seçim modunda satır kimliği. */
function anahtar(d: YedekDosyasi): string {
  return d.dosya.uri;
}

/**
 * "Faturaları Cihazımda Yedekle > Yedeklenen Faturaları Görüntüle".
 * Yedek klasöründeki PDF'leri mükellef klasörlerine göre gruplayıp listeler;
 * her fatura telefonun PDF görüntüleyicisiyle açılabilir, paylaşılabilir ya
 * da telefondan silinebilir. Sıralama, arama ve filtre (alıcı unvanı,
 * VKN/TCKN, tarih aralığı). Alıcı bilgileri ve iptal/itiraz durumu mükellef
 * klasöründeki yedek bilgi dosyasından gelir (bkz. utils/yedekleme.ts →
 * YEDEK_DIZIN_ADI); durum yedekleme anındakidir. GİB'e istek atılmaz;
 * silme yalnızca telefondaki kopyayı siler.
 */
export default function YedekleriGoruntuleScreen({ navigation }: Props) {
  const [yukleniyor, setYukleniyor] = useState(true);
  const [klasorAdi, setKlasorAdi] = useState<string | null>(null);
  const [gruplar, setGruplar] = useState<MukellefYedegi[]>([]);
  const [arama, setArama] = useState('');
  const [mesgul, setMesgul] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);
  const kullaniciBilgisi = useAuthStore((s) => s.kullaniciBilgisi);
  // Açık GİB oturumunun mükellefi. Bir kullanıcı birden fazla GİB koduyla
  // çalışabildiği için varsayılan olarak YALNIZCA onun yedekleri gösterilir;
  // diğer mükelleflerinkiler anahtarla açılır. Belirlenemezse (ör. çevrimdışı)
  // hepsi gösterilir ve bu belirtilir.
  const [mukellef, setMukellef] = useState<Mukellef | null>(null);
  const [digerleriniGoster, setDigerleriniGoster] = useState(false);

  const [siralama, setSiralama] = useState<YedekSiralama>('tarihYeni');
  const [filtre, setFiltre] = useState<YedekFiltresi>({});
  // Filtre dialog'u: değişiklikler "Uygula"ya basılınca geçerli olur.
  const [filtreAcik, setFiltreAcik] = useState(false);
  const [taslakFiltre, setTaslakFiltre] = useState<YedekFiltresi>({});
  const [acikTarih, setAcikTarih] = useState<'baslangic' | 'bitis' | null>(null);

  // Çoklu silme için seçim modu.
  const [secimModu, setSecimModu] = useState(false);
  const [secilenler, setSecilenler] = useState<Set<string>>(new Set());

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const kok = await yedekKlasoru();
      if (!kok) {
        setKlasorAdi(null);
        setGruplar([]);
        return;
      }
      setKlasorAdi(klasorGorunenAdi(kok));
      setGruplar(yedekleriListele(kok));
      if (token) {
        try {
          setMukellef(await aktifMukellef(token, kullaniciBilgisi));
        } catch {
          setMukellef(null);
        }
      }
    } catch (err) {
      Alert.alert('Yedekler okunamadı', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setYukleniyor(false);
    }
  }, [token, kullaniciBilgisi]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const islem = async (dosya: YedekDosyasi, tur: 'ac' | 'paylas') => {
    setMesgul(dosya.dosya.uri);
    try {
      if (tur === 'ac') await yedegiAc(dosya.dosya);
      else await yedegiPaylas(dosya.dosya);
    } catch (err) {
      Alert.alert('İşlem yapılamadı', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setMesgul(null);
    }
  };

  const buMukellefinMi = (g: MukellefYedegi) => mukellef !== null && mukellefKlasoruMu(g.ad, mukellef.vkn);
  const digerSayisi = mukellef === null ? 0 : gruplar.filter((g) => !buMukellefinMi(g)).length;
  const gosterilenGruplar = mukellef === null || digerleriniGoster ? gruplar : gruplar.filter(buMukellefinMi);

  const filtreSecenekleri = useMemo(
    () => yedekFiltreSecenekleri(gosterilenGruplar.flatMap((g) => g.dosyalar)),
    [gosterilenGruplar],
  );
  const bilgisizVar = gosterilenGruplar.some((g) => g.dosyalar.some((d) => !d.bilgi?.aliciUnvan));

  const bolumler = gosterilenGruplar
    .map((g) => ({
      title: g.ad,
      klasor: g.klasor,
      toplam: g.dosyalar.length,
      data: yedekleriSirala(
        g.dosyalar.filter((d) => yedekAramayaUyarMi(d, arama) && yedekFiltreyeUyarMi(d, filtre)),
        siralama,
      ),
    }))
    .filter((b) => b.data.length > 0);
  const gorunenSayisi = bolumler.reduce((t, b) => t + b.data.length, 0);
  const filtreEtkin = !yedekFiltresiBosMu(filtre);

  // --- Silme -----------------------------------------------------------

  const sil = (hedefler: { klasor: MukellefYedegi['klasor']; dosya: YedekDosyasi }[]) => {
    if (hedefler.length === 0) return;
    const tek = hedefler.length === 1 ? hedefler[0].dosya : null;
    Alert.alert(
      tek ? 'Yedeği sil' : `${hedefler.length} yedeği sil`,
      (tek ? `${yedekDosyaAdiniCoz(tek.ad).belgeNo} faturasının yedeği` : `Seçilen ${hedefler.length} fatura yedeği`) +
        " telefondan kalıcı olarak silinecek. GİB'deki fatura etkilenmez; gerekirse yeniden yedekleyebilirsiniz.",
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const basarisiz = yedekleriSil(hedefler);
            setSecilenler(new Set());
            setSecimModu(false);
            await yukle();
            if (basarisiz.length > 0) {
              Alert.alert('Bazı yedekler silinemedi', basarisiz.slice(0, 5).join('\n'));
            }
          },
        },
      ],
    );
  };

  const secimiDegistir = (d: YedekDosyasi) => {
    setSecilenler((onceki) => {
      const yeni = new Set(onceki);
      if (yeni.has(anahtar(d))) yeni.delete(anahtar(d));
      else yeni.add(anahtar(d));
      return yeni;
    });
  };

  const gorunenHepsi = bolumler.flatMap((b) => b.data.map((d) => ({ klasor: b.klasor, dosya: d })));
  const hepsiSecili = gorunenHepsi.length > 0 && gorunenHepsi.every((h) => secilenler.has(anahtar(h.dosya)));

  const secimModunuKapat = () => {
    setSecimModu(false);
    setSecilenler(new Set());
  };

  // --- Filtre dialog'u -------------------------------------------------

  const filtreyiAc = () => {
    setTaslakFiltre(filtre);
    setFiltreAcik(true);
  };

  const tarihSecildi = (_e: DateTimePickerChangeEvent, secilen: Date) => {
    const hedef = acikTarih;
    setAcikTarih(null);
    if (!hedef) return;
    setTaslakFiltre((f) => {
      const yeni = { ...f, [hedef]: siralanabilir(secilen) };
      // Başlangıç bitişten sonra olamaz: diğer uç kaydırılır.
      if (yeni.baslangic && yeni.bitis && yeni.baslangic > yeni.bitis) {
        if (hedef === 'baslangic') yeni.bitis = yeni.baslangic;
        else yeni.baslangic = yeni.bitis;
      }
      return yeni;
    });
  };

  const filtreOzeti = [
    filtre.aliciUnvan,
    filtre.aliciVknTckn,
    filtre.baslangic || filtre.bitis
      ? `${siralanabilirTarihiGoster(filtre.baslangic) ?? '…'} – ${siralanabilirTarihiGoster(filtre.bitis) ?? '…'}`
      : undefined,
  ].filter(Boolean) as string[];

  return (
    <AppScreen>
      <AppHeader
        title={secimModu ? `${secilenler.size} seçildi` : 'Yedeklenen Faturalar'}
        onBack={secimModu ? secimModunuKapat : () => navigation.goBack()}
        right={
          secimModu ? (
            <AppIconButton icon="close" accessibilityLabel="Seçimi bitir" onPress={secimModunuKapat} />
          ) : (
            <>
              <AppIconButton
                icon={filtreEtkin ? 'filter' : 'filter-outline'}
                iconColor={filtreEtkin ? colors.primary : colors.info}
                accessibilityLabel="Filtrele"
                onPress={filtreyiAc}
                disabled={klasorAdi === null}
              />
              <AppIconButton
                icon="checkbox-multiple-marked-outline"
                iconColor={colors.danger}
                accessibilityLabel="Silmek için seç"
                onPress={() => setSecimModu(true)}
                disabled={klasorAdi === null || gorunenSayisi === 0}
              />
              <AppIconButton icon="refresh" accessibilityLabel="Yenile" onPress={yukle} />
            </>
          )
        }
      />

      {yukleniyor ? (
        <View style={styles.merkezi}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : klasorAdi === null ? (
        <View style={styles.merkezi}>
          <EmptyState
            icon="folder-alert-outline"
            title="Henüz bir yedek klasörü seçilmedi."
            action={
              <PrimaryButton icon="folder-download-outline" onPress={() => navigation.replace('Yedekle')} fullWidth>
                Faturaları Şimdi Yedekle
              </PrimaryButton>
            }
          />
        </View>
      ) : (
        <SectionList
          persistentScrollbar
          indicatorStyle="white"
          sections={bolumler}
          keyExtractor={(item) => item.dosya.uri}
          extraData={[secimModu, secilenler, mesgul]}
          contentContainerStyle={styles.liste}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={styles.ustKisim}>
              <View style={styles.klasorSatiri}>
                <Icon name="folder-outline" size={18} color={colors.textMuted} />
                <Text style={[typography.caption, styles.klasorMetni]}>
                  Klasör: {klasorAdi}
                  {KLASOR_SECILEBILIR ? '' : ' (yalnızca bu uygulamadan erişilir)'}
                </Text>
              </View>
              {mukellef === null ? (
                <InfoBox tone="neutral">
                  Açık hesabın mükellefi belirlenemedi; cihazdaki tüm mükelleflerin yedekleri gösteriliyor.
                </InfoBox>
              ) : (
                digerSayisi > 0 && (
                  <AppCard>
                    <ToggleRow
                      title={`Diğer mükelleflerin yedeklerini de göster (${digerSayisi})`}
                      value={digerleriniGoster}
                      onValueChange={setDigerleriniGoster}
                    />
                  </AppCard>
                )
              )}
              <SearchBar
                placeholder="Belge no, unvan, VKN/TCKN ya da tarih ara"
                value={arama}
                onChangeText={setArama}
              />
              <AppSelect
                label="Sırala"
                value={siralama}
                secenekler={YEDEK_SIRALAMALARI}
                onSelect={(v) => setSiralama(v as YedekSiralama)}
              />
              {filtreEtkin ? (
                <AppCard tone="primary" padded={false} style={styles.filtreOzeti}>
                  <Icon name="filter" size={18} color={colors.primary} />
                  <Text style={[typography.bodySecondary, styles.filtreOzetiMetni]} numberOfLines={3}>
                    Filtre: {filtreOzeti.join(' · ')}
                  </Text>
                  <TextButton compact icon="filter-remove-outline" onPress={() => setFiltre({})}>
                    Temizle
                  </TextButton>
                </AppCard>
              ) : null}
              {secimModu ? (
                <View style={styles.secimCubugu}>
                  <TextButton
                    compact
                    icon={hepsiSecili ? 'checkbox-blank-outline' : 'checkbox-multiple-marked-outline'}
                    onPress={() =>
                      setSecilenler(hepsiSecili ? new Set() : new Set(gorunenHepsi.map((h) => anahtar(h.dosya))))
                    }
                  >
                    {hepsiSecili ? 'Seçimi kaldır' : 'Görünenlerin tümünü seç'}
                  </TextButton>
                  <DangerButton
                    compact
                    icon="delete-outline"
                    disabled={secilenler.size === 0}
                    onPress={() => sil(gorunenHepsi.filter((h) => secilenler.has(anahtar(h.dosya))))}
                  >
                    {`Sil (${secilenler.size})`}
                  </DangerButton>
                </View>
              ) : null}
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.bolumBasligi} accessibilityRole="header">
              <Text style={[typography.cardTitle, styles.bolumAdi]}>{section.title}</Text>
              <Text style={typography.caption}>
                {section.data.length === section.toplam
                  ? `${section.toplam} fatura`
                  : `${section.data.length} / ${section.toplam} fatura`}
              </Text>
            </View>
          )}
          renderItem={({ item, section }) => {
            const ad = yedekDosyaAdiniCoz(item.ad);
            const belgeNo = item.bilgi?.belgeNo ?? ad.belgeNo;
            const tarih = siralanabilirTarihiGoster(item.bilgi?.belgeTarihi ?? ad.tarih);
            const unvan = item.bilgi?.aliciUnvan;
            const vkn = item.bilgi?.aliciVknTckn;
            const talep = item.bilgi?.talepDurumu;
            const buMesgul = mesgul === item.dosya.uri;
            const secili = secilenler.has(anahtar(item));
            const boyut = boyutMetni(item.boyut);
            return (
              <AppCard
                onPress={() => (secimModu ? secimiDegistir(item) : islem(item, 'ac'))}
                onLongPress={
                  secimModu
                    ? undefined
                    : () => {
                        setSecimModu(true);
                        secimiDegistir(item);
                      }
                }
                disabled={mesgul !== null}
                tone={secili ? 'primary' : 'default'}
                accessibilityLabel={
                  secimModu ? `${belgeNo} ${secili ? 'seçili' : 'seçili değil'}` : `${belgeNo} faturasını aç`
                }
                style={styles.satir}
              >
                <View style={styles.pdfKarosu}>
                  {secimModu ? (
                    <Icon
                      name={secili ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={26}
                      color={secili ? colors.primary : colors.textSecondary}
                    />
                  ) : (
                    <Icon name="file-pdf-box" size={26} color={colors.danger} />
                  )}
                </View>
                <View style={styles.satirMetinleri}>
                  <Text style={typography.cardTitle} numberOfLines={1}>
                    {belgeNo}
                  </Text>
                  {unvan ? (
                    <Text style={typography.bodySecondary} numberOfLines={2}>
                      {unvan}
                    </Text>
                  ) : null}
                  {vkn ? <Text style={typography.caption}>VKN/TCKN: {vkn}</Text> : null}
                  <View style={styles.satirAlt}>
                    {tarih ? <Text style={typography.bodySecondary}>{tarih}</Text> : null}
                    {ad.durum === 'SILINMIS' ? (
                      <StatusBadge status="deleted" label="Silinmiş" />
                    ) : ad.durum === 'ONAYSIZ' ? (
                      <StatusBadge status="draft" label="Onaylanmamış" />
                    ) : null}
                    {talep ? <StatusBadge status={talepRozeti(talep)} label={talep} /> : null}
                    {boyut ? <Text style={typography.caption}>{boyut}</Text> : null}
                  </View>
                </View>
                {secimModu ? null : buMesgul ? (
                  <View style={styles.satirSpinner}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : (
                  <View style={styles.satirEylemleri}>
                    <AppIconButton
                      icon="share-variant"
                      accessibilityLabel="Paylaş / Kaydet"
                      onPress={() => islem(item, 'paylas')}
                      disabled={mesgul !== null}
                    />
                    <AppIconButton
                      icon="delete-outline"
                      accessibilityLabel="Yedeği sil"
                      onPress={() => sil([{ klasor: section.klasor, dosya: item }])}
                      disabled={mesgul !== null}
                    />
                  </View>
                )}
              </AppCard>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={arama || filtreEtkin ? 'file-search-outline' : 'folder-open-outline'}
              title={
                arama || filtreEtkin
                  ? 'Aramaya ya da filtreye uyan yedek yok.'
                  : mukellef !== null && !digerleriniGoster
                    ? 'Bu mükellefin henüz yedeklenmiş faturası yok.'
                    : 'Bu klasörde henüz yedeklenmiş fatura yok.'
              }
              action={
                arama || filtreEtkin ? (
                  <TextButton
                    icon="filter-remove-outline"
                    onPress={() => {
                      setArama('');
                      setFiltre({});
                    }}
                  >
                    Aramayı ve filtreyi temizle
                  </TextButton>
                ) : (
                  <PrimaryButton icon="folder-download-outline" onPress={() => navigation.replace('Yedekle')} fullWidth>
                    Faturaları Şimdi Yedekle
                  </PrimaryButton>
                )
              }
            />
          }
        />
      )}

      <AppDialog
        visible={filtreAcik}
        onDismiss={() => setFiltreAcik(false)}
        title="Filtrele"
        icon="filter-outline"
        actions={
          <>
            <TextButton compact onPress={() => setTaslakFiltre({})}>
              Temizle
            </TextButton>
            <PrimaryButton
              compact
              icon="check"
              onPress={() => {
                setFiltre(taslakFiltre);
                setFiltreAcik(false);
              }}
            >
              Uygula
            </PrimaryButton>
          </>
        }
      >
        <AppSelect
          label="Alıcı unvanı"
          value={taslakFiltre.aliciUnvan ?? ''}
          secenekler={[{ value: '', label: 'Tümü' }, ...filtreSecenekleri.unvanlar.map((u) => ({ value: u, label: u }))]}
          onSelect={(v) => setTaslakFiltre((f) => ({ ...f, aliciUnvan: v || undefined }))}
        />
        <AppSelect
          label="Alıcı VKN/TCKN"
          value={taslakFiltre.aliciVknTckn ?? ''}
          secenekler={[{ value: '', label: 'Tümü' }, ...filtreSecenekleri.vknler.map((v) => ({ value: v, label: v }))]}
          onSelect={(v) => setTaslakFiltre((f) => ({ ...f, aliciVknTckn: v || undefined }))}
        />
        <FormRow minColumnWidth={120}>
          <DateField
            label="Başlangıç"
            value={siralanabilirTarihiGoster(taslakFiltre.baslangic)}
            placeholder="Tümü"
            onPress={() => setAcikTarih('baslangic')}
          />
          <DateField
            label="Bitiş"
            value={siralanabilirTarihiGoster(taslakFiltre.bitis)}
            placeholder="Tümü"
            onPress={() => setAcikTarih('bitis')}
          />
        </FormRow>
        {taslakFiltre.baslangic || taslakFiltre.bitis ? (
          <TextButton
            compact
            icon="calendar-remove-outline"
            onPress={() => setTaslakFiltre((f) => ({ ...f, baslangic: undefined, bitis: undefined }))}
          >
            Tarih aralığını kaldır
          </TextButton>
        ) : null}
        {bilgisizVar ? (
          <InfoBox tone="neutral">
            Bazı eski yedeklerde alıcı bilgisi yok; bunlar unvan ya da VKN/TCKN'ye göre süzülemez. Aynı dönemi bir kez
            daha yedeklerseniz (faturalar yeniden indirilmez) bilgileri tamamlanır.
          </InfoBox>
        ) : null}
      </AppDialog>

      {acikTarih && (
        <DateTimePicker
          value={tariheCevir(acikTarih === 'baslangic' ? taslakFiltre.baslangic : taslakFiltre.bitis)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          onValueChange={tarihSecildi}
          onDismiss={() => setAcikTarih(null)}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  merkezi: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  liste: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.xs, flexGrow: 1 },
  ustKisim: { paddingTop: spacing.xs, paddingBottom: spacing.xs, gap: spacing.sm },
  klasorSatiri: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  klasorMetni: { flex: 1, minWidth: 0 },
  filtreOzeti: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  filtreOzetiMetni: { flex: 1, minWidth: 0 },
  secimCubugu: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  bolumBasligi: { paddingTop: spacing.md, paddingBottom: spacing.xxs, gap: 2 },
  bolumAdi: { flexShrink: 1 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.xxs,
    minHeight: 64,
  },
  pdfKarosu: {
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    borderRadius: radius.medium,
    backgroundColor: colors.dangerBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  satirMetinleri: { flex: 1, minWidth: 0, gap: 2 },
  satirAlt: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  satirEylemleri: { flexDirection: 'column', alignItems: 'center' },
  satirSpinner: { width: TOUCH_MIN, alignItems: 'center' },
});
