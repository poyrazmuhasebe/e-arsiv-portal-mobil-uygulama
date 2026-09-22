/**
 * GİB şifresinin YALNIZCA BELLEKTE tutulan kopyası.
 *
 * NEDEN: Dijital Vergi Dairesi (dijital.gib.gov.tr) girişi e-Arşiv Portal ile
 * aynı kullanıcı kodu ve şifreyi kullanıyor. Kullanıcı isteği (2026-09-22):
 * "e-Arşiv Faturalarım" ekranında yalnızca güvenlik kodu (captcha)
 * yazdırılsın; kullanıcı kodu ve şifre e-Arşiv girişinden alınsın.
 *
 * KURALLAR (uygulamanın "GİB şifresi saklanmaz" ilkesi korunur):
 *  - Hiçbir koşulda diske, SecureStore'a ya da sunucuya YAZILMAZ; zustand
 *    durumuna da konmaz (yalnızca bu modülün değişkeninde durur).
 *  - e-Arşiv girişi başarılı olunca konur (useAuthStore.login), GİB oturumu
 *    kapanınca silinir (useAuthStore.logout). Uygulama süreci bitince
 *    kendiliğinden yok olur.
 *  - Uygulama yeniden açılıp GİB oturumu KAYITLI token'dan geri yüklenirse
 *    şifre bellekte YOKTUR; Dijital VD ekranı o zaman şifreyi bir kez sorar
 *    (yine yalnızca bu oturum için bellekte tutulur).
 */

let sifre: string | null = null;

export function oturumSifresiniAyarla(yeni: string): void {
  sifre = yeni.length > 0 ? yeni : null;
}

export function oturumSifresi(): string | null {
  return sifre;
}

export function oturumSifresiniSil(): void {
  sifre = null;
}
