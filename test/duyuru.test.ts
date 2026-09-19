import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteDepo, sahteleriSifirla } from './sahte/kurulum';
import { GIB_DUYURULARI, type Duyuru } from '../src/constants/duyurular';
import { duyuruyuKapat, gosterilecekDuyuru, kapatilanDuyurulariGetir } from '../src/utils/duyuru';

beforeEach(() => sahteleriSifirla());

function duyuru(id: string, bitis: string): Duyuru {
  return { id, baslik: id, tarih: '', paragraflar: [], bitis };
}

const BOS = new Set<string>();

test('planlı bakım duyurusu bakım bitene kadar gösterilir, sonra gizlenir', () => {
  const bakim = GIB_DUYURULARI.find((d) => d.id === 'gib-planli-bakim-2026-09-19');
  assert.ok(bakim);
  // Türkiye saati (UTC+3) ile sınırlar.
  assert.equal(gosterilecekDuyuru(GIB_DUYURULARI, new Date('2026-09-19T10:00:00+03:00'), BOS)?.id, bakim.id);
  assert.equal(gosterilecekDuyuru(GIB_DUYURULARI, new Date('2026-09-20T23:59:00+03:00'), BOS)?.id, bakim.id);
  assert.equal(gosterilecekDuyuru(GIB_DUYURULARI, new Date('2026-09-20T23:59:01+03:00'), BOS), null);
  assert.equal(gosterilecekDuyuru(GIB_DUYURULARI, new Date('2026-09-21T09:00:00+03:00'), BOS), null);
});

test('kapatılan duyuru atlanır, sıradaki gösterilir; tarihi bozuk olan gösterilmez', () => {
  const liste = [duyuru('a', '2030-01-01T00:00:00Z'), duyuru('bozuk', 'yarın'), duyuru('b', '2030-01-01T00:00:00Z')];
  const simdi = new Date('2026-09-19T00:00:00Z');
  assert.equal(gosterilecekDuyuru(liste, simdi, BOS)?.id, 'a');
  assert.equal(gosterilecekDuyuru(liste, simdi, new Set(['a']))?.id, 'b');
  assert.equal(gosterilecekDuyuru(liste, simdi, new Set(['a', 'b'])), null);
});

test('kapatma cihazda hatırlanır; artık tanımlı olmayan kimlikler temizlenir', async () => {
  assert.deepEqual([...(await kapatilanDuyurulariGetir())], []);
  sahteDepo.veriler.set('gib_kapatilan_duyurular', JSON.stringify(['eski-silinmis']));
  await duyuruyuKapat('x', ['x', 'y']);
  assert.deepEqual([...(await kapatilanDuyurulariGetir())], ['x']);
  sahteDepo.veriler.set('gib_kapatilan_duyurular', '{bozuk');
  assert.deepEqual([...(await kapatilanDuyurulariGetir())], []);
});

test('duyuru metni GİB duyurusundaki maddeleri ve kaynağı içeriyor', () => {
  const bakim = GIB_DUYURULARI[0];
  assert.equal(bakim.tarih, '18/9/2026');
  assert.equal(bakim.paragraflar.filter((p) => p.startsWith('- ')).length, 4);
  assert.equal(bakim.paragraflar.at(-1), 'Duyurulur.');
  assert.match(bakim.baglanti ?? '', /^https:\/\/ebelge\.gib\.gov\.tr\/.+\.pdf$/);
});
