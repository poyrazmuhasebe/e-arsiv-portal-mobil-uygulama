import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteDepo, sahteleriSifirla } from './sahte/kurulum';
import {
  MAX_MAL_HIZMET_KAYDI,
  malHizmetKaydet,
  malHizmetListesiGetir,
  malHizmetSil,
} from '../src/utils/malHizmetDefteri';
import { useAuthStore } from '../src/store/useAuthStore';

function oturumAc(kullaniciKodu: string | null) {
  useAuthStore.setState({ token: kullaniciKodu ? 'tkn' : null, kullaniciKodu });
}

beforeEach(() => {
  sahteleriSifirla();
  oturumAc(null);
});

test('iki hesabın mal/hizmet defteri birbirini görmez', async () => {
  oturumAc('A');
  assert.equal(await malHizmetKaydet(['Danışmanlık']), true);
  oturumAc('B');
  assert.deepEqual(await malHizmetListesiGetir(), []);
  await malHizmetKaydet(['Kira']);
  oturumAc('A');
  assert.deepEqual(await malHizmetListesiGetir(), ['Danışmanlık']);
  assert.deepEqual([...sahteDepo.veriler.keys()].sort(), [
    'gib_malhizmet_dizin_41',
    'gib_malhizmet_dizin_42',
    'gib_malhizmet_kayit_41_0',
    'gib_malhizmet_kayit_42_0',
  ]);
});

test('oturum yokken hiçbir şey yazılmaz', async () => {
  assert.equal(await malHizmetKaydet(['X']), false);
  assert.equal(sahteDepo.veriler.size, 0);
});

test('tekrarlar (Türkçe büyük/küçük harf dahil) tek kayıt olur, en üste taşınır', async () => {
  oturumAc('kod');
  await malHizmetKaydet(['İnşaat işi', 'Kira']);
  await malHizmetKaydet(['  inşaat İşi  ', '', '   ', 'Nakliye', 'NAKLİYE']);
  assert.deepEqual(await malHizmetListesiGetir(), ['inşaat İşi', 'Nakliye', 'Kira']);
});

test('en fazla 50 kayıt tutulur; en eskiler düşer', async () => {
  oturumAc('kod');
  const adlar = Array.from({ length: MAX_MAL_HIZMET_KAYDI + 5 }, (_, i) => `Hizmet ${i}`);
  for (const ad of adlar) await malHizmetKaydet([ad]);
  const liste = await malHizmetListesiGetir();
  assert.equal(liste.length, MAX_MAL_HIZMET_KAYDI);
  assert.equal(liste[0], `Hizmet ${MAX_MAL_HIZMET_KAYDI + 4}`);
  assert.equal(liste.includes('Hizmet 4'), false);
  assert.equal(liste.includes('Hizmet 5'), true);
});

test('silme büyük/küçük harf farkını gözetmez, yoksa false', async () => {
  oturumAc('kod');
  await malHizmetKaydet(['Danışmanlık', 'Kira']);
  assert.equal(await malHizmetSil('DANIŞMANLIK'), true);
  assert.deepEqual(await malHizmetListesiGetir(), ['Kira']);
  assert.equal(await malHizmetSil('Yok'), false);
});

test('bozuk içerik ve yazma reddi', async () => {
  oturumAc('kod');
  await malHizmetKaydet(['A', 'B', 'C']);
  // Metin olmayan / okunamayan kayıtlar atlanır.
  sahteDepo.veriler.set('gib_malhizmet_kayit_6b-6f-64_0', '5');
  sahteDepo.veriler.set('gib_malhizmet_kayit_6b-6f-64_2', '{bozuk');
  assert.deepEqual(await malHizmetListesiGetir(), ['B']);
  sahteDepo.yazmaHatasi = new Error('çok büyük');
  assert.equal(await malHizmetKaydet(['C']), false);
});
