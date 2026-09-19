import { test } from 'node:test';
import assert from 'node:assert/strict';

import { paraBirimiSimgesi, tutarEtiketi } from '../src/utils/paraBirimi';
import { PARA_BIRIMLERI, VARSAYILAN_PARA_BIRIMI } from '../src/constants/faturaConstants';

test('bilinen kodlar simgeye çevrilir', () => {
  assert.equal(paraBirimiSimgesi('TRY'), '₺');
  assert.equal(paraBirimiSimgesi('USD'), '$');
  assert.equal(paraBirimiSimgesi('EUR'), '€');
  assert.equal(paraBirimiSimgesi('GBP'), '£');
  assert.equal(paraBirimiSimgesi(' eur '), '€');
  assert.equal(paraBirimiSimgesi(VARSAYILAN_PARA_BIRIMI), '₺');
});

test('bilinmeyen ya da çok anlamlı simgeli kodlarda kodun kendisi gösterilir', () => {
  assert.equal(paraBirimiSimgesi('CHF'), 'CHF');
  assert.equal(paraBirimiSimgesi('CAD'), 'CAD'); // "$" USD ile karışmasın
  assert.equal(paraBirimiSimgesi('JPY'), 'JPY');
  assert.equal(paraBirimiSimgesi('XYZ'), 'XYZ');
  assert.equal(paraBirimiSimgesi(''), '');
});

test('GİB listesindeki her kod için boş olmayan bir etiket üretilir', () => {
  for (const { value } of PARA_BIRIMLERI) {
    assert.ok(paraBirimiSimgesi(value).length > 0, value);
  }
});

test('tutarEtiketi Türkçe biçimle simgeyi birleştirir', () => {
  // toLocaleString('tr-TR') Node'un ICU verisine bağlı; ayraçları ondan alıyoruz.
  const bicimli = (1234.5).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  assert.equal(tutarEtiketi(1234.5, 'TRY'), `${bicimli} ₺`);
  assert.equal(tutarEtiketi(1234.5, 'CHF'), `${bicimli} CHF`);
  assert.equal(tutarEtiketi(1234.5, ''), bicimli);
});
