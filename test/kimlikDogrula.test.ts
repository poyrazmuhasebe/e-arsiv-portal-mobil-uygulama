import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tcknGecerliMi, vknGecerliMi, vknTcknGecerliMi, vknTcknHatasi } from '../src/utils/kimlikDogrula';

const GECERLI_VKNLER = ['1460415308', '8590921777'];
const GECERLI_TCKN = '10000000146';

/** Numaranın her hanesini, diğer 9 rakamın her biriyle tek tek değiştirir. */
function tekHaneBozulmuslar(numara: string): string[] {
  const sonuc: string[] = [];
  for (let i = 0; i < numara.length; i++) {
    for (let r = 0; r <= 9; r++) {
      const rakam = String(r);
      if (rakam === numara[i]) continue;
      sonuc.push(numara.slice(0, i) + rakam + numara.slice(i + 1));
    }
  }
  return sonuc;
}

test('bilinen geçerli VKN\'ler kabul edilir', () => {
  for (const vkn of GECERLI_VKNLER) {
    assert.equal(vknGecerliMi(vkn), true, vkn);
    assert.equal(vknTcknGecerliMi(vkn), true, vkn);
    assert.equal(vknTcknHatasi(vkn), null, vkn);
  }
});

test('bilinen geçerli TCKN kabul edilir', () => {
  assert.equal(tcknGecerliMi(GECERLI_TCKN), true);
  assert.equal(vknTcknGecerliMi(GECERLI_TCKN), true);
  assert.equal(vknTcknHatasi(GECERLI_TCKN), null);
});

test('VKN\'nin herhangi bir tek hanesi bozulunca reddedilir', () => {
  for (const vkn of GECERLI_VKNLER) {
    for (const bozuk of tekHaneBozulmuslar(vkn)) {
      assert.equal(vknGecerliMi(bozuk), false, bozuk);
      assert.match(vknTcknHatasi(bozuk) ?? '', /Geçersiz VKN/, bozuk);
    }
  }
});

test('TCKN\'nin herhangi bir tek hanesi bozulunca reddedilir', () => {
  for (const bozuk of tekHaneBozulmuslar(GECERLI_TCKN)) {
    assert.equal(tcknGecerliMi(bozuk), false, bozuk);
  }
  assert.match(vknTcknHatasi('10000000147') ?? '', /Geçersiz TCKN/);
});

test('uzunluk ve karakter kuralları', () => {
  assert.equal(vknTcknGecerliMi(''), false);
  assert.equal(vknTcknGecerliMi('146041530'), false); // 9 hane
  assert.equal(vknTcknGecerliMi('1460415308 '), true); // kenar boşluğu kırpılır
  assert.equal(tcknGecerliMi('00000000000'), false); // ilk hane 0 olamaz
  assert.equal(vknGecerliMi('146041530a'), false);
  // Yazma sürerken (henüz 10/11 hane değilken) uyarı çıkmaz.
  assert.equal(vknTcknHatasi('14604'), null);
  assert.equal(vknTcknHatasi(''), null);
  assert.match(vknTcknHatasi('12a4') ?? '', /yalnızca rakam/);
});
