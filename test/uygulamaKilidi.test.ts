import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteDepo, sahtePlatform, sahteYerelKimlik, sahteleriSifirla } from './sahte/kurulum';
import {
  KILIT_ZAMAN_ASIMI_MS,
  cihazKilidiVarMi,
  kilidiAcmayiDene,
  kilitAyariAcikMi,
  kilitAyariniKaydet,
  kilitGerekliMi,
  kilitHataMesaji,
  kilitUygulanamazMi,
  zamanAsimiDolduMu,
} from '../src/utils/uygulamaKilidi';

beforeEach(() => sahteleriSifirla());

test('kilit ayarı varsayılan açık, yalnızca "0" kapalı', async () => {
  assert.equal(await kilitAyariAcikMi(), true);
  await kilitAyariniKaydet(false);
  assert.equal(sahteDepo.veriler.get('gib_uygulama_kilidi'), '0');
  assert.equal(await kilitAyariAcikMi(), false);
  await kilitAyariniKaydet(true);
  assert.equal(await kilitAyariAcikMi(), true);
});

test('cihaz kilidi: seviye NONE, hata ve web durumunda yok sayılır', async () => {
  assert.equal(await cihazKilidiVarMi(), true);
  sahteYerelKimlik.seviye = 0;
  assert.equal(await cihazKilidiVarMi(), false);
  sahteYerelKimlik.seviye = 3;
  sahteYerelKimlik.seviyeHatasi = true;
  assert.equal(await cihazKilidiVarMi(), false);
  sahteYerelKimlik.seviyeHatasi = false;
  sahtePlatform.OS = 'web';
  assert.equal(await cihazKilidiVarMi(), false);
});

test('kilit yalnızca ayar açık VE cihaz kilidi varsa gerekir', async () => {
  assert.equal(await kilitGerekliMi(), true);
  await kilitAyariniKaydet(false);
  assert.equal(await kilitGerekliMi(), false);
  await kilitAyariniKaydet(true);
  sahteYerelKimlik.seviye = 0;
  assert.equal(await kilitGerekliMi(), false);
});

test('zaman aşımı: eşikten önce kilitlemez, eşikte ve saat geri alınınca kilitler', () => {
  const t0 = 1_000_000;
  assert.equal(zamanAsimiDolduMu(null, t0), false);
  assert.equal(zamanAsimiDolduMu(t0, t0 + KILIT_ZAMAN_ASIMI_MS - 1), false);
  assert.equal(zamanAsimiDolduMu(t0, t0 + KILIT_ZAMAN_ASIMI_MS), true);
  assert.equal(zamanAsimiDolduMu(t0, t0 - 1), true);
});

test('kilidi açma sonucu ve hata mesajları', async () => {
  assert.deepEqual(await kilidiAcmayiDene(), { basarili: true });
  sahteYerelKimlik.sonuc = { success: false, error: 'lockout' };
  assert.deepEqual(await kilidiAcmayiDene(), { basarili: false, hata: 'lockout' });

  assert.equal(kilitHataMesaji('user_cancel'), null);
  assert.match(kilitHataMesaji('lockout') ?? '', /Çok fazla hatalı deneme/);
  assert.ok(kilitHataMesaji('bilinmeyen'));
  assert.equal(kilitUygulanamazMi('not_enrolled'), true);
  assert.equal(kilitUygulanamazMi('authentication_failed'), false);
});
