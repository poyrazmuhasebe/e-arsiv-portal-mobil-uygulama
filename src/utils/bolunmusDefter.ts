import { deleteSecureItem, secureItemOku, setSecureItem } from './secureStorage';
import { hesapKimligi } from './hesapAnahtari';

// Hesaba özel, kayıt başına ayrı SecureStore anahtarına bölünmüş defter.
//
// Neden: eskiden her defter TEK bir SecureStore değerinde JSON dizi olarak
// duruyordu (dolu bir alıcı defteri ~13,5 KB, uçta ~48 KB). SecureStore
// dokümanı büyük değerlerin reddedilebileceğini söylüyor (sabit bir sınır
// belgelemeden); tasarım tek bir büyük değere bağlı kalmasın diye her kayıt
// artık kendi anahtarında (en büyüğü ~1 KB). Ayrıntı: docs/guvenlik-ve-veri.md.
//
// Anahtarlar (<hex>: hesapAnahtari.ts; yalnızca [0-9a-f-], "_" içermez):
//   <onek>_dizin_<hex>          {"v":1,"k":[yuvalar, liste sırasıyla],"t":[...]}
//   <onek>_kayit_<hex>_<yuva>   tek kaydın JSON'u; yuva 0 … 2×enFazla−1
//
// Yarım yazma güvenliği: dizin tek başına küçük bir değerdir ve yazılması
// "kesinleştirme" anıdır. Yeni/değişen kayıtlar önce mevcut dizinin
// KULLANMADIĞI yuvalara yazılır, en son dizin yazılır; işlem herhangi bir
// noktada kesilirse okunan defter ya tamamen eski ya tamamen yeni hâlidir.
// SecureStore anahtarları listeleyemediği için, veri içerebilecek ama dizinde
// olmayan (sahipsiz) yuvalar dizinin "t" alanında kesin olarak tutulur ve bir
// sonraki yazmada silinir; hiçbir zaman 100 yuvanın hepsi taranmaz (Android'de
// her silme diske senkron yazar). Yuva sayısı 2×enFazla'dır: dizindeki en
// fazla enFazla yuvaya dokunmadan tek seferde enFazla yeni kayıt yazılabilsin.

export interface DefterTanimi<T> {
  /** Yeni biçimin anahtar öneki, ör. 'gib_alici'. */
  onek: string;
  /** Eski (tek değerli) biçimin hesaba özel öneki, ör. 'gib_alici_defteri_'. */
  eskiOnek: string;
  enFazla: number;
  /** Okunan bir kaydın kullanılabilir olup olmadığı (bozuk kayıtlar atlanır). */
  kayitMi: (deger: unknown) => deger is T;
}

interface Anahtarlar {
  dizin: string;
  eski: string;
  kayit: (yuva: number) => string;
  yuvalar: number[];
}

type DizinDurumu =
  | { durum: 'yok' }
  | { durum: 'bozuk' }
  | { durum: 'hata' }
  | { durum: 'tamam'; k: number[]; t: number[] };

interface Girdi<T> {
  yuva: number;
  ham: string;
  deger: T;
}

function anahtarlar<T>(tanim: DefterTanimi<T>): Anahtarlar | null {
  const kimlik = hesapKimligi();
  if (kimlik === null) return null;
  return {
    dizin: `${tanim.onek}_dizin_${kimlik}`,
    eski: tanim.eskiOnek + kimlik,
    kayit: (yuva) => `${tanim.onek}_kayit_${kimlik}_${yuva}`,
    yuvalar: Array.from({ length: 2 * tanim.enFazla }, (_, i) => i),
  };
}

/** JSON.parse; bozuksa undefined (JSON.parse hiçbir zaman undefined döndürmez). */
function jsonCoz(ham: string): unknown {
  try {
    return JSON.parse(ham);
  } catch {
    return undefined;
  }
}

