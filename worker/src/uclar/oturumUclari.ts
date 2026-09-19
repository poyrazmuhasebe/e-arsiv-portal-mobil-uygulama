/** POST /v1/oturum/yenile ve POST /v1/cikis. */

import { govdeOku, metinAl } from "../govde";
import { oturumIptal, oturumYenile } from "../oturum";
import type { Ortam } from "../turler";
import { IstekHatasi, jsonYanit } from "../yanit";
import { hesapYaniti, kullaniciGetir } from "./ortak";

const IZINLI_ALANLAR = ["yenilemeToken"] as const;
const TOKEN_EN_FAZLA = 512;

export async function yenileUcu(
  istek: Request,
  env: Ortam,
  simdiSn: number,
): Promise<Response> {
  const govde = await govdeOku(istek, IZINLI_ALANLAR);
  const yenilemeToken = metinAl(govde, "yenilemeToken", TOKEN_EN_FAZLA);

  const sonuc = await oturumYenile(env, yenilemeToken, simdiSn);
  if (sonuc === null) {
    throw new IstekHatasi(
      "oturum_iptal",
      401,
      "Oturumunuz sona erdi, lütfen tekrar giriş yapın.",
    );
  }

  const kullanici = await kullaniciGetir(env, sonuc.kullaniciId);
  return jsonYanit(hesapYaniti(kullanici, sonuc.oturum));
}

export async function cikisUcu(
  istek: Request,
  env: Ortam,
): Promise<Response> {
  const govde = await govdeOku(istek, IZINLI_ALANLAR);
  const yenilemeToken = metinAl(govde, "yenilemeToken", TOKEN_EN_FAZLA);
  // Token geçersiz olsa bile başarı döner: çıkış her zaman "başarılı"dır.
  await oturumIptal(env, yenilemeToken);
  return jsonYanit({ tamam: true });
}
