import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DESTEKLENMIYOR_EKI,
  VERGI_SECENEKLERI,
  kalemVergiHatasi,
  vergiTuruDesteklenirMi,
  vergiUyumsuzlukHatasi,
} from '../src/utils/vergiDestegi';
import { KDV_TEVKIFAT_VERGI_TURU, VERGI_TURLERI } from '../src/constants/faturaConstants';
import type { KalemFormu, KalemVergisi } from '../src/types/faturaForm';

function kalem(ekVergi?: KalemVergisi): KalemFormu {
  return { id: 'k', malHizmet: 'X', miktar: '1', birim: 'C62', birimFiyat: '100', iskontoOrani: '0', kdvOrani: 20, ekVergi };
}

test('yalnızca V9015 destekleniyor; diğer 28 tür seçicide pasif ve etiketli', () => {
  assert.equal(vergiTuruDesteklenirMi(KDV_TEVKIFAT_VERGI_TURU), true);
  assert.equal(VERGI_SECENEKLERI.length, VERGI_TURLERI.length);

  const aktifler = VERGI_SECENEKLERI.filter((s) => !s.disabled);
  assert.deepEqual(aktifler.map((s) => s.value), ['V9015']);
  assert.equal(aktifler[0].label, 'KDV TEVKİFAT');

  const pasifler = VERGI_SECENEKLERI.filter((s) => s.disabled);
  assert.equal(pasifler.length, VERGI_TURLERI.length - 1);
  for (const s of pasifler) {
    assert.ok(s.label.endsWith(DESTEKLENMIYOR_EKI), s.label);
    assert.equal(vergiTuruDesteklenirMi(s.value), false, s.value);
  }
  // Değerler (GİB kodları) değişmedi.
  assert.deepEqual(VERGI_SECENEKLERI.map((s) => s.value), VERGI_TURLERI.map((v) => v.value));
});

test('vergisiz kalem ve doğru tevkifat hata vermez', () => {
  assert.equal(kalemVergiHatasi(kalem(), 'SATIS'), null);
  for (const tip of ['TEVKIFAT', 'TEVKIFATIADE', 'YTBTEVKIFAT', 'YTBTEVKIFATIADE']) {
    assert.equal(kalemVergiHatasi(kalem({ tur: 'V9015', tevkifatKodu: '603' }), tip), null, tip);
  }
});

test('desteklenmeyen vergi türü sessizce geçmez', () => {
  assert.match(kalemVergiHatasi(kalem({ tur: 'V0059' }), 'SATIS') ?? '', /"KONAKLAMA VERGİSİ" vergi türü henüz desteklenmiyor/);
  assert.match(kalemVergiHatasi(kalem({ tur: 'V1047' }), 'TEVKIFAT') ?? '', /DAMGA V/);
  assert.match(kalemVergiHatasi(kalem({ tur: 'BILINMEYEN' }), 'SATIS') ?? '', /"BILINMEYEN"/);
});

test('tevkifat kodu yoksa ya da fatura tipi uyumsuzsa hata', () => {
  assert.match(kalemVergiHatasi(kalem({ tur: 'V9015' }), 'TEVKIFAT') ?? '', /tevkifat kodu seçin/);
  assert.match(kalemVergiHatasi(kalem({ tur: 'V9015', tevkifatKodu: '603' }), 'SATIS') ?? '', /Fatura Tipi "TEVKİFAT"/);
});

test('vergiUyumsuzlukHatasi ilk hatalı kalemi numarasıyla bildirir', () => {
  assert.equal(vergiUyumsuzlukHatasi([kalem(), kalem()], 'SATIS'), null);
  assert.match(vergiUyumsuzlukHatasi([kalem(), kalem({ tur: 'V0059' })], 'SATIS') ?? '', /^2\. kalem: /);
});
