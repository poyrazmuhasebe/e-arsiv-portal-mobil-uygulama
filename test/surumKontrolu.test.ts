// Zorunlu güncelleme kontrolü: karar mantığı, sunucu yanıtının doğrulanması
// ve ağ hatasında uygulamanın ENGELLENMEMESİ.

import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteFetch, sahteJsonYanit, sahteleriSifirla } from './sahte/kurulum';
import { sonSurumuDogrula, surumDurumu, surumuDenetle } from '../src/utils/surumKontrolu';

const TABAN = 'https://hesap.ornek.test';
const SON = { kod: 7, ad: '1.0.1-beta.7', indirmeAdresi: null, yayin: 1 };

beforeEach(() => {
  sahteleriSifirla();
  process.env.EXPO_PUBLIC_HESAP_API_URL = TABAN;
});

test('yüklü sürüm son sürümden düşükse güncelleme gerekir', () => {
  assert.deepEqual(surumDurumu(6, SON), { tur: 'guncelleme_gerekli', yukluKod: 6, son: SON });
});

test('yüklü sürüm son sürüme eşit ya da yüksekse güncel', () => {
  assert.deepEqual(surumDurumu(7, SON), { tur: 'guncel' });
  assert.deepEqual(surumDurumu(8, SON), { tur: 'guncel' });
});

test('yüklü sürüm bilinmiyorsa ya da sunucuda kayıt yoksa ENGELLEMEZ', () => {
  assert.equal(surumDurumu(null, SON).tur, 'bilinmiyor');
  assert.equal(surumDurumu(undefined, SON).tur, 'bilinmiyor');
  assert.equal(surumDurumu(0, SON).tur, 'bilinmiyor');
  assert.equal(surumDurumu(5, null).tur, 'bilinmiyor');
});

test('sunucu kaydı doğrulanır; bozuk kayıt null, https olmayan adres atılır', () => {
  assert.equal(sonSurumuDogrula(null), null);
  assert.equal(sonSurumuDogrula({ kod: '7', ad: 'x' }), null);
  assert.equal(sonSurumuDogrula({ kod: 1.5, ad: 'x' }), null);
  assert.equal(sonSurumuDogrula({ kod: 7 }), null);
  assert.equal(sonSurumuDogrula({ kod: 7, ad: 'x', indirmeAdresi: 'http://ornek.test/a.apk' })?.indirmeAdresi, null);
  assert.equal(
    sonSurumuDogrula({ kod: 7, ad: 'x', indirmeAdresi: 'https://ornek.test/a.apk' })?.indirmeAdresi,
    'https://ornek.test/a.apk',
  );
});

test('surumuDenetle GET /v1/surum?platform=android sorar, gövde göndermez', async () => {
  sahteFetch.isleyici = () => sahteJsonYanit({ platform: 'android', sonSurum: SON });
  const durum = await surumuDenetle('android', 6, false);

  assert.equal(durum.tur, 'guncelleme_gerekli');
  assert.equal(sahteFetch.istekler.length, 1);
  assert.equal(sahteFetch.istekler[0].url, `${TABAN}/v1/surum?platform=android`);
  assert.equal(sahteFetch.istekler[0].yontem, 'GET');
  assert.equal(sahteFetch.istekler[0].govde, null);
  assert.equal(sahteFetch.istekler[0].basliklar.authorization, undefined);
});

test('ağ hatası, sunucu hatası ve bozuk yanıt uygulamayı ENGELLEMEZ', async () => {
  const isleyiciler: (() => Response)[] = [
    () => {
      throw new TypeError('Network request failed');
    },
    () => sahteJsonYanit({ hata: { kod: 'sunucu_hatasi', mesaj: 'x' } }, 500),
    () => new Response('<html>1101</html>', { status: 500, headers: { 'content-type': 'text/html' } }),
    () => sahteJsonYanit({ platform: 'android', sonSurum: { kod: 'bozuk' } }),
  ];
  for (const isleyici of isleyiciler) {
    sahteFetch.isleyici = isleyici;
    assert.equal((await surumuDenetle('android', 6, false)).tur, 'bilinmiyor');
  }
});

test('Android dışında ve sürüm kodu bilinmiyorsa ağa hiç çıkmaz', async () => {
  assert.equal((await surumuDenetle('ios', 6, false)).tur, 'bilinmiyor');
  assert.equal((await surumuDenetle('web', 6, false)).tur, 'bilinmiyor');
  assert.equal((await surumuDenetle('android', null, false)).tur, 'bilinmiyor');
  assert.equal(sahteFetch.istekler.length, 0);
});
