import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteDepo, sahteleriSifirla } from './sahte/kurulum';
import {
  MAX_ALICI_KAYDI,
  aliciAdresGuncelle,
  aliciKaydet,
  aliciListesiGetir,
  aliciSil,
  eskiOrtakAliciDefteriniSil,
} from '../src/utils/aliciDefteri';
import { useAuthStore } from '../src/store/useAuthStore';
import type { AliciFormu } from '../src/types/faturaForm';

function alici(vknTckn: string, unvan: string): AliciFormu {
  return { vknTckn, unvan, ad: '', soyad: '', vergiDairesi: 'Test VD', ulke: 'Türkiye', adres: 'Adres' };
}

function oturumAc(kullaniciKodu: string | null) {
  useAuthStore.setState({ token: kullaniciKodu ? 'tkn' : null, kullaniciKodu });
}

beforeEach(() => {
  sahteleriSifirla();
  oturumAc(null);
});

test('iki hesabın defteri birbirini görmez', async () => {
  oturumAc('11111111');
  await aliciKaydet(alici('1460415308', 'A MÜŞTERİSİ'));

  oturumAc('22222222');
  assert.deepEqual(await aliciListesiGetir(), []);
  await aliciKaydet(alici('8590921777', 'B MÜŞTERİSİ'));
  assert.deepEqual((await aliciListesiGetir()).map((a) => a.unvan), ['B MÜŞTERİSİ']);

  oturumAc('11111111');
  assert.deepEqual((await aliciListesiGetir()).map((a) => a.unvan), ['A MÜŞTERİSİ']);

  // Anahtarlar, kullanıcı kodunun onaltılık karşılığıyla hesaba özel
  // (dizin + kayıt başına bir anahtar; bkz. bolunmusDefter.ts).
  const anahtarlar = [...sahteDepo.veriler.keys()].sort();
  assert.deepEqual(anahtarlar, [
    'gib_alici_dizin_31-31-31-31-31-31-31-31',
    'gib_alici_dizin_32-32-32-32-32-32-32-32',
    'gib_alici_kayit_31-31-31-31-31-31-31-31_0',
    'gib_alici_kayit_32-32-32-32-32-32-32-32_0',
  ]);
});

test('oturum yokken defter boş döner ve hiçbir şey yazılmaz', async () => {
  await aliciKaydet(alici('1460415308', 'X'));
  assert.deepEqual(await aliciListesiGetir(), []);
  assert.equal(sahteDepo.veriler.size, 0);
});

test('aynı VKN tekrar kaydedilince güncellenip en üste taşınır', async () => {
  oturumAc('kod');
  await aliciKaydet(alici('1460415308', 'ESKİ UNVAN'));
  await aliciKaydet(alici('8590921777', 'İKİNCİ'));
  await aliciKaydet(alici('1460415308', 'YENİ UNVAN'));
  const liste = await aliciListesiGetir();
  assert.deepEqual(liste.map((a) => a.unvan), ['YENİ UNVAN', 'İKİNCİ']);
});

test('bozuk JSON içeren defter boş liste olarak okunur', async () => {
  oturumAc('kod');
  await aliciKaydet(alici('1460415308', 'A'));
  const anahtar = [...sahteDepo.veriler.keys()].find((a) => a.startsWith('gib_alici_dizin_'))!;
  sahteDepo.veriler.set(anahtar, '{bozuk');
  assert.deepEqual(await aliciListesiGetir(), []);
});

test('GİB sorgusu yapılmamış ya da kontrol basamağı hatalı alıcı deftere yazılmaz', async () => {
  oturumAc('kod');
  assert.equal(await aliciKaydet(alici('1460415309', 'BOZUK VKN')), false);
  assert.equal(await aliciKaydet(alici('1460415308', '')), false); // unvan boş (sorgu yok)
  assert.equal(await aliciKaydet({ ...alici('10000000146', ''), ad: 'AD', soyad: '' }), false);
  assert.equal(await aliciKaydet({ ...alici('10000000146', ''), ad: 'AD', soyad: 'SOYAD' }), true);
  assert.deepEqual((await aliciListesiGetir()).map((a) => a.vknTckn), ['10000000146']);
});

