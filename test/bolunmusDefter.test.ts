// Alıcı ve mal/hizmet defterlerinin cihazdaki saklama biçimi (bolunmusDefter.ts):
// kayıt başına anahtar + dizin, eski tek değerli biçimden taşıma, yarım yazma.

import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteDepo, sahteleriSifirla } from './sahte/kurulum';
import {
  MAX_ALICI_KAYDI,
  aliciAdresGuncelle,
  aliciKaydet,
  aliciListesiGetir,
  aliciSil,
} from '../src/utils/aliciDefteri';
import {
  MAX_MAL_HIZMET_KAYDI,
  malHizmetKaydet,
  malHizmetListesiGetir,
  malHizmetSil,
} from '../src/utils/malHizmetDefteri';
import { useAuthStore } from '../src/store/useAuthStore';
import type { AliciFormu, KayitliAlici } from '../src/types/faturaForm';

// "kod" kullanıcı kodunun anahtarlardaki onaltılık karşılığı.
const HEX = '6b-6f-64';
const ESKI_ALICI = `gib_alici_defteri_${HEX}`;
const ESKI_MAL_HIZMET = `gib_malhizmet_defteri_${HEX}`;

function oturumAc(kullaniciKodu: string | null) {
  useAuthStore.setState({ token: kullaniciKodu ? 'tkn' : null, kullaniciKodu });
}

