import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStorage';
import { useAuthStore } from '../store/useAuthStore';
import type { AliciFormu, KayitliAlici } from '../types/faturaForm';

// Eskiden tüm hesaplar TEK bir ortak defteri paylaşıyordu; birden fazla
// mükellefin hesabına giren bir mali müşavir, bir müşterisinin alıcılarını
// (VKN/TCKN, unvan, adres) diğer müşterisi için fatura keserken görüyordu.
// Artık defter, giriş yapan kullanıcı koduna özel bir anahtarda tutuluyor.
const ESKI_ORTAK_DEFTER_KEY = 'gib_alici_defteri';
const DEFTER_ANAHTAR_ONEKI = 'gib_alici_defteri_';
const MAX_KAYIT = 50;

/**
 * Oturumdaki kullanıcı koduna özel SecureStore anahtarı; oturum yoksa null.
 * SecureStore anahtarları yalnızca harf/rakam ve ".", "-", "_" kabul ettiği
 * için kullanıcı kodu, karakter kodlarının onaltılık gösterimine çevriliyor
 * (farklı kodlar asla aynı anahtara düşmez).
 */
function defterAnahtari(): string | null {
  const kod = useAuthStore.getState().kullaniciKodu?.trim();
  if (!kod) return null;
  const hex = Array.from(kod)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join('-');
  return DEFTER_ANAHTAR_ONEKI + hex;
}

/**
 * Eski sürümlerden kalan, hesaplar arası ORTAK defteri cihazdan siler.
 * Kimin alıcısı olduğu bilinemediğinden başka bir hesaba taşınamıyor; bu
 * yüzden silinir (kayıtlı alıcılar yeniden, fatura kesildikçe oluşur).
 */
export async function eskiOrtakAliciDefteriniSil(): Promise<void> {
  await deleteSecureItem(ESKI_ORTAK_DEFTER_KEY);
}

export async function aliciListesiGetir(): Promise<KayitliAlici[]> {
  const anahtar = defterAnahtari();
  if (!anahtar) return [];
  const ham = await getSecureItem(anahtar);
  if (!ham) return [];
  try {
    const liste = JSON.parse(ham);
    return Array.isArray(liste) ? liste : [];
  } catch {
    return [];
  }
}

/** Aynı VKN/TCKN zaten kayıtlıysa günceller (en üste taşır), yoksa yeni ekler. */
export async function aliciKaydet(alici: AliciFormu): Promise<void> {
  const anahtar = defterAnahtari();
  if (!anahtar) return;

  const temizVkn = alici.vknTckn.trim();
  if (!temizVkn) return;

  const mevcut = await aliciListesiGetir();
  const digerleri = mevcut.filter((a) => a.vknTckn.trim() !== temizVkn);
  const yeniListe: KayitliAlici[] = [
    { ...alici, kayitTarihi: new Date().toISOString() },
    ...digerleri,
  ].slice(0, MAX_KAYIT);

  await setSecureItem(anahtar, JSON.stringify(yeniListe));
}
