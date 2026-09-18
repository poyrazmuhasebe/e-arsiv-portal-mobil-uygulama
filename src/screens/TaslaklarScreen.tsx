import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { WebView } from 'react-native-webview';

import type { RootStackParamList } from '../../App';
import {
  faturaHTMLGetir,
  faturaSil,
  iptalTalebiOlustur,
  smsSifreGonder,
  smsSifreOnayla,
  taslakGetir,
  telefonnoSorgula,
} from '../services/gibApi';
import { useAuthStore } from '../store/useAuthStore';
import { pdfIndir, pdfPaylas } from '../utils/pdf';
import type { TaslakFatura } from '../types/gib';

type TaslakDurum = 'onaylandi' | 'onaylanmadi' | 'silinmis' | 'bilinmiyor';

// GİB'in canlı yanıtında doğrulanan kesin değerler: "Onaylandı" | "Onaylanmadı" | "Silinmiş".
function taslakDurumu(item: TaslakFatura, onaylananlar: Set<string>): TaslakDurum {
  if (onaylananlar.has(item.ettn)) return 'onaylandi';
  const ham = item.onayDurumu ?? item.durum;
  if (ham === 'Onaylandı') return 'onaylandi';
  if (ham === 'Silinmiş') return 'silinmis';
  if (ham === 'Onaylanmadı') return 'onaylanmadi';
  return 'bilinmiyor';
}

/**
 * Gerçek konsol yakalamasıyla DOĞRULANDI: bir belgede iptal/itiraz talebi
 * hiç yoksa `iptalItiraz`/`talepDurum` alanları taslak listesi yanıtında hiç
 * gelmiyor (ör. "Silinmiş" durumundaki kayıtlarda bu alanlar yok). Bir talep
 * varsa ikisi de geliyor — gözlemlenen tek somut örnek:
 * `{"iptalItiraz":"0","talepDurum":"1"}` → GİB'in kendi ekranında
 * "İptal/İtiraz Durumu: İptal Kabul Edildi" yazıyordu, ve bu istek gerçekten
 * bir İPTAL talebiydi (İtiraz değil).
 *
 * Buradan çıkarılan (ama başka durum kodlarıyla henüz teyit edilmeyen)
 * yorum: `iptalItiraz` talebin TÜRÜNÜ taşıyor ("0" = İptal, "1" = İtiraz —
 * ikincisi tahmindir), `talepDurum` ise `EARSIV_PORTAL_IPTAL_ITIRAZ_TALEP_DURUM_GUNCELLE`
 * isteğine gönderilen `talepCevabi` değerini yansıtıyor ("1" = Kabul Edildi,
 * canlı doğrulandı). "İptal Aşamasında" (henüz cevaplanmamış) durumunun ham
 * değeri henüz yakalanmadı — bu yüzden "1" dışındaki her değer için güvenli,
 * genel bir "Aşamasında" metni gösteriliyor.
 */
function iptalItirazDurumMetni(item: TaslakFatura): string | undefined {
  const talepDurum = asString(item.talepDurum);
  if (!talepDurum) return undefined;

  const tur = item.iptalItiraz === '1' ? 'İtiraz' : 'İptal'; // "0"=İptal doğrulandı, "1"=İtiraz tahmin

  if (talepDurum === '1') return `${tur} Kabul Edildi`;
  return `${tur}/İtiraz Aşamasında`;
}

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

function yediGunOncesi(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

// "5551234567" -> "(555) 123 45 67" — GİB'in kendi SMS Onay ekranındaki
// gösterim biçimiyle birebir aynı (gerçek yakalamayla doğrulandı).
function telefonMaskele(rakamlar: string): string {
  const m = rakamlar.match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/);
  return m ? `(${m[1]}) ${m[2]} ${m[3]} ${m[4]}` : rakamlar;
}

const SMS_SURESI_SN = 180;

