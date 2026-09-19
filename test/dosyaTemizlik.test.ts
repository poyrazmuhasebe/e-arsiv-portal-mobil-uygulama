import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteDosyaSistemi, sahteleriSifirla } from './sahte/kurulum';
import { eskiFaturaPdfleriniSil } from '../src/utils/dosyaTemizlik';

const BIR_SAAT = 60 * 60 * 1000;

beforeEach(() => sahteleriSifirla());

test('yalnızca 1 saatten eski fatura PDF\'leri silinir', async () => {
  const simdi = Date.now();
  const eski = `Fatura_${simdi - 2 * BIR_SAAT}.pdf`;
  const taze = `Fatura_${simdi - 60 * 1000}.pdf`;
  sahteDosyaSistemi.dosyalar = new Set([eski, taze, 'baska.pdf', 'Fatura_abc.pdf', 'notlar.txt']);

  const silinen = await eskiFaturaPdfleriniSil();

  assert.equal(silinen, 1);
  assert.deepEqual([...sahteDosyaSistemi.dosyalar].sort(), ['Fatura_abc.pdf', 'baska.pdf', 'notlar.txt', taze].sort());
});

test('0 verilince yaşa bakmadan tüm fatura PDF\'leri silinir (çıkış)', async () => {
  const simdi = Date.now();
  sahteDosyaSistemi.dosyalar = new Set([`Fatura_${simdi}.pdf`, `Fatura_${simdi - 5 * BIR_SAAT}.pdf`, 'baska.pdf']);
  assert.equal(await eskiFaturaPdfleriniSil(0), 2);
  assert.deepEqual([...sahteDosyaSistemi.dosyalar], ['baska.pdf']);
});

test('gelecek tarihli (saat geri alınmış) dosya taze sayılmaz, silinir', async () => {
  sahteDosyaSistemi.dosyalar = new Set([`Fatura_${Date.now() + BIR_SAAT}.pdf`]);
  assert.equal(await eskiFaturaPdfleriniSil(), 1);
});

test('dizin okunamazsa ya da yoksa hata fırlatmaz, 0 döner', async () => {
  sahteDosyaSistemi.okumaHatasi = true;
  assert.equal(await eskiFaturaPdfleriniSil(0), 0);
  sahteDosyaSistemi.okumaHatasi = false;
  sahteDosyaSistemi.documentDirectory = null;
  assert.equal(await eskiFaturaPdfleriniSil(0), 0);
});
