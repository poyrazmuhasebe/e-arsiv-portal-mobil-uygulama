/**
 * Uygulama hesabı oturumu (Zustand).
 *
 * `useAuthStore` GİB'e özel kalır ve buraya HİÇBİR alan taşınmaz: alıcı ve
 * mal/hizmet defterlerinin SecureStore anahtarları `useAuthStore.kullaniciKodu`
 * üzerinden üretiliyor (`hesapAnahtari.ts` → `bolunmusDefter.ts`); o alanın
 * anlamı değişirse cihazlarda duran defterler sahipsiz kalır.
 *
 * ÇEVRİMDIŞI DAVRANIŞ (karar 2026-09-20): ekran geçişi cihazdaki kayda bakar.
 * Yenileme token'ının YEREL bitiş tarihi geçmediyse Worker'a hiç sorulmadan
 * GİB ekranına geçilir. Böylece Cloudflare kesintisi, günlük limitin dolması
 * ya da telefonun çevrimdışı olması uygulamayı tamamen kilitlemez.
 * Artık risk: sunucuda iptal edilmiş bir oturum, erişim token'ının süresi
 * dolana kadar cihazda çalışmaya devam eder.
 */

import { create } from 'zustand';

import {
  hesabiSil as apiHesabiSil,
  cikisYap as apiCikisYap,
  epostaDogrula as apiEpostaDogrula,
  epostaKoduGonder as apiEpostaKoduGonder,
  girisYap as apiGirisYap,
  kayitOl as apiKayitOl,
  oturumYenile as apiOturumYenile,
  HesapApiHatasi,
  type HesapKullanicisi,
  type HesapOturumu,
  type HesapYaniti,
} from '../services/hesapApi';
import { hesabinKodlariniSil } from '../utils/hatirlananKodlar';
import { deleteSecureItem, getSecureItem, setSecureItem } from '../utils/secureStorage';

/** `hesap_` öneki bilinçli: bu anahtarlar GİB verisi DEĞİLDİR. */
const OTURUM_KEY = 'hesap_oturum';
const YENILEME_KEY = 'hesap_yenileme';

/** Erişim token'ı bu eşiğin altında kaldıysa yenilenir. */
const YENILEME_ESIGI_SN = 120;

/** SecureStore'a yazılan kayıt. 2 KB'ı geçmemeli (iOS sınırı). */
interface SaklananOturum {
  kullanici: HesapKullanicisi;
  erisimToken: string;
  erisimBitis: number;
  yenilemeBitis: number;
}

interface HesapState {
  kullanici: HesapKullanicisi | null;
  oturum: HesapOturumu | null;
  /** Açılıştaki geri yükleme bitti mi? App.tsx bunu bekler. */
  hazir: boolean;
  yukleniyor: boolean;
  /**
   * DEMO: kullanıcı Karşılama ekranında "Şimdilik atla"ya bastı ve hesapsız
   * GİB girişine geçti. YALNIZCA BELLEKTE tutulur, cihaza yazılmaz: uygulama
   * yeniden başlatılınca Karşılama ekranı tekrar gelir. Bu modda açılan GİB
   * oturumu hiçbir uygulama hesabına bağlanmaz, bu yüzden bir sonraki açılışta
   * geri yüklenmez (bkz. utils/gibSahibi.ts).
   */
  atlandi: boolean;

  /** DEMO: hesap oluşturmadan GİB girişine geç. */
  hesabiAtla: () => void;
  oturumuGeriYukle: () => Promise<void>;
  kayitOl: (eposta: string, kullaniciAdi: string, sifre: string) => Promise<HesapYaniti>;
  girisYap: (eposta: string, sifre: string) => Promise<void>;
  kodGonder: () => Promise<string | undefined>;
  epostaDogrula: (kod: string) => Promise<void>;
  /** Yalnızca uygulama hesabı oturumunu kapatır; GİB'e dokunmaz. */
  hesaptanCik: () => Promise<void>;
  /** Hesabı sunucudan KALICI olarak siler ve yerel oturumu temizler. */
  hesabiSil: (sifre: string) => Promise<void>;
  /** Gerekirse yenileyerek geçerli bir erişim token'ı döndürür. */
  gecerliErisimToken: () => Promise<string | null>;
}

function simdiSn(): number {
  return Math.floor(Date.now() / 1000);
}