export default function TaslaklarScreen({ navigation }: Props) {
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);

  const [taslaklar, setTaslaklar] = useState<TaslakFatura[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const [baslangicTarih, setBaslangicTarih] = useState<Date>(yediGunOncesi);
  const [bitisTarih, setBitisTarih] = useState<Date>(() => new Date());
  const [acikPicker, setAcikPicker] = useState<'baslangic' | 'bitis' | null>(null);

  // GİB'in gerçek onay durumunu tekrar sorgulamak yerine, SMS ile başarıyla
  // onaylanan belgeleri burada yerel olarak işaretliyoruz.
  const [onaylananlar, setOnaylananlar] = useState<Set<string>>(new Set());

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

  const veriYukle = useCallback(
    async (baslangic: Date, bitis: Date) => {
      if (!token) return;
      try {
        const sonuc = await taslakGetir(token, {
          baslangicTarihi: tarihFormatla(baslangic),
          bitisTarihi: tarihFormatla(bitis),
        });
        setTaslaklar(sonuc);
      } catch (err) {
        const message = err instanceof Error && err.message ? err.message : 'Faturalar yüklenemedi.';
        Alert.alert('Hata', message);
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

  const handleTarihSecildi = (_event: DateTimePickerChangeEvent, secilen: Date) => {
    const hedef = acikPicker;
    setAcikPicker(null); // Android'de picker modal olarak açılır, seçim sonrası kapanır
    if (hedef === 'baslangic') setBaslangicTarih(secilen);
    else if (hedef === 'bitis') setBitisTarih(secilen);
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
      await smsSifreOnayla(token, smsHedefi, smsKodu.trim(), smsOid);
      setOnaylananlar((prev) => new Set(prev).add(smsHedefi.ettn));
      handleSmsVazgec();
      await veriYukle(baslangicTarih, bitisTarih);
      Alert.alert('Onaylandı', 'SMS şifreniz doğrulandı, işlem başarılı.');
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

  // Düzenle/İtiraz: gerçek GİB komutları henüz doğrulanmadığından şimdilik
  // yalnızca konsola yazan yer tutucular. Sil ve İptal Talebi Oluştur ayrıca
  // ele alınıyor (bkz. handleSilBaslat/handleSilOnayla,
  // handleIptalBaslat/handleIptalOnayla) — ikisi de gerçek DevTools
  // yakalamasıyla doğrulandı.
  const handleAksiyon = (aksiyonAdi: string, item: TaslakFatura) => {
    console.log(`${aksiyonAdi} tıklandı:`, item.ettn);
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

  const handleGoruntule = async (item: TaslakFatura) => {
    if (!token) return;
    setHtmlModalGorunur(true);
    setHtmlYukleniyor(true);
    setHtmlIcerik(null);
    try {
      const html = await faturaHTMLGetir(token, item.ettn, item.onayDurumu);
      setHtmlIcerik(html);
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
      await pdfIndir(htmlIcerik);
      // Artık paylaşım penceresi açılmıyor (doğrudan indiriliyor), bu yüzden
      // başarı geri bildirimi yalnızca bu Alert.
      Alert.alert('İndirildi', 'Fatura PDF olarak cihazınıza kaydedildi.');
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
      await pdfIndir(html);
      Alert.alert('İndirildi', 'Fatura PDF olarak cihazınıza kaydedildi.');
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Fatura indirilemedi.';
      Alert.alert('Hata', message);
    } finally {
      setIndirilenEttn(null);
    }
  };

  const renderItem = ({ item }: { item: TaslakFatura }) => {
    const durum = taslakDurumu(item, onaylananlar);
    const buItemIcinTelefonYukleniyor = smsHedefi?.ettn === item.ettn && smsTelefonYukleniyor;
    // GİB İmza/Düzenle/Sil yalnızca "Onaylanmadı" (henüz taslak) durumunda
    // anlamlı — onaylanmış veya silinmiş bir belgede gösterilmiyor.
    const duzenlenebilir = durum === 'onaylanmadi';
    // İptal Talebi Oluştur ise tam tersi: yalnızca ONAYLANMIŞ (imzalanmış)
    // bir belge için anlamlı — taslak bir fatura iptal edilmez, silinir
    // (gerçek yakalamayla doğrulandı: istek "onayDurumu":"Onaylandı" taşıyor).
    const iptalUygun = durum === 'onaylandi';

    const baslik = asString(item.aliciUnvanAdSoyad) ?? asString(item.aliciUnvan) ?? 'Bilinmeyen Alıcı';
    const tarih = asString(item.belgeTarihi) ?? asString(item.faturaTarihi) ?? '-';
    const vknTckn = asString(item.aliciVknTckn);
    const belgeNo = asString(item.belgeNumarasi) ?? item.ettn;
    const belgeTuru = asString(item.belgeTuru);
    const itirazIptalMetni = iptalItirazDurumMetni(item);

    const durumGorseli =
      durum === 'onaylandi'
        ? { icon: 'check-circle', stil: styles.chipOnayli, etiket: 'Onaylı' }
        : durum === 'silinmis'
          ? { icon: 'close-circle', stil: styles.chipSilinmis, etiket: 'Silinmiş' }
          : durum === 'onaylanmadi'
            ? { icon: 'clock-outline', stil: styles.chipTaslak, etiket: 'Taslak' }
            : { icon: 'help-circle-outline', stil: styles.chipBilinmiyor, etiket: 'Bilinmiyor' };

    return (
      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text variant="titleMedium" style={styles.flexShrink} numberOfLines={2}>
              {baslik}
            </Text>
            <Chip compact icon={durumGorseli.icon} style={durumGorseli.stil}>
              {durumGorseli.etiket}
            </Chip>
          </View>

          <Text variant="bodySmall" style={styles.mutedText}>
            {tarih}
            {vknTckn ? ` · ${vknTckn}` : ''}
          </Text>

          <Text variant="bodySmall" style={styles.mutedText}>
            Belge No: {belgeNo}
            {belgeTuru ? ` · ${belgeTuru}` : ''}
          </Text>

          {item.genelToplam !== undefined && (
            <Text variant="titleMedium" style={styles.tutar}>
              {paraFormatla(item.genelToplam)} ₺
            </Text>
          )}

          {itirazIptalMetni && (
            <Text variant="bodySmall" style={styles.uyariMetni}>
              İtiraz/İptal Durumu: {itirazIptalMetni}
            </Text>
          )}
        </Card.Content>

        <Card.Actions>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.aksiyonlarScroll}
          >
            <Button compact mode="text" icon="eye-outline" onPress={() => handleGoruntule(item)}>
              Görüntüle
            </Button>
            {duzenlenebilir && (
              <Button compact mode="text" icon="pencil-outline" onPress={() => handleAksiyon('Düzenle', item)}>
                Düzenle
              </Button>
            )}
            {duzenlenebilir && (
              <Button compact mode="text" icon="delete-outline" onPress={() => handleSilBaslat(item)}>
                Sil
              </Button>
            )}
            {duzenlenebilir && (
              <Button
                compact
                mode="text"
                icon="message-text-outline"
                loading={buItemIcinTelefonYukleniyor}
                disabled={buItemIcinTelefonYukleniyor}
                onPress={() => handleGibImzaBaslat(item)}
              >
                GİB İmza
              </Button>
            )}
            <Button
              compact
              mode="text"
              icon="tray-arrow-down"
              loading={indirilenEttn === item.ettn}
              disabled={indirilenEttn === item.ettn}
              onPress={() => handleListedenIndir(item)}
            >
              İndir
            </Button>
            <Button
              compact
              mode="text"
              icon="alert-circle-outline"
              onPress={() => handleAksiyon('İtiraz Talebi Oluştur', item)}
            >
              İtiraz
            </Button>
            {iptalUygun && (
              <Button
                compact
                mode="text"
                icon="close-circle-outline"
                onPress={() => handleIptalBaslat(item)}
              >
                İptal
              </Button>
            )}
          </ScrollView>
        </Card.Actions>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Taslak / Kesilen Faturalar" />
      </Appbar.Header>

      <View style={styles.filtreBar}>
        <View style={styles.tarihRow}>
          <Pressable
            onPress={() => setAcikPicker('baslangic')}
            style={[styles.tarihButon, { borderColor: theme.colors.outline }]}
          >
            <Text variant="labelSmall" style={styles.mutedText}>
              Başlangıç
            </Text>
            <Text variant="bodyMedium">{tarihFormatla(baslangicTarih)}</Text>
          </Pressable>
          <Pressable
            onPress={() => setAcikPicker('bitis')}
            style={[styles.tarihButon, { borderColor: theme.colors.outline }]}
          >
            <Text variant="labelSmall" style={styles.mutedText}>
              Bitiş
            </Text>
            <Text variant="bodyMedium">{tarihFormatla(bitisTarih)}</Text>
          </Pressable>
        </View>
        <Button mode="contained" onPress={handleSorgula} loading={yukleniyor} disabled={yukleniyor}>
          Sorgula
        </Button>
      </View>

      {acikPicker && (
        <DateTimePicker
          value={acikPicker === 'baslangic' ? baslangicTarih : bitisTarih}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          onValueChange={handleTarihSecildi}
          onDismiss={() => setAcikPicker(null)}
        />
      )}

      {yukleniyor ? (
        <View style={styles.merkezi}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={taslaklar}
          keyExtractor={(item) => item.ettn}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={yenileniyor}
          onRefresh={handlePullYenile}
          ListEmptyComponent={
            <View style={styles.merkezi}>
              <Text variant="bodyMedium" style={styles.mutedText}>
                Seçili tarih aralığında fatura bulunmuyor.
              </Text>
            </View>
          }
        />
      )}

      <Portal>
        <Dialog visible={silHedefi !== null && !silAciklamaAcik} onDismiss={handleSilVazgec}>
          <Dialog.Title>Uyarı</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Bu belgeyi silmek üzeresiniz.
            </Text>
            <Checkbox.Item
              label="Uyarıyı okudum."
              status={silUyariOkundu ? 'checked' : 'unchecked'}
              onPress={() => setSilUyariOkundu((v) => !v)}
              style={styles.silCheckbox}
              labelStyle={styles.silCheckboxLabel}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleSilVazgec}>Vazgeç</Button>
            <Button onPress={handleSilUyariOnayla} disabled={!silUyariOkundu}>
              Sil
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={silAciklamaAcik} onDismiss={handleSilVazgec}>
          <Dialog.Title>Açıklama</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Silme gerekçenizi giriniz:
            </Text>
            <TextInput mode="outlined" value={silAciklama} onChangeText={setSilAciklama} autoFocus />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleSilVazgec} disabled={silSurecinde}>
              Vazgeç
            </Button>
            <Button
              onPress={handleSilOnayla}
              loading={silSurecinde}
              disabled={silSurecinde || silAciklama.trim().length === 0}
            >
              Sil
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={iptalHedefi !== null} onDismiss={handleIptalVazgec}>
          <Dialog.Title>İptal Talebi Oluştur</Dialog.Title>
          <Dialog.Content>
            <Text variant="labelSmall" style={styles.mutedText}>
              İptal Gerekçenizi Giriniz
            </Text>
            <TextInput
              mode="outlined"
              value={iptalGerekce}
              onChangeText={(v) => setIptalGerekce(v.slice(0, 255))}
              maxLength={255}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <Text variant="labelSmall" style={styles.karakterSayaci}>
              {iptalGerekce.length}/255
            </Text>
            <Text variant="labelSmall" style={[styles.mutedText, styles.dialogUyariBaslik]}>
              UYARI
            </Text>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Düzenlemiş olduğunuz belge için iptal talebi oluşturmak
              istiyorsunuz. İptal talebi oluşturduğunuzda bu talep geri
              çekilemeyecek ve alıcıya iletilecektir.
            </Text>
            <Checkbox.Item
              label="Uyarıyı Okudum"
              status={iptalUyariOkundu ? 'checked' : 'unchecked'}
              onPress={() => setIptalUyariOkundu((v) => !v)}
              style={styles.silCheckbox}
              labelStyle={styles.silCheckboxLabel}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleIptalVazgec} disabled={iptalSurecinde}>
              Vazgeç
            </Button>
            <Button
              onPress={handleIptalOnayla}
              loading={iptalSurecinde}
              disabled={iptalSurecinde || !iptalUyariOkundu || iptalGerekce.trim().length === 0}
            >
              İptal Talebi Oluştur
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={smsHedefi !== null && smsAsama === 1} onDismiss={handleSmsVazgec}>
          <Dialog.Title>SMS Onay — 1. Adım</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Bu belge imzalandığında geçerlilik kazanacak olup, imzalandıktan
              sonra düzeltilmesi mümkün değildir.
            </Text>
            <Checkbox.Item
              label="Uyarıyı Okudum"
              status={smsUyariOkundu ? 'checked' : 'unchecked'}
              onPress={() => setSmsUyariOkundu((v) => !v)}
              style={styles.silCheckbox}
              labelStyle={styles.silCheckboxLabel}
            />
            <Text variant="labelSmall" style={styles.mutedText}>
              Cep Telefonu
            </Text>
            {smsTelefonYukleniyor ? (
              <ActivityIndicator size="small" style={styles.telefonSpinner} />
            ) : (
              <Text variant="bodyMedium">{smsTelefon ? telefonMaskele(smsTelefon) : '-'}</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleSmsVazgec}>Vazgeç</Button>
            <Button
              onPress={handleSifreGonder}
              loading={smsGonderiliyor}
              disabled={!smsUyariOkundu || !smsTelefon || smsGonderiliyor}
            >
              Şifre Gönder
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={smsHedefi !== null && smsAsama === 2} onDismiss={handleSmsVazgec}>
          <Dialog.Title>SMS Onay — 2. Adım</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={styles.mutedText}>
              Kalan süre: {smsKalanSure} sn
            </Text>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Lütfen cep telefonunuza gelen SMS şifrenizi giriniz.
            </Text>
            <TextInput
              mode="outlined"
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
              <Text variant="bodySmall" style={styles.uyariMetni}>
                SMS şifresinin süresi doldu. Vazgeçip tekrar deneyin.
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleSmsVazgec} disabled={smsOnaylaniyor}>
              Vazgeç
            </Button>
            <Button
              onPress={handleSmsOnayla}
              loading={smsOnaylaniyor}
              disabled={smsOnaylaniyor || smsKodu.trim().length === 0 || smsKalanSure <= 0}
            >
              Onayla
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Modal
        visible={htmlModalGorunur}
        animationType="slide"
        onRequestClose={() => setHtmlModalGorunur(false)}
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
          <Appbar.Header elevated>
            <Appbar.Content title="Fatura Görüntüle" />
            <Appbar.Action
              icon="download"
              accessibilityLabel="PDF İndir"
              disabled={!htmlIcerik || pdfIsleniyor}
              onPress={handlePdfIndir}
            />
            <Appbar.Action
              icon="share-variant"
              accessibilityLabel="Paylaş"
              disabled={!htmlIcerik || pdfIsleniyor}
              onPress={handlePdfPaylas}
            />
          </Appbar.Header>

          <View style={styles.kapatBar}>
            <Button mode="contained-tonal" icon="close" onPress={() => setHtmlModalGorunur(false)}>
              Kapat
            </Button>
            {pdfIsleniyor && <ActivityIndicator size="small" style={styles.pdfSpinner} />}
          </View>

          {htmlYukleniyor ? (
            <View style={styles.merkezi}>
              <ActivityIndicator size="large" />
            </View>
          ) : htmlIcerik ? (
            <WebView originWhitelist={['*']} source={{ html: htmlIcerik }} style={styles.flex} />
          ) : (
            <View style={styles.merkezi}>
              <Text variant="bodyMedium" style={styles.mutedText}>
                İçerik yüklenemedi.
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  kapatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pdfSpinner: { marginLeft: 4 },
  filtreBar: { padding: 16, gap: 12 },
  tarihRow: { flexDirection: 'row', gap: 12 },
  tarihButon: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  merkezi: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  listContent: { padding: 16, paddingTop: 0, gap: 12 },
  card: { borderRadius: 16, marginBottom: 12 },
  cardContent: { gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  flexShrink: { flex: 1 },
  chipOnayli: { backgroundColor: '#1b4332' },
  chipTaslak: { backgroundColor: '#4a3b00' },
  chipSilinmis: { backgroundColor: '#5c1a1a' },
  chipBilinmiyor: { backgroundColor: '#3a3a3a' },
  mutedText: { opacity: 0.7 },
  uyariMetni: { color: '#f2b8b5' },
  tutar: { marginTop: 2 },
  aksiyonlarScroll: { gap: 4, paddingHorizontal: 8 },
  dialogText: { marginBottom: 12 },
  silCheckbox: { paddingHorizontal: 0 },
  silCheckboxLabel: { fontSize: 14 },
  telefonSpinner: { alignSelf: 'flex-start', marginTop: 4 },
  karakterSayaci: { alignSelf: 'flex-end', opacity: 0.6, marginTop: 2, marginBottom: 8 },
  dialogUyariBaslik: { fontWeight: '700', marginBottom: 4 },
});
