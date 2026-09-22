/**
 * Zorunlu güncelleme kontrolü (beta süreci, karar 2026-09-22).
 *
 * Her yeni APK'nın sürüm kodu (Android versionCode) `npm run surum:yayinla`
 * ile hesap sunucusundaki `uygulama_surumleri` tablosuna yazılır. Uygulama
 * her açılışta ve arka plandan her dönüşte en son sürümü sorar; cihazdaki
 * sürüm kodu daha DÜŞÜKSE kapatılamayan "güncelleyin" kutusu gösterilir ve
 * uygulama kullanılamaz (components/GuncellemeKutusu.tsx).
 *
 * AĞ HATASINDA ENGELLEMEZ: sunucuya ulaşılamazsa, yanıt bozuksa ya da
 * sunucuda hiç sürüm kaydı yoksa sonuç "bilinmiyor" olur ve uygulama açık
 * kalır. Aksi hâlde Cloudflare kesintisi ya da çevrimdışı telefon uygulamayı
 * tamamen kilitlerdi (useHesapStore'daki çevrimdışı kararla aynı gerekçe).
 */

import { sonSurumuGetir, type SonSurum } from '../services/hesapApi';

/** Arka plandan dönüşlerde en fazla bu sıklıkta sorulur. */
export const KONTROL_ARALIGI_MS = 60_000;

export type SurumDurumu =
  | { tur: 'guncel' }
  | { tur: 'bilinmiyor' }
  | { tur: 'guncelleme_gerekli'; yukluKod: number; son: SonSurum };

function gecerliKod(kod: unknown): kod is number {
  return typeof kod === 'number' && Number.isInteger(kod) && kod > 0;
}

/** Sunucudan gelen kaydı doğrular; bozuksa null. İndirme adresi yalnızca https. */
export function sonSurumuDogrula(ham: unknown): SonSurum | null {
  if (ham === null || typeof ham !== 'object') return null;
  const s = ham as Record<string, unknown>;
  if (!gecerliKod(s.kod) || typeof s.ad !== 'string') return null;
  const adres =
    typeof s.indirmeAdresi === 'string' && s.indirmeAdresi.startsWith('https://') ? s.indirmeAdresi : null;
  return { kod: s.kod, ad: s.ad, indirmeAdresi: adres, yayin: typeof s.yayin === 'number' ? s.yayin : 0 };
}

/** Saf karar: yüklü sürüm kodu son sürümden düşükse güncelleme gerekir. */
export function surumDurumu(yukluKod: number | null | undefined, son: SonSurum | null): SurumDurumu {
  if (!gecerliKod(yukluKod) || son === null) return { tur: 'bilinmiyor' };
  return yukluKod < son.kod ? { tur: 'guncelleme_gerekli', yukluKod, son } : { tur: 'guncel' };
}

/**
 * Sunucuya sorar; her türlü hatada "bilinmiyor" döner (engellemez).
 * Şimdilik yalnızca Android: iOS derlemesi yok.
 */
export async function surumuDenetle(
  platform: string,
  yukluKod: number | null | undefined,
  gelistirmeMi: boolean,
): Promise<SurumDurumu> {
  if (platform !== 'android' || !gecerliKod(yukluKod)) return { tur: 'bilinmiyor' };
  try {
    const yanit = await sonSurumuGetir('android', gelistirmeMi);
    return surumDurumu(yukluKod, sonSurumuDogrula(yanit?.sonSurum));
  } catch {
    return { tur: 'bilinmiyor' };
  }
}
