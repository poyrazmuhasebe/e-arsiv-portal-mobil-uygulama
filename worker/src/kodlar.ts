/**
 * Tek kullanımlık 6 haneli kodlar (e-posta doğrulama ve şifre sıfırlama).
 *
 * Kodun kendisi saklanmaz, yalnızca SHA-256 özeti. Kod kısa ömürlüdür, deneme
 * sayısı sınırlıdır ve bir kez kullanıldıktan sonra geçersizleşir.
 *
 * Neden derin bağlantı (deep link) değil de kod: kod yolu `app.json`'a bir
 * `scheme` eklemeyi, expo-linking/expo-web-browser kurmayı ve development
 * build'e geçmeyi GEREKTİRMEZ — akış Expo Go'da uçtan uca çalışır.
 */

import { rastgeleKimlik, rastgeleSayisalKod, sabitZamanliEsit, sha256Base64Url } from "./kripto";
import type { KodTipi, Ortam } from "./turler";

export const KOD_HANE = 6;
export const KOD_GECERLILIK_SN = 15 * 60;
export const KOD_EN_FAZLA_DENEME = 5;

/**
 * Yeni bir kod üretir ve aynı tipteki önceki kodları geçersiz kılar.
 * Dönen değer, yalnızca e-postayla gönderilmek üzere kullanılmalıdır.
 */
export async function kodOlustur(
  env: Ortam,
  kullaniciId: string,
  tip: KodTipi,
  simdiSn: number,
): Promise<string> {
  const kod = rastgeleSayisalKod(KOD_HANE);
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM tek_kullanimlik_kodlar WHERE kullanici_id = ?1 AND tip = ?2",
    ).bind(kullaniciId, tip),
    env.DB.prepare(
      `INSERT INTO tek_kullanimlik_kodlar
         (id, kullanici_id, tip, kod_ozeti, bitis, deneme, kullanildi, olusturma)
       VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, ?6)`,
    ).bind(
      rastgeleKimlik(),
      kullaniciId,
      tip,
      await sha256Base64Url(kod),
      simdiSn + KOD_GECERLILIK_SN,
      simdiSn,
    ),
  ]);
  return kod;
}

/**
 * Kodu doğrular ve tüketir. Başarısız her denemede sayaç artar; sayaç dolunca
 * kod geçersizleşir (yeni kod istenmesi gerekir).
 */
export async function kodDogrulaVeTuket(
  env: Ortam,
  kullaniciId: string,
  tip: KodTipi,
  kod: string,
  simdiSn: number,
): Promise<boolean> {
  const satir = await env.DB.prepare(
    `SELECT id, kod_ozeti, bitis, deneme, kullanildi
       FROM tek_kullanimlik_kodlar
      WHERE kullanici_id = ?1 AND tip = ?2
      ORDER BY olusturma DESC
      LIMIT 1`,
  )
    .bind(kullaniciId, tip)
    .first<{
      id: string;
      kod_ozeti: string;
      bitis: number;
      deneme: number;
      kullanildi: number;
    }>();

  if (
    satir === null ||
    satir.kullanildi === 1 ||
    satir.bitis <= simdiSn ||
    satir.deneme >= KOD_EN_FAZLA_DENEME
  ) {
    return false;
  }

  const gelenOzet = await sha256Base64Url(kod);
  if (!sabitZamanliEsit(gelenOzet, satir.kod_ozeti)) {
    await env.DB.prepare(
      "UPDATE tek_kullanimlik_kodlar SET deneme = deneme + 1 WHERE id = ?1",
    )
      .bind(satir.id)
      .run();
    return false;
  }

  await env.DB.prepare(
    "UPDATE tek_kullanimlik_kodlar SET kullanildi = 1 WHERE id = ?1",
  )
    .bind(satir.id)
    .run();
  return true;
}
