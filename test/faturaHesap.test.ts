import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_BIRIM_FIYAT,
  MAX_MIKTAR,
  faturaOzetiHesapla,
  gecerliSayiMi,
  kalemHesapla,
  kalemlerAralikHatasi,
  parseNumara,
} from '../src/utils/faturaHesap';
import type { KalemFormu } from '../src/types/faturaForm';

function kalem(patch: Partial<KalemFormu> = {}): KalemFormu {
  return {
    id: 'k1',
    malHizmet: 'Danışmanlık',
    miktar: '1',
    birim: 'C62',
    birimFiyat: '100',
    iskontoOrani: '0',
    kdvOrani: 20,
    ...patch,
  };
}

/** Kayan nokta farklarını yok sayan karşılaştırma (kuruş hassasiyeti). */
function yaklasik(gercek: number, beklenen: number, mesaj?: string) {
  assert.ok(Math.abs(gercek - beklenen) < 1e-9, `${mesaj ?? ''} beklenen ${beklenen}, gelen ${gercek}`);
}

test('parseNumara: geçerli ondalık girdiler', () => {
  assert.equal(parseNumara('10'), 10);
  assert.equal(parseNumara('10,5'), 10.5);
  assert.equal(parseNumara('10.5'), 10.5);
  assert.equal(parseNumara(' 7 '), 7);
  assert.equal(parseNumara('3,'), 3);
  assert.equal(parseNumara(',5'), 0.5);
  assert.equal(parseNumara('0'), 0);
});

test('parseNumara: onaltılık/üstel/negatif ve bozuk girdiler reddedilir (0)', () => {
  for (const girdi of ['0x10', '0b11', '0o7', '1e3', '1E3', '-5', '+5', 'abc', '', ' ', '1.2.3', '1,2,3', 'Infinity', 'NaN', '1 000']) {
    assert.equal(parseNumara(girdi), 0, `"${girdi}"`);
    if (girdi.trim()) assert.equal(gecerliSayiMi(girdi), false, `"${girdi}"`);
  }
});

test('kalemlerAralikHatasi: geçerli ve boş alanlar hata vermez', () => {
  assert.equal(kalemlerAralikHatasi([kalem()]), null);
  assert.equal(kalemlerAralikHatasi([kalem({ miktar: '', birimFiyat: '', iskontoOrani: '' })]), null);
  assert.equal(kalemlerAralikHatasi([kalem({ iskontoOrani: '100', miktar: String(MAX_MIKTAR) })]), null);
});

test('kalemlerAralikHatasi: aralık dışı ve geçersiz sayılar yakalanır', () => {
  assert.match(kalemlerAralikHatasi([kalem({ iskontoOrani: '101' })]) ?? '', /1\. kalem: İskonto oranı 0 ile 100/);
  assert.match(kalemlerAralikHatasi([kalem({ miktar: String(MAX_MIKTAR + 1) })]) ?? '', /Miktar en fazla/);
  assert.match(kalemlerAralikHatasi([kalem({ birimFiyat: String(MAX_BIRIM_FIYAT * 2) })]) ?? '', /Birim fiyat en fazla/);
  assert.match(kalemlerAralikHatasi([kalem({ miktar: '1e3' })]) ?? '', /Miktar geçerli bir sayı/);
  assert.match(kalemlerAralikHatasi([kalem({ birimFiyat: '-5' })]) ?? '', /Birim fiyat geçerli bir sayı/);
  // Hata doğru kalem numarasıyla bildirilir.
  assert.match(kalemlerAralikHatasi([kalem(), kalem({ iskontoOrani: '0x10' })]) ?? '', /^2\. kalem:/);
});

test('kalemHesapla: iskonto ve KDV', () => {
  const h = kalemHesapla(kalem({ miktar: '10', birimFiyat: '100', iskontoOrani: '10', kdvOrani: 20 }));
  yaklasik(h.bruttTutar, 1000);
  yaklasik(h.iskontoTutari, 100);
  yaklasik(h.netTutar, 900);
  yaklasik(h.kdvTutari, 180);
  assert.equal(h.tevkifatOrani, undefined);
  assert.equal(h.tevkifatTutari, 0);
});

test('kalemHesapla: ondalık virgüllü girdi', () => {
  const h = kalemHesapla(kalem({ miktar: '2,5', birimFiyat: '40', kdvOrani: 10 }));
  yaklasik(h.netTutar, 100);
  yaklasik(h.kdvTutari, 10);
});

test('kalemHesapla: KDV tevkifatı (V9015, 603 = 7/10)', () => {
  const h = kalemHesapla(
    kalem({ miktar: '1', birimFiyat: '1000', kdvOrani: 20, ekVergi: { tur: 'V9015', tevkifatKodu: '603' } }),
  );
  assert.equal(h.tevkifatOrani, 7);
  yaklasik(h.kdvTutari, 200);
  yaklasik(h.tevkifatTutari, 140);
});

test('kalemHesapla: tevkifat kodu seçilmemiş ya da bilinmiyorsa tevkifat yok', () => {
  assert.equal(kalemHesapla(kalem({ ekVergi: { tur: 'V9015' } })).tevkifatOrani, undefined);
  assert.equal(kalemHesapla(kalem({ ekVergi: { tur: 'V9015', tevkifatKodu: '999' } })).tevkifatOrani, undefined);
});

test('faturaOzetiHesapla: tevkifatlı ve tevkifatsız kalemlerin toplamı', () => {
  const ozet = faturaOzetiHesapla([
    kalem({ id: 'a', miktar: '1', birimFiyat: '1000', kdvOrani: 20, ekVergi: { tur: 'V9015', tevkifatKodu: '603' } }),
    kalem({ id: 'b', miktar: '2', birimFiyat: '50', kdvOrani: 10 }),
  ]);
  yaklasik(ozet.malHizmetToplam, 1100);
  yaklasik(ozet.hesaplananKdv, 210);
  yaklasik(ozet.tevkifataTabiTutar, 1000);
  yaklasik(ozet.tevkifataTabiUzerindenKdv, 200);
  yaklasik(ozet.hesaplananKdvTevkifat, 140);
  yaklasik(ozet.vergilerDahilToplam, 1310);
  yaklasik(ozet.odenecekTutar, 1170);
  assert.equal(ozet.tevkifatVarMi, true);
});
