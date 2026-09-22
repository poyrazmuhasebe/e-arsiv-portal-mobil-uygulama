import { create } from 'zustand';

import { dvdCikisYap, dvdGirisYap } from '../services/dvdApi';
import { oturumSifresi, oturumSifresiniAyarla } from '../utils/oturumSifresi';
import { useAuthStore } from './useAuthStore';

/**
 * Dijital Vergi Dairesi oturumu — YALNIZCA BELLEKTE.
 *
 * Token diske/SecureStore'a yazılmaz; uygulama kapanınca biter ve
 * "e-Arşiv Faturalarım" ekranı güvenlik kodunu yeniden ister. GİB (e-Arşiv
 * Portal) oturumu kapanınca (çıkış, "Hesaptan çık", oturum hatası) Dijital
 * VD oturumu da GİB tarafında kapatılır ve silinir — başka bir mükellefin
 * GİB oturumuna taşınmaz.
 *
 * Kullanıcı kodu ve şifre e-Arşiv girişinden gelir (kullanıcı isteği,
 * 2026-09-22): yalnızca güvenlik kodu yazılır. Şifre bellekte yoksa (oturum
 * kayıtlı token'dan geri yüklendiyse) ekran bir kez sorar.
 */
interface DvdDurumu {
  token: string | null;
  /** Oturumun hangi GİB kullanıcı koduyla açıldığı (başka koda geçilirse geçersiz). */
  kullaniciKodu: string | null;
  girisYapiliyor: boolean;
  girisYap: (b: { guvenlikKodu: string; cid: string; sifre?: string }) => Promise<void>;
  cikisYap: () => Promise<void>;
  /** Oturum GİB'de düşmüşse yalnızca yerelde temizler. */
  oturumuUnut: () => void;
}

export const useDvdStore = create<DvdDurumu>((set, get) => ({
  token: null,
  kullaniciKodu: null,
  girisYapiliyor: false,

  girisYap: async ({ guvenlikKodu, cid, sifre }) => {
    const kullaniciKodu = useAuthStore.getState().kullaniciKodu;
    const kullanilacakSifre = sifre ?? oturumSifresi();
    if (!kullaniciKodu) throw new Error('GİB oturumu açık değil.');
    if (!kullanilacakSifre) throw new Error('GİB şifrenizi girin.');
    set({ girisYapiliyor: true });
    try {
      const token = await dvdGirisYap({ kullaniciKodu, sifre: kullanilacakSifre, guvenlikKodu, cid });
      // Ekranda yazılan şifre doğru çıktıysa bu oturum için bellekte tutulur.
      if (sifre) oturumSifresiniAyarla(sifre);
      set({ token, kullaniciKodu });
    } finally {
      set({ girisYapiliyor: false });
    }
  },

  cikisYap: async () => {
    const { token } = get();
    set({ token: null, kullaniciKodu: null });
    if (token) await dvdCikisYap(token);
  },

  oturumuUnut: () => set({ token: null, kullaniciKodu: null }),
}));

/** Şifrenin bellekte olup olmadığı (ekran şifre alanını buna göre gösterir). */
export function dvdSifreGerekli(): boolean {
  return oturumSifresi() === null;
}

// GİB oturumu kapanınca ya da başka bir kullanıcı koduna geçilince Dijital VD
// oturumu da kapatılır.
useAuthStore.subscribe((durum, onceki) => {
  const dvd = useDvdStore.getState();
  if (!dvd.token) return;
  const kapandi = onceki.token !== null && durum.token === null;
  const kodDegisti = durum.kullaniciKodu !== null && durum.kullaniciKodu !== dvd.kullaniciKodu;
  if (kapandi || kodDegisti) void dvd.cikisYap();
});
