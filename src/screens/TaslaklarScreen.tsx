import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator, Portal } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import FaturaWebView from '../components/FaturaWebView';
import TarihAraligiFiltresi from '../components/TarihAraligiFiltresi';
import { varsayilanBaslangic } from '../utils/tarihAraligi';
import {
  Alert,
  AlertHost,
  AppCard,
  AppDialog,
  AppHeader,
  AppIconButton,
  AppInput,
  AppScreen,
  AppSelect,
  CheckRow,
  DangerButton,
  DangerSoftButton,
  DateField,
  DetailRow,
  DialogText,
  EmptyState,
  InfoBox,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  TextButton,
  type IconName,
  type StatusBadgeDurum,
} from '../components/ui';
import { colors, radius, spacing, typography } from '../theme';

import type { RootStackParamList } from '../../App';
import {
  faturaHTMLGetir,
  faturaSil,
  iptalTalebiOlustur,
  itirazTalebiOlustur,
  ITIRAZ_GONDERIMI_DOGRULANDI,
  smsSifreGonder,
  smsSifreOnayla,
  taslakGetir,
  telefonnoSorgula,
} from '../services/gibApi';
import { useAuthStore } from '../store/useAuthStore';
import { aktifMukellef } from '../services/yedekDeposu';
import type { Mukellef } from '../utils/yedekleme';

import { pdfIndir, pdfPaylas } from '../utils/pdf';
import type { TaslakFatura } from '../types/gib';
import { filigranliFaturaHtml, iptalItirazDurumMetni, iptalKabulEdildiMi } from '../utils/faturaFiligran';
import { betikliHtmlHazirla } from '../utils/htmlOnIsleme';
import {
  ITIRAZ_ACIKLAMA_EN_FAZLA,
  ITIRAZ_BELGE_NO_EN_FAZLA,
  ITIRAZ_UYARI_METNI,
  ITIRAZ_YONTEMLERI,
  bosItirazFormu,
  itirazFormHatasi,
  itirazIstekVerisi,
  itirazTarihiBicimle,
  type ItirazFormu,
  type ItirazYontemi,
} from '../utils/itirazTalebi';

type TaslakDurum = 'onaylandi' | 'onaylanmadi' | 'silinmis' | 'bilinmiyor';

// GİB'in canlı yanıtında doğrulanan kesin değerler: "Onaylandı" | "Onaylanmadı" | "Silinmiş".
// Durum YALNIZCA GİB'in kendi 'onayDurumu' alanından okunur. Eskiden SMS ile
// 'onaylanan' belgeler burada yerel olarak da işaretleniyordu; GİB onayı
// reddettiğinde bile liste 'Onaylı' gösteriyordu (2026-09-21 hatası).
function taslakDurumu(item: TaslakFatura): TaslakDurum {
  const ham = item.onayDurumu ?? item.durum;
  if (ham === 'Onaylandı') return 'onaylandi';
  if (ham === 'Silinmiş') return 'silinmis';
  if (ham === 'Onaylanmadı') return 'onaylanmadi';
  return 'bilinmiyor';
}

// İptal/itiraz durum metni ve filigran kuralları: src/utils/faturaFiligran.ts

// Kartta iptal/itiraz talebinin ikinci rozeti — yalnızca görünüm eşlemesi;
// metnin kendisi iptalItirazDurumMetni'nden gelir ve aynen gösterilir.
function talepRozeti(metin: string): StatusBadgeDurum {
  if (metin.endsWith('Reddedildi')) return 'rejected';
  if (metin.endsWith('Kabul Edildi')) return 'cancelAccepted';
  return 'pending';
}

// AppSelect'in beklediği biçim; değer ve etiketler ITIRAZ_YONTEMLERI'yle birebir.
const ITIRAZ_YONTEMI_SECENEKLERI = ITIRAZ_YONTEMLERI.map((y) => ({ value: y.deger, label: y.etiket }));

const INDIRILDI_MESAJI =
  Platform.OS === 'android'
    ? 'Fatura PDF olarak seçtiğiniz klasördeki mükellef (VKN/TCKN) klasörüne kaydedildi.'
    : 'Fatura PDF olarak cihazınıza kaydedildi.';

type Props = NativeStackScreenProps<RootStackParamList, 'Taslaklar'>;

