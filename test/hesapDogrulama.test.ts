// Uygulama hesabı alan kuralları. Kurallar worker/src/dogrulama.ts ile AYNI
// olmalı; buradaki kopyanın amacı kullanıcıya anında geri bildirim vermek ve
// GİB verisinin ağa hiç çıkmamasını sağlamak.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  GIB_KODU_CAKISMA_MESAJI,
  epostaHatasi,
  epostaNormalize,
  gibKoduylaCakisiyorMu,
  kullaniciAdiHatasi,
  kullaniciAdiNormalize,
  sifreHatasi,
} from '../src/utils/hesapDogrulama';

test('e-posta normalize edilir ve bozuk adresler reddedilir', () => {
  assert.equal(epostaNormalize('  Ali@Ornek.COM '), 'ali@ornek.com');
  assert.equal(epostaHatasi('ali.veli@ornek.com.tr'), null);
  for (const bozuk of ['', 'ali', 'ali@', '@ornek.com', 'ali@ornek', 'a b@c.com']) {
    assert.notEqual(epostaHatasi(bozuk), null, bozuk);
  }
});

test('YALNIZCA RAKAMDAN oluşan kullanıcı adı reddedilir (VKN/TCKN/GİB kodu koruması)', () => {
  for (const ad of ['12345678901', '1234567890', '34567890']) {
    assert.match(kullaniciAdiHatasi(ad) ?? '', /en az bir harf/, ad);
  }
  assert.equal(kullaniciAdiHatasi('aliveli'), null);
  assert.equal(kullaniciAdiHatasi(kullaniciAdiNormalize(' Ali.Veli_99 ')), null);
});

test('kullanıcı adı biçim kuralları', () => {
  assert.notEqual(kullaniciAdiHatasi('ab'), null);
  assert.notEqual(kullaniciAdiHatasi('a'.repeat(21)), null);
  assert.notEqual(kullaniciAdiHatasi('ali veli'), null);
  assert.notEqual(kullaniciAdiHatasi('ali-veli'), null);
  assert.notEqual(kullaniciAdiHatasi('şükrü'), null);
  assert.notEqual(kullaniciAdiHatasi('.ali'), null);
  assert.notEqual(kullaniciAdiHatasi('ali_'), null);
});

test('şifre kuralları', () => {
  assert.equal(sifreHatasi('Kucuk-Kedi-42', 'ali@ornek.com', 'aliveli'), null);
  assert.notEqual(sifreHatasi('kisa12', 'a@b.co', 'ali'), null);
  assert.notEqual(sifreHatasi('password123', 'a@b.co', 'ali'), null);
  assert.notEqual(sifreHatasi('PASSWORD123', 'a@b.co', 'ali'), null);
  assert.notEqual(sifreHatasi('aaaaaaaa', 'a@b.co', 'ali'), null);
  assert.notEqual(sifreHatasi('ali@ornek.com', 'ali@ornek.com', 'aliveli'), null);
  assert.notEqual(sifreHatasi('AliVeli1', 'a@b.co', 'aliveli1'), null);
});

test('hatırlanan GİB kullanıcı koduyla çakışma yalnızca CİHAZDA yakalanır', () => {
  assert.equal(gibKoduylaCakisiyorMu('34567890', '34567890'), true);
  assert.equal(gibKoduylaCakisiyorMu(' 34567890 ', '34567890'), true);
  assert.equal(gibKoduylaCakisiyorMu('ABC123', 'abc123'), true);
  assert.equal(gibKoduylaCakisiyorMu('aliveli', '34567890'), false);
  // Hatırlanan kod yoksa çakışma da yok.
  assert.equal(gibKoduylaCakisiyorMu('34567890', null), false);
  assert.equal(gibKoduylaCakisiyorMu('34567890', ''), false);
  assert.match(GIB_KODU_CAKISMA_MESAJI, /GİB kullanıcı kodunuz/);
});
