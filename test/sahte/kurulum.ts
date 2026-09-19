// Testlerde React Native / Expo'nun native modüllerini sahteleyen kurulum.
//
// `npm test` bu dosyayı `node --require` ile her test dosyasından ÖNCE yükler;
// testler de aşağıdaki sahte durum nesnelerini buradan içe aktarıp yönetir
// (aynı modül örneği olduğundan ikisi aynı durumu paylaşır).
//
// Node, `react-native` gibi paketleri çalıştıramaz (Flow sözdizimi, native
// köprü). Bu yüzden Module._load kancalanıp bu paketlerin yerine bellekte çalışan
// küçük sahteleri döndürülüyor. `axios` da sahtelendiği için testler HİÇBİR
// koşulda gerçek bir ağ isteği (GİB'e) atamaz: beklenmeyen bir istek hata
// fırlatır.

import Module from 'node:module';

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

// ---------------------------------------------------------------------------
// react-native (yalnızca Platform)
// ---------------------------------------------------------------------------

export const sahtePlatform: { OS: string } = { OS: 'android' };

// ---------------------------------------------------------------------------
// expo-secure-store — bellekte bir Map
// ---------------------------------------------------------------------------

export const sahteDepo = {
  veriler: new Map<string, string>(),
  /** Doluysa setItemAsync bu hatayı fırlatır (ör. boyut sınırı benzetimi). */
  yazmaHatasi: null as Error | null,
  /** Doluysa getItemAsync bu hatayı fırlatır (ör. Keystore çözme hatası). */
  okumaHatasi: null as Error | null,
  /** Sayıysa, o kadar okuma başarılı olur, sonrakiler hata fırlatır (null: sınırsız). */
  okumaHakki: null as number | null,
  /**
   * Uygulamanın yarıda kapanması benzetimi: sayıysa, o kadar yazma/silme
   * başarılı olur, sonrakilerin HEPSİ hata fırlatır (null: sınırsız).
   */
  islemHakki: null as number | null,
  /** Gerçekleşen işlem sayıları (performans/maliyet ölçümü için). */
  sayac: { okuma: 0, yazma: 0, silme: 0 },
};

function islemHakkiKullan(): void {
  if (sahteDepo.islemHakki === null) return;
  if (sahteDepo.islemHakki <= 0) throw new Error('kesinti (uygulama kapandı)');
  sahteDepo.islemHakki--;
}

const secureStoreSahtesi = {
  async getItemAsync(anahtar: string): Promise<string | null> {
    if (sahteDepo.okumaHatasi) throw sahteDepo.okumaHatasi;
    if (sahteDepo.okumaHakki !== null) {
      if (sahteDepo.okumaHakki <= 0) throw new Error('okunamadı');
      sahteDepo.okumaHakki--;
    }
    sahteDepo.sayac.okuma++;
    return sahteDepo.veriler.get(anahtar) ?? null;
  },
  async setItemAsync(anahtar: string, deger: string): Promise<void> {
    if (sahteDepo.yazmaHatasi) throw sahteDepo.yazmaHatasi;
    islemHakkiKullan();
    sahteDepo.sayac.yazma++;
    sahteDepo.veriler.set(anahtar, deger);
  },
  async deleteItemAsync(anahtar: string): Promise<void> {
    islemHakkiKullan();
    sahteDepo.sayac.silme++;
    sahteDepo.veriler.delete(anahtar);
  },
};

// ---------------------------------------------------------------------------
// axios — istek kaydeden, yanıtı testin belirlediği sahte istemci
// ---------------------------------------------------------------------------

export interface SahteYanit {
  status: number;
  data: unknown;
}

export interface KaydedilenIstek {
  url: string;
  govde: string;
}

type IstekIsleyici = (istek: KaydedilenIstek) => SahteYanit | Promise<SahteYanit>;

function beklenmeyenIstek(istek: KaydedilenIstek): never {
  throw new Error(`Testte beklenmeyen ağ isteği: ${istek.url || '(dispatch)'}`);
}

export const sahteAxios = {
  istekler: [] as KaydedilenIstek[],
  isleyici: beklenmeyenIstek as IstekIsleyici,
};

/** Axios'un ağ hatasını taklit eder (yanıt yok). `kod` verilirse ör. 'ECONNABORTED'. */
export function sahteAgHatasi(kod?: string): Error {
  return Object.assign(new Error('Network Error'), { isAxiosError: true, code: kod });
}

const axiosIstemcisi = {
  async post(url: string, govde: string): Promise<SahteYanit> {
    const istek = { url, govde };
    sahteAxios.istekler.push(istek);
    return sahteAxios.isleyici(istek);
  },
};

const axiosSahtesi = {
  __esModule: true,
  default: { create: () => axiosIstemcisi },
  create: () => axiosIstemcisi,
};

// ---------------------------------------------------------------------------
// expo-file-system/legacy — sanal belge dizini
// ---------------------------------------------------------------------------

export const sahteDosyaSistemi = {
  documentDirectory: 'file:///belgeler/' as string | null,
  dosyalar: new Set<string>(),
  okumaHatasi: false,
};

const dosyaSistemiSahtesi = {
  get documentDirectory() {
    return sahteDosyaSistemi.documentDirectory;
  },
  async readDirectoryAsync(_dizin: string): Promise<string[]> {
    if (sahteDosyaSistemi.okumaHatasi) throw new Error('okunamadı');
    return [...sahteDosyaSistemi.dosyalar];
  },
  async deleteAsync(yol: string): Promise<void> {
    const ad = yol.slice((sahteDosyaSistemi.documentDirectory ?? '').length);
    sahteDosyaSistemi.dosyalar.delete(ad);
  },
};

