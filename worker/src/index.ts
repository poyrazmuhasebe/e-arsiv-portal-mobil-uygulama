/**
 * e-Arşiv Portal — uygulama hesabı Worker'ı.
 *
 * Bu Worker YALNIZCA uygulama hesabı verisini görür: e-posta, uygulama
 * kullanıcı adı ve şifre. GİB kullanıcı kodu, GİB şifresi, GİB token'ı,
 * VKN/TCKN, unvan, fatura verisi ve defterler buraya HİÇBİR KOŞULDA gelmez —
 * her uç nokta yalnızca izin verilen alanları kabul eder, bilinmeyen alanı
 * reddeder (src/govde.ts).
 *
 * LOGLAMA KURALI: uygulamadaki `__DEV__` gibi bir koruma burada YOK. İstek
 * gövdesi, Authorization başlığı, şifre, token, e-posta ve kullanıcı adı
 * hiçbir koşulda console.* ile yazılmaz. Hatalar yalnızca sabit bir hata kodu
 * ve uç nokta adıyla loglanır.
 */

import { corsBasliklari, izinliKaynak } from "./cors";
import type { Ortam } from "./turler";
import { hataYaniti, IstekHatasi, jsonYanit } from "./yanit";
import { girisUcu } from "./uclar/giris";
import { kayitUcu } from "./uclar/kayit";
import { cikisUcu, yenileUcu } from "./uclar/oturumUclari";
import { epostaDogrulaUcu, kodGonderUcu } from "./uclar/epostaDogrulama";
import { sifirlamaBaslatUcu, sifirlamaTamamlaUcu } from "./uclar/sifreSifirlama";

const YAPILANDIRMA_HATASI = new IstekHatasi(
  "yapilandirma_eksik",
  500,
  "Hesap sunucusu yapılandırılmamış.",
);

async function yonlendir(
  istek: Request,
  env: Ortam,
  ip: string,
  simdiSn: number,
): Promise<Response> {
  const yol = new URL(istek.url).pathname;
  const yontem = istek.method;

  if (yontem === "POST") {
    switch (yol) {
      case "/v1/kayit":
        return kayitUcu(istek, env, ip, simdiSn);
      case "/v1/giris":
        return girisUcu(istek, env, ip, simdiSn);
      case "/v1/oturum/yenile":
        return yenileUcu(istek, env, simdiSn);
      case "/v1/cikis":
        return cikisUcu(istek, env);
      case "/v1/eposta/kod-gonder":
        return kodGonderUcu(istek, env, simdiSn);
      case "/v1/eposta/dogrula":
        return epostaDogrulaUcu(istek, env, simdiSn);
      case "/v1/sifre/sifirlama-baslat":
        return sifirlamaBaslatUcu(istek, env, ip, simdiSn);
      case "/v1/sifre/sifirlama-tamamla":
        return sifirlamaTamamlaUcu(istek, env, ip, simdiSn);
    }
  }

  if (yontem === "GET" && yol === "/v1/saglik") {
    // Yalnızca ayakta olma kontrolü. Hiçbir veri, sürüm ya da yapılandırma
    // bilgisi sızdırmaz.
    return jsonYanit({ tamam: true });
  }

  throw new IstekHatasi("bulunamadi", 404, "İstek bulunamadı.");
}

export default {
  async fetch(istek: Request, env: Ortam): Promise<Response> {
    const kaynak = izinliKaynak(env, istek);
    const cors = corsBasliklari(kaynak);

    if (istek.method === "OPTIONS") {
      // İzinli olmayan kaynaklarda CORS başlığı hiç dönmez; tarayıcı engeller.
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if ((env.OTURUM_IMZA_ANAHTARI ?? "").length === 0) {
        throw YAPILANDIRMA_HATASI;
      }

      const ip = istek.headers.get("cf-connecting-ip") ?? "bilinmeyen-ip";
      const simdiSn = Math.floor(Date.now() / 1000);
      const yanit = await yonlendir(istek, env, ip, simdiSn);

      for (const [ad, deger] of Object.entries(cors)) {
        yanit.headers.set(ad, deger);
      }
      return yanit;
    } catch (hata) {
      if (hata instanceof IstekHatasi) {
        return hataYaniti(hata, cors);
      }
      // Beklenmeyen hata: yalnızca yol yazılır. İstisna metni, istek gövdesi
      // ve kişisel veri LOGLANMAZ (yığın izi e-posta/şifre taşıyabilir).
      console.error("sunucu_hatasi", new URL(istek.url).pathname);
      return hataYaniti(
        new IstekHatasi(
          "sunucu_hatasi",
          500,
          "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
        ),
        cors,
      );
    }
  },
} satisfies ExportedHandler<Ortam>;
