/**
 * E-posta gönderimi (Cloudflare Email Sending).
 *
 * ⚠️ DOĞRULANMADI: Cloudflare Email Sending şu an BETA, Workers Paid planı ve
 * Cloudflare'de bir gönderen alan adı gerektiriyor. Bu kod gerçek bir
 * gönderimle DENENMEDİ. Binding (`send_email`) alan adı hazır olana kadar
 * `wrangler.jsonc`'de tanımlı değil; bu yüzden `env.EMAIL` isteğe bağlı.
 *
 * Yerel geliştirmede (GELISTIRME="1") posta gönderilmez: kod konsola yazılır
 * ve uç nokta yanıtında `gelistirmeKodu` alanıyla döner, böylece akış
 * e-posta altyapısı olmadan telefonda denenebilir.
 *
 * LOGLAMA KURALI: burada e-posta ADRESİ hiçbir koşulda loglanmaz. Geliştirme
 * modunda yalnızca kodun kendisi yazılır.
 */

import { gelistirmeModu, type KodTipi, type Ortam } from "./turler";
import { IstekHatasi } from "./yanit";

const KONU: Record<KodTipi, string> = {
  eposta_dogrulama: "e-Arşiv Portal — e-posta doğrulama kodunuz",
  sifre_sifirlama: "e-Arşiv Portal — şifre sıfırlama kodunuz",
};

function govdeMetni(tip: KodTipi, kod: string): string {
  const amac =
    tip === "eposta_dogrulama"
      ? "E-posta adresinizi doğrulamak için"
      : "Şifrenizi sıfırlamak için";
  return [
    `${amac} aşağıdaki kodu uygulamaya girin:`,
    "",
    kod,
    "",
    "Kod 15 dakika geçerlidir ve yalnızca bir kez kullanılabilir.",
    "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.",
    "",
    "Bu uygulama GİB'in resmi bir ürünü değildir.",
  ].join("\n");
}

/**
 * Kodu gönderir. Geliştirme modunda gönderim yapılmaz ve `true` döner
 * (çağıran taraf kodu yanıta ekler). Üretimde gönderim yapılamazsa hata
 * fırlatır — sessizce başarılı sayılmaz.
 */
export async function koduGonder(
  env: Ortam,
  alici: string,
  tip: KodTipi,
  kod: string,
): Promise<void> {
  if (gelistirmeModu(env)) {
    // Yalnızca yerel geliştirme. Adres YAZILMAZ.
    console.log(`[gelistirme] ${tip} kodu: ${kod}`);
    return;
  }

  const gonderen = env.POSTA_GONDEREN ?? "";
  if (env.EMAIL === undefined || gonderen.length === 0) {
    throw new IstekHatasi(
      "posta_yapilandirilmamis",
      503,
      "Doğrulama e-postası şu anda gönderilemiyor. Lütfen daha sonra tekrar deneyin.",
    );
  }

  try {
    await env.EMAIL.send({
      to: alici,
      from: gonderen,
      subject: KONU[tip],
      text: govdeMetni(tip, kod),
    });
  } catch {
    // Sağlayıcı yanıtı, adres ve kod LOGLANMAZ.
    console.error("posta_gonderilemedi", tip);
    throw new IstekHatasi(
      "posta_gonderilemedi",
      503,
      "Doğrulama e-postası gönderilemedi. Lütfen birazdan tekrar deneyin.",
    );
  }
}
