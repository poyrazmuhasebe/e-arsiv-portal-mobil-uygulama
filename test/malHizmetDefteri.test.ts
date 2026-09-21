import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteDepo, sahteleriSifirla } from './sahte/kurulum';
import {
  MAL_HIZMET_AD_EN_UZUN,
  MAX_MAL_HIZMET_KAYDI,
  malHizmetAdiniDegistir,
  malHizmetEkle,
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

// ---------------------------------------------------------------------------
// Mal/Hizmet Defteri ekranı: elle ekleme ve adını değiştirme
// ---------------------------------------------------------------------------

test('malHizmetEkle: en üste ekler; aynı ad varsa eklemez, var döner', async () => {
  oturumAc('A');
  await malHizmetKaydet(['Kira', 'Danışmanlık']);
  assert.equal(await malHizmetEkle('  Nakliye  '), 'tamam');
  assert.deepEqual(await malHizmetListesiGetir(), ['Nakliye', 'Kira', 'Danışmanlık']);
  assert.equal(await malHizmetEkle('KİRA'), 'var');
  assert.deepEqual(await malHizmetListesiGetir(), ['Nakliye', 'Kira', 'Danışmanlık']);
});

test('malHizmetEkle: boş, çok uzun ve oturumsuz durumlar', async () => {
  assert.equal(await malHizmetEkle('X'), 'hata'); // oturum yok
  oturumAc('A');
  assert.equal(await malHizmetEkle('   '), 'bos');
  assert.equal(await malHizmetEkle('x'.repeat(MAL_HIZMET_AD_EN_UZUN + 1)), 'uzun');
  assert.equal(await malHizmetEkle('x'.repeat(MAL_HIZMET_AD_EN_UZUN)), 'tamam');
});

test('malHizmetEkle: defter doluysa en alttaki düşer', async () => {
  oturumAc('A');
  const adlar = Array.from({ length: MAX_MAL_HIZMET_KAYDI }, (_, i) => `Ad ${i}`);
  await malHizmetKaydet(adlar);
  assert.equal(await malHizmetEkle('Yeni'), 'tamam');
  const liste = await malHizmetListesiGetir();
  assert.equal(liste.length, MAX_MAL_HIZMET_KAYDI);
  assert.equal(liste[0], 'Yeni');
  assert.ok(!liste.includes(`Ad ${MAX_MAL_HIZMET_KAYDI - 1}`));
});

test('malHizmetAdiniDegistir: yerini koruyarak değiştirir', async () => {
  oturumAc('A');
  await malHizmetKaydet(['A1', 'B1', 'C1']);
  assert.equal(await malHizmetAdiniDegistir('B1', ' B2 '), 'tamam');
  assert.deepEqual(await malHizmetListesiGetir(), ['A1', 'B2', 'C1']);
});

test('malHizmetAdiniDegistir: başka bir kayıtla çakışırsa birleştirmez', async () => {
  oturumAc('A');
  await malHizmetKaydet(['Kira', 'Nakliye']);
  assert.equal(await malHizmetAdiniDegistir('Nakliye', 'kira'), 'var');
  assert.deepEqual(await malHizmetListesiGetir(), ['Kira', 'Nakliye']);
});

test('malHizmetAdiniDegistir: yalnızca büyük/küçük harf değişikliği serbest; aynı ad tamam', async () => {
  oturumAc('A');
  await malHizmetKaydet(['kira']);
  assert.equal(await malHizmetAdiniDegistir('kira', 'Kira'), 'tamam');
  assert.deepEqual(await malHizmetListesiGetir(), ['Kira']);
  assert.equal(await malHizmetAdiniDegistir('Kira', 'Kira'), 'tamam');
});

test('malHizmetAdiniDegistir: olmayan kayıt, boş ve uzun ad', async () => {
  oturumAc('A');
  await malHizmetKaydet(['Kira']);
  assert.equal(await malHizmetAdiniDegistir('Yok', 'X'), 'yok');
  assert.equal(await malHizmetAdiniDegistir('Kira', '  '), 'bos');
  assert.equal(await malHizmetAdiniDegistir('Kira', 'x'.repeat(MAL_HIZMET_AD_EN_UZUN + 1)), 'uzun');
  assert.deepEqual(await malHizmetListesiGetir(), ['Kira']);
});

test('düzenleme yalnızca açık hesabın defterini etkiler', async () => {
  oturumAc('A');
  await malHizmetKaydet(['Kira']);
  oturumAc('B');
  await malHizmetKaydet(['Kira']);
  assert.equal(await malHizmetAdiniDegistir('Kira', 'Depo Kirası'), 'tamam');
  oturumAc('A');
  assert.deepEqual(await malHizmetListesiGetir(), ['Kira']);
});
