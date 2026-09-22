/**
 * Fatura yedeklerinin telefondaki yeri.
 *
 * ANDROID: Kullanıcı bir klasör seçer (sistem klasör seçicisi, SAF).
 * `Directory.pickDirectoryAsync` seçilen klasör için KALICI izin alıyor
 * (expo-file-system 57, FilePickerContract → takePersistableUriPermission);
 * klasörün adresi SecureStore'da saklanır ve uygulama yeniden açıldığında da
 * kullanılır. Yedekler bu klasöre, telefonun kendi dosya yöneticisinden de
 * görülebilecek şekilde yazılır; uygulama silinse bile kalır.
 *
 * iOS: Uygulamalar klasör seçip oraya kalıcı yazamıyor. Yedekler uygulamanın
 * kendi "Belgeler" klasörüne yazılır. Bağımsız (EAS) derlemede bu klasör
 * "Dosyalar > Bu iPhone'da > e-Arşiv Portal" altında görünür (app.json
 * UIFileSharingEnabled); Expo Go'da Dosyalar'da görünmez, yalnızca uygulama
 * içinden açılabilir. iOS'ta uygulama silinirse yedekler de silinir.
 *
 * Klasör yapısı: <seçilen klasör>/<VKN - Unvan>/<YYYY-AA-GG_BelgeNo>.pdf
 */

import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

import { kullaniciBilgileriDetayGetir } from './gibApi';
import type { KullaniciBilgisi } from '../types/gib';
import { PAYLASIM_KLASORU } from '../utils/dosyaTemizlik';
import { deleteSecureItem, getSecureItem, setSecureItem } from '../utils/secureStorage';
import {
  detaydakiMukellef,
  mukellefKlasorAdi,
  mukellefKlasoruMu,
  oturumdakiMukellef,
  YEDEK_DIZIN_ADI,
  yedekBilgisi,
  yedekDiziniCoz,
  yedekDiziniYazilacak,
  type Mukellef,
  type YedekBilgisi,
  type YedekDizini,
  type YedekOrtami,
} from '../utils/yedekleme';

const KLASOR_ANAHTARI = 'yedek_klasor_uri';
const IOS_KLASOR_ADI = 'Fatura Yedekleri';

/** Klasör seçimi yalnızca Android'de var (bkz. dosya başı). */
export const KLASOR_SECILEBILIR = Platform.OS === 'android';

function klasorVarMi(d: Directory): boolean {
  try {
    return d.exists;
  } catch {
    return false;
  }
}

/**
 * Kayıtlı bir klasör (anahtarı SecureStore'da); Android'de seçilmemişse ya da
 * erişilemiyorsa null. iOS'ta uygulamanın Belgeler klasöründeki `iosAd`.
 */
async function kayitliKlasor(anahtar: string, iosAd: string): Promise<Directory | null> {
  if (!KLASOR_SECILEBILIR) {
    const d = new Directory(Paths.document, iosAd);
    if (!klasorVarMi(d)) d.create({ intermediates: true, idempotent: true });
    return d;
  }
  const uri = await getSecureItem(anahtar);
  if (!uri) return null;
  const d = new Directory(uri);
  // Klasör silindiyse ya da izin geri alındıysa kayıt temizlenir; kullanıcı
  // yeniden seçer.
  if (!klasorVarMi(d)) {
    await deleteSecureItem(anahtar);
    return null;
  }
  return d;
}

/** Android: sistem klasör seçicisini açar ve seçimi hatırlar. Vazgeçilirse null. */
async function klasorSec(anahtar: string, iosAd: string): Promise<Directory | null> {
  if (!KLASOR_SECILEBILIR) return kayitliKlasor(anahtar, iosAd);
  let secilen: Directory;
  try {
    secilen = await Directory.pickDirectoryAsync();
  } catch {
    return null; // vazgeçildi
  }
  await setSecureItem(anahtar, secilen.uri);
  return secilen;
}

/** Kayıtlı yedek klasörü; Android'de seçilmemişse ya da erişilemiyorsa null. */
export function yedekKlasoru(): Promise<Directory | null> {
  return kayitliKlasor(KLASOR_ANAHTARI, IOS_KLASOR_ADI);
}

/** Android: sistem klasör seçicisini açar. Vazgeçilirse null. */
export function yedekKlasoruSec(): Promise<Directory | null> {
  return klasorSec(KLASOR_ANAHTARI, IOS_KLASOR_ADI);
}

