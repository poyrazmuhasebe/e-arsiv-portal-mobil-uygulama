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

/**
 * Bir adın en fazla uzunluğu. GİB kuralı DEĞİL, uygulamanın kendi sınırı:
 * her ad ayrı bir SecureStore değerinde durur ve iOS'ta bir değer ~2 KB'ı
 * geçmemeli (Türkçe karakterler 2 bayt).
 */
export const MAL_HIZMET_AD_EN_UZUN = 500;

export type DefterIslemSonucu = 'tamam' | 'bos' | 'uzun' | 'var' | 'yok' | 'hata';

function adHatasi(ad: string): 'bos' | 'uzun' | null {
  if (!ad) return 'bos';
  if (ad.length > MAL_HIZMET_AD_EN_UZUN) return 'uzun';
  return null;
}

/**
 * "Mal/Hizmet Defteri" ekranından elle ekleme: en üste eklenir. Aynı ad
 * (büyük/küçük harf farkı gözetmeksizin) zaten varsa EKLENMEZ, 'var' döner
 * (fatura sonrası otomatik kaydın aksine sessizce taşımaz; kullanıcı
 * bilgilendirilir). Defter doluysa en eski kayıt düşer.
 */
export async function malHizmetEkle(hamAd: string): Promise<DefterIslemSonucu> {
  const ad = hamAd.trim();
  const hata = adHatasi(ad);
  if (hata) return hata;
  const k = karsilastirmaAnahtari(ad);
  let zatenVar = false;
  const basarili = await defterGuncelle(MAL_HIZMET_DEFTERI, (mevcut) => {
    if (mevcut.some((a) => karsilastirmaAnahtari(a) === k)) {
      zatenVar = true;
      return null;
    }
    return [ad, ...mevcut].slice(0, MAX_MAL_HIZMET_KAYDI);
  });
  if (zatenVar) return 'var';
  return basarili ? 'tamam' : 'hata';
}

/**
 * Bir adı değiştirir; kaydın sıradaki yeri korunur. Yeni ad BAŞKA bir
 * kayıtla aynıysa 'var' (iki kayıt birleşmez; kullanıcı önce diğerini
 * silmeli). Yalnızca büyük/küçük harf ya da boşluk değişikliği serbesttir.
 * Eski ad bulunamazsa 'yok'.
 */
export async function malHizmetAdiniDegistir(eskiAd: string, hamYeniAd: string): Promise<DefterIslemSonucu> {
  const yeniAd = hamYeniAd.trim();
  const hata = adHatasi(yeniAd);
  if (hata) return hata;
  const eskiK = karsilastirmaAnahtari(eskiAd);
  const yeniK = karsilastirmaAnahtari(yeniAd);
  // `as`: kapanış içinde atandığı için TS'nin 'tamam'a daraltmasını önler.
  let sonuc = 'tamam' as DefterIslemSonucu;
  const basarili = await defterGuncelle(MAL_HIZMET_DEFTERI, (mevcut) => {
    const sira = mevcut.findIndex((a) => karsilastirmaAnahtari(a) === eskiK);
    if (sira < 0) {
      sonuc = 'yok';
      return null;
    }
    if (yeniK !== eskiK && mevcut.some((a) => karsilastirmaAnahtari(a) === yeniK)) {
      sonuc = 'var';
      return null;
    }
    if (mevcut[sira] === yeniAd) return null; // değişiklik yok
    const yeni = [...mevcut];
    yeni[sira] = yeniAd;
    return yeni;
  });
  if (sonuc !== 'tamam') return sonuc;
  // Değişiklik yoksa defterGuncelle false döner ama bu bir hata değil.
  return basarili || (await malHizmetListesiGetir()).includes(yeniAd) ? 'tamam' : 'hata';
}

/** Adı defterden siler. Kayıt yoksa ya da yazma başarısızsa false. */
export async function malHizmetSil(ad: string): Promise<boolean> {
  const hedef = karsilastirmaAnahtari(ad);
  return defterGuncelle(MAL_HIZMET_DEFTERI, (mevcut) => {
    const yeniListe = mevcut.filter((a) => karsilastirmaAnahtari(a) !== hedef);
    return yeniListe.length === mevcut.length ? null : yeniListe;
  });
}
