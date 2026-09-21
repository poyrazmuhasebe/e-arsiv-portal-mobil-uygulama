import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteDepo, sahteleriSifirla } from './sahte/kurulum';
import {
  ESKI_HATIRLANAN_KOD_KEY,
  EN_FAZLA_KOD,
  hatirlananKodlarAnahtari,
  hatirlananKodlariOku,
  hesabinKodlariniSil,
  kayitIcinBilinenKodlar,
  koduHatirla,
  koduUnut,
} from '../src/utils/hatirlananKodlar';

beforeEach(() => {
  sahteleriSifirla();
});

test('anahtar: hesaba özel, SecureStore karakter kümesinde, demo ayrı', () => {
  const a = hatirlananKodlarAnahtari('hesap-1');
  const b = hatirlananKodlarAnahtari('hesap-2');
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9._-]+$/);
  assert.equal(hatirlananKodlarAnahtari(null), 'gib_hatirlanan_kodlar_demo');
  assert.notEqual(hatirlananKodlarAnahtari(null), a);
});

test('bir hesap birden fazla GİB kodu hatırlar, en son kullanılan başta', async () => {
  await koduHatirla('h1', '11111111');
  await koduHatirla('h1', '22222222');
  await koduHatirla('h1', '11111111');
  assert.deepEqual(await hatirlananKodlariOku('h1'), ['11111111', '22222222']);
});

test('hesaplar birbirinin kodlarını görmez', async () => {
  await koduHatirla('h1', '11111111');
  await koduHatirla('h2', '33333333');
  await koduHatirla(null, '44444444');
  assert.deepEqual(await hatirlananKodlariOku('h1'), ['11111111']);
  assert.deepEqual(await hatirlananKodlariOku('h2'), ['33333333']);
  assert.deepEqual(await hatirlananKodlariOku(null), ['44444444']);
});

test(`en fazla ${EN_FAZLA_KOD} kod tutulur, en eskisi düşer`, async () => {
  for (let i = 0; i < EN_FAZLA_KOD + 3; i++) await koduHatirla('h1', `kod${i}`);
  const kodlar = await hatirlananKodlariOku('h1');
  assert.equal(kodlar.length, EN_FAZLA_KOD);
  assert.equal(kodlar[0], `kod${EN_FAZLA_KOD + 2}`);
  assert.ok(!kodlar.includes('kod0'));
});

test('koduUnut yalnızca o kodu çıkarır; son kod çıkınca anahtar silinir', async () => {
  await koduHatirla('h1', 'A');
  await koduHatirla('h1', 'B');
  assert.deepEqual(await koduUnut('h1', 'A'), ['B']);
  assert.deepEqual(await koduUnut('h1', 'B'), []);
  assert.equal(sahteDepo.veriler.has(hatirlananKodlarAnahtari('h1')), false);
});

test('eski tekil anahtar ilk okuyan hesaba taşınır ve silinir', async () => {
  sahteDepo.veriler.set(ESKI_HATIRLANAN_KOD_KEY, '34567890');
  await koduHatirla('h1', '11111111');
  // koduHatirla önce okuduğu için taşıma orada olur; eski kod sona eklenir.
  assert.deepEqual(await hatirlananKodlariOku('h1'), ['11111111', '34567890']);
  assert.equal(sahteDepo.veriler.has(ESKI_HATIRLANAN_KOD_KEY), false);
  assert.deepEqual(await hatirlananKodlariOku('h2'), []);
});

test('bozuk kayıt boş liste sayılır, çökmez', async () => {
  sahteDepo.veriler.set(hatirlananKodlarAnahtari('h1'), '{bozuk');
  assert.deepEqual(await hatirlananKodlariOku('h1'), []);
  sahteDepo.veriler.set(hatirlananKodlarAnahtari('h1'), JSON.stringify(['A', 5, '', 'A', ' B ']));
  assert.deepEqual(await hatirlananKodlariOku('h1'), ['A', 'B']);
});

test('kayıt ekranı: demo listesi ve eski anahtar görülür ama taşınmaz', async () => {
  await koduHatirla(null, '44444444');
  sahteDepo.veriler.set(ESKI_HATIRLANAN_KOD_KEY, '34567890');
  assert.deepEqual(await kayitIcinBilinenKodlar(), ['44444444', '34567890']);
  assert.equal(sahteDepo.veriler.get(ESKI_HATIRLANAN_KOD_KEY), '34567890');
});

test('hesap silinince yalnızca o hesabın kodları silinir', async () => {
  await koduHatirla('h1', '11111111');
  await koduHatirla('h2', '33333333');
  await hesabinKodlariniSil('h1');
  assert.deepEqual(await hatirlananKodlariOku('h1'), []);
  assert.deepEqual(await hatirlananKodlariOku('h2'), ['33333333']);
});
