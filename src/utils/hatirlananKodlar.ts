/**
 * Hatırlanan GİB kullanıcı kodları — UYGULAMA HESABINA ÖZEL bir liste.
 *
 * NEDEN: Bir kullanıcı (ör. mali müşavir) birden fazla GİB kullanıcı koduyla
 * giriş yapabilir. Eskiden cihazda TEK bir `gib_hatirlanan_kullanici_kodu`
 * vardı: yalnızca son girilen kod hatırlanıyor, üstelik aynı telefondaki
 * BAŞKA bir uygulama hesabının giriş formuna da dolduruluyordu.
 *
 * Artık her uygulama hesabının kendi listesi var (en yeni başta, en fazla
 * EN_FAZLA_KOD). Hesapsız kullanım için ayrı bir "demo" listesi vardır
 * (eski "Şimdilik atla" modundan kalma; o mod 2026-09-22'de kaldırıldı).
 * Şifre hiçbir zaman saklanmaz; yalnızca kullanıcı kodları.
 *
 * Eski tekil anahtar, onu ilk okuyan hesabın listesine TAŞINIR ve silinir
 * (kimin olduğu bilinemez; zaten cihazdaki herkese görünüyordu).
 */

import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStorage';

export const ESKI_HATIRLANAN_KOD_KEY = 'gib_hatirlanan_kullanici_kodu';
const ONEK = 'gib_hatirlanan_kodlar_';
export const EN_FAZLA_KOD = 10;
const EN_UZUN_KOD = 64;

/**
 * SecureStore anahtarları yalnızca harf/rakam ve ".", "-", "_" kabul eder;
 * hesap kimliği onaltılık karakter kodlarına çevrilir (hesapAnahtari.ts ile
 * aynı yöntem). Hesap yoksa "demo".
 */
export function hatirlananKodlarAnahtari(hesapId: string | null): string {
  if (!hesapId) return `${ONEK}demo`;
  return (
    ONEK +
    Array.from(hesapId)
      .map((c) => c.codePointAt(0)!.toString(16))
      .join('-')
  );
}

function temizle(kodlar: unknown): string[] {
  if (!Array.isArray(kodlar)) return [];
  const sonuc: string[] = [];
  for (const k of kodlar) {
    if (typeof k !== 'string') continue;
    const kod = k.trim();
    if (!kod || kod.length > EN_UZUN_KOD || sonuc.includes(kod)) continue;
    sonuc.push(kod);
    if (sonuc.length >= EN_FAZLA_KOD) break;
  }
  return sonuc;
}

async function yaz(hesapId: string | null, kodlar: string[]): Promise<void> {
  const anahtar = hatirlananKodlarAnahtari(hesapId);
  if (kodlar.length === 0) await deleteSecureItem(anahtar);
  else await setSecureItem(anahtar, JSON.stringify(kodlar));
}

/** Hesabın hatırlanan kodları, en son kullanılan başta. */
export async function hatirlananKodlariOku(hesapId: string | null): Promise<string[]> {
  let kodlar: string[] = [];
  const ham = await getSecureItem(hatirlananKodlarAnahtari(hesapId));
  if (ham) {
    try {
      kodlar = temizle(JSON.parse(ham));
    } catch {
      kodlar = [];
    }
  }

  // Eski tekil anahtar: bu hesaba taşı, sonra sil.
  const eski = (await getSecureItem(ESKI_HATIRLANAN_KOD_KEY))?.trim();
  if (eski) {
    kodlar = temizle([...kodlar, eski]);
    await yaz(hesapId, kodlar);
    await deleteSecureItem(ESKI_HATIRLANAN_KOD_KEY);
  }
  return kodlar;
}

/** Başarılı girişten sonra: kodu listenin başına al. */
export async function koduHatirla(hesapId: string | null, kod: string): Promise<void> {
  const mevcut = await hatirlananKodlariOku(hesapId);
  await yaz(hesapId, temizle([kod, ...mevcut]));
}

/**
 * Kayıt ekranı için: henüz hesap yokken cihazda bilinen kodlar (hesapsız
 * listesi + taşınmamış eski tekil anahtar). Yalnızca "kullanıcı adı GİB
 * kodunuzla aynı olmasın" uyarısı için CİHAZDA karşılaştırılır; hiçbir şey
 * taşınmaz ya da silinmez, sunucuya gönderilmez.
 */
export async function kayitIcinBilinenKodlar(): Promise<string[]> {
  const ham = await getSecureItem(hatirlananKodlarAnahtari(null));
  let kodlar: string[] = [];
  if (ham) {
    try {
      kodlar = temizle(JSON.parse(ham));
    } catch {
      kodlar = [];
    }
  }
  const eski = (await getSecureItem(ESKI_HATIRLANAN_KOD_KEY))?.trim();
  return eski ? temizle([...kodlar, eski]) : kodlar;
}

/** "Hatırla" kapalıyken girildiyse ya da kullanıcı kodu listeden sildiyse. */
export async function koduUnut(hesapId: string | null, kod: string): Promise<string[]> {
  const kalan = (await hatirlananKodlariOku(hesapId)).filter((k) => k !== kod.trim());
  await yaz(hesapId, kalan);
  return kalan;
}

/** Uygulama hesabı silinince: o hesabın hatırlanan kodları cihazda kalmasın. */
export async function hesabinKodlariniSil(hesapId: string): Promise<void> {
  await deleteSecureItem(hatirlananKodlarAnahtari(hesapId));
}
