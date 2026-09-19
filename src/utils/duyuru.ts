import type { Duyuru } from '../constants/duyurular';
import { getSecureItem, setSecureItem } from './secureStorage';

// Kullanıcının kapattığı duyuruların kimlikleri. Hesaba özel değildir (duyurular
// herkese aynıdır ve giriş ekranında, oturum açılmadan gösterilir).
const KAPATILAN_DUYURULAR_KEY = 'gib_kapatilan_duyurular';

/**
 * Gösterilecek ilk duyuru: süresi (`bitis`) dolmamış ve kullanıcının
 * kapatmadığı. Tarihi okunamayan bir duyuru gösterilmez (güvenli taraf).
 */
export function gosterilecekDuyuru(
  duyurular: readonly Duyuru[],
  simdi: Date,
  kapatilanlar: ReadonlySet<string>,
): Duyuru | null {
  for (const d of duyurular) {
    const bitis = Date.parse(d.bitis);
    if (Number.isNaN(bitis) || simdi.getTime() > bitis) continue;
    if (kapatilanlar.has(d.id)) continue;
    return d;
  }
  return null;
}

export async function kapatilanDuyurulariGetir(): Promise<Set<string>> {
  const ham = await getSecureItem(KAPATILAN_DUYURULAR_KEY);
  if (!ham) return new Set();
  try {
    const liste = JSON.parse(ham);
    return new Set(Array.isArray(liste) ? liste.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

/**
 * Duyuruyu kapatılmış olarak hatırlar. Yalnızca hâlâ tanımlı duyuruların
 * kimlikleri saklanır; böylece liste zamanla büyümez.
 */
export async function duyuruyuKapat(id: string, tanimliIdler: readonly string[]): Promise<void> {
  const mevcut = await kapatilanDuyurulariGetir();
  mevcut.add(id);
  const saklanacak = [...mevcut].filter((x) => tanimliIdler.includes(x));
  await setSecureItem(KAPATILAN_DUYURULAR_KEY, JSON.stringify(saklanacak));
}
