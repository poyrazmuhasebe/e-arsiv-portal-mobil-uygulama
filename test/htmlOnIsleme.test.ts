import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  KAREKOD_PX,
  betikliHtmlHazirla,
  cspEkle,
  mesajiCoz,
  onIsleyiciKaydet,
  onislemeBetigi,
  type OnislemeIsi,
} from '../src/utils/htmlOnIsleme';

const BETIKLI = '<html><head><title>F</title></head><body><div id="qrcode"></div><script>1</script></body></html>';

afterEach(() => onIsleyiciKaydet(null));

test('cspEkle: politika <head>in en başına, ilk betikten önce', () => {
  const s = cspEkle(BETIKLI);
  const csp = s.indexOf('Content-Security-Policy');
  assert.ok(csp > 0 && csp < s.indexOf('<script'));
  assert.match(s, /connect-src 'none'/);
  assert.match(s, /img-src data:/);
  assert.match(cspEkle('<html><body>x</body></html>'), /<html><head><meta id="earsiv-onisleme-csp"/);
  assert.match(cspEkle('<p>x</p>'), /^<meta id="earsiv-onisleme-csp"/);
});

test('onislemeBetigi: geçerli JavaScript, jetonu içerir', () => {
  const b = onislemeBetigi('abc-123');
  // Sözdizimi hatası olsaydı Function kurucusu fırlatırdı.
  assert.equal(typeof new Function(b), 'function');
  assert.match(b, /"abc-123"/);
  assert.match(b, /toDataURL/);
  // Karekod, GİB'in kendi PDF'indeki boyuta (220 CSS px) sabitlenir.
  assert.equal(KAREKOD_PX, 220);
  assert.match(b, /style\.width = '220px'/);
  assert.match(b, /style\.height = '220px'/);
});

test('mesajiCoz: yalnızca bu işin jetonuyla gelen HTML kabul edilir', () => {
  assert.equal(mesajiCoz(JSON.stringify({ t: 'j1', html: '<p>ok</p>' }), 'j1'), '<p>ok</p>');
  assert.equal(mesajiCoz(JSON.stringify({ t: 'baska', html: '<p>x</p>' }), 'j1'), null);
  assert.equal(mesajiCoz(JSON.stringify({ t: 'j1', hata: 'x' }), 'j1'), null);
  assert.equal(mesajiCoz(JSON.stringify({ t: 'j1', html: '' }), 'j1'), null);
  assert.equal(mesajiCoz('{bozuk', 'j1'), null);
});

test('işleyici yoksa ya da HTML betik içermiyorsa özgün HTML hemen döner', async () => {
  assert.equal(await betikliHtmlHazirla(BETIKLI), BETIKLI);
  let cagrildi = false;
  onIsleyiciKaydet(() => (cagrildi = true));
  assert.equal(await betikliHtmlHazirla('<p>betiksiz</p>'), '<p>betiksiz</p>');
  assert.equal(cagrildi, false);
});

test('işleyici sonucu döner', async () => {
  onIsleyiciKaydet((is) => {
    if (is) setTimeout(() => is.bitir('<p>karekodlu</p>'), 1);
  });
  assert.equal(await betikliHtmlHazirla(BETIKLI), '<p>karekodlu</p>');
});

test('süre dolarsa özgün HTML (PDF engellenmez)', async () => {
  onIsleyiciKaydet(() => undefined); // hiç yanıt vermeyen işleyici
  assert.equal(await betikliHtmlHazirla(BETIKLI, 20), BETIKLI);
});

test('işler sırayla: aynı anda tek iş; süre sıra gelince başlar', async () => {
  const gorulen: string[] = [];
  let aktifSayisi = 0;
  let enCok = 0;
  onIsleyiciKaydet((is: OnislemeIsi | null) => {
    if (!is) return;
    aktifSayisi++;
    enCok = Math.max(enCok, aktifSayisi);
    gorulen.push(is.html);
    setTimeout(() => {
      aktifSayisi--;
      is.bitir(is.html + '!');
    }, 15);
  });
  // Süre (25 ms) tek işten uzun, üç işin toplamından kısa: sayaç sıraya
  // girerken başlasaydı son iş zaman aşımına düşerdi.
  const sonuclar = await Promise.all([
    betikliHtmlHazirla('<script>a</script>', 25),
    betikliHtmlHazirla('<script>b</script>', 25),
    betikliHtmlHazirla('<script>c</script>', 25),
  ]);
  assert.deepEqual(sonuclar, ['<script>a</script>!', '<script>b</script>!', '<script>c</script>!']);
  assert.equal(enCok, 1);
  assert.equal(gorulen.length, 3);
});

test('bileşen ayrılınca bekleyen işler özgün HTML ile biter', async () => {
  onIsleyiciKaydet(() => undefined);
  const p1 = betikliHtmlHazirla('<script>1</script>');
  const p2 = betikliHtmlHazirla('<script>2</script>');
  onIsleyiciKaydet(null);
  assert.deepEqual(await Promise.all([p1, p2]), ['<script>1</script>', '<script>2</script>']);
});
