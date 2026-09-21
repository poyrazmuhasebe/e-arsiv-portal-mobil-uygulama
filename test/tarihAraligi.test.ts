// Fatura sorgulama tarih aralığı: GİB 1 haftadan uzun aralığa izin vermiyor
// (kullanıcı bildirimi, 2026-09-21).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { EN_FAZLA_GUN, aralikGecerliMi, araligiSinirla, gunFarki } from '../src/utils/tarihAraligi';

const g = (y: number, a: number, gun: number) => new Date(y, a - 1, gun, 15, 30);
const gun = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const BUGUN = g(2026, 9, 21);

test('sınır 7 gün; varsayılan "son 7 gün" geçerli', () => {
  assert.equal(EN_FAZLA_GUN, 7);
  assert.equal(aralikGecerliMi(g(2026, 9, 14), g(2026, 9, 21)), true);
  assert.equal(aralikGecerliMi(g(2026, 9, 13), g(2026, 9, 21)), false);
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
  assert.equal(gun(s.bitis), '2026-9-8');
  assert.equal(s.duzeltildi, true);
});

test('bitiş ileri alınırsa BAŞLANGIÇ kaydırılır, bitişe dokunulmaz', () => {
  const s = araligiSinirla(g(2026, 9, 1), g(2026, 9, 20), 'bitis', BUGUN);
  assert.equal(gun(s.baslangic), '2026-9-13');
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
  assert.equal(gun(s.baslangic), '2026-9-3');
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
