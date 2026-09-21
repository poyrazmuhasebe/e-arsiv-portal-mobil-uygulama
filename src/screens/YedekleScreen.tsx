import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Directory } from 'expo-file-system';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import type { RootStackParamList } from '../../App';
import {
  Alert,
  AppCard,
  AppDialog,
  AppHeader,
  AppScreen,
  DangerSoftButton,
  DialogText,
  Icon,
  InfoBox,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  TextButton,
  ToggleRow,
} from '../components/ui';
import { tarihFormatla } from '../components/TarihAraligiFiltresi';
import { GibApiError, faturaHTMLGetir, gibHatasiniIsle, taslakGetir } from '../services/gibApi';
import {
  KLASOR_SECILEBILIR,
  aktifMukellef,
  dosyaOrtami,
  klasorGorunenAdi,
  mukellefKlasoru,
  yedekKlasoru,
  yedekKlasoruSec,
} from '../services/yedekDeposu';
import { useAuthStore } from '../store/useAuthStore';
import { TOUCH_MIN, colors, radius, spacing, typography } from '../theme';
import { filigranliFaturaHtml } from '../utils/faturaFiligran';
import { yedekPdfBase64 } from '../utils/pdf';
import {
  YEDEK_SURELERI,
  haftalikParcalar,
  noktaliTarih,
  yedekBaslangici,
  yedekle,
  type YedekIlerleme,
  type YedekSonucu,
  type YedekSuresi,
} from '../utils/yedekleme';

type Props = NativeStackScreenProps<RootStackParamList, 'Yedekle'>;

const KEEP_AWAKE_ETIKETI = 'fatura-yedekleme';
const YONLENDIRME_GECIKMESI_MS = 2000;

type Durum =
  | { tur: 'bosta' }
  | { tur: 'suruyor'; ilerleme: YedekIlerleme | null }
  | { tur: 'bitti'; sonuc: YedekSonucu }
  | { tur: 'hata'; mesaj: string; sonuc: YedekSonucu | null };

/**
 * "Faturaları Cihazımda Yedekle > Faturaları Şimdi Yedekle".
 *
 * Seçilen dönem (son 1 hafta … son 1 yıl) GİB'in 7 gün sınırı yüzünden
 * bugünden geriye haftalık parçalara bölünür; her parçanın faturaları
 * (EARSIV_PORTAL_TASLAKLARI_GETIR) tek tek PDF olarak (EARSIV_PORTAL_FATURA_GOSTER
 * + filigran) telefondaki yedek klasörüne yazılır. Döngü: utils/yedekleme.ts.
 *
 * GİB verisi yalnızca GİB ile telefon arasında gider; hiçbir şey uygulama
 * sunucusuna (Cloudflare) gönderilmez.
 */
