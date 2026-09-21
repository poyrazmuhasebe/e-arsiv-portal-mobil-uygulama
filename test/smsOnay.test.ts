// SMS ile imzalama (2. adım) — 2026-09-21 hatası: GİB SMS onayını kabul
// etmediği hâlde uygulama "Onaylandı" diyordu, çünkü yanıta hiç bakılmıyordu.
//
// Testlerdeki TÜM değerler uydurmadır; gerçek yakalamadaki token, SMS kodu,
// ETTN ve alıcı kimliği kullanılmaz.

import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteAxios, sahteleriSifirla } from './sahte/kurulum';
import { GibApiError, smsOnayYanitiniYorumla, smsSifreOnayla } from '../src/services/gibApi';
import type { TaslakFatura } from '../src/types/gib';

beforeEach(() => sahteleriSifirla());

const TASLAK: TaslakFatura = {
  ettn: '00000000-0000-4000-8000-000000000001',
  faturaOid: '',
  toplamTutar: '0',
  belgeNumarasi: 'GIB2026000000099',
  aliciVknTckn: '11111111111',
  aliciUnvanAdSoyad: 'DENEME ALICI',
  saticiVknTckn: '',
  saticiUnvanAdSoyad: '',
  belgeTarihi: '01-01-2026',
  belgeTuru: 'FATURA',
  onayDurumu: 'Onaylanmadı',
  talepDurumColumn: '----------',
  iptalItiraz: '-99',
  talepDurum: '-99',
};

// ---------------------------------------------------------------------------
// Yanıt yorumlama (saf)
// ---------------------------------------------------------------------------

test('gözlenmiş başarı metni başarı sayılır (düz metin ve nesne içinde)', () => {
  const metin = 'SMS şifreniz doğrulandı, işlem başarılı.';
  assert.equal(smsOnayYanitiniYorumla(metin).durum, 'basarili');
  assert.equal(smsOnayYanitiniYorumla({ msg: metin }).durum, 'basarili');
  assert.equal(smsOnayYanitiniYorumla({ mesaj: metin }).mesaj, metin);
});

test('ret metinleri başarısız sayılır (Türkçe büyük harf dahil)', () => {
  for (const ret of [
    'Girilen SMS şifresi hatalıdır.',
    'SMS ŞİFRESİ GEÇERSİZ',
    'Şifrenin süresi doldu.',
    'İşlem başarısız.',
    'Kayıt bulunamadı',
    { msg: 'SMS şifresi yanlış girildi' },
  ]) {
    assert.equal(smsOnayYanitiniYorumla(ret).durum, 'basarisiz', JSON.stringify(ret));
  }
});

test('"başarısız" kelimesi "başarı" içerdiği hâlde BAŞARI SAYILMAZ', () => {
  assert.equal(smsOnayYanitiniYorumla('İşlem başarısız oldu').durum, 'basarisiz');
});

test('boş ya da tanınmayan yanıt ASLA başarı sayılmaz', () => {
  for (const yanit of [undefined, null, '', '   ', {}, { foo: 1 }, [], 'İşlem tamamlandı', 42]) {
    assert.equal(smsOnayYanitiniYorumla(yanit).durum, 'belirsiz', JSON.stringify(yanit));
  }
});

// ---------------------------------------------------------------------------
// smsSifreOnayla — istek ve yanıt
// ---------------------------------------------------------------------------

function sonIstekAlanlari(): URLSearchParams {
  const istek = sahteAxios.istekler[sahteAxios.istekler.length - 1];
  assert.ok(istek, 'istek atılmadı');
  return new URLSearchParams(istek.govde);
}

test('istek GİB portalının kendi isteğiyle aynı yapıda gönderilir', async () => {
  sahteAxios.isleyici = () => ({ status: 200, data: { data: 'SMS şifreniz doğrulandı, işlem başarılı.' } });

  await smsSifreOnayla('sahte-token', TASLAK, 'AB12CD', 'sahteoid123');

  const alanlar = sonIstekAlanlari();
  assert.equal(alanlar.get('cmd'), '0lhozfib5410mp');
  assert.equal(alanlar.get('pageName'), 'RG_SMSONAY');

  const jp = JSON.parse(alanlar.get('jp') ?? '{}') as {
    SIFRE: string; OID: string; OPR: number; DATA: Record<string, unknown>[];
  };
  assert.equal(jp.SIFRE, 'AB12CD');
  assert.equal(jp.OID, 'sahteoid123');
  assert.equal(jp.OPR, 1);
  assert.equal(jp.DATA.length, 1);
  // GİB portalının gerçek isteğindeki DATA ögesiyle aynı 14 alan.
  assert.deepEqual(Object.keys(jp.DATA[0] ?? {}).sort(), [
    'aliciUnvanAdSoyad', 'aliciVknTckn', 'belgeNumarasi', 'belgeTarihi', 'belgeTuru',
    'ettn', 'faturaOid', 'iptalItiraz', 'onayDurumu', 'saticiUnvanAdSoyad',
    'saticiVknTckn', 'talepDurum', 'talepDurumColumn', 'toplamTutar',
  ]);
  assert.equal(jp.DATA[0]?.ettn, TASLAK.ettn);
});

test('başarı yanıtında GİB\'in kendi mesajı döner', async () => {
  sahteAxios.isleyici = () => ({ status: 200, data: { data: 'SMS şifreniz doğrulandı, işlem başarılı.' } });
  const sonuc = await smsSifreOnayla('sahte-token', TASLAK, 'AB12CD', 'sahteoid123');
  assert.deepEqual(sonuc, { durum: 'basarili', mesaj: 'SMS şifreniz doğrulandı, işlem başarılı.' });
});

test('HTTP 200 ile gelen RET mesajı artık HATA FIRLATIR (eskiden başarı sayılıyordu)', async () => {
  sahteAxios.isleyici = () => ({ status: 200, data: { data: 'Girilen SMS şifresi hatalıdır.' } });
  await assert.rejects(
    () => smsSifreOnayla('sahte-token', TASLAK, 'YANLIS', 'sahteoid123'),
    (hata: unknown) => hata instanceof GibApiError && /hatal/i.test(hata.message),
  );
});

test('boş/tanınmayan yanıt başarı olarak DÖNMEZ, "belirsiz" döner', async () => {
  sahteAxios.isleyici = () => ({ status: 200, data: { data: {} } });
  const sonuc = await smsSifreOnayla('sahte-token', TASLAK, 'AB12CD', 'sahteoid123');
  assert.equal(sonuc.durum, 'belirsiz');
});
