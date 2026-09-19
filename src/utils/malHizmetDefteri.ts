import { getSecureItem, setSecureItem } from './secureStorage';
import { hesabaOzelAnahtar } from './hesapAnahtari';

// "Kayıtlı Mal/Hizmet Adı" defteri: fatura kalemlerinde sık kullanılan
// mal/hizmet adları. Alıcı defteriyle aynı desende, giriş yapılan kullanıcı
// koduna ÖZEL bir anahtarda tutulur (bir mükellefin kalemleri diğerinin
// hesabında görünmez). Yalnızca adlar saklanır (tutar/miktar değil); en son
// kullanılan en başta. Boyut notu için bkz. docs/guvenlik-ve-veri.md.
const DEFTER_ANAHTAR_ONEKI = 'gib_malhizmet_defteri_';
export const MAX_MAL_HIZMET_KAYDI = 50;

function defterAnahtari(): string | null {
  return hesabaOzelAnahtar(DEFTER_ANAHTAR_ONEKI);
}

/** Tekrarları ayırt etmek için: kenar boşlukları kırpılmış, Türkçe küçük harf. */
function karsilastirmaAnahtari(ad: string): string {
  return ad.trim().toLocaleLowerCase('tr-TR');
}

export async function malHizmetListesiGetir(): Promise<string[]> {
  const anahtar = defterAnahtari();
  if (!anahtar) return [];
  const ham = await getSecureItem(anahtar);
  if (!ham) return [];
  try {
    const liste = JSON.parse(ham);
    return Array.isArray(liste) ? liste.filter((a): a is string => typeof a === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Verilen adları defterin başına ekler (sırayla; ilk verilen en üstte). Aynı ad
 * (büyük/küçük harf farkı gözetmeksizin) zaten varsa tekrar eklenmez, en üste
 * taşınır ve son yazılış biçimi saklanır. Boş adlar atlanır. En fazla 50 kayıt.
 * Oturum yoksa ya da cihaz depolaması yazmayı reddederse false.
 */
export async function malHizmetKaydet(adlar: string[]): Promise<boolean> {
  const anahtar = defterAnahtari();
  if (!anahtar) return false;

  const yeniler: string[] = [];
  const gorulen = new Set<string>();
  for (const ham of adlar) {
    const ad = ham.trim();
    const k = karsilastirmaAnahtari(ad);
    if (!ad || gorulen.has(k)) continue;
    gorulen.add(k);
    yeniler.push(ad);
  }
  if (yeniler.length === 0) return true;

  const mevcut = await malHizmetListesiGetir();
  const digerleri = mevcut.filter((a) => !gorulen.has(karsilastirmaAnahtari(a)));
  const yeniListe = [...yeniler, ...digerleri].slice(0, MAX_MAL_HIZMET_KAYDI);
  return setSecureItem(anahtar, JSON.stringify(yeniListe));
}

/** Adı defterden siler. Kayıt yoksa ya da yazma başarısızsa false. */
export async function malHizmetSil(ad: string): Promise<boolean> {
  const anahtar = defterAnahtari();
  if (!anahtar) return false;
  const hedef = karsilastirmaAnahtari(ad);
  const mevcut = await malHizmetListesiGetir();
  const yeniListe = mevcut.filter((a) => karsilastirmaAnahtari(a) !== hedef);
  if (yeniListe.length === mevcut.length) return false;
  return setSecureItem(anahtar, JSON.stringify(yeniListe));
}
