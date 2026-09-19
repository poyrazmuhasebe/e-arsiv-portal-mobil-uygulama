/**
 * Sabit pencereli oran sınırlama (D1 üzerinde).
 *
 * Anahtarlar kişisel veri İÇERMEZ: e-posta ve IP adresi doğrudan yazılmaz,
 * SHA-256 özetleri kullanılır. Böylece oran sınırlama tablosu sızsa bile
 * kimin ne zaman giriş denediği okunamaz.
 */

import { sha256Base64Url } from "./kripto";
import type { Ortam } from "./turler";
import { IstekHatasi } from "./yanit";

export interface OranSiniri {
  /** Pencere başına izin verilen istek sayısı. */
  limit: number;
  /** Pencere uzunluğu, saniye. */
  pencereSn: number;
}

export const SINIR_GIRIS_IP: OranSiniri = { limit: 20, pencereSn: 600 };
export const SINIR_GIRIS_HESAP: OranSiniri = { limit: 8, pencereSn: 600 };
export const SINIR_KAYIT_IP: OranSiniri = { limit: 5, pencereSn: 3600 };
export const SINIR_SIFIRLAMA_IP: OranSiniri = { limit: 10, pencereSn: 3600 };
export const SINIR_SIFIRLAMA_HESAP: OranSiniri = { limit: 5, pencereSn: 3600 };
export const SINIR_KOD_GONDER: OranSiniri = { limit: 1, pencereSn: 60 };
export const SINIR_KOD_DOGRULA: OranSiniri = { limit: 15, pencereSn: 600 };

/** Eski satırlar her seferinde değil, yaklaşık %2 olasılıkla temizlenir. */
const TEMIZLIK_OLASILIGI = 0.02;

/**
 * Sayacı bir artırır. Limit aşıldıysa 429 fırlatır.
 *
 * `bilesen` kişisel veri olabilir (IP, e-posta) — özetlenerek saklanır.
 */
export async function oranSiniriUygula(
  env: Ortam,
  kapsam: string,
  bilesen: string,
  sinir: OranSiniri,
  simdiSn: number,
): Promise<void> {
  const anahtar = `${kapsam}:${await sha256Base64Url(bilesen)}`;
  const pencere = Math.floor(simdiSn / sinir.pencereSn);

  const satir = await env.DB.prepare(
    `INSERT INTO oran_sinir (anahtar, pencere, sayac) VALUES (?1, ?2, 1)
     ON CONFLICT(anahtar) DO UPDATE SET
       sayac = CASE WHEN oran_sinir.pencere = excluded.pencere
                    THEN oran_sinir.sayac + 1
                    ELSE 1 END,
       pencere = excluded.pencere
     RETURNING sayac`,
  )
    .bind(anahtar, pencere)
    .first<{ sayac: number }>();

  if (Math.random() < TEMIZLIK_OLASILIGI) {
    await env.DB.prepare("DELETE FROM oran_sinir WHERE pencere < ?1")
      .bind(pencere - 2)
      .run();
  }

  if (satir !== null && satir.sayac > sinir.limit) {
    throw new IstekHatasi(
      "oran_siniri",
      429,
      "Çok fazla deneme yaptınız. Lütfen bir süre sonra tekrar deneyin.",
    );
  }
}