// "e-Arşiv Faturalarım" (Dijital VD) PDF'leri: yedeklerden AYRI bir klasör.
const RAPOR_KLASOR_ANAHTARI = 'dvd_rapor_klasor_uri';
export const IOS_RAPOR_KLASOR_ADI = 'e-Arşiv Faturalarım PDF';

/** e-Arşiv Faturalarım PDF klasörü; Android'de seçilmemişse null. */
export function raporKlasoru(): Promise<Directory | null> {
  return kayitliKlasor(RAPOR_KLASOR_ANAHTARI, IOS_RAPOR_KLASOR_ADI);
}

export function raporKlasoruSec(): Promise<Directory | null> {
  return klasorSec(RAPOR_KLASOR_ANAHTARI, IOS_RAPOR_KLASOR_ADI);
}

/** PDF'i (Base64) klasöre yeni bir dosya olarak yazar. */
export function pdfDosyasiYaz(klasor: Directory, ad: string, base64: string): File {
  const dosya = klasor.createFile(ad, 'application/pdf');
  try {
    dosya.write(base64, { encoding: 'base64' });
  } catch (err) {
    // Yarım/boş dosya "Kaydedilen PDF'ler"de görünmesin.
    try {
      dosya.delete();
    } catch {
      // yoksay
    }
    throw err;
  }
  return dosya;
}

export interface KayitliPdf {
  dosya: File;
  ad: string;
  boyut: number | null;
}

/** Klasördeki, adı `onEk` ile başlayan PDF'ler (ada göre yeniden eskiye). */
export function pdfleriListele(klasor: Directory, onEk: string): KayitliPdf[] {
  const sonuc: KayitliPdf[] = [];
  for (const oge of klasor.list()) {
    if (!(oge instanceof File)) continue;
    if (!oge.name.startsWith(onEk) || !oge.name.toLowerCase().endsWith('.pdf')) continue;
    let boyut: number | null = null;
    try {
      boyut = oge.size;
    } catch {
      boyut = null;
    }
    sonuc.push({ dosya: oge, ad: oge.name, boyut });
  }
  return sonuc.sort((a, b) => b.ad.localeCompare(a.ad));
}

/** Dosyayı siler; silinemezse false. */
export function dosyaSil(dosya: File): boolean {
  try {
    dosya.delete();
    return !dosya.exists;
  } catch {
    return false;
  }
}

/**
 * Kullanıcıya gösterilecek klasör adı. SAF adresi okunaksız
 * ("content://…/tree/primary%3ADownload%2FYedek"); "Download/Yedek"e çevrilir.
 */
export function klasorGorunenAdi(d: Directory, iosAd: string = IOS_KLASOR_ADI): string {
  if (!KLASOR_SECILEBILIR) return `Uygulama klasörü / ${iosAd}`;
  const agac = /\/tree\/([^/]+)/.exec(d.uri);
  if (agac) {
    try {
      const yol = decodeURIComponent(agac[1]);
      const ikiNokta = yol.indexOf(':');
      const goreli = ikiNokta >= 0 ? yol.slice(ikiNokta + 1) : yol;
      return goreli || 'Dahili depolama';
    } catch {
      // aşağıya düş
    }
  }
  return d.name || d.uri;
}

/**
 * Açık GİB oturumunun mükellefi (VKN/TCKN + unvan) — yedek klasörünün adı.
 *
 * Bir kullanıcı birden fazla GİB kullanıcı koduyla çalışabildiği için her
 * mükellefin yedeği KENDİ klasörüne gitmeli. Klasör GİB kullanıcı koduyla
 * DEĞİL, VKN/TCKN ile adlandırılır: kullanıcı kodu mükellefi tanımlamaz ve
 * VKN'nin gelmediği bir girişte koda düşmek aynı mükellef için ikinci bir
 * klasör açardı. VKN, alanı CANLI DOĞRULANMIŞ "Kullanıcı Bilgileri"
 * (RG_KULLANICI) yanıtından okunur; oturumdaki kullaniciBilgisi yalnızca
 * geçerli bir VKN içeriyorsa (ek istek atmamak için) kullanılır.
 *
 * VKN bulunamazsa null — yedekleme başlatılmaz, yanlış klasöre yazılmaz.
 */
export async function aktifMukellef(token: string, bilgi: KullaniciBilgisi | null): Promise<Mukellef | null> {
  const oturumdan = oturumdakiMukellef(bilgi);
  if (oturumdan) return oturumdan;
  return detaydakiMukellef(await kullaniciBilgileriDetayGetir(token), bilgi?.unvan);
}