// ---------------------------------------------------------------------------
// expo-local-authentication
// ---------------------------------------------------------------------------

const SecurityLevel = { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 };

export const sahteYerelKimlik = {
  seviye: SecurityLevel.SECRET as number,
  seviyeHatasi: false,
  sonuc: { success: true } as { success: true } | { success: false; error: string },
};

const yerelKimlikSahtesi = {
  SecurityLevel,
  async getEnrolledLevelAsync(): Promise<number> {
    if (sahteYerelKimlik.seviyeHatasi) throw new Error('desteklenmiyor');
    return sahteYerelKimlik.seviye;
  },
  async authenticateAsync() {
    return sahteYerelKimlik.sonuc;
  },
};

// ---------------------------------------------------------------------------
// globalThis.fetch
// ---------------------------------------------------------------------------
//
// Node 24'te fetch YERLEŞİK olarak var. Sahte axios yalnızca `axios` modülünü
// kapsıyordu, dolayısıyla fetch kullanan her kod testte GERÇEKTEN ağa
// çıkabilirdi. Uygulama hesabı istemcisi (hesapApi.ts) Worker'a fetch ile
// gidecek; bu sahte olmadan testler Cloudflare'e gerçek istek atardı.
//
// Varsayılan davranış: her istek hata fırlatır. Bir test ağ bekliyorsa
// `sahteFetch.isleyici`'yi kendisi ayarlar.

export interface KaydedilenFetch {
  url: string;
  yontem: string;
  basliklar: Record<string, string>;
  govde: string | null;
}

type FetchIsleyici = (istek: KaydedilenFetch) => Response | Promise<Response>;

function beklenmeyenFetch(istek: KaydedilenFetch): never {
  throw new Error(`Testte beklenmeyen ağ isteği (fetch): ${istek.yontem} ${istek.url}`);
}

export const sahteFetch = {
  istekler: [] as KaydedilenFetch[],
  isleyici: beklenmeyenFetch as FetchIsleyici,
};

/** Test kolaylığı: JSON gövdeli bir yanıt üretir. */
export function sahteJsonYanit(veri: unknown, durum = 200): Response {
  return new Response(JSON.stringify(veri), {
    status: durum,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

globalThis.fetch = async function sahteGlobalFetch(
  girdi: RequestInfo | URL,
  secenekler?: RequestInit,
): Promise<Response> {
  const url =
    typeof girdi === 'string'
      ? girdi
      : girdi instanceof URL
        ? girdi.toString()
        : girdi.url;

  const basliklar: Record<string, string> = {};
  new Headers(secenekler?.headers ?? (girdi instanceof Request ? girdi.headers : undefined)).forEach(
    (deger, ad) => {
      basliklar[ad] = deger;
    },
  );

  const istek: KaydedilenFetch = {
    url,
    yontem: (secenekler?.method ?? (girdi instanceof Request ? girdi.method : 'GET')).toUpperCase(),
    basliklar,
    govde: typeof secenekler?.body === 'string' ? secenekler.body : null,
  };
  sahteFetch.istekler.push(istek);
  return sahteFetch.isleyici(istek);
} as typeof fetch;

// ---------------------------------------------------------------------------
// Ortak sıfırlama ve Module._load kancası
// ---------------------------------------------------------------------------

/** Her testten önce çağrılır: tüm sahte durumları varsayılana döndürür. */
export function sahteleriSifirla(): void {
  sahteFetch.istekler = [];
  sahteFetch.isleyici = beklenmeyenFetch;
  sahtePlatform.OS = 'android';
  sahteDepo.veriler.clear();
  sahteDepo.yazmaHatasi = null;
  sahteDepo.okumaHatasi = null;
  sahteDepo.okumaHakki = null;
  sahteDepo.islemHakki = null;
  sahteDepo.sayac = { okuma: 0, yazma: 0, silme: 0 };
  sahteAxios.istekler = [];
  sahteAxios.isleyici = beklenmeyenIstek;
  sahteDosyaSistemi.documentDirectory = 'file:///belgeler/';
  sahteDosyaSistemi.dosyalar.clear();
  sahteDosyaSistemi.okumaHatasi = false;
  sahteYerelKimlik.seviye = SecurityLevel.SECRET;
  sahteYerelKimlik.seviyeHatasi = false;
  sahteYerelKimlik.sonuc = { success: true };
}

const SAHTE_MODULLER: Record<string, unknown> = {
  'react-native': { Platform: sahtePlatform },
  'expo-secure-store': secureStoreSahtesi,
  axios: axiosSahtesi,
  'expo-file-system/legacy': dosyaSistemiSahtesi,
  'expo-local-authentication': yerelKimlikSahtesi,
};

type YukleyiciFn = (istek: string, ebeveyn: unknown, anaModulMu: boolean) => unknown;
const DahiliModule = Module as unknown as { _load: YukleyiciFn; __earsivSahte?: boolean };

if (!DahiliModule.__earsivSahte) {
  DahiliModule.__earsivSahte = true;
  const asilYukleyici = DahiliModule._load;
  DahiliModule._load = function (istek, ebeveyn, anaModulMu) {
    if (Object.prototype.hasOwnProperty.call(SAHTE_MODULLER, istek)) return SAHTE_MODULLER[istek];
    return asilYukleyici.call(this, istek, ebeveyn, anaModulMu);
  };
}
