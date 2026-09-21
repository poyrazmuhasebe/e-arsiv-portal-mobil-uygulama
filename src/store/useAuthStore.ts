import { create } from 'zustand';
import { login as gibLogin, logout as gibLogout, getKullaniciBilgileri } from '../services/gibApi';
import { deleteSecureItem, getSecureItem, setSecureItem } from '../utils/secureStorage';
import { eskiFaturaPdfleriniSil, paylasimKopyalariniSil } from '../utils/dosyaTemizlik';
import {
  gibOturumuGeriYuklenebilirMi,
  gibSahibiniKaydet,
  gibSahibiniOku,
  gibSahibiniSil,
} from '../utils/gibSahibi';
import type { KullaniciBilgisi } from '../types/gib';

const TOKEN_KEY = 'gib_token';
const KULLANICI_KODU_KEY = 'gib_kullanici_kodu';

interface AuthState {
  token: string | null;
  kullaniciKodu: string | null;
  kullaniciBilgisi: KullaniciBilgisi | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  error: string | null;

  /**
   * `sahipHesapId`: GİB oturumunu açan uygulama hesabının kimliği. Oturumla
   * birlikte cihaza yazılır ki sonraki açılışta BAŞKA bir hesaba geri
   * yüklenmesin (bkz. utils/gibSahibi.ts).
   */
  login: (
    kullaniciKodu: string,
    kullaniciSifresi: string,
    sahipHesapId: string,
    remember?: boolean,
  ) => Promise<void>;
  /**
   * `aktifHesapId` null ise ya da cihazdaki GİB oturumunun sahibiyle
   * eşleşmiyorsa oturum GERİ YÜKLENMEZ: GİB'de kapatılmaya çalışılır ve
   * cihazdaki anahtarlar silinir.
   */
  restoreSession: (aktifHesapId: string | null) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  kullaniciKodu: null,
  kullaniciBilgisi: null,
  isLoading: false,
  isLoggingOut: false,
  error: null,

  login: async (kullaniciKodu, kullaniciSifresi, sahipHesapId, remember = true) => {
    set({ isLoading: true, error: null });
    try {
      const token = await gibLogin(kullaniciKodu, kullaniciSifresi);
      const kullaniciBilgisi = await getKullaniciBilgileri(token).catch(() => null);

      if (remember) {
        // NOT: Şifreyi hiçbir zaman saklamıyoruz, yalnızca oturum token'ını
        // ve kullanıcı kodunu (giriş formunu önceden doldurmak için) saklıyoruz.
        await setSecureItem(TOKEN_KEY, token);
        await setSecureItem(KULLANICI_KODU_KEY, kullaniciKodu);
        // Oturumun SAHİBİ. Bu bilgi GİB'e değil, yalnızca cihaza yazılır.
        await gibSahibiniKaydet(sahipHesapId);
      }

      set({ token, kullaniciKodu, kullaniciBilgisi, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Giriş yapılamadı.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  restoreSession: async (aktifHesapId) => {
    const [token, kullaniciKodu, sahip] = await Promise.all([
      getSecureItem(TOKEN_KEY),
      getSecureItem(KULLANICI_KODU_KEY),
      gibSahibiniOku(),
    ]);
    if (!token) return;

    if (!gibOturumuGeriYuklenebilirMi(sahip, aktifHesapId)) {
      // Sahipsiz (güncellemeden önce açılmış) ya da başka bir uygulama
      // hesabına ait bir GİB oturumu. Geri YÜKLENMEZ: GİB'de kapatılmaya
      // çalışılır ve cihazdaki anahtarlar silinir.
      //
      // Hatırlanan GİB kodları ve defterler SİLİNMEZ — form yine
      // dolu gelir, defterler yerinde kalır.
      try {
        await gibLogout(token);
      } catch {
        // Ağ yoksa ya da token zaten geçersizse yoksay; yerel temizlik yeter.
      }
      await Promise.all([
        deleteSecureItem(TOKEN_KEY),
        deleteSecureItem(KULLANICI_KODU_KEY),
        gibSahibiniSil(),
      ]);
      return;
    }

    set({ token, kullaniciKodu });
    // Uygulama soğuk başladığında da Header'da mükellef unvanının
    // görünmesi için; başarısız olursa sessizce login sonrası tekrar
    // denenir (kullaniciBilgisi null kalır, Header kullaniciKodu'na düşer).
    const kullaniciBilgisi = await getKullaniciBilgileri(token).catch(() => null);
    set({ kullaniciBilgisi });
  },

  logout: async () => {
    const { token } = get();
    set({ isLoggingOut: true });

    if (token) {
      // GİB tarafındaki oturumu da sonlandırmayı deniyoruz; bu istek
      // başarısız olsa bile (ağ hatası, süresi dolmuş token vb.) yerel
      // oturumu temizlemeye devam ediyoruz ki kullanıcı uygulamada kilitli
      // kalmasın.
      try {
        await gibLogout(token);
      } catch {
        // yoksay — yerel temizlik zaten aşağıda gerçekleşecek.
      }
    }

    await Promise.all([
      deleteSecureItem(TOKEN_KEY),
      deleteSecureItem(KULLANICI_KODU_KEY),
      gibSahibiniSil(),
    ]);
    // Çıkışta, oturum boyunca üretilen tüm fatura PDF'lerini (kişisel/mali veri
    // içerirler) cihazdan sil. Hata fırlatmaz; çıkışı asla engellemez.
    await eskiFaturaPdfleriniSil(0);
    // Yedeklerden paylaşım için önbelleğe alınan kopyalar da (başka bir
    // mükellefin oturumuna kalmasın).
    await paylasimKopyalariniSil();
    set({
      token: null,
      kullaniciKodu: null,
      kullaniciBilgisi: null,
      error: null,
      isLoggingOut: false,
    });
  },
}));
