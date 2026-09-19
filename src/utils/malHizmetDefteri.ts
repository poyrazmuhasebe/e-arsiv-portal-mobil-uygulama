import { defterGuncelle, defterOku, type DefterTanimi } from './bolunmusDefter';
import { hesapKimligi } from './hesapAnahtari';

// "Kayıtlı Mal/Hizmet Adı" defteri: fatura kalemlerinde sık kullanılan
// mal/hizmet adları. Alıcı defteriyle aynı desende, giriş yapılan kullanıcı
// koduna ÖZEL anahtarlarda ve her ad ayrı bir anahtarda tutulur (bkz.
// bolunmusDefter.ts; bir mükellefin kalemleri diğerinin hesabında görünmez).
// Yalnızca adlar saklanır (tutar/miktar değil); en son kullanılan en başta.
// Tek değerli önceki biçim (`gib_malhizmet_defteri_<hex>`) ilk erişimde
// taşınır. Boyut notu için bkz. docs/guvenlik-ve-veri.md.
export const MAX_MAL_HIZMET_KAYDI = 50;

const MAL_HIZMET_DEFTERI: DefterTanimi<string> = {
  onek: 'gib_malhizmet',
  eskiOnek: 'gib_malhizmet_defteri_',
  enFazla: MAX_MAL_HIZMET_KAYDI,
  kayitMi: (deger): deger is string => typeof deger === 'string',
};

/** Tekrarları ayırt etmek için: kenar boşlukları kırpılmış, Türkçe küçük harf. */
function karsilastirmaAnahtari(ad: string): string {
  return ad.trim().toLocaleLowerCase('tr-TR');
}

export async function malHizmetListesiGetir(): Promise<string[]> {
  return defterOku(MAL_HIZMET_DEFTERI);
}

/**
 * Verilen adları defterin başına ekler (sırayla; ilk verilen en üstte). Aynı ad
 * (büyük/küçük harf farkı gözetmeksizin) zaten varsa tekrar eklenmez, en üste
 * taşınır ve son yazılış biçimi saklanır. Boş adlar atlanır. En fazla 50 kayıt.
 * Oturum yoksa ya da cihaz depolaması yazmayı reddederse false.
 */
export async function malHizmetKaydet(adlar: string[]): Promise<boolean> {
  const yeniler: string[] = [];
  const gorulen = new Set<string>();
  for (const ham of adlar) {
    const ad = ham.trim();
    const k = karsilastirmaAnahtari(ad);
    if (!ad || gorulen.has(k)) continue;
    gorulen.add(k);
    yeniler.push(ad);
  }
  if (yeniler.length === 0) return hesapKimligi() !== null;

  return defterGuncelle(MAL_HIZMET_DEFTERI, (mevcut) => {
    const digerleri = mevcut.filter((a) => !gorulen.has(karsilastirmaAnahtari(a)));
    return [...yeniler, ...digerleri].slice(0, MAX_MAL_HIZMET_KAYDI);
  });
}

/** Adı defterden siler. Kayıt yoksa ya da yazma başarısızsa false. */
export async function malHizmetSil(ad: string): Promise<boolean> {
  const hedef = karsilastirmaAnahtari(ad);
  return defterGuncelle(MAL_HIZMET_DEFTERI, (mevcut) => {
    const yeniListe = mevcut.filter((a) => karsilastirmaAnahtari(a) !== hedef);
    return yeniListe.length === mevcut.length ? null : yeniListe;
  });
}
