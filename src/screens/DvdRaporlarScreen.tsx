import React, { useCallback, useEffect, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Directory } from 'expo-file-system';

import type { RootStackParamList } from '../../App';
import {
  Alert,
  AppCard,
  AppHeader,
  AppIconButton,
  AppScreen,
  DangerButton,
  EmptyState,
  Icon,
  InfoBox,
  SecondaryButton,
  TextButton,
  ToggleRow,
} from '../components/ui';
import {
  IOS_RAPOR_KLASOR_ADI,
  KLASOR_SECILEBILIR,
  aktifMukellef,
  dosyaSil,
  klasorGorunenAdi,
  raporKlasoru,
  raporKlasoruSec,
  raporlariListele,
  yedegiAc,
  yedegiPaylas,
  type KayitliPdf,
  type MukellefPdfleri,
} from '../services/yedekDeposu';
import { useAuthStore } from '../store/useAuthStore';
import { useDvdStore } from '../store/useDvdStore';
import { colors, spacing, typography } from '../theme';
import { DVD_RAPOR_ON_EKI, dvdRaporDosyaAdiniCoz } from '../utils/dvdRapor';
import { mukellefKlasoruMu, type Mukellef } from '../utils/yedekleme';

type Props = NativeStackScreenProps<RootStackParamList, 'DvdRaporlar'>;

