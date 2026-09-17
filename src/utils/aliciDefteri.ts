import { getSecureItem, setSecureItem } from './secureStorage';
import type { AliciFormu, KayitliAlici } from '../types/faturaForm';

const ALICI_DEFTERI_KEY = 'gib_alici_defteri';
const MAX_KAYIT = 50;

export async function aliciListesiGetir(): Promise<KayitliAlici[]> {
  const ham = await getSecureItem(ALICI_DEFTERI_KEY);
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
  const temizVkn = alici.vknTckn.trim();
  if (!temizVkn) return;

  const mevcut = await aliciListesiGetir();
  const digerleri = mevcut.filter((a) => a.vknTckn.trim() !== temizVkn);
  const yeniListe: KayitliAlici[] = [
    { ...alici, kayitTarihi: new Date().toISOString() },
    ...digerleri,
  ].slice(0, MAX_KAYIT);

  await setSecureItem(ALICI_DEFTERI_KEY, JSON.stringify(yeniListe));
}
