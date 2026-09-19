// Uygulama hesabı istemcisi: GİB verisinin gönderilmemesi, hata yolları,
// sunucu adresi yapılandırması.

import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteFetch, sahteJsonYanit, sahteleriSifirla } from './sahte/kurulum';
import {
  HesapApiHatasi,
  epostaDogrula,
  girisYap,
  govdeyiDenetle,
  kayitOl,
  oturumYenile,
} from '../src/services/hesapApi';
import { hesapSunucuDurumu } from '../src/config/hesapSunucu';

const TABAN = 'https://hesap.ornek.test';

beforeEach(() => {
  sahteleriSifirla();
  process.env.EXPO_PUBLIC_HESAP_API_URL = TABAN;
});

// ---------------------------------------------------------------------------
// GİB verisi hesap sunucusuna GİTMEZ
// ---------------------------------------------------------------------------

test('govdeyiDenetle GİB alanlarını reddeder', () => {
  const yasaklilar: Record<string, unknown>[] = [
    { gibToken: 'x' },
    { gibKullaniciKodu: '34567890' },
    { kullaniciKodu: '34567890' },
    { kullaniciSifresi: 'gizli' },
    { kullaniciBilgisi: { unvan: 'Örnek Ltd' } },
    { vkn: '1234567890' },
    { tckn: '12345678901' },
    { unvan: 'Örnek Ltd' },
    { faturalar: [] },
    { aliciDefteri: [] },
    { malHizmetDefteri: [] },
    { iadeTable: [] },
    { token: 'x' },
    { vergiDairesi: 'Kadıköy' },
  ];
  for (const govde of yasaklilar) {
    assert.throws(
      () => govdeyiDenetle(govde),
      /yasakli_alan|gönderilemeyecek/,
      `reddedilmeliydi: ${Object.keys(govde)[0]}`,
    );
  }
});

test('govdeyiDenetle iç içe ve dizi içindeki GİB alanlarını da bulur', () => {
  assert.throws(() => govdeyiDenetle({ a: { b: { gibToken: 'x' } } }), /gibToken/);
  assert.throws(() => govdeyiDenetle({ liste: [{ vkn: '1' }] }), /vkn/);
});

test('govdeyiDenetle meşru hesap alanlarını geçirir', () => {
  govdeyiDenetle({ eposta: 'a@b.co', kullaniciAdi: 'aliveli', sifre: 'Kucuk-Kedi-42' });
  govdeyiDenetle({ yenilemeToken: 'abc' });
  govdeyiDenetle({ kod: '123456' });
});

test('gönderilen istek gövdesinde hiçbir GİB alanı bulunmaz', async () => {
  sahteFetch.isleyici = () =>
    sahteJsonYanit({
      kullanici: { id: '1', eposta: 'a@b.co', kullaniciAdi: 'aliveli', epostaDogrulandi: false },
      oturum: { erisimToken: 'e', erisimBitis: 1, yenilemeToken: 'y', yenilemeBitis: 2 },
    });

  await kayitOl('a@b.co', 'aliveli', 'Kucuk-Kedi-42', true);

  const istek = sahteFetch.istekler[0];
  assert.ok(istek);
  const govde = JSON.parse(istek.govde ?? '{}') as Record<string, unknown>;
  assert.deepEqual(Object.keys(govde).sort(), ['eposta', 'kullaniciAdi', 'sifre']);

  // Başlıklarda da GİB verisi olmamalı.
  const basliklarMetni = JSON.stringify(istek.basliklar).toLowerCase();
  assert.doesNotMatch(basliklarMetni, /gib|vkn|tckn/);
});

test('gövdeye GİB alanı sızarsa istek HİÇ ATILMAZ', () => {
  assert.throws(() =>
    govdeyiDenetle({ eposta: 'a@b.co', sifre: 'x', gibToken: 'sizinti' }),
  );
  assert.equal(sahteFetch.istekler.length, 0);
});

// ---------------------------------------------------------------------------
// Sunucu adresi yapılandırması
// ---------------------------------------------------------------------------

test('adres tanımsızsa istek atılmaz, anlamlı hata döner', async () => {
  delete process.env.EXPO_PUBLIC_HESAP_API_URL;
  await assert.rejects(
    () => girisYap('a@b.co', 'Kucuk-Kedi-42', true),
    /yapılandırılmamış/,
  );
  assert.equal(sahteFetch.istekler.length, 0);
});

test('yayın derlemesinde http adres reddedilir, geliştirmede kabul edilir', () => {
  process.env.EXPO_PUBLIC_HESAP_API_URL = 'http://192.168.1.25:8787';
  assert.equal(hesapSunucuDurumu(true).tamam, true);

  const yayin = hesapSunucuDurumu(false);
  assert.equal(yayin.tamam, false);
  if (!yayin.tamam) assert.match(yayin.mesaj, /https/);
});

test('sondaki eğik çizgi temizlenir', async () => {
  process.env.EXPO_PUBLIC_HESAP_API_URL = `${TABAN}///`;
  sahteFetch.isleyici = () => sahteJsonYanit({ tamam: true });
  await oturumYenile('abc', true).catch(() => undefined);
  assert.equal(sahteFetch.istekler[0]?.url, `${TABAN}/v1/oturum/yenile`);
});

// ---------------------------------------------------------------------------
// Hata yolları
// ---------------------------------------------------------------------------

test('sunucu erişilemezken anlamlı Türkçe hata döner', async () => {
  sahteFetch.isleyici = () => {
    throw new TypeError('fetch failed');
  };
  await assert.rejects(() => girisYap('a@b.co', 'Kucuk-Kedi-42', true), /ulaşılamadı/);
});

test('HTML hata sayfası (Cloudflare 1101/1102/1027) JSON sanılmaz', async () => {
  sahteFetch.isleyici = () =>
    new Response('<!DOCTYPE html><html><body>Error 1102</body></html>', {
      status: 500,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });

  await assert.rejects(
    () => girisYap('a@b.co', 'Kucuk-Kedi-42', true),
    (hata: unknown) => {
      assert.ok(hata instanceof HesapApiHatasi);
      assert.equal(hata.kod, 'sunucu_yaniti_bozuk');
      assert.match(hata.message, /hizmet veremiyor/);
      return true;
    },
  );
});

test('sunucunun hata kodu ve mesajı istemciye taşınır', async () => {
  sahteFetch.isleyici = () =>
    sahteJsonYanit(
      { hata: { kod: 'eposta_kullanimda', mesaj: 'Bu e-posta adresiyle bir hesap zaten var.' } },
      409,
    );

  await assert.rejects(
    () => kayitOl('a@b.co', 'aliveli', 'Kucuk-Kedi-42', true),
    (hata: unknown) => {
      assert.ok(hata instanceof HesapApiHatasi);
      assert.equal(hata.kod, 'eposta_kullanimda');
      assert.equal(hata.durum, 409);
      assert.match(hata.message, /zaten var/);
      return true;
    },
  );
});

test('erişim token\'ı Authorization başlığıyla gönderilir', async () => {
  sahteFetch.isleyici = () => sahteJsonYanit({ tamam: true, epostaDogrulandi: true });
  await epostaDogrula('erisim-token-degeri', '123456', true);
  assert.equal(sahteFetch.istekler[0]?.basliklar.authorization, 'Bearer erisim-token-degeri');
});
