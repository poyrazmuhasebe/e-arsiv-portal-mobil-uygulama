/**
 * Hesap silme.
 *
 * Google Play, hesap oluşturan uygulamalarda İKİ ayrı yol zorunlu tutuyor:
 * uygulama içinden silme ve herkese açık bir web sayfasından silme talebi.
 * Dondurmak silme sayılmaz.
 *
 * - `DELETE /v1/hesap` — uygulama içi yol (oturum + şifre)
 * - `GET  /hesap-sil`  — herkese açık HTML sayfa
 * - `POST /hesap-sil`  — o sayfanın formu (e-posta + şifre)
 *
 * ⚠️ Bu dosya, "Worker her zaman JSON döner" kuralının BİLİNÇLİ İSTİSNASIDIR:
 * `/hesap-sil` bir tarayıcı sayfasıdır. `/v1/*` uçları JSON dönmeye devam
 * eder.
 */

import { EPOSTA_EN_FAZLA, epostaNormalize, SIFRE_EN_FAZLA } from "../dogrulama";
import { govdeOku, metinAl } from "../govde";
import {
  oranSiniriUygula,
  SINIR_GIRIS_HESAP,
  SINIR_GIRIS_IP,
} from "../oranSinir";
import { istektenKullaniciId } from "../oturum";
import { sifreDogrula, SAHTE_KAYIT } from "../sifre";
import type { Ortam } from "../turler";
import { IstekHatasi, jsonYanit } from "../yanit";
import { kullaniciEpostadanGetir, kullaniciGetir } from "./ortak";

/**
 * Kullanıcıya ait TÜM satırları siler. Yabancı anahtarların davranışına
 * güvenmek yerine her tabloyu tek tek, tek bir `batch()` içinde siliyoruz.
 */
async function kullaniciyiSil(env: Ortam, kullaniciId: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM oturumlar WHERE kullanici_id = ?1").bind(kullaniciId),
    env.DB.prepare(
      "DELETE FROM tek_kullanimlik_kodlar WHERE kullanici_id = ?1",
    ).bind(kullaniciId),
    env.DB.prepare(
      "DELETE FROM kimlik_saglayicilar WHERE kullanici_id = ?1",
    ).bind(kullaniciId),
    env.DB.prepare("DELETE FROM kullanicilar WHERE id = ?1").bind(kullaniciId),
  ]);
}

const SIL_ALANLARI = ["sifre"] as const;

/** DELETE /v1/hesap — uygulama içi yol. Oturum + şifre doğrulaması ister. */
export async function hesapSilUcu(
  istek: Request,
  env: Ortam,
  ip: string,
  simdiSn: number,
): Promise<Response> {
  const govde = await govdeOku(istek, SIL_ALANLARI);
  const sifre = metinAl(govde, "sifre", SIFRE_EN_FAZLA);
  const kullaniciId = await istektenKullaniciId(env, istek, simdiSn);

  await oranSiniriUygula(env, "hesap_sil", ip, SINIR_GIRIS_IP, simdiSn);

  const kullanici = await kullaniciGetir(env, kullaniciId);
  const dogru = await sifreDogrula(
    sifre,
    kullanici.sifre_ozeti ?? SAHTE_KAYIT,
    env.PEPPER ?? "",
  );
  if (kullanici.sifre_ozeti === null || !dogru) {
    throw new IstekHatasi("sifre_hatali", 401, "Şifre hatalı.");
  }

  await kullaniciyiSil(env, kullaniciId);
  return jsonYanit({ tamam: true, silindi: true });
}

// ---------------------------------------------------------------------------
// Herkese açık web sayfası
// ---------------------------------------------------------------------------

const HTML_BASLIK: Record<string, string> = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  // Sayfa tamamen kendi içinde; hiçbir dış kaynak yüklemez.
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  "referrer-policy": "no-referrer",
};