function ayniDizi<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function birlesim(...diziler: number[][]): number[] {
  return [...new Set(diziler.flat())].sort((a, b) => a - b);
}

// Aynı defter üzerindeki işlemler (oku-değiştir-yaz) sırayla çalışır; ör. iki
// kayıt aynı anda gelirse aynı boş yuvayı paylaşmasınlar.
const kuyruklar = new Map<string, Promise<unknown>>();

function sirayla<R>(anahtar: string, is: () => Promise<R>): Promise<R> {
  const onceki = kuyruklar.get(anahtar) ?? Promise.resolve();
  const sonraki = onceki.then(is, is);
  kuyruklar.set(
    anahtar,
    sonraki.catch(() => undefined),
  );
  return sonraki;
}

async function dizinOku(a: Anahtarlar): Promise<DizinDurumu> {
  const okuma = await secureItemOku(a.dizin);
  if (!okuma.basarili) return { durum: 'hata' };
  if (okuma.deger === null) return { durum: 'yok' };
  const d = jsonCoz(okuma.deger) as { v?: unknown; k?: unknown; t?: unknown } | null | undefined;
  if (!d || typeof d !== 'object' || d.v !== 1 || !Array.isArray(d.k) || !Array.isArray(d.t)) {
    return { durum: 'bozuk' };
  }
  const gecerli = (y: unknown): y is number => Number.isInteger(y) && a.yuvalar.includes(y as number);
  const k = [...new Set(d.k.filter(gecerli))];
  const t = [...new Set(d.t.filter(gecerli))].filter((y) => !k.includes(y));
  return { durum: 'tamam', k, t };
}

function dizinYaz(a: Anahtarlar, k: number[], t: number[]): Promise<boolean> {
  return setSecureItem(a.dizin, JSON.stringify({ v: 1, k, t }));
}

/** Dizindeki kayıtları sırayla okur; eksik/bozuk kayıtlar atlanır. */
async function kayitlariOku<T>(
  tanim: DefterTanimi<T>,
  a: Anahtarlar,
  k: number[],
): Promise<{ girdiler: Girdi<T>[]; okumaHatasi: boolean }> {
  const okumalar = await Promise.all(k.map((yuva) => secureItemOku(a.kayit(yuva))));
  const girdiler: Girdi<T>[] = [];
  let okumaHatasi = false;
  okumalar.forEach((okuma, i) => {
    if (!okuma.basarili) {
      okumaHatasi = true;
      return;
    }
    if (okuma.deger === null) return;
    const deger = jsonCoz(okuma.deger);
    if (tanim.kayitMi(deger)) girdiler.push({ yuva: k[i], ham: okuma.deger, deger });
  });
  return { girdiler, okumaHatasi };
}

/** Eski tek değerli defteri çözer; JSON bozuksa ya da dizi değilse null. */
function eskiDefteriCoz<T>(tanim: DefterTanimi<T>, ham: string): T[] | null {
  const liste = jsonCoz(ham);
  if (!Array.isArray(liste)) return null;
  return liste.filter(tanim.kayitMi).slice(0, tanim.enFazla);
}

interface TasimaSonucu<T> {
  /** false ise bu defter üzerinde yazma yapılmamalı. */
  yazilabilir: boolean;
  /** Taşıma tamamlanamadıysa, okumada gösterilecek eski defter içeriği. */
  eskiListe?: T[];
}

/**
 * Eski biçimdeki (tek değerli) defteri, varsa, yeni biçime taşır. Her işlemin
 * başında çalışır; eski anahtar yoksa tek bir okumaya mal olur.
 *
 * Sıra: kayıtlar → dizin → geri okuyup doğrula → ancak o zaman eski anahtarı
 * sil. Arada kesilirse eski anahtar yerinde kalır, bir sonraki işlem taşımayı
 * baştan yapar (aynı yuvalara aynı içerik yazılır) ya da dizin yazılmışsa
 * doğrulayıp eski anahtarı siler. Doğrulama tutmazsa eski anahtar silinmez.
 */
