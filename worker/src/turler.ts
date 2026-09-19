/**
 * Worker'ın ortam (binding + değişken) sözleşmesi.
 *
 * `wrangler types` ile üretilen `Cloudflare.Env` yerine kendi arayüzümüzü
 * kullanıyoruz: üretilen tip `vars` değerlerini birebir sabit (literal) olarak
 * yazıyor ("" gibi), sırlar ise orada hiç görünmüyor.
 */

/** Cloudflare Email Sending binding'inin kullandığımız kadarı. */
export interface EpostaGonderici {
  send(mesaj: {
    to: string;
    from: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<{ messageId: string }>;
}

export interface Ortam {
  DB: D1Database;

  /**
   * Cloudflare Email Sending binding'i. Alan adı hazır olana kadar
   * `wrangler.jsonc`'de tanımlı DEĞİL, bu yüzden isteğe bağlı.
   */
  EMAIL?: EpostaGonderici;

  /** Sır. Oturum token'larını imzalar. */
  OTURUM_IMZA_ANAHTARI: string;
  /** Sır, isteğe bağlı. Şifre özetine eklenen, veritabanında bulunmayan değer. */
  PEPPER?: string;

  POSTA_GONDEREN?: string;
  POSTA_GONDEREN_AD?: string;

  /** Virgülle ayrılmış tam kaynak listesi. Üretimde boş. Wildcard yok. */
  CORS_IZIN_LISTESI?: string;

  /**
   * SADECE YEREL GELİŞTİRME ("1"). Yalnızca git dışı `.dev.vars`'tan gelir;
   * `wrangler.jsonc`'deki `vars` bloğunda bilerek yoktur ve `.dev.vars`
   * deploy edilmez.
   */
  GELISTIRME?: string;
}

export type KodTipi = "eposta_dogrulama" | "sifre_sifirlama";

/** Veritabanındaki kullanıcı satırının okuduğumuz alanları. */
export interface KullaniciSatiri {
  id: string;
  eposta: string;
  kullanici_adi: string;
  sifre_ozeti: string | null;
  eposta_dogrulandi: number;
}

/** Yalnızca yerel geliştirmede true döner. */
export function gelistirmeModu(env: Ortam): boolean {
  return env.GELISTIRME === "1";
}