function boyutMetni(bayt: number | null): string {
  if (bayt === null || !Number.isFinite(bayt)) return '';
  if (bayt < 1024) return `${bayt} B`;
  if (bayt < 1024 * 1024) return `${Math.round(bayt / 1024)} KB`;
  return `${(bayt / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * "e-Arşiv Faturalarım" ekranından PDF'e aktarılan listeler. PDF'ler
 * mükellefe (VKN/TCKN) göre ayrı klasörlerde durur: aynı üyelikte başka
 * kullanıcı kodlarıyla da giriş yapılabildiği için varsayılan olarak
 * YALNIZCA oturumdaki mükellefin PDF'leri gösterilir (fatura yedeklerindeki
 * gibi); diğerleri anahtarla açılır. Mükellef: önce Dijital VD oturumu, o
 * yoksa e-Arşiv oturumu. İkisi de yoksa hepsi, mükellef başlıklarıyla.
 */
export default function DvdRaporlarScreen({ navigation }: Props) {
  const dvdToken = useDvdStore((s) => s.token);
  const gibToken = useAuthStore((s) => s.token);
  const kullaniciBilgisi = useAuthStore((s) => s.kullaniciBilgisi);

  const [klasor, setKlasor] = useState<Directory | null>(null);
  const [gruplar, setGruplar] = useState<MukellefPdfleri[]>([]);
  const [mukellef, setMukellef] = useState<Mukellef | null>(null);
  const [digerleriniGoster, setDigerleriniGoster] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [secimModu, setSecimModu] = useState(false);
  const [secilenler, setSecilenler] = useState<Set<string>>(new Set());

  const yukle = useCallback(async (hedef?: Directory | null) => {
    setYukleniyor(true);
    try {
      const k = hedef === undefined ? await raporKlasoru() : hedef;
      setKlasor(k);
      setGruplar(k ? raporlariListele(k, DVD_RAPOR_ON_EKI) : []);
    } catch (err) {
      setGruplar([]);
      Alert.alert("PDF'ler okunamadı", err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  useEffect(() => {
    let iptal = false;
    (async () => {
      let m: Mukellef | null = null;
      if (dvdToken)
        m = await useDvdStore
          .getState()
          .mukellefiBelirle()
          .catch(() => null);
      if (!m && gibToken) m = await aktifMukellef(gibToken, kullaniciBilgisi).catch(() => null);
      if (!iptal) setMukellef(m);
    })();
    return () => {
      iptal = true;
    };
  }, [dvdToken, gibToken, kullaniciBilgisi]);

  const klasorDegistir = async () => {
    const secilen = await raporKlasoruSec();
    if (secilen) await yukle(secilen);
  };

  const islem = async (p: KayitliPdf, tur: 'ac' | 'paylas') => {
    setMesgul(p.dosya.uri);
    try {
      if (tur === 'ac') await yedegiAc(p.dosya);
      else await yedegiPaylas(p.dosya);
    } catch (err) {
      Alert.alert('İşlem yapılamadı', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setMesgul(null);
    }
  };

  /** Tek ya da çoklu silme (onaylı). Silinemeyenlerin adları gösterilir. */
  const sil = (hedefler: KayitliPdf[]) => {
    if (hedefler.length === 0) return;
    const tek = hedefler.length === 1 ? hedefler[0] : null;
    Alert.alert(
      tek ? "PDF'i sil" : `${hedefler.length} PDF'i sil`,
      (tek ? tek.ad : `Seçilen ${hedefler.length} PDF`) +
        ' telefondan kalıcı olarak silinecek. Gerekirse yeniden aktarabilirsiniz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const basarisiz = hedefler.filter((p) => !dosyaSil(p.dosya)).map((p) => p.ad);
            secimModunuKapat();
            await yukle(klasor);
            if (basarisiz.length > 0) Alert.alert("Bazı PDF'ler silinemedi", basarisiz.slice(0, 5).join('\n'));
          },
        },
      ],
    );
  };

  const secimModunuKapat = () => {
    setSecimModu(false);
    setSecilenler(new Set());
  };

  const secimiDegistir = (p: KayitliPdf) => {
    setSecilenler((onceki) => {
      const yeni = new Set(onceki);
      if (yeni.has(p.dosya.uri)) yeni.delete(p.dosya.uri);
      else yeni.add(p.dosya.uri);
      return yeni;
    });
  };

  const buMukellefinMi = (g: MukellefPdfleri) => mukellef !== null && mukellefKlasoruMu(g.ad, mukellef.vkn);
  const digerSayisi = mukellef === null ? 0 : gruplar.filter((g) => !buMukellefinMi(g)).length;
  const gosterilen = mukellef === null || digerleriniGoster ? gruplar : gruplar.filter(buMukellefinMi);
  const bolumler = gosterilen.map((g) => ({
    baslik: g.klasor ? g.ad : 'Mükellefe ayrılmamış eski PDF’ler',
    key: g.klasor?.uri ?? 'kok',
    data: g.dosyalar,
  }));
  const pdfSayisi = gosterilen.reduce((t, g) => t + g.dosyalar.length, 0);
  // Seçim ve "tümünü seç" yalnızca GÖRÜNEN PDF'leri kapsar (gizli diğer
  // mükelleflerinkiler toplu silmeye karışmaz).
  const gorunenHepsi = gosterilen.flatMap((g) => g.dosyalar);
  const hepsiSecili = gorunenHepsi.length > 0 && gorunenHepsi.every((p) => secilenler.has(p.dosya.uri));
  const secilenPdfler = gorunenHepsi.filter((p) => secilenler.has(p.dosya.uri));

  return (
    <AppScreen>
      <AppHeader
        title={secimModu ? `${secilenler.size} seçildi` : "Kaydedilen PDF'ler"}
        subtitle={secimModu ? undefined : 'e-Arşiv Faturalarım'}
        onBack={secimModu ? secimModunuKapat : () => navigation.goBack()}
        right={
          secimModu ? (
            <AppIconButton icon="close" accessibilityLabel="Seçimi bitir" onPress={secimModunuKapat} />
          ) : (
            <>
              <AppIconButton
                icon="checkbox-multiple-marked-outline"
                iconColor={colors.danger}
                accessibilityLabel="Silmek için seç"
                onPress={() => setSecimModu(true)}
                disabled={pdfSayisi === 0}
              />
              <AppIconButton icon="refresh" accessibilityLabel="Yenile" onPress={() => yukle(klasor)} />
            </>
          )
        }
      />

      {yukleniyor ? (
        <View style={styles.merkezi}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <SectionList
          persistentScrollbar
          indicatorStyle="white"
          sections={bolumler}
          keyExtractor={(p) => p.dosya.uri}
          extraData={[secimModu, secilenler, mesgul]}
          contentContainerStyle={styles.liste}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={styles.ustKisim}>
              <View style={styles.klasorSatiri}>
                <Icon name="folder-outline" size={20} color={colors.warning} />
                <Text style={[typography.body, styles.klasorAdi]} numberOfLines={2}>
                  {klasor ? klasorGorunenAdi(klasor, IOS_RAPOR_KLASOR_ADI) : 'Henüz klasör seçilmedi.'}
                </Text>
              </View>
              {KLASOR_SECILEBILIR ? (
                <SecondaryButton icon="folder-edit-outline" onPress={klasorDegistir} compact>
                  {klasor ? 'Klasörü Değiştir' : 'Klasör Seç'}
                </SecondaryButton>
              ) : null}
              {klasor && gruplar.length > 0 ? (
                mukellef === null ? (
                  <InfoBox tone="neutral">
                    Açık oturumun mükellefi belirlenemedi; cihazdaki tüm mükelleflerin PDF'leri gösteriliyor.
                  </InfoBox>
                ) : (
                  <>
                    <Text style={typography.caption}>
                      Mükellef: {mukellef.vkn}
                      {mukellef.unvan ? ` - ${mukellef.unvan}` : ''}
                    </Text>
                    {digerSayisi > 0 ? (
                      <AppCard>
                        <ToggleRow
                          title={`Diğer mükelleflerin PDF'lerini de göster (${digerSayisi})`}
                          value={digerleriniGoster}
                          onValueChange={setDigerleriniGoster}
                        />
                      </AppCard>
                    ) : null}
                  </>
                )
              ) : null}
              {pdfSayisi > 0 ? <Text style={typography.caption}>{pdfSayisi} PDF</Text> : null}
              {secimModu ? (
                <View style={styles.secimCubugu}>
                  <TextButton
                    compact
                    icon={hepsiSecili ? 'checkbox-blank-outline' : 'checkbox-multiple-marked-outline'}
                    onPress={() =>
                      setSecilenler(hepsiSecili ? new Set() : new Set(gorunenHepsi.map((p) => p.dosya.uri)))
                    }
                  >
                    {hepsiSecili ? 'Seçimi kaldır' : 'Görünenlerin tümünü seç'}
                  </TextButton>
                  <DangerButton
                    compact
                    icon="delete-outline"
                    disabled={secilenler.size === 0}
                    onPress={() => sil(secilenPdfler)}
                  >
                    {`Sil (${secilenler.size})`}
                  </DangerButton>
                </View>
              ) : null}
            </View>
          }
          renderSectionHeader={({ section }) =>
            mukellef === null || digerleriniGoster ? (
              <View style={styles.bolumBasi}>
                <Icon name="account-outline" size={18} color={colors.info} />
                <Text style={[typography.sectionTitle, styles.bolumBasiMetin]} numberOfLines={2}>
                  {section.baslik}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const bilgi = dvdRaporDosyaAdiniCoz(item.ad);
            const calisiyor = mesgul === item.dosya.uri;
            const secili = secilenler.has(item.dosya.uri);
            return (
              <AppCard
                style={styles.kart}
                tone={secili ? 'primary' : 'default'}
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
                accessibilityLabel={
                  secimModu ? `${item.ad} ${secili ? 'seçili' : 'seçili değil'}` : `${item.ad} dosyasını aç`
                }
              >
                <View style={styles.kartBasi}>
                  {secimModu ? (
                    <Icon
                      name={secili ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={28}
                      color={secili ? colors.primary : colors.textSecondary}
                    />
                  ) : (
                    <Icon name="file-pdf-box" size={28} color={colors.danger} />
                  )}
                  <View style={styles.kartMetin}>
                    <Text style={typography.cardTitle}>{bilgi ? bilgi.donem : item.ad}</Text>
                    <Text style={typography.caption} numberOfLines={2}>
                      {[bilgi ? `Oluşturulma: ${bilgi.olusturma}` : undefined, bilgi?.kimlik, boyutMetni(item.boyut)]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  {calisiyor ? <ActivityIndicator color={colors.primary} /> : null}
                </View>
                {secimModu ? null : (
                  <View style={styles.eylemler}>
                    <AppIconButton
                      icon="file-eye-outline"
                      iconColor={colors.primary}
                      accessibilityLabel="Aç"
                      onPress={() => islem(item, 'ac')}
                      disabled={mesgul !== null}
                    />
                    <AppIconButton
                      icon="share-variant-outline"
                      iconColor={colors.info}
                      accessibilityLabel="Paylaş"
                      onPress={() => islem(item, 'paylas')}
                      disabled={mesgul !== null}
                    />
                    <AppIconButton
                      icon="delete-outline"
                      iconColor={colors.danger}
                      accessibilityLabel="Sil"
                      onPress={() => sil([item])}
                      disabled={mesgul !== null}
                    />
                  </View>
                )}
              </AppCard>
            );
          }}
          ListEmptyComponent={
            klasor ? (
              <EmptyState
                icon="file-pdf-box"
                title={
                  mukellef !== null && digerSayisi > 0
                    ? 'Bu mükellef için aktarılmış PDF yok.'
                    : 'Bu klasörde aktarılmış PDF yok.'
                }
                description="e-Arşiv Faturalarım ekranındaki PDF'e Aktar ya da Toplu PDF'e Aktar ile oluşturabilirsiniz."
              />
            ) : (
              <InfoBox tone="info" icon="folder-question-outline">
                PDF'ler ilk aktarmada seçtiğiniz klasöre, mükellefin VKN/TCKN klasörüne kaydedilir. Klasörü şimdi de
                seçebilirsiniz.
              </InfoBox>
            )
          }
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  ustKisim: { gap: spacing.sm, paddingBottom: spacing.xs },
  klasorSatiri: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  klasorAdi: { flex: 1 },
  merkezi: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  liste: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
    gap: spacing.card,
  },
  bolumBasi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  bolumBasiMetin: { flex: 1 },
  kart: { gap: spacing.sm },
  kartBasi: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  kartMetin: { flex: 1, minWidth: 0, gap: 2 },
  eylemler: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  secimCubugu: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
});