/** HTML'e gömülen her kullanıcı girdisi buradan geçer. */
function kacisla(deger: string): string {
  return deger
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sayfa(govde: string): Response {
  return new Response(
    `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Hesap Silme — e-Arşiv Portal</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
         line-height: 1.6; max-width: 34rem; margin: 0 auto; padding: 2rem 1rem; }
  h1 { font-size: 1.5rem; }
  label { display: block; margin-top: 1rem; font-weight: 600; }
  input { width: 100%; box-sizing: border-box; padding: .6rem; font-size: 1rem;
          margin-top: .3rem; border: 1px solid #8888; border-radius: .4rem; }
  button { margin-top: 1.5rem; padding: .7rem 1.2rem; font-size: 1rem;
           border: 0; border-radius: .4rem; background: #b3261e; color: #fff;
           cursor: pointer; }
  .uyari { border: 1px solid #8888; border-radius: .5rem; padding: 1rem; }
  .kucuk { font-size: .9rem; opacity: .8; }
  .hata { color: #b3261e; font-weight: 600; }
  .tamam { color: #1b5e20; font-weight: 600; }
</style>
</head>
<body>
${govde}
<hr>
<p class="kucuk">Bu uygulama Gelir İdaresi Başkanlığı'nın resmi bir ürünü
değildir.</p>
</body>
</html>`,
    { status: 200, headers: HTML_BASLIK },
  );
}

const FORM = `
<h1>Hesabınızı silin</h1>
<div class="uyari">
  <p><strong>Bu işlem geri alınamaz.</strong> Hesabınız silindiğinde e-posta
  adresiniz, uygulama kullanıcı adınız, şifre özetiniz ve tüm oturumlarınız
  sunucudan kalıcı olarak silinir. Dondurma değil, silmedir.</p>
  <p class="kucuk">Telefonunuzdaki GİB verileri (hatırlanan GİB kullanıcı
  kodunuz, alıcı defteriniz ve kayıtlı mal/hizmet adlarınız) bundan
  <strong>etkilenmez</strong> — bunlar zaten sunucuda tutulmuyor, yalnızca
  cihazınızda duruyor. Onları silmek için uygulamayı kaldırabilirsiniz.</p>
</div>
<form method="POST" action="/hesap-sil">
  <label for="eposta">E-posta adresiniz</label>
  <input id="eposta" name="eposta" type="email" autocomplete="email" required>
  <label for="sifre">Uygulama şifreniz</label>
  <input id="sifre" name="sifre" type="password" autocomplete="current-password" required>
  <p class="kucuk">Bu, GİB şifreniz değildir.</p>
  <button type="submit">Hesabımı kalıcı olarak sil</button>
</form>`;

export function hesapSilSayfasi(): Response {
  return sayfa(FORM);
}

const EN_FAZLA_FORM_BAYT = 2048;

/** POST /hesap-sil — herkese açık form. */
export async function hesapSilFormu(
  istek: Request,
  env: Ortam,
  ip: string,
  simdiSn: number,
): Promise<Response> {
  const uzunluk = Number(istek.headers.get("content-length") ?? "0");
  if (uzunluk > EN_FAZLA_FORM_BAYT) {
    return sayfa(`<h1>Hesabınızı silin</h1><p class="hata">Gönderilen veri çok büyük.</p>${FORM}`);
  }

  // `formData()` kullanılıyor: `text()` form-urlencoded gövdede workerd'de
  // uyarı üretiyor ve o uyarı üretim loglarına da düşerdi.
  let alanlar: FormData;
  try {
    alanlar = await istek.formData();
  } catch {
    return sayfa(`<h1>Hesabınızı silin</h1><p class="hata">Form okunamadı.</p>${FORM}`);
  }

  const epostaHam = alanlar.get("eposta");
  const sifreHam = alanlar.get("sifre");
  const eposta = epostaNormalize(
    (typeof epostaHam === "string" ? epostaHam : "").slice(0, EPOSTA_EN_FAZLA),
  );
  const sifre = (typeof sifreHam === "string" ? sifreHam : "").slice(0, SIFRE_EN_FAZLA);

  try {
    await oranSiniriUygula(env, "hesap_sil_web_ip", ip, SINIR_GIRIS_IP, simdiSn);
    await oranSiniriUygula(env, "hesap_sil_web", eposta, SINIR_GIRIS_HESAP, simdiSn);
  } catch {
    return sayfa(
      `<h1>Hesabınızı silin</h1><p class="hata">Çok fazla deneme yaptınız. Lütfen bir süre sonra tekrar deneyin.</p>`,
    );
  }

  const kullanici = await kullaniciEpostadanGetir(env, eposta);
  const dogru = await sifreDogrula(
    sifre,
    kullanici?.sifre_ozeti ?? SAHTE_KAYIT,
    env.PEPPER ?? "",
  );

  if (kullanici === null || kullanici.sifre_ozeti === null || !dogru) {
    // Giriş ucuyla aynı: kullanıcı var mı yok mu ayırt edilmez.
    return sayfa(
      `<h1>Hesabınızı silin</h1><p class="hata">E-posta veya şifre hatalı.</p>${FORM}`,
    );
  }

  await kullaniciyiSil(env, kullanici.id);

  return sayfa(
    `<h1>Hesabınız silindi</h1>
     <p class="tamam">${kacisla(eposta)} adresine ait hesap ve tüm oturumları
     sunucudan kalıcı olarak silindi.</p>
     <p class="kucuk">Telefonunuzdaki GİB verileri silinmedi; uygulamayı
     kaldırarak onları da temizleyebilirsiniz.</p>`,
  );
}
