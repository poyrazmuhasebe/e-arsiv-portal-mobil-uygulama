/** POST /v1/giris — e-posta + şifre. */

import { EPOSTA_EN_FAZLA, epostaNormalize, SIFRE_EN_FAZLA } from "../dogrulama";
import { govdeOku, metinAl } from "../govde";
import {
  oranSiniriUygula,
  SINIR_GIRIS_HESAP,
  SINIR_GIRIS_IP,
} from "../oranSinir";
import { oturumOlustur } from "../oturum";
import { SAHTE_KAYIT, sifreDogrula } from "../sifre";
import type { Ortam } from "../turler";
import { IstekHatasi, jsonYanit } from "../yanit";
import { hesapYaniti, kullaniciEpostadanGetir } from "./ortak";

const IZINLI_ALANLAR = ["eposta", "sifre"] as const;

/**
 * Kullanıcı bulunsun bulunmasın AYNI mesaj döner. Ayrıca kullanıcı yoksa da
 * bir scrypt hesabı yapılır: "bu e-posta kayıtlı mı?" sorusu yanıt süresinden
 * de anlaşılmasın.
 */
const GIRIS_HATASI = new IstekHatasi(
  "giris_basarisiz",
  401,
  "E-posta veya şifre hatalı.",
);

export async function girisUcu(
  istek: Request,
  env: Ortam,
  ip: string,
  simdiSn: number,
): Promise<Response> {
  const govde = await govdeOku(istek, IZINLI_ALANLAR);
  const eposta = epostaNormalize(metinAl(govde, "eposta", EPOSTA_EN_FAZLA));
  const sifre = metinAl(govde, "sifre", SIFRE_EN_FAZLA);

  await oranSiniriUygula(env, "giris_ip", ip, SINIR_GIRIS_IP, simdiSn);
  await oranSiniriUygula(env, "giris_hesap", eposta, SINIR_GIRIS_HESAP, simdiSn);

  const kullanici = await kullaniciEpostadanGetir(env, eposta);
  const kayit = kullanici?.sifre_ozeti ?? SAHTE_KAYIT;
  const dogru = await sifreDogrula(sifre, kayit, env.PEPPER ?? "");

  if (kullanici === null || kullanici.sifre_ozeti === null || !dogru) {
    throw GIRIS_HATASI;
  }

  const oturum = await oturumOlustur(env, kullanici.id, simdiSn);
  return jsonYanit(hesapYaniti(kullanici, oturum));
}
