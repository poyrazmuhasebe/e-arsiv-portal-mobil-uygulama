import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Appbar,
  Button,
  Card,
  Dialog,
  Portal,
  ProgressBar,
  RadioButton,
  Switch,
  Text,
  useTheme,
} from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Directory } from 'expo-file-system';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import type { RootStackParamList } from '../../App';
import { tarihFormatla } from '../components/TarihAraligiFiltresi';
import { GibApiError, faturaHTMLGetir, gibHatasiniIsle, taslakGetir } from '../services/gibApi';
import {
  KLASOR_SECILEBILIR,
  dosyaOrtami,
  klasorGorunenAdi,
  mukellefKlasoru,
  yedekKlasoru,
  yedekKlasoruSec,
} from '../services/yedekDeposu';
import { useAuthStore } from '../store/useAuthStore';
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
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);
  const kullaniciBilgisi = useAuthStore((s) => s.kullaniciBilgisi);
  const kullaniciKodu = useAuthStore((s) => s.kullaniciKodu);

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
    const vkn = String(kullaniciBilgisi?.vknTckn || kullaniciKodu || 'mukellef');
    const unvan = typeof kullaniciBilgisi?.unvan === 'string' ? kullaniciBilgisi.unvan : undefined;

    const bugun = new Date();
    const parcalar = haftalikParcalar(yedekBaslangici(sure, bugun), bugun);

    durdurIstendi.current = false;
    setDurum({ tur: 'suruyor', ilerleme: null });
    // Uzun yedeklemede ekran kararıp uygulama arka plana düşmesin.
    await activateKeepAwakeAsync(KEEP_AWAKE_ETIKETI).catch(() => undefined);

    let sonIlerleme: YedekSonucu | null = null;
    try {
      const hedef = mukellefKlasoru(klasor, vkn, unvan, true);
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
  }, [token, klasor, kullaniciBilgisi, kullaniciKodu, sure, taslaklarDahil, navigation]);

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

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} disabled={suruyor} />
        <Appbar.Content title="Faturaları Şimdi Yedekle" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Card mode="elevated" style={styles.card}>
          <Card.Title title="Yedek klasörü" />
          <Card.Content style={styles.cardContent}>
            {klasorYukleniyor ? (
              <Text variant="bodyMedium" style={styles.mutedText}>
                Yükleniyor…
              </Text>
            ) : klasor ? (
              <Text variant="bodyMedium">{klasorGorunenAdi(klasor)}</Text>
            ) : (
              <Text variant="bodyMedium" style={styles.uyari}>
                Henüz klasör seçilmedi.
              </Text>
            )}
            <Text variant="bodySmall" style={styles.mutedText}>
              {KLASOR_SECILEBILIR
                ? 'Faturalar bu klasörün içinde, her mükellef için ayrı bir alt klasöre PDF olarak kaydedilir. Telefonun "Dosyalar" uygulamasından da görebilirsiniz.'
                : "iPhone'da uygulamalar klasör seçemiyor; faturalar uygulamanın kendi klasörüne kaydedilir ve uygulama silinirse onlar da silinir. Önemli yedekleri Görüntüle ekranından Paylaş ile iCloud Drive'a da kaydedin."}
            </Text>
          </Card.Content>
          {KLASOR_SECILEBILIR && (
            <Card.Actions>
              <Button mode="outlined" icon="folder" onPress={handleKlasorSec} disabled={suruyor}>
                {klasor ? 'Klasörü Değiştir' : 'Klasör Seç'}
              </Button>
            </Card.Actions>
          )}
        </Card>

        <Card mode="elevated" style={styles.card}>
          <Card.Title title="Dönem" />
          <Card.Content>
            <RadioButton.Group onValueChange={(v) => setSure(v as YedekSuresi)} value={sure}>
              {YEDEK_SURELERI.map((s) => (
                <RadioButton.Item key={s.anahtar} label={s.etiket} value={s.anahtar} disabled={suruyor} />
              ))}
            </RadioButton.Group>
            <Text variant="bodySmall" style={styles.mutedText}>
              {noktaliTarih(baslangicOnizleme)} – {noktaliTarih(new Date())} arası, GİB'in 7 gün sınırı nedeniyle{' '}
              {parcaSayisi} ayrı sorguyla yedeklenir.
            </Text>
          </Card.Content>
        </Card>

        <Card mode="elevated" style={styles.card}>
          <Card.Content style={styles.switchSatiri}>
            <View style={styles.switchMetni}>
              <Text variant="titleSmall">Onaylanmamış ve silinmiş faturalar da</Text>
              <Text variant="bodySmall" style={styles.mutedText}>
                Kapalıyken yalnızca GİB'de onaylanmış faturalar yedeklenir.
              </Text>
            </View>
            <Switch value={taslaklarDahil} onValueChange={setTaslaklarDahil} disabled={suruyor} />
          </Card.Content>
        </Card>

        <Text variant="bodySmall" style={styles.mutedText}>
          Daha önce yedeklenmiş faturalar yeniden indirilmez; yarıda kalan bir yedeklemeyi tekrar başlatırsanız kaldığı
          yerden devam eder. Yedekleme sürerken uygulamayı açık tutun.
        </Text>

        <Button mode="contained" icon="content-save" onPress={baslat} disabled={suruyor || !klasor}>
          Yedeklemeyi Başlat
        </Button>
      </ScrollView>

      <Portal>
        <Dialog visible={durum.tur !== 'bosta'} dismissable={false}>
          {durum.tur === 'suruyor' && (
            <>
              <Dialog.Title>Yedekleme devam ediyor</Dialog.Title>
              <Dialog.Content style={styles.dialogIcerik}>
                {durum.ilerleme ? (
                  <>
                    <Text variant="bodyMedium">
                      {noktaliTarih(durum.ilerleme.parca.baslangic)} – {noktaliTarih(durum.ilerleme.parca.bitis)} arası
                      yedekleniyor
                    </Text>
                    <Text variant="bodySmall" style={styles.mutedText}>
                      Sorgu {durum.ilerleme.parcaSirasi} / {durum.ilerleme.parcaSayisi}
                    </Text>
                    <ProgressBar
                      progress={(durum.ilerleme.parcaSirasi - 1) / durum.ilerleme.parcaSayisi}
                      style={styles.ilerlemeCubugu}
                    />
                    <Text variant="bodySmall">
                      Kaydedilen: {durum.ilerleme.kaydedilen} · Zaten yedekli: {durum.ilerleme.atlanan}
                      {durum.ilerleme.hatali > 0 ? ` · Hatalı: ${durum.ilerleme.hatali}` : ''}
                    </Text>
                  </>
                ) : (
                  <Text variant="bodyMedium">Hazırlanıyor…</Text>
                )}
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => (durdurIstendi.current = true)}>Durdur</Button>
              </Dialog.Actions>
            </>
          )}

          {durum.tur === 'bitti' && (
            <>
              <Dialog.Title>
                {durum.sonuc.durduruldu ? 'Yedekleme durduruldu' : 'Yedekleme tamamlanmıştır'}
              </Dialog.Title>
              <Dialog.Content style={styles.dialogIcerik}>
                <Text variant="bodyMedium">
                  Kaydedilen: {durum.sonuc.kaydedilen} · Zaten yedekli: {durum.sonuc.atlanan}
                  {durum.sonuc.hatali > 0 ? ` · Hatalı: ${durum.sonuc.hatali}` : ''}
                </Text>
                {durum.sonuc.hatalar.slice(0, 5).map((h) => (
                  <Text key={h.belge} variant="bodySmall" style={styles.uyari}>
                    {h.belge}: {h.mesaj}
                  </Text>
                ))}
                {!durum.sonuc.durduruldu && durum.sonuc.hatali === 0 && (
                  <Text variant="bodySmall" style={styles.mutedText}>
                    Yedeklenen faturalara yönlendiriliyorsunuz…
                  </Text>
                )}
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={kutuyuKapat}>Kapat</Button>
                <Button onPress={yedeklereGit}>Yedekleri Görüntüle</Button>
              </Dialog.Actions>
            </>
          )}

          {durum.tur === 'hata' && (
            <>
              <Dialog.Title>Yedekleme yarıda kaldı</Dialog.Title>
              <Dialog.Content style={styles.dialogIcerik}>
                <Text variant="bodyMedium">{durum.mesaj}</Text>
                {durum.sonuc && (
                  <Text variant="bodySmall" style={styles.mutedText}>
                    O ana kadar kaydedilen {durum.sonuc.kaydedilen} fatura klasörde duruyor. Tekrar başlatırsanız
                    kaldığı yerden devam eder.
                  </Text>
                )}
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={kutuyuKapat}>Kapat</Button>
              </Dialog.Actions>
            </>
          )}
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 16 },
  cardContent: { gap: 6 },
  mutedText: { opacity: 0.7 },
  uyari: { color: '#f2b8b5' },
  switchSatiri: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchMetni: { flex: 1, gap: 2 },
  dialogIcerik: { gap: 8 },
  ilerlemeCubugu: { marginVertical: 4 },
});
