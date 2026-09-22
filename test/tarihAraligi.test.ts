// Fatura sorgulama tarih aralığı: GİB 1 haftadan uzun aralığa izin vermiyor
// (kullanıcı bildirimi, 2026-09-21).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  EN_FAZLA_FARK,
  EN_FAZLA_GUN,
  aralikGecerliMi,
  araligiSinirla,
  enErkenBaslangic,
  enGecBitis,
  gunFarki,
  varsayilanBaslangic,
} from '../src/utils/tarihAraligi';

const g = (y: number, a: number, gun: number) => new Date(y, a - 1, gun, 15, 30);
const gun = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const BUGUN = g(2026, 9, 21);

test('sınır uçlar dahil 7 gün (01/08–07/08, 15/08–21/08); varsayılan "son 7 gün" geçerli', () => {
  assert.equal(EN_FAZLA_GUN, 7);
  assert.equal(EN_FAZLA_FARK, 6);
  // Kullanıcının örnekleri (2026-09-22).
  assert.equal(aralikGecerliMi(g(2026, 8, 1), g(2026, 8, 7)), true);
  assert.equal(aralikGecerliMi(g(2026, 8, 15), g(2026, 8, 21)), true);
  assert.equal(aralikGecerliMi(g(2026, 8, 1), g(2026, 8, 8)), false); // 8 gün
  assert.equal(aralikGecerliMi(g(2026, 9, 15), g(2026, 9, 21)), true);
  assert.equal(aralikGecerliMi(g(2026, 9, 14), g(2026, 9, 21)), false);
  assert.equal(gun(varsayilanBaslangic(BUGUN)), '2026-9-15');
  assert.ok(aralikGecerliMi(varsayilanBaslangic(BUGUN), BUGUN));
  assert.equal(aralikGecerliMi(g(2026, 9, 22), g(2026, 9, 21)), false);
});

test('gün farkı saat ve ay/yıl geçişinden etkilenmez', () => {
  assert.equal(gunFarki(new Date(2026, 8, 20, 23, 59), new Date(2026, 8, 21, 0, 1)), 1);
  assert.equal(gunFarki(g(2026, 12, 28), g(2027, 1, 4)), 7);
  assert.equal(gunFarki(g(2026, 2, 26), g(2026, 3, 5)), 7);
});

test('başlangıç geriye çekilirse BİTİŞ kaydırılır, başlangıca dokunulmaz', () => {
  const s = araligiSinirla(g(2026, 9, 1), g(2026, 9, 21), 'baslangic', BUGUN);
  assert.equal(gun(s.baslangic), '2026-9-1');
  assert.equal(gun(s.bitis), '2026-9-7'); // 01–07: uçlar dahil 7 gün
  assert.equal(s.duzeltildi, true);
});

test('bitiş ileri alınırsa BAŞLANGIÇ kaydırılır, bitişe dokunulmaz', () => {
  const s = araligiSinirla(g(2026, 9, 1), g(2026, 9, 20), 'bitis', BUGUN);
  assert.equal(gun(s.baslangic), '2026-9-14'); // 14–20: uçlar dahil 7 gün
  assert.equal(gun(s.bitis), '2026-9-20');
  assert.equal(s.duzeltildi, true);
});

test('aralık zaten geçerliyse hiçbir şey değişmez', () => {
  const s = araligiSinirla(g(2026, 9, 15), g(2026, 9, 20), 'baslangic', BUGUN);
  assert.equal(gun(s.baslangic), '2026-9-15');
  assert.equal(gun(s.bitis), '2026-9-20');
  assert.equal(s.duzeltildi, false);
});

test('bitiş başlangıçtan önceye alınırsa başlangıç ona göre kaydırılır', () => {
  const s = araligiSinirla(g(2026, 9, 18), g(2026, 9, 10), 'bitis', BUGUN);
  assert.equal(gun(s.baslangic), '2026-9-4');
  assert.equal(gun(s.bitis), '2026-9-10');
  assert.ok(aralikGecerliMi(s.baslangic, s.bitis));
});

test('başlangıç bitişten sonraya alınırsa bitiş kaydırılır ama BUGÜNÜ AŞMAZ', () => {
  const s = araligiSinirla(g(2026, 9, 19), g(2026, 9, 10), 'baslangic', BUGUN);
  assert.equal(gun(s.baslangic), '2026-9-19');
  assert.equal(gun(s.bitis), '2026-9-21');
});