async function eskiBicimiTasi<T>(tanim: DefterTanimi<T>, a: Anahtarlar): Promise<TasimaSonucu<T>> {
  const eski = await secureItemOku(a.eski);
  if (!eski.basarili) return { yazilabilir: false };
  if (eski.deger === null) return { yazilabilir: true };

  const eskiListe = eskiDefteriCoz(tanim, eski.deger);
  const dizin = await dizinOku(a);
  if (dizin.durum === 'hata') return { yazilabilir: false, eskiListe: eskiListe ?? [] };

  if (dizin.durum === 'tamam') {
    // Taşıma dizin yazılarak kesinleşmiş, eski anahtar silinmeden kesilmiş.
    if (eskiListe === null) {
      await deleteSecureItem(a.eski);
      return { yazilabilir: true };
    }
    const { girdiler, okumaHatasi } = await kayitlariOku(tanim, a, dizin.k);
    const beklenen = eskiListe.map((kayit) => JSON.stringify(kayit));
    if (!okumaHatasi && ayniDizi(girdiler.map((g) => g.ham), beklenen)) await deleteSecureItem(a.eski);
    // Eşleşmiyorsa dizin (daha yeni olan) geçerlidir; eski anahtara dokunulmaz.
    return { yazilabilir: true };
  }

  // Dizin bozuksa hangi yuvaların dolu olduğu bilinemez: hepsi temizlenecek sayılır.
  const sahipsiz = (k: number[]) => (dizin.durum === 'bozuk' ? a.yuvalar.filter((y) => !k.includes(y)) : []);

  if (eskiListe === null) {
    // Okunamayan eski değer: bugünkü sürüm de bunu boş gösteriyordu, kurtarılamaz.
    if (!(await dizinYaz(a, [], sahipsiz([])))) return { yazilabilir: false, eskiListe: [] };
    await deleteSecureItem(a.eski);
    return { yazilabilir: true };
  }

  const hamlar = eskiListe.map((kayit) => JSON.stringify(kayit));
  for (let i = 0; i < hamlar.length; i++) {
    if (!(await setSecureItem(a.kayit(i), hamlar[i]))) return { yazilabilir: false, eskiListe };
  }
  const k = hamlar.map((_, i) => i);
  if (!(await dizinYaz(a, k, sahipsiz(k)))) return { yazilabilir: false, eskiListe };

  const kontrol = await dizinOku(a);
  const geriOkunan = kontrol.durum === 'tamam' && ayniDizi(kontrol.k, k) ? await kayitlariOku(tanim, a, k) : null;
  if (!geriOkunan || geriOkunan.okumaHatasi || !ayniDizi(geriOkunan.girdiler.map((g) => g.ham), hamlar)) {
    // Bir sonraki işlemde taşıma baştan denensin; eski anahtar yerinde.
    await deleteSecureItem(a.dizin);
    return { yazilabilir: false, eskiListe };
  }
  await deleteSecureItem(a.eski);
  return { yazilabilir: true };
}

/** Oturumdaki hesabın defteri; oturum yoksa ya da okunamazsa boş liste. */
export async function defterOku<T>(tanim: DefterTanimi<T>): Promise<T[]> {
  const a = anahtarlar(tanim);
  if (!a) return [];
  return sirayla(a.dizin, async () => {
    const tasima = await eskiBicimiTasi(tanim, a);
    if (tasima.eskiListe) return tasima.eskiListe;
    const dizin = await dizinOku(a);
    if (dizin.durum !== 'tamam') return [];
    return (await kayitlariOku(tanim, a, dizin.k)).girdiler.map((g) => g.deger);
  });
}

/**
 * Oturumdaki hesabın defterini `degistir`in döndürdüğü listeyle değiştirir
 * (ilk enFazla kayıt). `degistir` null döndürürse hiçbir şey yazılmaz ve
 * false döner. Oturum yoksa, defter okunamıyorsa ya da cihaz depolaması bir
 * yazmayı reddederse false; bu durumda defter bir önceki hâlinde kalır.
 */
