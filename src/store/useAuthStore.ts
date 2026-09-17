import { create } from 'zustand';
import { login as gibLogin, logout as gibLogout, getKullaniciBilgileri } from '../services/gibApi';
import { deleteSecureItem, getSecureItem, setSecureItem } from '../utils/secureStorage';
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

  login: (kullaniciKodu: string, kullaniciSifresi: string, remember?: boolean) => Promise<void>;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  kullaniciKodu: null,
  kullaniciBilgisi: null,
  isLoading: false,
  isLoggingOut: false,
  error: null,

  login: async (kullaniciKodu, kullaniciSifresi, remember = true) => {
    set({ isLoading: true, error: null });
    try {
      const token = await gibLogin(kullaniciKodu, kullaniciSifresi);
      const kullaniciBilgisi = await getKullaniciBilgileri(token).catch(() => null);

      if (remember) {
        // NOT: Şifreyi hiçbir zaman saklamıyoruz, yalnızca oturum token'ını
        // ve kullanıcı kodunu (giriş formunu önceden doldurmak için) saklıyoruz.
        await setSecureItem(TOKEN_KEY, token);
        await setSecureItem(KULLANICI_KODU_KEY, kullaniciKodu);
      }

      set({ token, kullaniciKodu, kullaniciBilgisi, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Giriş yapılamadı.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  restoreSession: async () => {
    const [token, kullaniciKodu] = await Promise.all([
      getSecureItem(TOKEN_KEY),
      getSecureItem(KULLANICI_KODU_KEY),
    ]);
    if (token) {
      set({ token, kullaniciKodu });
      // Uygulama soğuk başladığında da Header'da mükellef unvanının
      // görünmesi için; başarısız olursa sessizce login sonrası tekrar
      // denenir (kullaniciBilgisi null kalır, Header kullaniciKodu'na düşer).
      const kullaniciBilgisi = await getKullaniciBilgileri(token).catch(() => null);
      set({ kullaniciBilgisi });
    }
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

    await Promise.all([deleteSecureItem(TOKEN_KEY), deleteSecureItem(KULLANICI_KODU_KEY)]);
    set({
      token: null,
      kullaniciKodu: null,
      kullaniciBilgisi: null,
      error: null,
      isLoggingOut: false,
    });
  },
}));
