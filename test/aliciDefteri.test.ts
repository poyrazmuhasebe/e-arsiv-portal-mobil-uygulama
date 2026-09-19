import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteDepo, sahteleriSifirla } from './sahte/kurulum';
import { aliciKaydet, aliciListesiGetir, eskiOrtakAliciDefteriniSil } from '../src/utils/aliciDefteri';
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

  // Anahtar, kullanıcı kodunun onaltılık karşılığıyla hesaba özel.
  const anahtarlar = [...sahteDepo.veriler.keys()].sort();
  assert.deepEqual(anahtarlar, [
    'gib_alici_defteri_31-31-31-31-31-31-31-31',
    'gib_alici_defteri_32-32-32-32-32-32-32-32',
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
  const [anahtar] = [...sahteDepo.veriler.keys()];
  sahteDepo.veriler.set(anahtar, '{bozuk');
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