export async function defterGuncelle<T>(
  tanim: DefterTanimi<T>,
  degistir: (mevcut: T[]) => T[] | null,
): Promise<boolean> {
  const a = anahtarlar(tanim);
  if (!a) return false;
  return sirayla(a.dizin, async () => {
    if (!(await eskiBicimiTasi(tanim, a)).yazilabilir) return false;

    const dizin = await dizinOku(a);
    if (dizin.durum === 'hata') return false;
    const eskiK = dizin.durum === 'tamam' ? dizin.k : [];
    const eskiT = dizin.durum === 'tamam' ? dizin.t : dizin.durum === 'bozuk' ? a.yuvalar : [];

    // Okunamayan bir kayıt varken yazılırsa o kayıt kaybolur; yazma yapılmaz.
    const { girdiler, okumaHatasi } = await kayitlariOku(tanim, a, eskiK);
    if (okumaHatasi) return false;

    const yeniListe = degistir(girdiler.map((g) => g.deger));
    if (yeniListe === null) return false;
    const hamlar = yeniListe.slice(0, tanim.enFazla).map((kayit) => JSON.stringify(kayit));

    // Değişmeyen kayıtlar yuvasında kalır; yeni/değişenler, eski dizinin
    // kullanmadığı en küçük yuvalara yazılır (eski dizin bu arada geçerli kalır).
    const mevcutYuvalar = new Map<string, number[]>();
    for (const g of girdiler) mevcutYuvalar.set(g.ham, [...(mevcutYuvalar.get(g.ham) ?? []), g.yuva]);
    const bosYuvalar = a.yuvalar.filter((y) => !eskiK.includes(y));
    const yeniK: number[] = [];
    const yazilacaklar: Array<[number, string]> = [];
    for (const ham of hamlar) {
      const ayniKayit = mevcutYuvalar.get(ham)?.shift();
      if (ayniKayit !== undefined) {
        yeniK.push(ayniKayit);
        continue;
      }
      const yuva = bosYuvalar.shift();
      if (yuva === undefined) return false; // olmamalı: en az enFazla boş yuva var
      yeniK.push(yuva);
      yazilacaklar.push([yuva, ham]);
    }
    if (yazilacaklar.length === 0 && ayniDizi(yeniK, eskiK) && eskiT.length === 0) return true;

    // 1) Niyet: yazılacak yuvalar önce "t"ye eklenir; kesilirse sahipsiz kalanlar bilinsin.
    const yazilacakYuvalar = yazilacaklar.map(([yuva]) => yuva);
    const niyetT = birlesim(eskiT, yazilacakYuvalar);
    if (niyetT.length !== eskiT.length && !(await dizinYaz(a, eskiK, niyetT))) return false;

    // 2) Kayıtlar.
    for (const [yuva, ham] of yazilacaklar) {
      if (!(await setSecureItem(a.kayit(yuva), ham))) return false;
    }

    // 3) Kesinleştirme: yeni dizin. Artık kullanılmayan yuvalar "t"de.
    const temizlenecek = birlesim(niyetT, eskiK).filter((y) => !yeniK.includes(y));
    if (!(await dizinYaz(a, yeniK, temizlenecek))) return false;

    // 4) Temizlik. Başarısız olursa sonuç değişmez (defter zaten yazıldı);
    // silinemeyenler "t"de kalır, bir sonraki yazmada yeniden denenir.
    if (temizlenecek.length > 0) {
      const silinemeyen: number[] = [];
      for (const yuva of temizlenecek) {
        if (!(await deleteSecureItem(a.kayit(yuva)))) silinemeyen.push(yuva);
      }
      await dizinYaz(a, yeniK, silinemeyen);
    }
    return true;
  });
}
