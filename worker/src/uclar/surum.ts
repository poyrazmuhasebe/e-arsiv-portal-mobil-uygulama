/**
 * GET /v1/surum?platform=android — yayınlanmış en son uygulama sürümü.
 *
 * Oturum GEREKTİRMEZ: kontrol, hesaba giriş yapılmadan (Karşılama ekranında)
 * da çalışmalı. Kişisel veri almaz, döndürmez.
 */

import type { Ortam } from "../turler";
import { IstekHatasi, jsonYanit } from "../yanit";

const PLATFORMLAR = new Set(["android", "ios"]);

interface SurumSatiri {
  surum_kodu: number;
  surum_adi: string;
  indirme_adresi: string | null;
  yayin: number;
}

export interface SurumYaniti {
  platform: string;
  /** Hiç sürüm kaydedilmemişse null (kontrol kimseyi engellemez). */
  sonSurum: {
    kod: number;
    ad: string;
    indirmeAdresi: string | null;
    yayin: number;
  } | null;
}

export async function surumUcu(istek: Request, env: Ortam): Promise<Response> {
  const platform = new URL(istek.url).searchParams.get("platform") ?? "";
  if (!PLATFORMLAR.has(platform)) {
    throw new IstekHatasi("gecersiz_istek", 400, "Geçersiz platform.");
  }

  const satir = await env.DB.prepare(
    `SELECT surum_kodu, surum_adi, indirme_adresi, yayin
       FROM uygulama_surumleri
      WHERE platform = ?1
      ORDER BY surum_kodu DESC
      LIMIT 1`,
  )
    .bind(platform)
    .first<SurumSatiri>();

  const yanit: SurumYaniti = {
    platform,
    sonSurum:
      satir === null
        ? null
        : {
            kod: satir.surum_kodu,
            ad: satir.surum_adi,
            indirmeAdresi: satir.indirme_adresi,
            yayin: satir.yayin,
          },
  };
  return jsonYanit(yanit);
}
