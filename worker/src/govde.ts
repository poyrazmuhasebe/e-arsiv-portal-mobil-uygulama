/**
 * İstek gövdesinin okunması ve sıkı doğrulanması.
 *
 * Kural: her uç nokta YALNIZCA izin verilen alanları kabul eder ve bilinmeyen
 * bir alan görürse isteği reddeder. Bu, "GİB verisi Worker'a gitmez" kuralının
 * sunucu tarafındaki bekçisidir: uygulamada bir hata olup gövdeye fazladan bir
 * alan (ör. gibToken) eklense bile Worker bunu reddeder ve kaydetmez.
 */

import { IstekHatasi } from "./yanit";

const EN_FAZLA_GOVDE_BAYT = 4096;

export async function govdeOku(
  istek: Request,
  izinliAlanlar: readonly string[],
): Promise<Record<string, unknown>> {
  const tip = istek.headers.get("content-type") ?? "";
  if (!tip.toLowerCase().includes("application/json")) {
    throw new IstekHatasi("gecersiz_icerik_tipi", 415, "İstek biçimi geçersiz.");
  }

  const uzunlukBasligi = istek.headers.get("content-length");
  if (uzunlukBasligi !== null && Number(uzunlukBasligi) > EN_FAZLA_GOVDE_BAYT) {
    throw new IstekHatasi("govde_cok_buyuk", 413, "Gönderilen veri çok büyük.");
  }

  const metin = await istek.text();
  if (metin.length > EN_FAZLA_GOVDE_BAYT) {
    throw new IstekHatasi("govde_cok_buyuk", 413, "Gönderilen veri çok büyük.");
  }

  let cozulmus: unknown;
  try {
    cozulmus = JSON.parse(metin);
  } catch {
    throw new IstekHatasi("gecersiz_govde", 400, "İstek biçimi geçersiz.");
  }

  if (
    typeof cozulmus !== "object" ||
    cozulmus === null ||
    Array.isArray(cozulmus)
  ) {
    throw new IstekHatasi("gecersiz_govde", 400, "İstek biçimi geçersiz.");
  }

  const govde = cozulmus as Record<string, unknown>;
  for (const alan of Object.keys(govde)) {
    if (!izinliAlanlar.includes(alan)) {
      // Alan ADI hata kodunda geçmez; yalnızca sabit bir kod döner. Alanın
      // DEĞERİ hiçbir yerde loglanmaz.
      throw new IstekHatasi(
        "bilinmeyen_alan",
        400,
        "İstek tanınmayan bir alan içeriyor.",
      );
    }
  }

  return govde;
}

/** Zorunlu metin alanı. Tip yanlışsa ya da boşsa hata fırlatır. */
export function metinAl(
  govde: Record<string, unknown>,
  alan: string,
  enFazla: number,
): string {
  const deger = govde[alan];
  if (typeof deger !== "string") {
    throw new IstekHatasi("eksik_alan", 400, "Lütfen tüm alanları doldurun.");
  }
  if (deger.length > enFazla) {
    throw new IstekHatasi("alan_cok_uzun", 400, "Girilen değer çok uzun.");
  }
  return deger;
}
