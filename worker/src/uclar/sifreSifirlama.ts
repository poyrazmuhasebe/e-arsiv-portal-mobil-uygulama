/** POST /v1/sifre/sifirlama-baslat ve POST /v1/sifre/sifirlama-tamamla. */

import {
  EPOSTA_EN_FAZLA,
  epostaNormalize,
  SIFRE_EN_FAZLA,
  sifreHatasi,
} from "../dogrulama";
import { koduGonder } from "../eposta";
import { govdeOku, metinAl } from "../govde";
import { KOD_HANE, kodDogrulaVeTuket, kodOlustur } from "../kodlar";
import {
  oranSiniriUygula,
  SINIR_KOD_DOGRULA,
  SINIR_SIFIRLAMA_HESAP,
  SINIR_SIFIRLAMA_IP,
} from "../oranSinir";
import { tumOturumlariIptal } from "../oturum";
import { sifreOzetle } from "../sifre";
import { gelistirmeModu, type Ortam } from "../turler";
import { IstekHatasi, jsonYanit } from "../yanit";
import { kullaniciEpostadanGetir } from "./ortak";

const BASLAT_ALANLARI = ["eposta"] as const;
const TAMAMLA_ALANLARI = ["eposta", "kod", "yeniSifre"] as const;

/**
 * E-posta kayıtlı olsun olmasın AYNI yanıt döner — bu uç bir e-posta
 * enumeration yüzeyi olmamalı.
 */
export async function sifirlamaBaslatUcu(
  istek: Request,
  env: Ortam,
  ip: string,
  simdiSn: number,
): Promise<Response> {
  const govde = await govdeOku(istek, BASLAT_ALANLARI);
  const eposta = epostaNormalize(metinAl(govde, "eposta", EPOSTA_EN_FAZLA));

  await oranSiniriUygula(env, "sifirlama_ip", ip, SINIR_SIFIRLAMA_IP, simdiSn);
  await oranSiniriUygula(
    env,
    "sifirlama_hesap",
    eposta,
    SINIR_SIFIRLAMA_HESAP,
    simdiSn,
  );

  const kullanici = await kullaniciEpostadanGetir(env, eposta);
  let kod: string | null = null;
  if (kullanici !== null) {
    kod = await kodOlustur(env, kullanici.id, "sifre_sifirlama", simdiSn);
    await koduGonder(env, kullanici.eposta, "sifre_sifirlama", kod);
  }

  const yanit: { tamam: true; gelistirmeKodu?: string } = { tamam: true };
  // Geliştirme modunda bile hesap yoksa kod dönmez: yerelde de aynı yanıt.
  if (gelistirmeModu(env) && kod !== null) yanit.gelistirmeKodu = kod;
  return jsonYanit(yanit);
}

export async function sifirlamaTamamlaUcu(
  istek: Request,
  env: Ortam,
  ip: string,
  simdiSn: number,
): Promise<Response> {
  const govde = await govdeOku(istek, TAMAMLA_ALANLARI);
  const eposta = epostaNormalize(metinAl(govde, "eposta", EPOSTA_EN_FAZLA));
  const kod = metinAl(govde, "kod", KOD_HANE).trim();
  const yeniSifre = metinAl(govde, "yeniSifre", SIFRE_EN_FAZLA);

  await oranSiniriUygula(env, "kod_dogrula", ip, SINIR_KOD_DOGRULA, simdiSn);

  const kullanici = await kullaniciEpostadanGetir(env, eposta);
  const hata = sifreHatasi(
    yeniSifre,
    eposta,
    kullanici?.kullanici_adi ?? "",
  );
  if (hata !== null) {
    throw new IstekHatasi("gecersiz_alan", 400, hata);
  }

  const kodGecersiz = new IstekHatasi(
    "kod_gecersiz",
    400,
    "Kod hatalı ya da süresi dolmuş. Yeni bir kod isteyin.",
  );
  if (kullanici === null) throw kodGecersiz;

  const gecerli = await kodDogrulaVeTuket(
    env,
    kullanici.id,
    "sifre_sifirlama",
    kod,
    simdiSn,
  );
  if (!gecerli) throw kodGecersiz;

  await env.DB.prepare(
    "UPDATE kullanicilar SET sifre_ozeti = ?2, guncelleme = ?3 WHERE id = ?1",
  )
    .bind(kullanici.id, await sifreOzetle(yeniSifre, env.PEPPER ?? ""), simdiSn)
    .run();

  // Şifre değişince mevcut tüm oturumlar düşer: hesabı ele geçiren varsa
  // erişimi kesilir. Kullanıcı yeniden giriş yapar.
  await tumOturumlariIptal(env, kullanici.id);

  return jsonYanit({ tamam: true });
}