test('hiçbir uç bugünden ileri olamaz', () => {
  const s = araligiSinirla(g(2026, 9, 25), g(2026, 9, 30), 'baslangic', BUGUN);
  assert.equal(gun(s.baslangic), '2026-9-21');
  assert.equal(gun(s.bitis), '2026-9-21');
});

test('sonuç her durumda geçerli bir aralıktır', () => {
  for (let a = 1; a <= 28; a += 3) {
    for (let b = 1; b <= 28; b += 4) {
      for (const d of ['baslangic', 'bitis'] as const) {
        const s = araligiSinirla(g(2026, 9, a), g(2026, 9, b), d, BUGUN);
        assert.ok(aralikGecerliMi(s.baslangic, s.bitis), `${a}-${b} ${d}`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Ay sonu sınırı (kullanıcı tarifi, 2026-09-22)
// ---------------------------------------------------------------------------

test('aralık ay sonunu geçemez: 29/08–05/09 ve 29/04–06/05 geçersiz', () => {
  assert.equal(aralikGecerliMi(g(2026, 8, 29), g(2026, 9, 5)), false); // 31 çeken ay
  assert.equal(aralikGecerliMi(g(2026, 4, 29), g(2026, 5, 5)), false); // 30 çeken ay
  assert.equal(aralikGecerliMi(g(2026, 8, 29), g(2026, 8, 31)), true);
  assert.equal(aralikGecerliMi(g(2026, 4, 29), g(2026, 4, 30)), true);
  assert.equal(aralikGecerliMi(g(2026, 12, 29), g(2027, 1, 2)), false); // yıl geçişi
});

test('başlangıç 29/08 seçilince bitiş en fazla 31/08; 29/04 → 30/04; şubat → 28', () => {
  const agustos = araligiSinirla(g(2026, 8, 29), g(2026, 9, 5), 'baslangic', BUGUN);
  assert.equal(gun(agustos.baslangic), '2026-8-29');
  assert.equal(gun(agustos.bitis), '2026-8-31');
  assert.equal(agustos.duzeltildi, true);
  const nisan = araligiSinirla(g(2026, 4, 29), g(2026, 5, 6), 'baslangic', BUGUN);
  assert.equal(gun(nisan.bitis), '2026-4-30');
  const subat = araligiSinirla(g(2026, 2, 25), g(2026, 3, 3), 'baslangic', BUGUN);
  assert.equal(gun(subat.bitis), '2026-2-28');
});

test('bitiş 03/09 seçilince başlangıç en erken 01/09 (ay başından önceye gitmez)', () => {
  const s = araligiSinirla(g(2026, 8, 28), g(2026, 9, 3), 'bitis', BUGUN);
  assert.equal(gun(s.baslangic), '2026-9-1');
  assert.equal(gun(s.bitis), '2026-9-3');
  assert.equal(s.duzeltildi, true);
});

test('ay içindeki kısa aralıklar olduğu gibi kalır', () => {
  const s = araligiSinirla(g(2026, 8, 25), g(2026, 8, 31), 'baslangic', BUGUN);
  assert.equal(gun(s.bitis), '2026-8-31');
  assert.equal(s.duzeltildi, false);
});

test('varsayılan "son 7 gün" ayın ilk günlerinde ay başında durur', () => {
  assert.equal(gun(varsayilanBaslangic(g(2026, 9, 3))), '2026-9-1');
  assert.equal(gun(varsayilanBaslangic(g(2026, 9, 1))), '2026-9-1');
  assert.equal(gun(varsayilanBaslangic(g(2026, 9, 7))), '2026-9-1');
  assert.equal(gun(varsayilanBaslangic(g(2026, 9, 8))), '2026-9-2');
  assert.equal(gun(enErkenBaslangic(g(2026, 3, 2))), '2026-3-1');
  assert.equal(gun(enGecBitis(g(2026, 4, 28))), '2026-4-30');
});

test('ay geçişlerinde de sonuç her zaman geçerli bir aralıktır', () => {
  const bugun = g(2027, 1, 31);
  for (let gunNo = 0; gunNo < 400; gunNo += 3) {
    const a = new Date(2026, 0, 1 + gunNo, 12);
    for (const fark of [-9, -3, 0, 2, 6, 7, 12]) {
      const b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + fark, 12);
      for (const d of ['baslangic', 'bitis'] as const) {
        const s = araligiSinirla(a, b, d, bugun);
        assert.ok(aralikGecerliMi(s.baslangic, s.bitis), `${gun(a)} ${gun(b)} ${d} → ${gun(s.baslangic)}–${gun(s.bitis)}`);
      }
    }
  }
});