function paraFormatla(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tarihFormatla(d: Date): string {
  const gg = String(d.getDate()).padStart(2, '0');
  const aa = String(d.getMonth() + 1).padStart(2, '0');
  return `${gg}/${aa}/${d.getFullYear()}`;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** Bugün dahil son 7 gün (bkz. utils/tarihAraligi.ts → varsayilanBaslangic). */
function yediGunOncesi(): Date {
  return varsayilanBaslangic();
}

// "5551234567" -> "(555) 123 45 67" — GİB'in kendi SMS Onay ekranındaki
// gösterim biçimiyle birebir aynı (gerçek yakalamayla doğrulandı).
function telefonMaskele(rakamlar: string): string {
  const m = rakamlar.match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/);
  return m ? `(${m[1]}) ${m[2]} ${m[3]} ${m[4]}` : rakamlar;
}

const SMS_SURESI_SN = 180;

export default function TaslaklarScreen({ navigation }: Props) {
  const token = useAuthStore((s) => s.token);
  const kullaniciBilgisi = useAuthStore((s) => s.kullaniciBilgisi);

  /**
   * İndirilen fatura, seçilen klasörün içindeki mükellef (VKN/TCKN) klasörüne
   * yazılır (aynı üyelikte başka kullanıcı kodlarıyla da giriş yapılabilir).
   * Mükellef belirlenemezse indirilmez. iOS'ta paylaşım sayfası açıldığı için
   * gerekmez.
   */
  const indirmeMukellefi = async (): Promise<Mukellef | undefined> => {
    if (Platform.OS !== 'android') return undefined;
    const m = token ? await aktifMukellef(token, kullaniciBilgisi) : null;
    if (!m) {
      throw new Error(
        'VKN/TCKN belirlenemedi. İndirilen faturalar mükellefe göre ayrı klasörlere kaydedildiği için fatura indirilmedi; tekrar deneyin.',
      );
    }
    return m;
  };

  const [taslaklar, setTaslaklar] = useState<TaslakFatura[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const [baslangicTarih, setBaslangicTarih] = useState<Date>(yediGunOncesi);
  const [bitisTarih, setBitisTarih] = useState<Date>(() => new Date());
  // Tarih seçici, 7 günlük sınır düzeltmesi ve Sorgula güvencesi ortak
  // TarihAraligiFiltresi bileşeninde (davranış buradaki eski kopyayla aynı).

  // SMS ile imzalama (GİB İmza) — GİB'in kendi arayüzündeki gerçek iki
  // adımlı sihirbazın birebir taklidi: 1) uyarı onayı + kayıtlı cep telefonu
  // görüntüleme + "Şifre Gönder", 2) 180 saniyelik geri sayım + SMS kodu +
  // "Onayla". `smsOid`, `smsSifreGonder`'in döndürdüğü işlem kimliğidir —
  // `smsSifreOnayla`'ya geçirilmesi zorunlu.
  const [smsHedefi, setSmsHedefi] = useState<TaslakFatura | null>(null);
  const [smsAsama, setSmsAsama] = useState<1 | 2>(1);
  const [smsUyariOkundu, setSmsUyariOkundu] = useState(false);
  const [smsTelefon, setSmsTelefon] = useState<string | null>(null);
  const [smsTelefonYukleniyor, setSmsTelefonYukleniyor] = useState(false);
  const [smsGonderiliyor, setSmsGonderiliyor] = useState(false);
  const [smsOid, setSmsOid] = useState<string | null>(null);
  const [smsKodu, setSmsKodu] = useState('');
  const [smsOnaylaniyor, setSmsOnaylaniyor] = useState(false);
  const [smsKalanSure, setSmsKalanSure] = useState(SMS_SURESI_SN);

  const [htmlModalGorunur, setHtmlModalGorunur] = useState(false);
  const [htmlYukleniyor, setHtmlYukleniyor] = useState(false);
  const [htmlIcerik, setHtmlIcerik] = useState<string | null>(null);
  // Ön işlemeden ÖNCEKİ (betikli) HTML: yalnızca "Gelişmiş görünüm"
  // (JavaScript açık) seçilirse gösterilir. Ön işlenmiş HTML'de betik
  // kalmadığı için JavaScript'i açmak orada hiçbir şeyi değiştirmezdi.
  const [htmlOzgun, setHtmlOzgun] = useState<string | null>(null);
  // Fatura HTML'i varsayılan olarak JavaScript kapalı gösterilir; yalnızca fatura
  // boş/bozuk göründüğünde kullanıcı bilinçli olarak açar (bkz. FaturaWebView).
  const [faturaJsAcik, setFaturaJsAcik] = useState(false);
  const [pdfIsleniyor, setPdfIsleniyor] = useState(false);

  // Listedeki "İndir" butonu için — hangi kartın HTML'i arka planda
  // çekilip PDF'e çevriliyor.
  const [indirilenEttn, setIndirilenEttn] = useState<string | null>(null);

  // Taslak silme — GİB'in kendi arayüzündeki gerçek iki adımlı akışın
  // birebir taklidi: 1) "Bu belgeyi silmek üzeresiniz" uyarısı + "Uyarıyı
  // okudum" onay kutusu, 2) silme gerekçesi metin girişi. Bu ikinci adımdan
  // sonra gerçek EARSIV_PORTAL_FATURA_SIL isteği gönderiliyor.
  const [silHedefi, setSilHedefi] = useState<TaslakFatura | null>(null);
  const [silUyariOkundu, setSilUyariOkundu] = useState(false);
  const [silAciklamaAcik, setSilAciklamaAcik] = useState(false);
  const [silAciklama, setSilAciklama] = useState('');
  const [silSurecinde, setSilSurecinde] = useState(false);

  // İptal Talebi Oluştur — yalnızca ONAYLANMIŞ (imzalanmış) faturalar için
  // anlamlı (taslak/onaylanmamış bir fatura silinir, iptal edilmez). GİB'in
  // kendi arayüzündeki gerçek akış: gerekçe metni (max 255) + "Uyarıyı
  // Okudum" onayı.
  const [iptalHedefi, setIptalHedefi] = useState<TaslakFatura | null>(null);
  const [iptalUyariOkundu, setIptalUyariOkundu] = useState(false);
  const [iptalGerekce, setIptalGerekce] = useState('');
  const [iptalSurecinde, setIptalSurecinde] = useState(false);

  // İtiraz Talebi Oluştur — GİB portalındaki pencerenin birebir karşılığı
  // (bkz. utils/itirazTalebi.ts). GİB'e giden istek henüz yakalanmadığı için
  // gönderim kilitli: son adımda kapatılabilir bir bilgi kutusu gösterilir.
  const [itirazHedefi, setItirazHedefi] = useState<TaslakFatura | null>(null);
  const [itirazFormu, setItirazFormu] = useState<ItirazFormu>(bosItirazFormu);
  const [itirazTarihSeciliyor, setItirazTarihSeciliyor] = useState(false);
  const [itirazSurecinde, setItirazSurecinde] = useState(false);
  const [itirazBilgiGorunur, setItirazBilgiGorunur] = useState(false);

  const veriYukle = useCallback(
    async (baslangic: Date, bitis: Date): Promise<TaslakFatura[] | null> => {
      if (!token) return null;
      try {
        const sonuc = await taslakGetir(token, {
          baslangicTarihi: tarihFormatla(baslangic),
          bitisTarihi: tarihFormatla(bitis),
        });
        setTaslaklar(sonuc);
        return sonuc;
      } catch (err) {
        const message = err instanceof Error && err.message ? err.message : 'Faturalar yüklenemedi.';
        Alert.alert('Hata', message);
        return null;
      }
    },
    [token],
  );

  useEffect(() => {
    // Yalnızca ilk açılışta varsayılan (son 7 gün) aralıkla sorgulanır;
    // kullanıcı tarihleri değiştirdiğinde yalnızca "Sorgula" butonuna
    // basınca yeni sorgu gönderilir.
    setYukleniyor(true);
    veriYukle(baslangicTarih, bitisTarih).finally(() => setYukleniyor(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veriYukle]);

  // GİB 1 haftadan uzun aralığı reddediyor: geçersiz aralıkta
  // TarihAraligiFiltresi bu fonksiyonu hiç çağırmaz (son güvence orada).
  const handleSorgula = async () => {
    setYukleniyor(true);
    await veriYukle(baslangicTarih, bitisTarih);
    setYukleniyor(false);
  };

  const handlePullYenile = async () => {
    setYenileniyor(true);
    await veriYukle(baslangicTarih, bitisTarih);
    setYenileniyor(false);
  };

  // TarihAraligiFiltresi seçilen tarihi 7 günlük sınıra göre düzeltip
  // (gerekirse uyarı göstererek) iki ucu birlikte bildirir.
  const handleTarihDegisti = (baslangic: Date, bitis: Date) => {
    setBaslangicTarih(baslangic);
    setBitisTarih(bitis);
  };

  // Adım 1: "GİB İmza" tıklanınca dialog açılır ve kayıtlı cep telefonu
  // (EARSIV_PORTAL_TELEFONNO_SORGULA) arka planda sorgulanır.
  const handleGibImzaBaslat = async (item: TaslakFatura) => {
    if (!token) return;
    setSmsHedefi(item);
    setSmsAsama(1);
    setSmsUyariOkundu(false);
    setSmsKodu('');
    setSmsOid(null);
    setSmsTelefon(null);
    setSmsTelefonYukleniyor(true);
    try {
      const telefon = await telefonnoSorgula(token);
      setSmsTelefon(telefon);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Telefon numarası alınamadı.';
      Alert.alert('Hata', message);
      setSmsHedefi(null);
    } finally {
      setSmsTelefonYukleniyor(false);
    }
  };

  const handleSmsVazgec = () => {
    setSmsHedefi(null);
    setSmsAsama(1);
    setSmsUyariOkundu(false);
    setSmsTelefon(null);
    setSmsOid(null);
    setSmsKodu('');
  };

  // Adım 1 → Adım 2 geçişi: "Şifre Gönder" — GİB'e kayıtlı telefona SMS
  // gönderilir, dönen işlem kimliği (OID) 2. adımda kullanılmak üzere saklanır.
  const handleSifreGonder = async () => {
    if (!token || !smsTelefon) return;
    setSmsGonderiliyor(true);
    try {
      const oid = await smsSifreGonder(token, smsTelefon);
      setSmsOid(oid);
      setSmsKalanSure(SMS_SURESI_SN);
      setSmsAsama(2);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'SMS gönderilemedi.';
      Alert.alert('SMS Gönderilemedi', message);
    } finally {
      setSmsGonderiliyor(false);
    }
  };

  const handleSmsOnayla = async () => {
    if (!token || !smsHedefi || !smsOid || smsKodu.trim().length === 0) return;
    setSmsOnaylaniyor(true);
    try {
      const ettn = smsHedefi.ettn;
      const yanit = await smsSifreOnayla(token, smsHedefi, smsKodu.trim(), smsOid);
      handleSmsVazgec();

      // Sonuç GİB'in KENDİ LİSTESİNDEN doğrulanır. Başarı mesajı yalnızca
      // fatura orada gerçekten 'Onaylandı' görünüyorsa gösterilir; aksi hâlde
      // (ret, belirsiz yanıt, gecikme) kullanıcıya açıkça söylenir. Yanlış bir
      // 'onaylandı' mesajı, yanlış bir 'doğrulanamadı' mesajından çok daha
      // tehlikelidir: kullanıcı imzalanmamış bir faturayı imzalı sanır.
      const liste = await veriYukle(baslangicTarih, bitisTarih);
      const guncel = liste?.find((t) => t.ettn === ettn);
      if (guncel && taslakDurumu(guncel) === 'onaylandi') {
        Alert.alert('Onaylandı', yanit.mesaj ?? 'Fatura GİB tarafından onaylandı.');
      } else {
        const gibDurumu = guncel?.onayDurumu ?? 'bilinmiyor';
        Alert.alert(
          'Onay doğrulanamadı',
          'GİB listesinde bu fatura "' + gibDurumu + '" görünüyor; imza gerçekleşmemiş olabilir. ' +
            'SMS şifresini ve süresini kontrol edip yeniden deneyin ya da GİB portalından kontrol edin.' +
            (yanit.mesaj ? '\n\nGİB yanıtı: ' + yanit.mesaj : ''),
        );
      }
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'SMS kodu onaylanamadı.';
      Alert.alert('Onay Başarısız', message);
    } finally {
      setSmsOnaylaniyor(false);
    }
  };

  // 2. adımdaki 180 saniyelik SMS geçerlilik süresi geri sayımı.
  useEffect(() => {
    if (!smsHedefi || smsAsama !== 2 || smsKalanSure <= 0) return;
    const zamanlayici = setTimeout(() => setSmsKalanSure((s) => s - 1), 1000);
    return () => clearTimeout(zamanlayici);
  }, [smsHedefi, smsAsama, smsKalanSure]);

  // Düzenle: gerçek GİB komutu henüz doğrulanmadığından şimdilik
  // yalnızca konsola yazan yer tutucular. Sil ve İptal Talebi Oluştur ayrıca
  // ele alınıyor (bkz. handleSilBaslat/handleSilOnayla,
  // handleIptalBaslat/handleIptalOnayla) — ikisi de gerçek DevTools
  // yakalamasıyla doğrulandı.
  const handleAksiyon = (aksiyonAdi: string, item: TaslakFatura) => {
    if (__DEV__) console.log(`${aksiyonAdi} tıklandı:`, item.ettn);
  };

  const handleItirazBaslat = (item: TaslakFatura) => {
    setItirazHedefi(item);
    setItirazFormu(bosItirazFormu());
    setItirazTarihSeciliyor(false);
  };

  const handleItirazVazgec = () => {
    setItirazHedefi(null);
    setItirazFormu(bosItirazFormu());
    setItirazTarihSeciliyor(false);
  };

  const itirazAlaniniGuncelle = (alan: Partial<ItirazFormu>) =>
    setItirazFormu((onceki) => ({ ...onceki, ...alan }));

  const handleItirazOlustur = async () => {
    if (!token || !itirazHedefi || itirazFormHatasi(itirazFormu) !== null) return;
    // Gönderim doğrulanana kadar GİB'e HİÇBİR İSTEK gitmez; yalnızca bilgi
    // kutusu açılır. Form kapanmaz, kullanıcı 'Vazgeç' ile çıkar.
    if (!ITIRAZ_GONDERIMI_DOGRULANDI) {
      setItirazBilgiGorunur(true);
      return;
    }
    setItirazSurecinde(true);
    try {
      await itirazTalebiOlustur(token, itirazIstekVerisi(itirazHedefi, itirazFormu));
      handleItirazVazgec();
      await veriYukle(baslangicTarih, bitisTarih);
      Alert.alert('Talep Oluşturuldu', 'İtiraz talebiniz oluşturulmuştur.');
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'İtiraz talebi oluşturulamadı.';
      Alert.alert('İşlem Başarısız', message);
    } finally {
      setItirazSurecinde(false);
    }
  };

  const handleSilBaslat = (item: TaslakFatura) => {
    setSilHedefi(item);
    setSilUyariOkundu(false);
    setSilAciklamaAcik(false);
    setSilAciklama('');
  };

  const handleSilVazgec = () => {
    setSilHedefi(null);
    setSilUyariOkundu(false);
    setSilAciklamaAcik(false);
    setSilAciklama('');
  };

  const handleSilUyariOnayla = () => {
    setSilAciklamaAcik(true);
  };

  const handleSilOnayla = async () => {
    if (!token || !silHedefi || silAciklama.trim().length === 0) return;
    setSilSurecinde(true);
    try {
      await faturaSil(token, silHedefi, silAciklama.trim());
      handleSilVazgec();
      await veriYukle(baslangicTarih, bitisTarih);
      Alert.alert('Silindi', '1 fatura başarıyla silindi.');
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Fatura silinemedi.';
      Alert.alert('Silme Başarısız', message);
    } finally {
      setSilSurecinde(false);
    }
  };

  const handleIptalBaslat = (item: TaslakFatura) => {
    setIptalHedefi(item);
    setIptalUyariOkundu(false);
    setIptalGerekce('');
  };

  const handleIptalVazgec = () => {
    setIptalHedefi(null);
    setIptalUyariOkundu(false);
    setIptalGerekce('');
  };

  const handleIptalOnayla = async () => {
    if (!token || !iptalHedefi || iptalGerekce.trim().length === 0) return;
    setIptalSurecinde(true);
    try {
      await iptalTalebiOlustur(token, iptalHedefi, iptalGerekce.trim());
      handleIptalVazgec();
      await veriYukle(baslangicTarih, bitisTarih);
      Alert.alert('Talep Oluşturuldu', 'İptal talebiniz başarıyla oluşturulmuştur.');
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'İptal talebi oluşturulamadı.';
      Alert.alert('İşlem Başarısız', message);
    } finally {
      setIptalSurecinde(false);
    }
  };

  const handleGelismisGorunum = () => {
    Alert.alert(
      'Gelişmiş görünüm',
      'Fatura sayfasındaki betiklerin (JavaScript) çalışmasına izin verilecek. Bunu yalnızca fatura boş ya da bozuk görünüyorsa kullanın.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Aç', onPress: () => setFaturaJsAcik(true) },
      ],
    );
  };

  const handleGoruntule = async (item: TaslakFatura) => {
    if (!token) return;
    setHtmlModalGorunur(true);
    setHtmlYukleniyor(true);
    setHtmlIcerik(null);
    setHtmlOzgun(null);
    setFaturaJsAcik(false);
    try {
      const html = await faturaHTMLGetir(token, item.ettn, item.onayDurumu);
      // Filigran artık görüntülemede de var (önceden yalnızca PDF'teydi).
      // Karekod: GİB onu betikle çiziyor, görüntüleyicide ise JavaScript
      // kapalı; HTML önce kısıtlı ön işlemeden geçer (karekod resme çevrilir,
      // bkz. utils/htmlOnIsleme.ts). PDF bu HTML'den üretildiği için ikisi
      // her zaman aynı. Ön işleme olmazsa özgün HTML gösterilir.
      const filigranli = filigranliFaturaHtml(html, item);
      setHtmlOzgun(filigranli);
      setHtmlIcerik(await betikliHtmlHazirla(filigranli));
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Fatura görüntülenemedi.';
      Alert.alert('Hata', message);
      setHtmlModalGorunur(false);
    } finally {
      setHtmlYukleniyor(false);
    }
  };

  const handlePdfIndir = async () => {
    if (!htmlIcerik) return;
    setPdfIsleniyor(true);
    try {
      await pdfIndir(htmlIcerik, undefined, await indirmeMukellefi());
      // Artık paylaşım penceresi açılmıyor (doğrudan indiriliyor), bu yüzden
      // başarı geri bildirimi yalnızca bu Alert.
      Alert.alert('İndirildi', INDIRILDI_MESAJI);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'PDF oluşturulamadı.';
      Alert.alert('Hata', message);
    } finally {
      setPdfIsleniyor(false);
    }
  };

  const handlePdfPaylas = async () => {
    if (!htmlIcerik) return;
    setPdfIsleniyor(true);
    try {
      await pdfPaylas(htmlIcerik);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'PDF paylaşılamadı.';
      Alert.alert('Hata', message);
    } finally {
      setPdfIsleniyor(false);
    }
  };

  // Kart üzerindeki "İndir": modalı açmadan doğrudan HTML'i çekip PDF olarak indirir.
  const handleListedenIndir = async (item: TaslakFatura) => {
    if (!token) return;
    setIndirilenEttn(item.ettn);
    try {
      const html = await faturaHTMLGetir(token, item.ettn, item.onayDurumu);
      await pdfIndir(filigranliFaturaHtml(html, item), undefined, await indirmeMukellefi());
      Alert.alert('İndirildi', INDIRILDI_MESAJI);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Fatura indirilemedi.';
      Alert.alert('Hata', message);
    } finally {
      setIndirilenEttn(null);
    }
  };

  const renderItem = ({ item }: { item: TaslakFatura }) => {
    const durum = taslakDurumu(item);
    const buItemIcinTelefonYukleniyor = smsHedefi?.ettn === item.ettn && smsTelefonYukleniyor;
    // GİB İmza/Düzenle/Sil yalnızca "Onaylanmadı" (henüz taslak) durumunda
    // anlamlı — onaylanmış veya silinmiş bir belgede gösterilmiyor.
    const duzenlenebilir = durum === 'onaylanmadi';
    const itirazIptalMetni = iptalItirazDurumMetni(item);
    // Belgede zaten bir iptal/itiraz talebi varsa (kabul edilmiş ya da hâlâ
    // aşamasında) yeni bir İtiraz/İptal talebi oluşturmanın anlamı yok —
    // GİB'in kendi arayüzü de bu durumda ilgili seçenekleri sunmuyor.
    const talepVarMi = itirazIptalMetni !== undefined;
    // İptal Talebi Oluştur ise tam tersi: yalnızca ONAYLANMIŞ (imzalanmış)
    // bir belge için anlamlı — taslak bir fatura iptal edilmez, silinir
    // (gerçek yakalamayla doğrulandı: istek "onayDurumu":"Onaylandı" taşıyor).
    const iptalUygun = durum === 'onaylandi' && !talepVarMi;
    // Silinmiş bir belgeye itiraz edilmez (kullanıcı isteği, 2026-09-21).
    const itirazUygun = durum !== 'silinmis' && !talepVarMi;

    const baslik = asString(item.aliciUnvanAdSoyad) ?? asString(item.aliciUnvan) ?? 'Bilinmeyen Alıcı';
    const tarih = asString(item.belgeTarihi) ?? asString(item.faturaTarihi) ?? '-';
    const vknTckn = asString(item.aliciVknTckn);
    const belgeNo = asString(item.belgeNumarasi) ?? item.ettn;
    const belgeTuru = asString(item.belgeTuru);

    // İptal talebi kabul edilmiş fatura GİB'de hâlâ 'Onaylandı' görünür ama
    // geçersizdir: yeşil 'Onaylı' yerine kırmızı 'İptal' (kullanıcı isteği).
    const durumGorseli: { rozet: StatusBadgeDurum; etiket: string; icon?: IconName } =
      durum === 'onaylandi' && iptalKabulEdildiMi(item)
        ? { rozet: 'cancelAccepted', etiket: 'İptal' }
        : durum === 'onaylandi'
          ? { rozet: 'approved', etiket: 'Onaylı' }
          : durum === 'silinmis'
            ? { rozet: 'deleted', etiket: 'Silinmiş' }
            : durum === 'onaylanmadi'
              ? { rozet: 'draft', etiket: 'Taslak' }
              : { rozet: 'info', etiket: 'Bilinmiyor', icon: 'help-circle-outline' };

    // Taslakta ana eylem GİB İmza; diğer durumlarda Görüntüle öne çıkar.
    const GoruntuleDugmesi = duzenlenebilir ? SecondaryButton : PrimaryButton;

    return (
      <AppCard style={styles.kart}>
        <View style={styles.kartBaslik}>
          <Text style={[typography.cardTitle, styles.kartBaslikMetni]} numberOfLines={2}>
            {baslik}
          </Text>
          <StatusBadge status={durumGorseli.rozet} label={durumGorseli.etiket} icon={durumGorseli.icon} />
        </View>

        {itirazIptalMetni !== undefined ? (
          <View style={styles.talepSatiri}>
            <Text style={typography.caption}>İtiraz/İptal Durumu</Text>
            <StatusBadge status={talepRozeti(itirazIptalMetni)} label={itirazIptalMetni} />
          </View>
        ) : null}

        <View style={styles.detaylar}>
          <DetailRow label="Tarih" value={tarih} />
          <DetailRow label="VKN/TCKN" value={vknTckn} />
          <DetailRow label="Belge No" value={belgeNo} />
          <DetailRow label="Belge Türü" value={belgeTuru} />
          {item.genelToplam !== undefined ? (
            <DetailRow label="Tutar" value={`${paraFormatla(item.genelToplam)} ₺`} numeric />
          ) : null}
        </View>

        <View style={styles.aksiyonlar}>
          {duzenlenebilir && (
            <PrimaryButton
              compact
              icon="cellphone-message"
              loading={buItemIcinTelefonYukleniyor}
              disabled={buItemIcinTelefonYukleniyor}
              onPress={() => handleGibImzaBaslat(item)}
            >
              GİB İmza
            </PrimaryButton>
          )}
          <GoruntuleDugmesi compact icon="eye-outline" onPress={() => handleGoruntule(item)}>
            Görüntüle
          </GoruntuleDugmesi>
          <SecondaryButton
            compact
            icon="tray-arrow-down"
            loading={indirilenEttn === item.ettn}
            disabled={indirilenEttn === item.ettn}
            onPress={() => handleListedenIndir(item)}
          >
            İndir
          </SecondaryButton>
          {duzenlenebilir && (
            <SecondaryButton compact icon="pencil-outline" onPress={() => handleAksiyon('Düzenle', item)}>
              Düzenle
            </SecondaryButton>
          )}
          {itirazUygun && (
            <SecondaryButton compact icon="alert-circle-outline" onPress={() => handleItirazBaslat(item)}>
              İtiraz
            </SecondaryButton>
          )}
          {duzenlenebilir && (
            <DangerSoftButton compact icon="delete-outline" onPress={() => handleSilBaslat(item)}>
              Sil
            </DangerSoftButton>
          )}
          {iptalUygun && (
            <DangerSoftButton compact icon="close-circle-outline" onPress={() => handleIptalBaslat(item)}>
              İptal
            </DangerSoftButton>
          )}
        </View>
      </AppCard>
    );
  };

  return (
    <AppScreen>
      <AppHeader title="Taslak / Kesilen Faturalar" onBack={() => navigation.goBack()} />

      <TarihAraligiFiltresi
        baslangic={baslangicTarih}
        bitis={bitisTarih}
        onDegisti={handleTarihDegisti}
        onSorgula={handleSorgula}
        yukleniyor={yukleniyor}
      />

      {yukleniyor ? (
        <View style={styles.merkezi}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList persistentScrollbar indicatorStyle="white"
          data={taslaklar}
          keyExtractor={(item) => item.ettn}
          renderItem={renderItem}
          contentContainerStyle={styles.listeIcerik}
          refreshing={yenileniyor}
          onRefresh={handlePullYenile}
          ListEmptyComponent={
            <EmptyState
              icon="file-document-outline"
              title="Bu tarih aralığında fatura yok"
              description="Başlangıç ve bitiş tarihlerini değiştirip yeniden sorgulayabilirsiniz."
            />
          }
        />
      )}

      {/* Taslak silme — 1. adım: uyarı + "Uyarıyı okudum." */}
      <AppDialog
        visible={silHedefi !== null && !silAciklamaAcik}
        onDismiss={handleSilVazgec}
        title="Uyarı"
        icon="alert-outline"
        tone="danger"
        actions={
          <>
            <TextButton compact onPress={handleSilVazgec}>
              Vazgeç
            </TextButton>
            <DangerButton compact onPress={handleSilUyariOnayla} disabled={!silUyariOkundu}>
              Sil
            </DangerButton>
          </>
        }
      >
        <DialogText>Bu belgeyi silmek üzeresiniz.</DialogText>
        <CheckRow label="Uyarıyı okudum." checked={silUyariOkundu} onChange={() => setSilUyariOkundu((v) => !v)} />
      </AppDialog>

      {/* Taslak silme — 2. adım: silme gerekçesi */}
      <AppDialog
        visible={silAciklamaAcik}
        onDismiss={handleSilVazgec}
        title="Açıklama"
        icon="delete-outline"
        tone="danger"
        actions={
          <>
            <TextButton compact onPress={handleSilVazgec} disabled={silSurecinde}>
              Vazgeç
            </TextButton>
            <DangerButton
              compact
              onPress={handleSilOnayla}
              loading={silSurecinde}
              disabled={silSurecinde || silAciklama.trim().length === 0}
            >
              Sil
            </DangerButton>
          </>
        }
      >
        <DialogText>Silme gerekçenizi giriniz:</DialogText>
        <AppInput value={silAciklama} onChangeText={setSilAciklama} autoFocus />
      </AppDialog>

      <AppDialog
        visible={iptalHedefi !== null}
        onDismiss={handleIptalVazgec}
        title="İptal Talebi Oluştur"
        icon="close-circle-outline"
        tone="danger"
        actions={
          <>
            <TextButton compact onPress={handleIptalVazgec} disabled={iptalSurecinde}>
              Vazgeç
            </TextButton>
            <DangerButton
              compact
              onPress={handleIptalOnayla}
              loading={iptalSurecinde}
              disabled={iptalSurecinde || !iptalUyariOkundu || iptalGerekce.trim().length === 0}
            >
              İptal Talebi Oluştur
            </DangerButton>
          </>
        }
      >
        <AppInput
          label="İptal Gerekçenizi Giriniz"
          value={iptalGerekce}
          onChangeText={(v) => setIptalGerekce(v.slice(0, 255))}
          maxLength={255}
          multiline
          numberOfLines={3}
          autoFocus
        />
        <Text style={styles.karakterSayaci}>{iptalGerekce.length} / 255</Text>
        <InfoBox tone="warning" title="Uyarı">
          {'Düzenlemiş olduğunuz belge için iptal talebi oluşturmak istiyorsunuz. İptal talebi oluşturduğunuzda ' +
            'bu talep geri çekilemeyecek ve alıcıya iletilecektir.'}
        </InfoBox>
        <CheckRow label="Uyarıyı Okudum" checked={iptalUyariOkundu} onChange={() => setIptalUyariOkundu((v) => !v)} />
      </AppDialog>

      {/* İtiraz Talebi Oluştur — GİB portalındaki pencerenin birebir
          karşılığı: alan sırası, etiketler, 4 yöntem ve uyarı metni aynı. */}
      <AppDialog
        visible={itirazHedefi !== null}
        onDismiss={handleItirazVazgec}
        title="İtiraz Talebi Oluştur"
        icon="alert-circle-outline"
        tone="warning"
        actions={
          <>
            <TextButton compact onPress={handleItirazVazgec} disabled={itirazSurecinde}>
              Vazgeç
            </TextButton>
            <PrimaryButton
              compact
              onPress={handleItirazOlustur}
              loading={itirazSurecinde}
              disabled={itirazSurecinde || itirazFormHatasi(itirazFormu) !== null}
            >
              İtiraz Talebi Oluştur
            </PrimaryButton>
          </>
        }
      >
        <AppInput
          label="İtiraz Belge Numarası *"
          value={itirazFormu.belgeNumarasi}
          onChangeText={(v) => itirazAlaniniGuncelle({ belgeNumarasi: v })}
          maxLength={ITIRAZ_BELGE_NO_EN_FAZLA}
          autoCapitalize="characters"
          autoCorrect={false}
          helperText="Türk Ticaret Kanununda yer alan itiraz yöntemlerinin belge numarası yazılmalıdır"
        />

        <View style={styles.alanGrubu}>
          <DateField
            label="İtiraz Belge Tarihi"
            required
            value={itirazFormu.belgeTarihi ? itirazTarihiBicimle(itirazFormu.belgeTarihi) : undefined}
            placeholder="__/__/____"
            onPress={() => setItirazTarihSeciliyor(true)}
          />
          <Text style={styles.alanNotu}>
            Türk Ticaret Kanununda yer alan itiraz yöntemlerinin belge tarihi yazılmalıdır
          </Text>
        </View>
        {itirazTarihSeciliyor && (
          <DateTimePicker
            value={itirazFormu.belgeTarihi ?? new Date()}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onValueChange={(_e: DateTimePickerChangeEvent, secilen: Date) => {
              setItirazTarihSeciliyor(false);
              itirazAlaniniGuncelle({ belgeTarihi: secilen });
            }}
            onDismiss={() => setItirazTarihSeciliyor(false)}
          />
        )}

        <AppSelect
          label="İtiraz Yöntemi"
          zorunlu
          value={itirazFormu.yontem}
          secenekler={ITIRAZ_YONTEMI_SECENEKLERI}
          onSelect={(v) => itirazAlaniniGuncelle({ yontem: v as ItirazYontemi })}
        />

        <View>
          <AppInput
            label="Açıklama"
            value={itirazFormu.aciklama}
            onChangeText={(v) => itirazAlaniniGuncelle({ aciklama: v.slice(0, ITIRAZ_ACIKLAMA_EN_FAZLA) })}
            maxLength={ITIRAZ_ACIKLAMA_EN_FAZLA}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.karakterSayaci}>
            {itirazFormu.aciklama.length} / {ITIRAZ_ACIKLAMA_EN_FAZLA}
          </Text>
        </View>

        <InfoBox tone="warning" title="Uyarı">
          {ITIRAZ_UYARI_METNI}
        </InfoBox>
        <CheckRow
          label="Uyarıyı Okudum"
          checked={itirazFormu.uyariOkundu}
          onChange={() => itirazAlaniniGuncelle({ uyariOkundu: !itirazFormu.uyariOkundu })}
        />
      </AppDialog>

      {/* Kullanıcı isteği (2026-09-21): gönderim doğrulanana kadar son adımda
          kapatılabilir bilgi kutusu. GİB'e hiçbir istek gitmez. */}
      <AppDialog
        visible={itirazBilgiGorunur}
        onDismiss={() => setItirazBilgiGorunur(false)}
        title="Bilgi"
        icon="information-outline"
        actions={
          <PrimaryButton compact onPress={() => setItirazBilgiGorunur(false)}>
            Kapat
          </PrimaryButton>
        }
      >
        <DialogText>Bu bölümden sonrası test edilemediği için geliştirilememiştir.</DialogText>
        <InfoBox tone="neutral">
          İtiraz talebiniz GİB'e gönderilmedi. Talebi GİB e-Arşiv Portalı üzerinden oluşturabilirsiniz.
        </InfoBox>
      </AppDialog>

      <AppDialog
        visible={smsHedefi !== null && smsAsama === 1}
        onDismiss={handleSmsVazgec}
        title="SMS Onay — 1. Adım"
        icon="cellphone-message"
        actions={
          <>
            <TextButton compact onPress={handleSmsVazgec}>
              Vazgeç
            </TextButton>
            <PrimaryButton
              compact
              onPress={handleSifreGonder}
              loading={smsGonderiliyor}
              disabled={!smsUyariOkundu || !smsTelefon || smsGonderiliyor}
            >
              Şifre Gönder
            </PrimaryButton>
          </>
        }
      >
        <InfoBox tone="warning">
          Bu belge imzalandığında geçerlilik kazanacak olup, imzalandıktan sonra düzeltilmesi mümkün değildir.
        </InfoBox>
        <CheckRow label="Uyarıyı Okudum" checked={smsUyariOkundu} onChange={() => setSmsUyariOkundu((v) => !v)} />
        <View style={styles.telefonKutusu}>
          <Text style={typography.label}>Cep Telefonu</Text>
          {smsTelefonYukleniyor ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.telefonSpinner} />
          ) : (
            <Text style={typography.body}>{smsTelefon ? telefonMaskele(smsTelefon) : '-'}</Text>
          )}
        </View>
      </AppDialog>

      <AppDialog
        visible={smsHedefi !== null && smsAsama === 2}
        onDismiss={handleSmsVazgec}
        title="SMS Onay — 2. Adım"
        icon="cellphone-message"
        actions={
          <>
            <TextButton compact onPress={handleSmsVazgec} disabled={smsOnaylaniyor}>
              Vazgeç
            </TextButton>
            <PrimaryButton
              compact
              onPress={handleSmsOnayla}
              loading={smsOnaylaniyor}
              disabled={smsOnaylaniyor || smsKodu.trim().length === 0 || smsKalanSure <= 0}
            >
              Onayla
            </PrimaryButton>
          </>
        }
      >
        <StatusBadge
          status={smsKalanSure > 0 ? 'pending' : 'rejected'}
          icon="timer-outline"
          label={`Kalan süre: ${smsKalanSure} sn`}
        />
        <DialogText>Lütfen cep telefonunuza gelen SMS şifrenizi giriniz.</DialogText>
        <AppInput
          label="Şifre"
          value={smsKodu}
          // GİB'in SMS şifresi yalnızca rakam değil, harf+rakam karışık
          // gelebiliyor (ör. "0IC017") — bu yüzden number-pad DEĞİL,
          // varsayılan klavye kullanılıyor; GİB'in kendi mesajındaki gibi
          // büyük harfe otomatik çevriliyor.
          onChangeText={(v) => setSmsKodu(v.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          // iOS'ta sistem, gelen SMS'teki kodu klavye üstünde otomatik
          // öneriyor (textContentType); Android'de de aynı işlevi gören
          // autoComplete="sms-otp" ipucu veriliyor — ikisi de uygulamanın
          // SMS okuma izni istemesini GEREKTİRMİYOR, işletim sistemi/
          // klavye kendi mekanizmasıyla dolduruyor.
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoFocus
        />
        {smsKalanSure <= 0 && (
          <InfoBox tone="danger">SMS şifresinin süresi doldu. Vazgeçip tekrar deneyin.</InfoBox>
        )}
      </AppDialog>

      <Modal
        visible={htmlModalGorunur}
        animationType="slide"
        onRequestClose={() => setHtmlModalGorunur(false)}
      >
        {/* Modal ayrı bir yerel pencere: güvenli alan ve dialog katmanı
            onun içinde yeniden kurulur. Aksi hâlde temalı Alert (ör.
            "Gelişmiş görünüm" onayı, PDF hataları) görüntüleyicinin
            ARKASINDA açılıp görünmüyordu. */}
        <SafeAreaProvider>
        <Portal.Host>
        <AppScreen glow={false}>
          <AppHeader
            title="Fatura Görüntüle"
            onBack={() => setHtmlModalGorunur(false)}
            right={
              <>
                <AppIconButton
                  icon="tray-arrow-down"
                  accessibilityLabel="PDF İndir"
                  disabled={!htmlIcerik || pdfIsleniyor}
                  onPress={handlePdfIndir}
                />
                <AppIconButton
                  icon="share-variant"
                  accessibilityLabel="Paylaş"
                  disabled={!htmlIcerik || pdfIsleniyor}
                  onPress={handlePdfPaylas}
                />
              </>
            }
          />

          {pdfIsleniyor || (!!htmlIcerik && !faturaJsAcik) ? (
            <View style={styles.aracCubugu}>
              {pdfIsleniyor && (
                <View style={styles.pdfDurumu}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={typography.caption}>PDF hazırlanıyor…</Text>
                </View>
              )}
              {!!htmlIcerik && !faturaJsAcik && (
                <TextButton compact icon="help-circle-outline" onPress={handleGelismisGorunum}>
                  Fatura boş mu görünüyor?
                </TextButton>
              )}
            </View>
          ) : null}

          {htmlYukleniyor ? (
            <View style={styles.merkezi}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : htmlIcerik ? (
            <View style={styles.faturaCercevesi}>
              <FaturaWebView html={faturaJsAcik && htmlOzgun ? htmlOzgun : htmlIcerik} javaScriptAcik={faturaJsAcik} />
            </View>
          ) : (
            <EmptyState icon="file-alert-outline" title="İçerik yüklenemedi." />
          )}
        </AppScreen>
        <AlertHost yerel />
        </Portal.Host>
        </SafeAreaProvider>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  merkezi: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  listeIcerik: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.card },
  kart: { gap: spacing.sm },
  kartBaslik: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.xs },
  kartBaslikMetni: { flex: 1, minWidth: 0 },
  talepSatiri: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  detaylar: {
    gap: spacing.xxs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  aksiyonlar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingTop: spacing.xxs },
  karakterSayaci: { ...typography.caption, alignSelf: 'flex-end', marginTop: spacing.xxs },
  alanGrubu: { gap: spacing.xxs },
  alanNotu: { ...typography.caption, paddingHorizontal: spacing.xxs },
  telefonKutusu: {
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  telefonSpinner: { alignSelf: 'flex-start', marginTop: spacing.xxs },
  aracCubugu: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xs,
  },
  pdfDurumu: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  faturaCercevesi: {
    flex: 1,
    marginHorizontal: spacing.xs,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