test('adres güncelleme yalnızca adres/ülkeyi değiştirir, sırayı korur', async () => {
  oturumAc('kod');
  await aliciKaydet(alici('1460415308', 'BİRİNCİ'));
  await aliciKaydet(alici('8590921777', 'İKİNCİ'));

  // Tipin dışına çıkılıp unvan gönderilse bile yok sayılır.
  const degisiklik = { adres: 'Yeni Adres', ulke: 'Almanya', unvan: 'SAHTE UNVAN' };
  assert.equal(await aliciAdresGuncelle('1460415308', degisiklik), true);

  const liste = await aliciListesiGetir();
  assert.deepEqual(liste.map((a) => a.vknTckn), ['8590921777', '1460415308']);
  assert.equal(liste[1].adres, 'Yeni Adres');
  assert.equal(liste[1].ulke, 'Almanya');
  assert.equal(liste[1].unvan, 'BİRİNCİ');
  assert.equal(await aliciAdresGuncelle('9999999999', { adres: 'x', ulke: 'y' }), false);
});

test('silme yalnızca o hesabın defterini etkiler', async () => {
  oturumAc('A');
  await aliciKaydet(alici('1460415308', 'A ALICISI'));
  oturumAc('B');
  await aliciKaydet(alici('1460415308', 'B ALICISI'));

  assert.equal(await aliciSil('1460415308'), true);
  assert.deepEqual(await aliciListesiGetir(), []);
  assert.equal(await aliciSil('1460415308'), false); // artık yok

  oturumAc('A');
  assert.deepEqual((await aliciListesiGetir()).map((a) => a.unvan), ['A ALICISI']);
});

test('en fazla 50 kayıt tutulur; en eski düşer', async () => {
  oturumAc('kod');
  // Geçerli 51 farklı TCKN üret (kontrol basamaklarını hesaplayarak).
  const tcknler: string[] = [];
  for (let i = 0; tcknler.length < MAX_ALICI_KAYDI + 1; i++) {
    const ilk9 = String(100000000 + i * 7919);
    const d = ilk9.split('').map(Number);
    const onuncu = ((((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10) + 10) % 10;
    const onbirinci = (d.reduce((a, b) => a + b, 0) + onuncu) % 10;
    tcknler.push(`${ilk9}${onuncu}${onbirinci}`);
  }
  for (const tckn of tcknler) {
    assert.equal(await aliciKaydet({ ...alici(tckn, ''), ad: 'AD', soyad: 'SOYAD' }), true, tckn);
  }
  const liste = await aliciListesiGetir();
  assert.equal(liste.length, MAX_ALICI_KAYDI);
  assert.equal(liste[0].vknTckn, tcknler.at(-1));
  assert.equal(liste.some((a) => a.vknTckn === tcknler[0]), false);
});

test('cihaz depolaması yazmayı reddederse false döner', async () => {
  oturumAc('kod');
  sahteDepo.yazmaHatasi = new Error('değer çok büyük');
  assert.equal(await aliciKaydet(alici('1460415308', 'A')), false);
  assert.deepEqual(await aliciListesiGetir(), []);
});

test('eski ortak defter silinir, hesaba özel defterlere dokunulmaz', async () => {
  oturumAc('kod');
  await aliciKaydet(alici('1460415308', 'A'));
  sahteDepo.veriler.set('gib_alici_defteri', '[]');
  await eskiOrtakAliciDefteriniSil();
  assert.equal(sahteDepo.veriler.has('gib_alici_defteri'), false);
  assert.equal((await aliciListesiGetir()).length, 1);
});