/**
 * Mükellefin alt klasörü. `olustur` true ise yoksa oluşturulur. SAF'ta
 * `createDirectory` aynı adda klasör varken "Ad (1)" açtığı için önce
 * mevcutlar listelenir.
 */
export function mukellefKlasoru(kok: Directory, vkn: string, unvan: string | undefined, olustur: boolean): Directory | null {
  for (const oge of kok.list()) {
    if (oge instanceof Directory && mukellefKlasoruMu(oge.name, vkn)) return oge;
  }
  return olustur ? kok.createDirectory(mukellefKlasorAdi(vkn, unvan)) : null;
}

/** Yedekleme döngüsünün dosya tarafı (bkz. utils/yedekleme.ts → YedekOrtami). */
export function dosyaOrtami(
  klasor: Directory,
): Pick<YedekOrtami, 'varMi' | 'yaz' | 'bilgiKaydet'> & { bilgileriKaydet: () => void } {
  const mevcut = new Set<string>();
  for (const oge of klasor.list()) {
    if (oge instanceof File) mevcut.add(oge.name);
  }
  const dizin = bilgiDosyasiniOku(klasor);
  let bekleyen = 0;
  const bilgileriKaydet = () => {
    if (bekleyen === 0) return;
    bilgiDosyasiniYaz(klasor, dizin);
    bekleyen = 0;
  };
  return {
    varMi: (ad) => mevcut.has(ad),
    yaz: (ad, base64) => {
      const dosya = klasor.createFile(ad, 'application/pdf');
      dosya.write(base64, { encoding: 'base64' });
      mevcut.add(ad);
    },
    bilgiKaydet: (ad, item) => {
      const yeni = yedekBilgisi(item);
      if (JSON.stringify(dizin[ad]) === JSON.stringify(yeni)) return;
      dizin[ad] = yeni;
      bekleyen++;
      // Yedekleme yarıda kesilirse bilgi kaybolmasın diye arada bir yazılır.
      if (bekleyen >= BILGI_YAZMA_ARALIGI) bilgileriKaydet();
    },
    /** Yedekleme bitince/durunca/hata verince çağrılır. */
    bilgileriKaydet,
  };
}

const BILGI_YAZMA_ARALIGI = 10;

function klasordekiDosya(klasor: Directory, ad: string): File | null {
  for (const oge of klasor.list()) {
    if (oge instanceof File && oge.name === ad) return oge;
  }
  return null;
}

/** Mükellef klasöründeki yedek bilgi dosyası (yoksa/bozuksa boş). */
export function bilgiDosyasiniOku(klasor: Directory): YedekDizini {
  try {
    return yedekDiziniCoz(klasordekiDosya(klasor, YEDEK_DIZIN_ADI)?.textSync());
  } catch {
    return {};
  }
}

/**
 * Bilgi dosyasını yazar. SAF'ta üzerine yazma ("w" kipi) bazı Android
 * sürümlerinde eski içeriği KESMİYOR; küçülen bir JSON bozulurdu. Bu yüzden
 * dosya silinip yeniden oluşturulur. Bilgi dosyası yalnızca görüntüleme
 * kolaylığıdır; yazılamazsa PDF yedekleri etkilenmez.
 */
export function bilgiDosyasiniYaz(klasor: Directory, dizin: YedekDizini): void {
  try {
    klasordekiDosya(klasor, YEDEK_DIZIN_ADI)?.delete();
    if (Object.keys(dizin).length === 0) return;
    klasor.createFile(YEDEK_DIZIN_ADI, 'application/json').write(yedekDiziniYazilacak(dizin));
  } catch {
    // yoksay
  }
}

// ---------------------------------------------------------------------------
// Görüntüleme
// ---------------------------------------------------------------------------

export interface YedekDosyasi {
  dosya: File;
  ad: string;
  boyut: number | null;
  /** Bilgi dosyasındaki kayıt (alıcı unvanı, VKN/TCKN…); eski yedeklerde olmayabilir. */
  bilgi?: YedekBilgisi;
}

export interface MukellefYedegi {
  klasor: Directory;
  ad: string;
  dosyalar: YedekDosyasi[];
}