export default function YedekleScreen({ navigation }: Props) {
  const token = useAuthStore((s) => s.token);
  const kullaniciBilgisi = useAuthStore((s) => s.kullaniciBilgisi);

  const [klasor, setKlasor] = useState<Directory | null>(null);
  const [klasorYukleniyor, setKlasorYukleniyor] = useState(true);
  const [sure, setSure] = useState<YedekSuresi>('1a');
  const [taslaklarDahil, setTaslaklarDahil] = useState(false);
  const [durum, setDurum] = useState<Durum>({ tur: 'bosta' });
  const durdurIstendi = useRef(false);
  const yonlendirme = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    yedekKlasoru()
      .then(setKlasor)
      .catch(() => setKlasor(null))
      .finally(() => setKlasorYukleniyor(false));
    return () => {
      if (yonlendirme.current) clearTimeout(yonlendirme.current);
      durdurIstendi.current = true;
      deactivateKeepAwake(KEEP_AWAKE_ETIKETI).catch(() => undefined);
    };
  }, []);

  const handleKlasorSec = async () => {
    try {
      const secilen = await yedekKlasoruSec();
      if (secilen) setKlasor(secilen);
    } catch (err) {
      Alert.alert('Klasör seçilemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  };

  const baslat = useCallback(async () => {
    if (!token) return;
    if (!klasor) {
      Alert.alert('Klasör seçin', 'Önce yedeklerin kaydedileceği klasörü seçin.');
      return;
    }
    const bugun = new Date();
    const parcalar = haftalikParcalar(yedekBaslangici(sure, bugun), bugun);

    durdurIstendi.current = false;
    setDurum({ tur: 'suruyor', ilerleme: null });
    // Uzun yedeklemede ekran kararıp uygulama arka plana düşmesin.
    await activateKeepAwakeAsync(KEEP_AWAKE_ETIKETI).catch(() => undefined);

    let sonIlerleme: YedekSonucu | null = null;
    try {
      // Klasör, açık GİB oturumunun mükellefine (VKN/TCKN) göre seçilir.
      const mukellef = await aktifMukellef(token, kullaniciBilgisi);
      if (!mukellef) {
        throw new Error("Mükellefin VKN/TCKN'si GİB'den alınamadı; yedekler doğru klasöre yazılamayacağı için yedekleme başlatılmadı.");
      }
      const hedef = mukellefKlasoru(klasor, mukellef.vkn, mukellef.unvan, true);
      if (!hedef) throw new Error('Yedek klasörü oluşturulamadı.');
      const dosya = dosyaOrtami(hedef);

      const sonuc = await yedekle(
        parcalar,
        {
          listele: (p) =>
            taslakGetir(token, { baslangicTarihi: tarihFormatla(p.baslangic), bitisTarihi: tarihFormatla(p.bitis) }),
          pdfUret: async (item) => {
            const html = await faturaHTMLGetir(token, item.ettn, item.onayDurumu);
            return yedekPdfBase64(filigranliFaturaHtml(html, item));
          },
          varMi: dosya.varMi,
          yaz: dosya.yaz,
          durduruldu: () => durdurIstendi.current,
          bekle: (ms) => new Promise((r) => setTimeout(r, ms)),
        },
        {
          taslaklarDahil,
          durduranHataMi: (err) => err instanceof GibApiError && err.oturumHatasi,
        },
        (ilerleme) => {
          sonIlerleme = {
            kaydedilen: ilerleme.kaydedilen,
            atlanan: ilerleme.atlanan,
            hatali: ilerleme.hatali,
            hatalar: [],
            durduruldu: false,
          };
          setDurum({ tur: 'suruyor', ilerleme });
        },
      );

      setDurum({ tur: 'bitti', sonuc });
      // Kullanıcı isteği: tamamlanınca "Yedeklenen Faturaları Görüntüle"ye
      // otomatik geçilir. Hatalı belge varsa kullanıcı listeyi okuyabilsin
      // diye otomatik geçilmez, kutudaki düğmeyle geçer.
      if (!sonuc.durduruldu && sonuc.hatali === 0) {
        yonlendirme.current = setTimeout(() => {
          setDurum({ tur: 'bosta' });
          navigation.replace('YedekleriGoruntule');
        }, YONLENDIRME_GECIKMESI_MS);
      }
    } catch (err) {
      // Oturum hatasında gibHatasiniIsle GİB oturumunu kapatır; uygulama
      // giriş ekranına döner. O ana kadar yazılan yedekler klasörde kalır.
      const { mesaj } = await gibHatasiniIsle(err);
      setDurum({ tur: 'hata', mesaj, sonuc: sonIlerleme });
    } finally {
      deactivateKeepAwake(KEEP_AWAKE_ETIKETI).catch(() => undefined);
    }
  }, [token, klasor, kullaniciBilgisi, sure, taslaklarDahil, navigation]);

  const baslangicOnizleme = yedekBaslangici(sure);
  const parcaSayisi = haftalikParcalar(baslangicOnizleme, new Date()).length;
  const suruyor = durum.tur === 'suruyor';

  const kutuyuKapat = () => {
    if (yonlendirme.current) clearTimeout(yonlendirme.current);
    setDurum({ tur: 'bosta' });
  };

  const yedeklereGit = () => {
    kutuyuKapat();
    navigation.replace('YedekleriGoruntule');
  };

  // Kutunun başlığı ve görünümü (ikon/ton) duruma göre; düğmeler ve metinler
  // eskisiyle aynı.
  const kutuBasligi =
    durum.tur === 'suruyor'
      ? 'Yedekleme devam ediyor'
      : durum.tur === 'hata'
        ? 'Yedekleme yarıda kaldı'
        : durum.tur === 'bitti' && durum.sonuc.durduruldu
          ? 'Yedekleme durduruldu'
          : 'Yedekleme tamamlanmıştır';
  const kutuGorunumu =
    durum.tur === 'hata'
      ? ({ icon: 'alert-circle-outline', tone: 'danger' } as const)
      : durum.tur === 'bitti' && (durum.sonuc.durduruldu || durum.sonuc.hatali > 0)
        ? ({ icon: 'alert-outline', tone: 'warning' } as const)
        : durum.tur === 'bitti'
          ? ({ icon: 'check-circle-outline', tone: 'success' } as const)
          : ({ icon: 'folder-sync-outline', tone: 'default' } as const);

  return (
    <AppScreen>
      <AppHeader title="Faturaları Şimdi Yedekle" onBack={() => navigation.goBack()} backDisabled={suruyor} />

      <ScrollView contentContainerStyle={styles.icerik}>
        <SectionCard title="Yedek klasörü" icon="folder-outline">
          <View style={styles.klasorSatiri}>
            <Icon
              name={klasor ? 'folder' : 'folder-alert-outline'}
              size={22}
              color={klasorYukleniyor ? colors.textMuted : klasor ? colors.primary : colors.warning}
            />
            {klasorYukleniyor ? (
              <Text style={[typography.body, styles.soluk, styles.klasorAdi]}>Yükleniyor…</Text>
            ) : klasor ? (
              <Text style={[typography.body, styles.klasorAdi]} selectable>
                {klasorGorunenAdi(klasor)}
              </Text>
            ) : (
              <Text style={[typography.body, styles.uyari, styles.klasorAdi]}>Henüz klasör seçilmedi.</Text>
            )}
          </View>
          {KLASOR_SECILEBILIR && (
            <SecondaryButton icon="folder" onPress={handleKlasorSec} disabled={suruyor} compact style={styles.solaYasli}>
              {klasor ? 'Klasörü Değiştir' : 'Klasör Seç'}
            </SecondaryButton>
          )}
          <Text style={typography.bodySecondary}>
            {KLASOR_SECILEBILIR
              ? 'Faturalar bu klasörün içinde, her mükellef için ayrı bir alt klasöre PDF olarak kaydedilir. Telefonun "Dosyalar" uygulamasından da görebilirsiniz.'
              : "iPhone'da uygulamalar klasör seçemiyor; faturalar uygulamanın kendi klasörüne kaydedilir ve uygulama silinirse onlar da silinir. Önemli yedekleri Görüntüle ekranından Paylaş ile iCloud Drive'a da kaydedin."}
          </Text>
        </SectionCard>

        <SectionCard title="Dönem" icon="calendar-range">
          <View accessibilityRole="radiogroup" style={styles.secenekler}>
            {YEDEK_SURELERI.map((s) => {
              const secili = s.anahtar === sure;
              return (
                <Pressable
                  key={s.anahtar}
                  onPress={() => setSure(s.anahtar)}
                  disabled={suruyor}
                  accessibilityRole="radio"
                  accessibilityLabel={s.etiket}
                  accessibilityState={{ checked: secili, disabled: suruyor }}
                  android_ripple={{ color: colors.primarySoft }}
                  style={({ pressed }) => [
                    styles.secenek,
                    secili && styles.seciliSecenek,
                    pressed && !secili && styles.basiliSecenek,
                  ]}
                >
                  <Icon
                    name={secili ? 'radiobox-marked' : 'radiobox-blank'}
                    size={22}
                    color={suruyor ? colors.textMuted : secili ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[typography.body, styles.secenekMetni, suruyor && styles.soluk]}>{s.etiket}</Text>
                </Pressable>
              );
            })}
          </View>
          <InfoBox tone="info" icon="calendar-clock">
            {`${noktaliTarih(baslangicOnizleme)} – ${noktaliTarih(new Date())} arası, GİB'in 7 gün sınırı nedeniyle ${parcaSayisi} ayrı sorguyla yedeklenir.`}
          </InfoBox>
        </SectionCard>

        <AppCard>
          <ToggleRow
            title="Onaylanmamış ve silinmiş faturalar da"
            description="Kapalıyken yalnızca GİB'de onaylanmış faturalar yedeklenir."
            value={taslaklarDahil}
            onValueChange={setTaslaklarDahil}
            disabled={suruyor}
          />
        </AppCard>

        <InfoBox tone="neutral">
          Daha önce yedeklenmiş faturalar yeniden indirilmez; yarıda kalan bir yedeklemeyi tekrar başlatırsanız kaldığı
          yerden devam eder. Yedekleme sürerken uygulamayı açık tutun.
        </InfoBox>

        <PrimaryButton icon="content-save" onPress={baslat} disabled={suruyor || !klasor} fullWidth>
          Yedeklemeyi Başlat
        </PrimaryButton>
      </ScrollView>

      {/* AppDialog Paper `Dialog` değil; çocuklarına `style` eklemez, bu
          yüzden duruma göre değişen kısımlar Fragment içinde verilebilir. */}
      <AppDialog
        visible={durum.tur !== 'bosta'}
        title={kutuBasligi}
        icon={kutuGorunumu.icon}
        tone={kutuGorunumu.tone}
        actions={
          durum.tur === 'suruyor' ? (
            <DangerSoftButton icon="stop" onPress={() => (durdurIstendi.current = true)} compact>
              Durdur
            </DangerSoftButton>
          ) : (
            <>
              {durum.tur === 'bitti' ? (
                <TextButton onPress={kutuyuKapat} compact>
                  Kapat
                </TextButton>
              ) : (
                <PrimaryButton onPress={kutuyuKapat} compact>
                  Kapat
                </PrimaryButton>
              )}
              {durum.tur === 'bitti' && (
                <PrimaryButton icon="folder-open-outline" onPress={yedeklereGit} compact>
                  Yedekleri Görüntüle
                </PrimaryButton>
              )}
            </>
          )
        }
      >
        {durum.tur === 'suruyor' &&
          (durum.ilerleme ? (
            <>
              <DialogText>
                {noktaliTarih(durum.ilerleme.parca.baslangic)} – {noktaliTarih(durum.ilerleme.parca.bitis)} arası
                yedekleniyor
              </DialogText>
              <Text style={typography.caption}>
                Sorgu {durum.ilerleme.parcaSirasi} / {durum.ilerleme.parcaSayisi}
              </Text>
              <ProgressBar
                progress={(durum.ilerleme.parcaSirasi - 1) / durum.ilerleme.parcaSayisi}
                color={colors.primary}
                style={styles.ilerlemeCubugu}
              />
              <Text style={typography.bodySecondary}>
                Kaydedilen: {durum.ilerleme.kaydedilen} · Zaten yedekli: {durum.ilerleme.atlanan}
                {durum.ilerleme.hatali > 0 ? ` · Hatalı: ${durum.ilerleme.hatali}` : ''}
              </Text>
            </>
          ) : (
            <DialogText>Hazırlanıyor…</DialogText>
          ))}

        {durum.tur === 'bitti' && (
          <>
            <DialogText>
              Kaydedilen: {durum.sonuc.kaydedilen} · Zaten yedekli: {durum.sonuc.atlanan}
              {durum.sonuc.hatali > 0 ? ` · Hatalı: ${durum.sonuc.hatali}` : ''}
            </DialogText>
            {durum.sonuc.hatalar.slice(0, 5).map((h) => (
              <Text key={h.belge} style={[typography.bodySecondary, styles.hata]}>
                {h.belge}: {h.mesaj}
              </Text>
            ))}
            {!durum.sonuc.durduruldu && durum.sonuc.hatali === 0 && (
              <Text style={typography.caption}>Yedeklenen faturalara yönlendiriliyorsunuz…</Text>
            )}
          </>
        )}

        {durum.tur === 'hata' && (
          <>
            <DialogText>{durum.mesaj}</DialogText>
            {durum.sonuc && (
              <Text style={typography.bodySecondary}>
                O ana kadar kaydedilen {durum.sonuc.kaydedilen} fatura klasörde duruyor. Tekrar başlatırsanız kaldığı
                yerden devam eder.
              </Text>
            )}
          </>
        )}
      </AppDialog>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  icerik: { paddingHorizontal: spacing.screen, paddingTop: spacing.xs, paddingBottom: spacing.xxl, gap: spacing.card },
  klasorSatiri: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  klasorAdi: { flex: 1, minWidth: 0 },
  solaYasli: { alignSelf: 'flex-start' },
  soluk: { color: colors.textMuted },
  uyari: { color: colors.warning },
  hata: { color: colors.danger },
  secenekler: { gap: spacing.xs },
  secenek: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_MIN + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    overflow: 'hidden',
  },
  seciliSecenek: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  basiliSecenek: { backgroundColor: colors.surfaceElevated },
  secenekMetni: { flex: 1 },
  ilerlemeCubugu: { marginVertical: spacing.xxs, borderRadius: radius.pill },
});
