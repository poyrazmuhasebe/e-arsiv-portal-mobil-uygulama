import { create } from 'zustand';

import { DvdApiError, dvdCikisYap, dvdGirisYap, dvdKullaniciBilgisiGetir } from '../services/dvdApi';
import { kullaniciBilgileriDetayGetir } from '../services/gibApi';
import { dvdMukellefi } from '../utils/dvdRapor';
import { detaydakiMukellef, oturumdakiMukellef, type Mukellef } from '../utils/yedekleme';
import { oturumSifresi, oturumSifresiniAyarla } from '../utils/oturumSifresi';
import { useAuthStore } from './useAuthStore';
import { useHesapStore } from './useHesapStore';

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
  /**
   * Oturumun mükellefi (VKN/TCKN + ad). İndirilen PDF'ler bu VKN/TCKN'nin
   * klasörüne yazılır: aynı üyelikte başka kullanıcı kodlarıyla da giriş
   * yapılabildiği için dosyalar mükellefe göre ayrılır. Yalnızca bellekte.
   */
  mukellef: Mukellef | null;
  /**
   * Mükellefi belirler (önbellekte yoksa). Önce Dijital VD `user-info`; o
   * geçerli VKN/TCKN vermezse ve oturum açık e-Arşiv oturumuyla AYNI
   * kullanıcı koduna aitse e-Arşiv'in doğrulanmış "Kullanıcı Bilgileri".
   * Belirlenemezse null. Oturum hatası fırlatılır.
   */
  mukellefiBelirle: () => Promise<Mukellef | null>;
  /**
   * `kullaniciKodu` verilmezse açık GİB (e-Arşiv) oturumunun kodu kullanılır.
   * e-Arşiv girişi yapılmadan (GİB giriş ekranından) açıldığında ekran kodu
   * ve şifreyi kendisi verir; o durumda şifre belleğe de ALINMAZ.
   */
  girisYap: (b: { guvenlikKodu: string; cid: string; sifre?: string; kullaniciKodu?: string }) => Promise<void>;
  cikisYap: () => Promise<void>;
  /** Oturum GİB'de düşmüşse yalnızca yerelde temizler. */
  oturumuUnut: () => void;
}

export const useDvdStore = create<DvdDurumu>((set, get) => ({
  token: null,
  kullaniciKodu: null,
  girisYapiliyor: false,
  mukellef: null,

  girisYap: async ({ guvenlikKodu, cid, sifre, kullaniciKodu: verilenKod }) => {
    const gibKodu = useAuthStore.getState().kullaniciKodu;
    const bagimsiz = gibKodu === null;
    const kullaniciKodu = (bagimsiz ? verilenKod?.trim() : gibKodu) || null;
    // Bağımsız girişte bellekteki şifre KULLANILMAZ (başka bir koda ait olabilir).
    const kullanilacakSifre = sifre || (bagimsiz ? null : oturumSifresi());
    if (!kullaniciKodu) throw new Error('GİB kullanıcı kodunuzu girin.');
    if (!kullanilacakSifre) throw new Error('GİB şifrenizi girin.');
    set({ girisYapiliyor: true });
    try {
      const token = await dvdGirisYap({ kullaniciKodu, sifre: kullanilacakSifre, guvenlikKodu, cid });
      // Ekranda yazılan şifre doğru çıktıysa ve açık GİB oturumunun koduna
      // aitse bu oturum için bellekte tutulur. Bağımsız girişte tutulmaz.
      if (sifre && !bagimsiz) oturumSifresiniAyarla(sifre);
      set({ token, kullaniciKodu, mukellef: null });
    } finally {
      set({ girisYapiliyor: false });
    }
  },

  mukellefiBelirle: async () => {
    const { token, kullaniciKodu, mukellef } = get();
    if (!token) return null;
    if (mukellef) return mukellef;
    let bulunan: Mukellef | null = null;
    try {
      bulunan = dvdMukellefi(await dvdKullaniciBilgisiGetir(token));
    } catch (err) {
      if (err instanceof DvdApiError && err.oturumHatasi) throw err;
      bulunan = null;
    }
    if (!bulunan) {
      const auth = useAuthStore.getState();
      if (auth.token && auth.kullaniciKodu !== null && auth.kullaniciKodu === kullaniciKodu) {
        bulunan = oturumdakiMukellef(auth.kullaniciBilgisi);
        if (!bulunan) {
          try {
            bulunan = detaydakiMukellef(await kullaniciBilgileriDetayGetir(auth.token), auth.kullaniciBilgisi?.unvan);
          } catch {
            bulunan = null;
          }
        }
      }
    }
    // Bu arada oturum kapandıysa ya da değiştiyse sonuç yazılmaz.
    if (bulunan && get().token === token) set({ mukellef: bulunan });
    return bulunan;
  },

  cikisYap: async () => {
    const { token } = get();
    set({ token: null, kullaniciKodu: null, mukellef: null });
    if (token) await dvdCikisYap(token);
  },

  oturumuUnut: () => set({ token: null, kullaniciKodu: null, mukellef: null }),
}));

/**
 * Ekran şifre alanını göstermeli mi? e-Arşiv oturumu yoksa (bağımsız giriş)
 * her zaman; varsa yalnızca şifre bellekte değilse.
 */
export function dvdSifreGerekli(): boolean {
  return useAuthStore.getState().kullaniciKodu === null || oturumSifresi() === null;
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

// Dijital VD, e-Arşiv girişi yapılmadan da (GİB giriş ekranından) açılabildiği
// için GİB oturumu olmayabilir. Uygulama hesabı değişince (çıkış, başka hesap,
// "Şimdilik atla"dan çıkış) oturum bir sonraki kullanıcıya KALMASIN.
useHesapStore.subscribe((durum, onceki) => {
  const dvd = useDvdStore.getState();
  if (!dvd.token) return;
  const hesapDegisti = (onceki.kullanici?.id ?? null) !== (durum.kullanici?.id ?? null);
  const atlamaBitti = onceki.atlandi && !durum.atlandi;
  if (hesapDegisti || atlamaBitti) void dvd.cikisYap();
});
