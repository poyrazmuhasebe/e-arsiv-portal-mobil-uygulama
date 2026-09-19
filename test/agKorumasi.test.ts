// Testlerin HİÇBİR KOŞULDA gerçek ağa çıkmadığını doğrular.
//
// Node 24'te `fetch` yerleşik olarak var; sahte axios yalnızca `axios`
// modülünü kapsıyordu. Uygulama hesabı istemcisi Worker'a fetch ile gidecek,
// bu yüzden fetch de sahtelendi (test/sahte/kurulum.ts).

import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteFetch, sahteJsonYanit, sahteleriSifirla } from './sahte/kurulum';

beforeEach(() => sahteleriSifirla());

test('varsayılan olarak her fetch isteği hata fırlatır', async () => {
  await assert.rejects(
    () => fetch('https://ornek.test/v1/kayit', { method: 'POST' }),
    /Testte beklenmeyen ağ isteği \(fetch\)/,
  );
});

test('istekler kaydedilir: url, yöntem, başlıklar ve gövde görülebilir', async () => {
  sahteFetch.isleyici = () => sahteJsonYanit({ tamam: true });

  const yanit = await fetch('https://ornek.test/v1/giris', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer abc' },
    body: JSON.stringify({ eposta: 'a@b.co' }),
  });

  assert.equal(yanit.status, 200);
  assert.deepEqual(await yanit.json(), { tamam: true });
  assert.equal(sahteFetch.istekler.length, 1);

  const istek = sahteFetch.istekler[0];
  assert.ok(istek);
  assert.equal(istek.url, 'https://ornek.test/v1/giris');
  assert.equal(istek.yontem, 'POST');
  assert.equal(istek.basliklar.authorization, 'Bearer abc');
  assert.equal(istek.govde, '{"eposta":"a@b.co"}');
});

test('sahteleriSifirla kayıtları ve işleyiciyi varsayılana döndürür', async () => {
  sahteFetch.isleyici = () => sahteJsonYanit({ tamam: true });
  await fetch('https://ornek.test/v1/saglik');
  assert.equal(sahteFetch.istekler.length, 1);

  sahteleriSifirla();

  assert.equal(sahteFetch.istekler.length, 0);
  await assert.rejects(() => fetch('https://ornek.test/v1/saglik'));
});
