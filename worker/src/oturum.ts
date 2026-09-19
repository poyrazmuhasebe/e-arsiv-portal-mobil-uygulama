/**
 * Oturum yönetimi.
 *
 * - Erişim token'ı: HS256 imzalı, 1 saat, sunucuda saklanmaz.
 * - Yenileme token'ı: 256 bit rastgele, 60 gün, her yenilemede döndürülür
 *   (rotasyon). Veritabanında token'ın KENDİSİ değil, SHA-256 özeti durur.
 * - Çerez kullanılmaz.
 *
 * Erişim token'ının 1 saat olması bilinçli: uygulama, cihazda kayıtlı yenileme
 * token'ının yerel bitiş tarihi geçmediği sürece Worker'a hiç sormadan GİB
 * ekranına geçebiliyor (çevrimdışı kararı, docs/hesap-sistemi.md). Artık risk:
 * sunucuda iptal edilen bir oturum, erişim token'ının süresi dolana kadar
 * cihazda çalışmaya devam eder.
 */

import {
  rastgeleBase64Url,
  rastgeleKimlik,
  sha256Base64Url,
  tokenDogrula,
  tokenUret,
} from "./kripto";
import type { Ortam } from "./turler";
import { IstekHatasi } from "./yanit";

export const ERISIM_SURESI_SN = 60 * 60;
export const YENILEME_SURESI_SN = 60 * 60 * 24 * 60;

export interface OturumYaniti {
  erisimToken: string;
  erisimBitis: number;
  yenilemeToken: string;
  yenilemeBitis: number;
}

export async function oturumOlustur(
  env: Ortam,
  kullaniciId: string,
  simdiSn: number,
): Promise<OturumYaniti> {
  const yenilemeToken = rastgeleBase64Url(32);
  const yenilemeBitis = simdiSn + YENILEME_SURESI_SN;

  await env.DB.prepare(
    `INSERT INTO oturumlar (id, kullanici_id, yenileme_ozeti, bitis, iptal, olusturma)
     VALUES (?1, ?2, ?3, ?4, 0, ?5)`,
  )
    .bind(
      rastgeleKimlik(),
      kullaniciId,
      await sha256Base64Url(yenilemeToken),
      yenilemeBitis,
      simdiSn,
    )
    .run();

  const erisimBitis = simdiSn + ERISIM_SURESI_SN;
  const erisimToken = await tokenUret(
    { sub: kullaniciId, iat: simdiSn, exp: erisimBitis, tur: "erisim" },
    env.OTURUM_IMZA_ANAHTARI,
  );

  return { erisimToken, erisimBitis, yenilemeToken, yenilemeBitis };
}

/**
 * Yenileme token'ını kullanır ve yenisiyle değiştirir (rotasyon). Geçersiz,
 * süresi dolmuş ya da iptal edilmiş token'da `null` döner.
 */
export async function oturumYenile(
  env: Ortam,
  yenilemeToken: string,
  simdiSn: number,
): Promise<{ oturum: OturumYaniti; kullaniciId: string } | null> {
  const ozet = await sha256Base64Url(yenilemeToken);
  const satir = await env.DB.prepare(
    `SELECT id, kullanici_id, bitis, iptal FROM oturumlar WHERE yenileme_ozeti = ?1`,
  )
    .bind(ozet)
    .first<{ id: string; kullanici_id: string; bitis: number; iptal: number }>();

  if (satir === null || satir.iptal === 1 || satir.bitis <= simdiSn) return null;

  // Eski satır silinip yenisi yazılır: kullanılmış bir yenileme token'ı bir
  // daha geçmez.
  await env.DB.prepare("DELETE FROM oturumlar WHERE id = ?1").bind(satir.id).run();
  const oturum = await oturumOlustur(env, satir.kullanici_id, simdiSn);
  return { oturum, kullaniciId: satir.kullanici_id };
}

export async function oturumIptal(
  env: Ortam,
  yenilemeToken: string,
): Promise<void> {
  await env.DB.prepare("DELETE FROM oturumlar WHERE yenileme_ozeti = ?1")
    .bind(await sha256Base64Url(yenilemeToken))
    .run();
}

export async function tumOturumlariIptal(
  env: Ortam,
  kullaniciId: string,
): Promise<void> {
  await env.DB.prepare("DELETE FROM oturumlar WHERE kullanici_id = ?1")
    .bind(kullaniciId)
    .run();
}

/** Authorization başlığındaki erişim token'ından kullanıcı kimliğini çıkarır. */
export async function istektenKullaniciId(
  env: Ortam,
  istek: Request,
  simdiSn: number,
): Promise<string> {
  const baslik = istek.headers.get("authorization") ?? "";
  if (!baslik.startsWith("Bearer ")) {
    throw new IstekHatasi("oturum_yok", 401, "Oturumunuz sona erdi, lütfen tekrar giriş yapın.");
  }
  const yuk = await tokenDogrula(baslik.slice(7), env.OTURUM_IMZA_ANAHTARI, simdiSn);
  if (yuk === null) {
    throw new IstekHatasi("oturum_gecersiz", 401, "Oturumunuz sona erdi, lütfen tekrar giriş yapın.");
  }
  return yuk.sub;
}