function gelistirmeMi(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

async function oturumuSakla(
  kullanici: HesapKullanicisi,
  oturum: HesapOturumu,
): Promise<void> {
  const kayit: SaklananOturum = {
    kullanici,
    erisimToken: oturum.erisimToken,
    erisimBitis: oturum.erisimBitis,
    yenilemeBitis: oturum.yenilemeBitis,
  };
  // Yenileme token'ı AYRI anahtarda: en hassas değer tek başına dursun.
  await setSecureItem(OTURUM_KEY, JSON.stringify(kayit));
  await setSecureItem(YENILEME_KEY, oturum.yenilemeToken);
}

async function saklananiSil(): Promise<void> {
  await Promise.all([deleteSecureItem(OTURUM_KEY), deleteSecureItem(YENILEME_KEY)]);
}

function kayitCoz(ham: string | null): SaklananOturum | null {
  if (ham === null) return null;
  try {
    const cozulmus = JSON.parse(ham) as Partial<SaklananOturum>;
    const kullanici = cozulmus.kullanici;
    if (
      typeof kullanici?.id !== 'string' ||
      typeof kullanici.eposta !== 'string' ||
      typeof kullanici.kullaniciAdi !== 'string' ||
      typeof cozulmus.erisimToken !== 'string' ||
      typeof cozulmus.erisimBitis !== 'number' ||
      typeof cozulmus.yenilemeBitis !== 'number'
    ) {
      return null;
    }
    return {
      kullanici: {
        id: kullanici.id,
        eposta: kullanici.eposta,
        kullaniciAdi: kullanici.kullaniciAdi,
        epostaDogrulandi: kullanici.epostaDogrulandi === true,
      },
      erisimToken: cozulmus.erisimToken,
      erisimBitis: cozulmus.erisimBitis,
      yenilemeBitis: cozulmus.yenilemeBitis,
    };
  } catch {
    return null;
  }
}

export const useHesapStore = create<HesapState>((set, get) => ({
  kullanici: null,
  oturum: null,
  hazir: false,
  yukleniyor: false,
  atlandi: false,

  hesabiAtla: () => set({ atlandi: true }),

  oturumuGeriYukle: async () => {
    const [ham, yenilemeToken] = await Promise.all([
      getSecureItem(OTURUM_KEY),
      getSecureItem(YENILEME_KEY),
    ]);
    const kayit = kayitCoz(ham);

    if (kayit === null || yenilemeToken === null) {
      await saklananiSil();
      set({ kullanici: null, oturum: null, hazir: true });
      return;
    }

    // Yenileme token'ının YEREL süresi dolduysa oturum bitmiştir; sunucuya
    // sormaya gerek yok.
    if (kayit.yenilemeBitis <= simdiSn()) {
      await saklananiSil();
      set({ kullanici: null, oturum: null, hazir: true });
      return;
    }

    set({
      kullanici: kayit.kullanici,
      oturum: {
        erisimToken: kayit.erisimToken,
        erisimBitis: kayit.erisimBitis,
        yenilemeToken,
        yenilemeBitis: kayit.yenilemeBitis,
      },
      hazir: true,
    });
  },

  kayitOl: async (eposta, kullaniciAdi, sifre) => {
    set({ yukleniyor: true });
    try {
      const yanit = await apiKayitOl(eposta, kullaniciAdi, sifre, gelistirmeMi());
      await oturumuSakla(yanit.kullanici, yanit.oturum);
      set({ kullanici: yanit.kullanici, oturum: yanit.oturum, atlandi: false });
      return yanit;
    } finally {
      set({ yukleniyor: false });
    }
  },

  girisYap: async (eposta, sifre) => {
    set({ yukleniyor: true });
    try {
      const yanit = await apiGirisYap(eposta, sifre, gelistirmeMi());
      await oturumuSakla(yanit.kullanici, yanit.oturum);
      set({ kullanici: yanit.kullanici, oturum: yanit.oturum, atlandi: false });
    } finally {
      set({ yukleniyor: false });
    }
  },

  kodGonder: async () => {
    const token = await get().gecerliErisimToken();
    if (token === null) {
      throw new HesapApiHatasi('oturum_yok', 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.');
    }
    const yanit = await apiEpostaKoduGonder(token, gelistirmeMi());
    return yanit.gelistirmeKodu;
  },

  epostaDogrula: async (kod) => {
    const token = await get().gecerliErisimToken();
    if (token === null) {
      throw new HesapApiHatasi('oturum_yok', 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.');
    }
    await apiEpostaDogrula(token, kod, gelistirmeMi());

    const { kullanici, oturum } = get();
    if (kullanici === null || oturum === null) return;
    const yeniKullanici: HesapKullanicisi = { ...kullanici, epostaDogrulandi: true };
    await oturumuSakla(yeniKullanici, oturum);
    set({ kullanici: yeniKullanici });
  },

  hesaptanCik: async () => {
    const { oturum } = get();
    if (oturum !== null) {
      // Sunucuda da iptal etmeyi dene; başarısız olsa bile yerel temizlik
      // yapılır, kullanıcı uygulamada kilitli kalmasın.
      try {
        await apiCikisYap(oturum.yenilemeToken, gelistirmeMi());
      } catch {
        // yoksay
      }
    }
    await saklananiSil();
    set({ kullanici: null, oturum: null, atlandi: false });
  },

  hesabiSil: async (sifre) => {
    const token = await get().gecerliErisimToken();
    if (token === null) {
      throw new HesapApiHatasi('oturum_yok', 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.');
    }
    // Hata fırlatırsa (ör. şifre yanlış) yerel oturum KORUNUR.
    const hesapId = get().kullanici?.id;
    await apiHesabiSil(token, sifre, gelistirmeMi());
    await saklananiSil();
    // Silinen hesabın hatırlanan GİB kodları cihazda sahipsiz kalmasın.
    if (hesapId) await hesabinKodlariniSil(hesapId);
    set({ kullanici: null, oturum: null, atlandi: false });
  },

  gecerliErisimToken: async () => {
    const { oturum } = get();
    if (oturum === null) return null;

    if (oturum.erisimBitis - YENILEME_ESIGI_SN > simdiSn()) {
      return oturum.erisimToken;
    }

    try {
      const yanit = await apiOturumYenile(oturum.yenilemeToken, gelistirmeMi());
      await oturumuSakla(yanit.kullanici, yanit.oturum);
      set({ kullanici: yanit.kullanici, oturum: yanit.oturum });
      return yanit.oturum.erisimToken;
    } catch (hata) {
      // Sunucu oturumu geçersiz saydıysa (iptal, silinmiş hesap) yerelde de
      // kapat. Ağ hatasıysa oturumu KAPATMA — çevrimdışı çalışmaya devam.
      if (hata instanceof HesapApiHatasi && hata.durum === 401) {
        await saklananiSil();
        set({ kullanici: null, oturum: null });
        return null;
      }
      throw hata;
    }
  },
}));
