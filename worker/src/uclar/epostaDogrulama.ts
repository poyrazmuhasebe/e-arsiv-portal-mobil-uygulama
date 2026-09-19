/** POST /v1/eposta/kod-gonder ve POST /v1/eposta/dogrula. */

import { koduGonder } from "../eposta";
import { govdeOku, metinAl } from "../govde";
import { KOD_HANE, kodDogrulaVeTuket, kodOlustur } from "../kodlar";
import {
  oranSiniriUygula,
  SINIR_KOD_DOGRULA,
  SINIR_KOD_GONDER,
} from "../oranSinir";
import { istektenKullaniciId } from "../oturum";
import type { Ortam } from "../turler";
import { IstekHatasi, jsonYanit } from "../yanit";
import { gelistirmeKoduEkle, kullaniciGetir } from "./ortak";

export async function kodGonderUcu(
  istek: Request,
  env: Ortam,
  simdiSn: number,
): Promise<Response> {
  // Gövde beklemiyoruz; gönderilirse de hiçbir alan kabul edilmez.
  await govdeOku(istek, []);
  const kullaniciId = await istektenKullaniciId(env, istek, simdiSn);
  const kullanici = await kullaniciGetir(env, kullaniciId);

  if (kullanici.eposta_dogrulandi === 1) {
    return jsonYanit({ tamam: true, zatenDogrulandi: true });
  }

  await oranSiniriUygula(env, "kod_gonder", kullaniciId, SINIR_KOD_GONDER, simdiSn);

  const kod = await kodOlustur(env, kullaniciId, "eposta_dogrulama", simdiSn);
  await koduGonder(env, kullanici.eposta, "eposta_dogrulama", kod);

  return jsonYanit(gelistirmeKoduEkle(env, { tamam: true }, kod));
}

const DOGRULA_ALANLARI = ["kod"] as const;

export async function epostaDogrulaUcu(
  istek: Request,
  env: Ortam,
  simdiSn: number,
): Promise<Response> {
  const govde = await govdeOku(istek, DOGRULA_ALANLARI);
  const kod = metinAl(govde, "kod", KOD_HANE).trim();
  const kullaniciId = await istektenKullaniciId(env, istek, simdiSn);

  await oranSiniriUygula(env, "kod_dogrula", kullaniciId, SINIR_KOD_DOGRULA, simdiSn);

  const gecerli = await kodDogrulaVeTuket(
    env,
    kullaniciId,
    "eposta_dogrulama",
    kod,
    simdiSn,
  );
  if (!gecerli) {
    throw new IstekHatasi(
      "kod_gecersiz",
      400,
      "Kod hatalı ya da süresi dolmuş. Yeni bir kod isteyin.",
    );
  }

  await env.DB.prepare(
    "UPDATE kullanicilar SET eposta_dogrulandi = 1, guncelleme = ?2 WHERE id = ?1",
  )
    .bind(kullaniciId, simdiSn)
    .run();

  return jsonYanit({ tamam: true, epostaDogrulandi: true });
}