/** Kontrol basamakları hesaplanmış geçerli TCKN'ler. */
function tcknler(adet: number): string[] {
  const sonuc: string[] = [];
  for (let i = 0; sonuc.length < adet; i++) {
    const ilk9 = String(100000000 + i * 7919);
    const d = ilk9.split('').map(Number);
    const onuncu = ((((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10) + 10) % 10;
    const onbirinci = (d.reduce((a, b) => a + b, 0) + onuncu) % 10;
    sonuc.push(`${ilk9}${onuncu}${onbirinci}`);
  }
  return sonuc;
}

function alici(tckn: string, ad: string, adres = 'Adres'): AliciFormu {
  return { vknTckn: tckn, unvan: '', ad, soyad: 'SOYAD', vergiDairesi: 'VD', ulke: 'Türkiye', adres };
}

/** Eski sürümün tek değerde sakladığı biçimde bir kayıt. */
function eskiKayit(tckn: string, ad: string): KayitliAlici {
  return { ...alici(tckn, ad), kayitTarihi: '2026-09-01T10:00:00.000Z' };
}

/** Karşılaştırma için kaydın kimliği + değişebilen alanları. */
function ozet(liste: KayitliAlici[]): string[] {
  return liste.map((a) => `${a.vknTckn}:${a.ad}:${a.adres}`);
}

function dizin(onek: string): { v: number; k: number[]; t: number[] } | null {
  const ham = sahteDepo.veriler.get(`${onek}_dizin_${HEX}`);
  return ham === undefined ? null : JSON.parse(ham);
}

/** Dizinde olmayan hiçbir kayıt anahtarı kalmamış ve "t" (temizlenecekler) boş. */
function sahipsizAnahtarYok(onek: string) {
  const d = dizin(onek);
  assert.ok(d, `${onek} dizini yok`);
  assert.deepEqual(d.t, []);
  const kayitlar = [...sahteDepo.veriler.keys()].filter((a) => a.startsWith(`${onek}_kayit_${HEX}_`)).sort();
  assert.deepEqual(kayitlar, d.k.map((y) => `${onek}_kayit_${HEX}_${y}`).sort());
}

const T = tcknler(MAX_ALICI_KAYDI + 5);

beforeEach(() => {
  sahteleriSifirla();
  oturumAc(null);
});

// ---------------------------------------------------------------------------
// Hesaba özel
// ---------------------------------------------------------------------------

test('her hesabın anahtarları kendi kullanıcı koduna özel; biri diğerini değiştirmez', async () => {
  oturumAc('A');
  await aliciKaydet(alici(T[0], 'A ALICISI'));
  await malHizmetKaydet(['A hizmeti']);
  oturumAc('B');
  await aliciKaydet(alici(T[0], 'B ALICISI'));
  assert.equal(await aliciAdresGuncelle(T[0], { adres: 'B adresi', ulke: 'Almanya' }), true);
  assert.deepEqual(await malHizmetListesiGetir(), []);

  oturumAc('A');
  assert.deepEqual(ozet(await aliciListesiGetir()), [`${T[0]}:A ALICISI:Adres`]);
  assert.deepEqual(await malHizmetListesiGetir(), ['A hizmeti']);
  for (const anahtar of sahteDepo.veriler.keys()) assert.match(anahtar, /_(41|42)(_\d+)?$/, anahtar);
});

// ---------------------------------------------------------------------------
// Eski biçimden taşıma
// ---------------------------------------------------------------------------

test('eski tek değerli defterler kayıpsız taşınır, eski anahtar silinir', async () => {
  oturumAc('kod');
  const eskiListe = [eskiKayit(T[0], 'BİR'), eskiKayit(T[1], 'İKİ'), eskiKayit(T[2], 'ÜÇ')];
  sahteDepo.veriler.set(ESKI_ALICI, JSON.stringify(eskiListe));
  sahteDepo.veriler.set(ESKI_MAL_HIZMET, JSON.stringify(['Kira', 'Danışmanlık']));
  // Başka bir hesabın eski defterine dokunulmaz.
  sahteDepo.veriler.set('gib_alici_defteri_41', '[]');

  assert.deepEqual(await aliciListesiGetir(), eskiListe);
  assert.deepEqual(await malHizmetListesiGetir(), ['Kira', 'Danışmanlık']);
  assert.equal(sahteDepo.veriler.has(ESKI_ALICI), false);
  assert.equal(sahteDepo.veriler.has(ESKI_MAL_HIZMET), false);
  assert.equal(sahteDepo.veriler.has('gib_alici_defteri_41'), true);
  sahipsizAnahtarYok('gib_alici');
  sahipsizAnahtarYok('gib_malhizmet');

  // Taşınan defter üzerinde işlemler normal çalışır.
  assert.equal(await aliciKaydet(alici(T[3], 'DÖRT')), true);
  assert.deepEqual((await aliciListesiGetir()).map((a) => a.ad), ['DÖRT', 'BİR', 'İKİ', 'ÜÇ']);
});

test('taşıma yazma işlemiyle de tetiklenir', async () => {
  oturumAc('kod');
  sahteDepo.veriler.set(ESKI_MAL_HIZMET, JSON.stringify(['Kira']));
  assert.equal(await malHizmetKaydet(['Nakliye']), true);
  assert.deepEqual(await malHizmetListesiGetir(), ['Nakliye', 'Kira']);
  assert.equal(sahteDepo.veriler.has(ESKI_MAL_HIZMET), false);
});

test('taşıma herhangi bir noktada kesilirse veri kaybolmaz, sonraki açılışta tamamlanır', async () => {
  const eskiListe = [eskiKayit(T[0], 'BİR'), eskiKayit(T[1], 'İKİ'), eskiKayit(T[2], 'ÜÇ')];
  // 3 kayıt + dizin + eski anahtarın silinmesi = 5 işlem; her kesinti noktası denenir.
  for (let hak = 0; hak <= 6; hak++) {
    sahteleriSifirla();
    oturumAc('kod');
    sahteDepo.veriler.set(ESKI_ALICI, JSON.stringify(eskiListe));

    sahteDepo.islemHakki = hak;
    assert.deepEqual(await aliciListesiGetir(), eskiListe, `kesinti ${hak}: okuma`);
    sahteDepo.islemHakki = null; // uygulama yeniden açıldı

    assert.deepEqual(await aliciListesiGetir(), eskiListe, `kesinti ${hak}: yeniden açılış`);
    assert.equal(sahteDepo.veriler.has(ESKI_ALICI), false, `kesinti ${hak}: eski anahtar`);
    sahipsizAnahtarYok('gib_alici');
  }
});

test('taşıma doğrulanamazsa eski anahtar silinmez', async () => {
  oturumAc('kod');
  const eskiListe = [eskiKayit(T[0], 'BİR'), eskiKayit(T[1], 'İKİ')];
  sahteDepo.veriler.set(ESKI_ALICI, JSON.stringify(eskiListe));
  // Okumalar: eski anahtar, dizin, (yazmalar), geri okunan dizin; kayıtlar geri okunamaz.
  sahteDepo.okumaHakki = 3;
  assert.deepEqual(await aliciListesiGetir(), eskiListe);
  assert.equal(sahteDepo.veriler.get(ESKI_ALICI), JSON.stringify(eskiListe));
  assert.equal(dizin('gib_alici'), null); // yarım taşıma kesinleşmiş sayılmaz

  sahteDepo.okumaHakki = null;
  assert.deepEqual(await aliciListesiGetir(), eskiListe);
  assert.equal(sahteDepo.veriler.has(ESKI_ALICI), false);
  sahipsizAnahtarYok('gib_alici');
});

test('taşıma yazması reddedilirse eski defter gösterilmeye devam eder, yazma false döner', async () => {
  oturumAc('kod');
  const eskiListe = [eskiKayit(T[0], 'BİR')];
  sahteDepo.veriler.set(ESKI_ALICI, JSON.stringify(eskiListe));
  sahteDepo.yazmaHatasi = new Error('değer çok büyük');

  assert.deepEqual(await aliciListesiGetir(), eskiListe);
  assert.equal(await aliciKaydet(alici(T[1], 'İKİ')), false);
  assert.equal(await aliciSil(T[0]), false);
  assert.deepEqual([...sahteDepo.veriler.keys()], [ESKI_ALICI]);

  sahteDepo.yazmaHatasi = null;
  assert.deepEqual(await aliciListesiGetir(), eskiListe);
  assert.equal(sahteDepo.veriler.has(ESKI_ALICI), false);
});

test('bozuk eski defter (okunamayan JSON / dizi değil) boş sayılır ve silinir', async () => {
  for (const bozuk of ['{bozuk', '{"a":1}', 'null']) {
    sahteleriSifirla();
    oturumAc('kod');
    sahteDepo.veriler.set(ESKI_ALICI, bozuk);
    sahteDepo.veriler.set(ESKI_MAL_HIZMET, bozuk);
    assert.deepEqual(await aliciListesiGetir(), [], bozuk);
    assert.deepEqual(await malHizmetListesiGetir(), [], bozuk);
    assert.equal(sahteDepo.veriler.has(ESKI_ALICI), false, bozuk);
    assert.equal(sahteDepo.veriler.has(ESKI_MAL_HIZMET), false, bozuk);
    assert.deepEqual(dizin('gib_alici'), { v: 1, k: [], t: [] });
  }
});

test('eski defterdeki geçersiz öğeler atlanır, geçerliler taşınır', async () => {
  oturumAc('kod');
  sahteDepo.veriler.set(ESKI_ALICI, JSON.stringify([null, 5, 'x', eskiKayit(T[0], 'BİR')]));
  sahteDepo.veriler.set(ESKI_MAL_HIZMET, '["B", 5, null]');
  assert.deepEqual(ozet(await aliciListesiGetir()), [`${T[0]}:BİR:Adres`]);
  assert.deepEqual(await malHizmetListesiGetir(), ['B']);
});

// ---------------------------------------------------------------------------
// Yarım yazma güvenliği
// ---------------------------------------------------------------------------

interface Senaryo {
  ad: string;
  kur: () => Promise<void>;
  islem: () => Promise<boolean>;
  oku: () => Promise<string[]>;
  onek: string;
  beklenen: string[];
}

const aliciOzeti = async () => ozet(await aliciListesiGetir());

async function ucAliciKur() {
  for (const [tckn, ad] of [
    [T[2], 'ÜÇ'],
    [T[1], 'İKİ'],
    [T[0], 'BİR'],
  ]) {
    assert.equal(await aliciKaydet(alici(tckn, ad)), true);
  }
}

const doluMalHizmet = Array.from({ length: MAX_MAL_HIZMET_KAYDI }, (_, i) => `Hizmet ${i}`);
const yeniAdlar = ['Yeni 1', 'Yeni 2', 'Yeni 3', 'Yeni 4', 'Yeni 5'];

const SENARYOLAR: Senaryo[] = [
  {
    ad: 'yeni alıcı ekleme',
    kur: ucAliciKur,
    islem: () => aliciKaydet(alici(T[3], 'DÖRT')),
    oku: aliciOzeti,
    onek: 'gib_alici',
    beklenen: [`${T[3]}:DÖRT:Adres`, `${T[0]}:BİR:Adres`, `${T[1]}:İKİ:Adres`, `${T[2]}:ÜÇ:Adres`],
  },
  {
    ad: 'kayıtlı alıcıyı güncelleme',
    kur: ucAliciKur,
    islem: () => aliciKaydet(alici(T[1], 'İKİ YENİ', 'Yeni adres')),
    oku: aliciOzeti,
    onek: 'gib_alici',
    beklenen: [`${T[1]}:İKİ YENİ:Yeni adres`, `${T[0]}:BİR:Adres`, `${T[2]}:ÜÇ:Adres`],
  },
  {
    ad: 'adres güncelleme',
    kur: ucAliciKur,
    islem: () => aliciAdresGuncelle(T[2], { adres: 'Başka adres', ulke: 'Türkiye' }),
    oku: aliciOzeti,
    onek: 'gib_alici',
    beklenen: [`${T[0]}:BİR:Adres`, `${T[1]}:İKİ:Adres`, `${T[2]}:ÜÇ:Başka adres`],
  },
  {
    ad: 'alıcı silme',
    kur: ucAliciKur,
    islem: () => aliciSil(T[1]),
    oku: aliciOzeti,
    onek: 'gib_alici',
    beklenen: [`${T[0]}:BİR:Adres`, `${T[2]}:ÜÇ:Adres`],
  },
  {
    ad: 'dolu mal/hizmet defterine 5 ad birden',
    kur: async () => {
      assert.equal(await malHizmetKaydet(doluMalHizmet), true);
    },
    islem: () => malHizmetKaydet(yeniAdlar),
    oku: malHizmetListesiGetir,
    onek: 'gib_malhizmet',
    beklenen: [...yeniAdlar, ...doluMalHizmet.slice(0, MAX_MAL_HIZMET_KAYDI - 5)],
  },
];

for (const s of SENARYOLAR) {
  test(`yarım yazma: ${s.ad} — her kesinti noktasında defter tutarlı, artıklar temizlenir`, async () => {
    let tamamlandi = false;
    for (let hak = 0; !tamamlandi; hak++) {
      assert.ok(hak < 40, 'işlem hiç tamamlanmadı');
      sahteleriSifirla();
      oturumAc('kod');
      await s.kur();
      const onceki = await s.oku();

      sahteDepo.islemHakki = hak;
      const sonuc = await s.islem();
      tamamlandi = sahteDepo.islemHakki > 0; // hak artırsa bile işlem bitmiş demektir
      sahteDepo.islemHakki = null; // uygulama yeniden açıldı

      // Sonuç true ise yeni hâl, false ise eski hâl — arası yok.
      assert.deepEqual(await s.oku(), sonuc ? s.beklenen : onceki, `kesinti ${hak}`);

      // Sonraki başarılı bir yazma, kesintiden kalan sahipsiz anahtarları temizler.
      if (s.onek === 'gib_alici') assert.equal(await aliciKaydet(alici(T[9], 'SONRAKİ')), true);
      else assert.equal(await malHizmetKaydet(['Sonraki']), true);
      sahipsizAnahtarYok(s.onek);
    }
  });
}

test('bozuk dizin: defter boş okunur, sonraki yazma tüm eski kayıt anahtarlarını temizler', async () => {
  oturumAc('kod');
  await ucAliciKur();
  sahteDepo.veriler.set(`gib_alici_dizin_${HEX}`, '{bozuk');
  assert.deepEqual(await aliciListesiGetir(), []);
  assert.equal(await aliciKaydet(alici(T[3], 'DÖRT')), true);
  assert.deepEqual((await aliciListesiGetir()).map((a) => a.ad), ['DÖRT']);
  sahipsizAnahtarYok('gib_alici');
});

test('bozuk tek kayıt atlanır, diğerleri korunur; sonraki yazmada anahtarı silinir', async () => {
  oturumAc('kod');
  await ucAliciKur();
  const yuva = dizin('gib_alici')!.k[1]; // İKİ
  sahteDepo.veriler.set(`gib_alici_kayit_${HEX}_${yuva}`, '{bozuk');
  assert.deepEqual((await aliciListesiGetir()).map((a) => a.ad), ['BİR', 'ÜÇ']);
  assert.equal(await aliciKaydet(alici(T[3], 'DÖRT')), true);
  assert.deepEqual((await aliciListesiGetir()).map((a) => a.ad), ['DÖRT', 'BİR', 'ÜÇ']);
  sahipsizAnahtarYok('gib_alici');
});

test('okuma hatasında hiçbir şey yazılmaz ve false döner', async () => {
  oturumAc('kod');
  await ucAliciKur();
  await malHizmetKaydet(['Kira']);
  const yazmaOncesi = sahteDepo.sayac.yazma + sahteDepo.sayac.silme;

  sahteDepo.okumaHatasi = new Error('çözülemedi');
  assert.deepEqual(await aliciListesiGetir(), []);
  assert.equal(await aliciKaydet(alici(T[3], 'DÖRT')), false);
  assert.equal(await aliciSil(T[0]), false);
  assert.equal(await malHizmetKaydet(['Nakliye']), false);
  assert.equal(await malHizmetSil('Kira'), false);
  assert.equal(sahteDepo.sayac.yazma + sahteDepo.sayac.silme, yazmaOncesi);

  sahteDepo.okumaHatasi = null;
  assert.deepEqual((await aliciListesiGetir()).map((a) => a.ad), ['BİR', 'İKİ', 'ÜÇ']);
  assert.deepEqual(await malHizmetListesiGetir(), ['Kira']);
});

test('yazma reddedilirse tüm işlemler false döner ve defter değişmez', async () => {
  oturumAc('kod');
  await ucAliciKur();
  await malHizmetKaydet(['Kira']);
  sahteDepo.yazmaHatasi = new Error('değer çok büyük');
  assert.equal(await aliciKaydet(alici(T[3], 'DÖRT')), false);
  assert.equal(await aliciAdresGuncelle(T[0], { adres: 'x', ulke: 'y' }), false);
  assert.equal(await aliciSil(T[0]), false);
  assert.equal(await malHizmetKaydet(['Nakliye']), false);
  assert.equal(await malHizmetSil('Kira'), false);
  sahteDepo.yazmaHatasi = null;
  assert.deepEqual((await aliciListesiGetir()).map((a) => a.ad), ['BİR', 'İKİ', 'ÜÇ']);
  assert.deepEqual(await malHizmetListesiGetir(), ['Kira']);
  sahipsizAnahtarYok('gib_alici');
});

// ---------------------------------------------------------------------------
// Sınır, eşzamanlılık, boyut
// ---------------------------------------------------------------------------

test('50 sınırı: fazlası düşer, düşen kayıtların anahtarı kalmaz', async () => {
  oturumAc('kod');
  for (let i = 0; i < MAX_ALICI_KAYDI + 5; i++) assert.equal(await aliciKaydet(alici(T[i], `A${i}`)), true);
  for (let i = 0; i < MAX_MAL_HIZMET_KAYDI + 5; i++) assert.equal(await malHizmetKaydet([`H${i}`]), true);

  const liste = await aliciListesiGetir();
  assert.equal(liste.length, MAX_ALICI_KAYDI);
  assert.equal(liste[0].ad, `A${MAX_ALICI_KAYDI + 4}`);
  assert.equal(liste.some((a) => a.ad === 'A4'), false);
  assert.equal((await malHizmetListesiGetir()).length, MAX_MAL_HIZMET_KAYDI);
  sahipsizAnahtarYok('gib_alici');
  sahipsizAnahtarYok('gib_malhizmet');
  // Hesap başına: 2 dizin + 50 + 50 kayıt anahtarı.
  assert.equal(sahteDepo.veriler.size, 2 + MAX_ALICI_KAYDI + MAX_MAL_HIZMET_KAYDI);
});

test('aynı anda gelen yazmalar birbirini ezmez', async () => {
  oturumAc('kod');
  const sonuclar = await Promise.all([
    aliciKaydet(alici(T[0], 'BİR')),
    aliciKaydet(alici(T[1], 'İKİ')),
    aliciListesiGetir(),
    aliciKaydet(alici(T[2], 'ÜÇ')),
  ]);
  assert.deepEqual(sonuclar.filter((s) => s === true).length, 3);
  assert.deepEqual((await aliciListesiGetir()).map((a) => a.ad), ['ÜÇ', 'İKİ', 'BİR']);
  sahipsizAnahtarYok('gib_alici');
});

test('her değer tek bir kaydı taşır; dolu defterin dizini küçüktür', async () => {
  oturumAc('kod');
  // Uç durum: 150 harflik unvan ve 250 harflik adres, Türkçe harflerle (UTF-8'de 2 bayt).
  const uzunAd = 'Ş'.repeat(150);
  const uzunAdres = 'Ğ'.repeat(250);
  for (let i = 0; i < MAX_ALICI_KAYDI; i++) await aliciKaydet(alici(T[i], `${uzunAd}${i}`, uzunAdres));
  await malHizmetKaydet(Array.from({ length: MAX_MAL_HIZMET_KAYDI }, (_, i) => `${'İ'.repeat(200)}${i}`));

  const bayt = (s: string) => new TextEncoder().encode(s).length;
  let enBuyukKayit = 0;
  for (const [anahtar, deger] of sahteDepo.veriler) {
    if (anahtar.includes('_kayit_')) {
      const kayit = JSON.parse(deger);
      assert.equal(Array.isArray(kayit), false, anahtar); // dizi değil, tek kayıt
      enBuyukKayit = Math.max(enBuyukKayit, bayt(deger));
    } else {
      assert.ok(bayt(deger) < 300, `${anahtar}: ${bayt(deger)} B`);
    }
  }
  // Tek bir uç kaydın kendi boyutu (~1,1 KB); defterin toplamına (~55 KB) bağlı değil.
  assert.ok(enBuyukKayit < 1200, `en büyük kayıt ${enBuyukKayit} B`);
});