/** Yedek klasöründeki mükellef klasörleri ve PDF'leri (en yeni fatura üstte). */
export function yedekleriListele(kok: Directory): MukellefYedegi[] {
  const sonuc: MukellefYedegi[] = [];
  for (const oge of kok.list()) {
    if (!(oge instanceof Directory)) continue;
    const dosyalar: YedekDosyasi[] = [];
    const dizin = bilgiDosyasiniOku(oge);
    for (const alt of oge.list()) {
      if (!(alt instanceof File) || !alt.name.toLowerCase().endsWith('.pdf')) continue;
      let boyut: number | null = null;
      try {
        boyut = alt.size;
      } catch {
        boyut = null;
      }
      dosyalar.push({ dosya: alt, ad: alt.name, boyut, bilgi: dizin[alt.name] });
    }
    if (dosyalar.length === 0) continue;
    dosyalar.sort((a, b) => b.ad.localeCompare(a.ad));
    sonuc.push({ klasor: oge, ad: oge.name, dosyalar });
  }
  sonuc.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  return sonuc;
}

/**
 * Yedekleri siler (telefondan kalıcı olarak). Her dosya ayrı denenir;
 * silinemeyenlerin adları döner. Silinenler bilgi dosyasından da çıkarılır.
 * GİB'deki faturaya dokunulmaz — yalnızca telefondaki PDF kopyası silinir.
 */
export function yedekleriSil(silinecekler: { klasor: Directory; dosya: YedekDosyasi }[]): string[] {
  const basarisiz: string[] = [];
  const klasorler = new Map<string, { klasor: Directory; silinen: string[] }>();
  for (const { klasor, dosya } of silinecekler) {
    try {
      dosya.dosya.delete();
      if (dosya.dosya.exists) throw new Error('silinemedi');
      const k = klasorler.get(klasor.uri) ?? { klasor, silinen: [] };
      k.silinen.push(dosya.ad);
      klasorler.set(klasor.uri, k);
    } catch {
      basarisiz.push(dosya.ad);
    }
  }
  for (const { klasor, silinen } of klasorler.values()) {
    const dizin = bilgiDosyasiniOku(klasor);
    let degisti = false;
    for (const ad of silinen) {
      if (ad in dizin) {
        delete dizin[ad];
        degisti = true;
      }
    }
    if (degisti) bilgiDosyasiniYaz(klasor, dizin);
  }
  return basarisiz;
}

// Android Intent.FLAG_GRANT_READ_URI_PERMISSION
const OKUMA_IZNI = 1;

/**
 * PDF'i telefonun PDF görüntüleyicisiyle açar. Android'de SAF dosyası
 * zaten bir content:// adresi; okuma izniyle doğrudan görüntüleyiciye
 * verilir. iOS'ta sistemin önizleme/paylaşım sayfası açılır.
 */
export async function yedegiAc(dosya: File): Promise<void> {
  if (Platform.OS === 'android') {
    const uri = dosya.uri.startsWith('content://') ? dosya.uri : dosya.contentUri;
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: uri,
        flags: OKUMA_IZNI,
        type: 'application/pdf',
      });
      return;
    } catch {
      // PDF görüntüleyici yoksa paylaşım sayfasına düş.
    }
  }
  await yedegiPaylas(dosya);
}

/**
 * Paylaş / başka yere kaydet. expo-sharing Android'de yalnızca uygulamanın
 * kendi dosyalarını paylaşabildiği için SAF dosyası önce önbelleğe
 * kopyalanır (içerik Base64 olarak okunup yazılır; önbellek sistemce
 * temizlenir).
 */
export async function yedegiPaylas(dosya: File): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Bu cihazda paylaşım desteklenmiyor.');
  }
  let paylasilacak = dosya;
  if (Platform.OS === 'android' && dosya.uri.startsWith('content://')) {
    // Her paylaşımda klasör boşaltılır: önceki kopyalar birikmez. GİB
    // oturumu kapanınca da silinir (useAuthStore.logout).
    const klasor = new Directory(Paths.cache, PAYLASIM_KLASORU);
    if (klasor.exists) klasor.delete();
    klasor.create({ intermediates: true, idempotent: true });
    const kopya = new File(klasor, dosya.name);
    kopya.create();
    kopya.write(await dosya.base64(), { encoding: 'base64' });
    paylasilacak = kopya;
  }
  await Sharing.shareAsync(paylasilacak.uri, {
    mimeType: 'application/pdf',
    dialogTitle: dosya.name,
    UTI: 'com.adobe.pdf',
  });
}
