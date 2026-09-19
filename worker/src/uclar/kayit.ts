/** POST /v1/kayit — e-posta + uygulama kullanıcı adı + şifre ile hesap açma. */

import {
  EPOSTA_EN_FAZLA,
  epostaHatasi,
  epostaNormalize,
  KULLANICI_ADI_EN_FAZLA,
  kullaniciAdiHatasi,
  kullaniciAdiNormalize,
  SIFRE_EN_FAZLA,
  sifreHatasi,
} from "../dogrulama";
import { koduGonder } from "../eposta";
import { govdeOku, metinAl } from "../govde";
import { kodOlustur } from "../kodlar";
import { rastgeleKimlik } from "../kripto";
import { oranSiniriUygula, SINIR_KAYIT_IP } from "../oranSinir";
import { oturumOlustur } from "../oturum";
import { sifreOzetle } from "../sifre";
import type { KullaniciSatiri, Ortam } from "../turler";
import { IstekHatasi, jsonYanit } from "../yanit";
import { gelistirmeKoduEkle, hesapYaniti } from "./ortak";

const IZINLI_ALANLAR = ["eposta", "kullaniciAdi", "sifre"] as const;

export async function kayitUcu(
  istek: Request,
  env: Ortam,
  ip: string,
  simdiSn: number,
): Promise<Response> {
  const govde = await govdeOku(istek, IZINLI_ALANLAR);
  const eposta = epostaNormalize(metinAl(govde, "eposta", EPOSTA_EN_FAZLA));
  const kullaniciAdi = kullaniciAdiNormalize(
    metinAl(govde, "kullaniciAdi", KULLANICI_ADI_EN_FAZLA),
  );
  const sifre = metinAl(govde, "sifre", SIFRE_EN_FAZLA);

  const hata =
    epostaHatasi(eposta) ??
    kullaniciAdiHatasi(kullaniciAdi) ??
    sifreHatasi(sifre, eposta, kullaniciAdi);
  if (hata !== null) {
    throw new IstekHatasi("gecersiz_alan", 400, hata);
  }

  await oranSiniriUygula(env, "kayit_ip", ip, SINIR_KAYIT_IP, simdiSn);

  // Enumeration notu: giriş ve şifre sıfırlama uçları her zaman aynı yanıtı
  // döner, ama KAYITTA ayrım kaçınılmaz — kullanıcıya hangi alanı
  // düzelteceğini söylemek gerekiyor. Bu bilinçli bir karar; kayıt ucu bu
  // yüzden IP başına sıkı oran sınırlamasıyla korunuyor.
  const cakisan = await env.DB.prepare(
    `SELECT eposta, kullanici_adi FROM kullanicilar
      WHERE eposta = ?1 OR kullanici_adi = ?2 LIMIT 1`,
  )
    .bind(eposta, kullaniciAdi)
    .first<{ eposta: string; kullanici_adi: string }>();

  if (cakisan !== null) {
    if (cakisan.eposta === eposta) {
      throw new IstekHatasi(
        "eposta_kullanimda",
        409,
        "Bu e-posta adresiyle bir hesap zaten var. Giriş yapmayı deneyin.",
      );
    }
    throw new IstekHatasi(
      "kullanici_adi_kullanimda",
      409,
      "Bu kullanıcı adı alınmış, başka bir tane seçin.",
    );
  }

  const kullanici: KullaniciSatiri = {
    id: rastgeleKimlik(),
    eposta,
    kullanici_adi: kullaniciAdi,
    sifre_ozeti: await sifreOzetle(sifre, env.PEPPER ?? ""),
    eposta_dogrulandi: 0,
  };

  try {
    await env.DB.prepare(
      `INSERT INTO kullanicilar
         (id, eposta, kullanici_adi, sifre_ozeti, eposta_dogrulandi, olusturma, guncelleme)
       VALUES (?1, ?2, ?3, ?4, 0, ?5, ?5)`,
    )
      .bind(kullanici.id, eposta, kullaniciAdi, kullanici.sifre_ozeti, simdiSn)
      .run();
  } catch {
    // Yukarıdaki kontrol ile INSERT arasındaki yarış: UNIQUE ihlali.
    throw new IstekHatasi(
      "kayit_cakismasi",
      409,
      "Bu e-posta veya kullanıcı adı az önce alındı. Lütfen tekrar deneyin.",
    );
  }

  const oturum = await oturumOlustur(env, kullanici.id, simdiSn);
  const kod = await kodOlustur(env, kullanici.id, "eposta_dogrulama", simdiSn);
  await koduGonder(env, eposta, "eposta_dogrulama", kod);

  return jsonYanit(
    gelistirmeKoduEkle(env, hesapYaniti(kullanici, oturum), kod),
    201,
  );
}
