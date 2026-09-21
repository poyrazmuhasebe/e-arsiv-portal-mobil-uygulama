import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteAgHatasi, sahteAxios, sahteleriSifirla, type SahteYanit } from './sahte/kurulum';
import {
  GibApiError,
  adimaDuzenlenenBelgeleriGetir,
  gibHatasiniIsle,
  login,
  taslakGetir,
} from '../src/services/gibApi';
import { useAuthStore } from '../src/store/useAuthStore';

// Bu testler GİB'e İSTEK ATMAZ: axios tamamen sahtelenmiştir (test/sahte/kurulum.ts).

function yanitla(yanit: SahteYanit | (() => never)) {
  sahteAxios.isleyici = () => (typeof yanit === 'function' ? yanit() : yanit);
}

async function hataBekle(islem: Promise<unknown>): Promise<GibApiError> {
  let yakalanan: unknown;
  try {
    await islem;
  } catch (err) {
    yakalanan = err;
  }
  if (!(yakalanan instanceof GibApiError)) {
    return assert.fail(`GibApiError bekleniyordu: ${String(yakalanan)}`);
  }
  return yakalanan;
}

beforeEach(() => {
  sahteleriSifirla();
  useAuthStore.setState({ token: null, kullaniciKodu: null, kullaniciBilgisi: null });
});

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

test('login: 200 ve token nesnesi → token döner, doğru komut gönderilir', async () => {
  yanitla({ status: 200, data: { token: 'abc123DEF' } });
  assert.equal(await login('kullanici', 'sifre'), 'abc123DEF');
  assert.equal(sahteAxios.istekler.length, 1);
  const govde = new URLSearchParams(sahteAxios.istekler[0].govde);
  assert.equal(govde.get('assoscmd'), 'anologin');
  assert.equal(govde.get('userid'), 'kullanici');
  assert.match(sahteAxios.istekler[0].url, /assos-login$/);
});

test('login: 200 ve düz metin (tırnaklı) token kabul edilir', async () => {
  yanitla({ status: 200, data: '"xyz789"' });
  assert.equal(await login('k', 's'), 'xyz789');
});

test('login: HTML sayfası token sayılmaz, ham HTML kullanıcıya gösterilmez', async () => {
  yanitla({ status: 200, data: '<html><body>Bakım çalışması</body></html>' });
  const hata = await hataBekle(login('k', 's'));
  assert.doesNotMatch(hata.message, /<|html/i);
  assert.match(hata.message, /Giriş başarısız/);
});

test('login: boşluk/satır sonu içeren yanıt token sayılmaz', async () => {
  for (const data of ['Kullanıcı adı veya şifre hatalı', 'abc\ndef', { token: 'a b' }]) {
    yanitla({ status: 200, data });
    await hataBekle(login('k', 's'));
  }
});

test('login: GİB kısa hata mesajı döndürürse o gösterilir', async () => {
  yanitla({ status: 200, data: { error: '1', messages: [{ type: '4', text: 'Kullanıcı adı veya şifre hatalı.' }] } });
  const hata = await hataBekle(login('k', 's'));
  assert.equal(hata.message, 'Kullanıcı adı veya şifre hatalı.');
});

test('login: 502/503/504 kesinti mesajı verir, gövde token gibi görünse bile', async () => {
  for (const status of [502, 503, 504]) {
    yanitla({ status, data: 'tokengibigorunen' });
    const hata = await hataBekle(login('k', 's'));
    assert.match(hata.message, new RegExp(`GİB portalı şu an hizmet vermiyor \\(HTTP ${status}\\)`));
  }
});

test('login: ağ yok ve zaman aşımı ayrı mesajlar verir', async () => {
  yanitla(() => {
    throw sahteAgHatasi();
  });
  assert.match((await hataBekle(login('k', 's'))).message, /ulaşılamadı/);
  yanitla(() => {
    throw sahteAgHatasi('ECONNABORTED');
  });
  assert.match((await hataBekle(login('k', 's'))).message, /zamanında yanıt vermedi/);
});

// ---------------------------------------------------------------------------
// dispatch (taslakGetir üzerinden)
// ---------------------------------------------------------------------------

const FILTRE = { baslangicTarihi: '01/09/2026', bitisTarihi: '07/09/2026' };

test('dispatch: 200 ve data zarfı açılır, cmd/token/jp gönderilir', async () => {
  yanitla({ status: 200, data: { data: [{ ettn: 'E1' }], metadata: {} } });
  const liste = await taslakGetir('TOKEN1', FILTRE);
  assert.deepEqual(liste, [{ ettn: 'E1' }]);

  const govde = new URLSearchParams(sahteAxios.istekler[0].govde);
  assert.equal(govde.get('cmd'), 'EARSIV_PORTAL_TASLAKLARI_GETIR');
  assert.equal(govde.get('pageName'), 'RG_BASITTASLAKLAR');
  assert.equal(govde.get('token'), 'TOKEN1');
  assert.deepEqual(JSON.parse(govde.get('jp') ?? ''), { baslangic: '01/09/2026', bitis: '07/09/2026', hangiTip: '5000/30000' });
});

test('dispatch: error "0" (string) başarı sayılır', async () => {
  yanitla({ status: 200, data: { error: '0', data: [{ ettn: 'E2' }] } });
  assert.deepEqual(await taslakGetir('t', FILTRE), [{ ettn: 'E2' }]);
});

test('dispatch: error "1" ise GİB mesajı hata olarak döner', async () => {
  yanitla({ status: 200, data: { error: '1', messages: [{ type: '4', text: 'Tarih aralığı hatalı.' }] } });
  const hata = await hataBekle(taslakGetir('t', FILTRE));
  assert.equal(hata.message, 'Tarih aralığı hatalı.');
  assert.equal(hata.oturumHatasi, false);
});

test('dispatch: bilinen GİB metni anlaşılır açıklamaya çevrilir, oturum hatası sayılmaz', async () => {
  yanitla({ status: 200, data: { error: '1', messages: [{ type: '7', text: 'Bu işlem için yetkiniz yok' }] } });
  const hata = await hataBekle(taslakGetir('t', FILTRE));
  assert.match(hata.message, /^GİB bu isteği reddetti\./);
  assert.match(hata.message, /"Bu işlem için yetkiniz yok"/);
  assert.equal(hata.oturumHatasi, false);
});

test('login: bilinen GİB giriş metni çevrilir', async () => {
  yanitla({ status: 200, data: { error: '1', messages: [{ text: 'Sisteme giriş için eksik bilgi verildi' }] } });
  assert.match((await hataBekle(login('k', ''))).message, /^Giriş bilgileri eksik/);
});

test('dispatch: error true ve mesaj yoksa genel ret mesajı', async () => {
  yanitla({ status: 200, data: { error: true } });
  assert.equal((await hataBekle(taslakGetir('t', FILTRE))).message, 'GİB portalı işlemi reddetti.');
});

test('dispatch: 502/503/504 kesinti mesajı', async () => {
  for (const status of [502, 503, 504]) {
    yanitla({ status, data: '<html>Bad Gateway</html>' });
    const hata = await hataBekle(taslakGetir('t', FILTRE));
    assert.match(hata.message, new RegExp(`HTTP ${status}`));
    assert.match(hata.message, /geçici bir GİB kesintisi/);
  }
});

test('dispatch: diğer 4xx/5xx durumlarında GİB mesajı ya da durum kodu', async () => {
  yanitla({ status: 500, data: { messages: [{ text: 'Genel Sistem Hatası: java.lang.NullPointerException' }] } });
  assert.match((await hataBekle(taslakGetir('t', FILTRE))).message, /^GİB tarafında beklenmeyen bir sistem hatası.*NullPointerException/s);
  yanitla({ status: 404, data: '' });
  assert.match((await hataBekle(taslakGetir('t', FILTRE))).message, /404 durum kodu/);
});

test('dispatch: ağ yok ve zaman aşımı', async () => {
  yanitla(() => {
    throw sahteAgHatasi();
  });
  assert.match((await hataBekle(taslakGetir('t', FILTRE))).message, /İnternet bağlantınızı/);
  yanitla(() => {
    throw sahteAgHatasi('ECONNABORTED');
  });
  assert.match((await hataBekle(taslakGetir('t', FILTRE))).message, /zamanında yanıt vermedi/);
});

test('oturum hatası: işaretlenir ve gibHatasiniIsle oturumu kapatır', async () => {
  useAuthStore.setState({ token: 'ESKI', kullaniciKodu: 'kod' });
  yanitla({ status: 200, data: { error: '1', messages: [{ text: 'Oturum sonlandırılmıştır, tekrar giriş yapınız.' }] } });
  const hata = await hataBekle(taslakGetir('ESKI', FILTRE));
  assert.equal(hata.oturumHatasi, true);

  // logout() GİB'e çıkış isteği atar; sahte yanıt verilir.
  yanitla({ status: 200, data: {} });
  const sonuc = await gibHatasiniIsle(hata);
  assert.equal(sonuc.oturumKapandi, true);
  assert.match(sonuc.mesaj, /Oturumunuz sona erdi/);
  assert.equal(useAuthStore.getState().token, null);
  assert.equal(new URLSearchParams(sahteAxios.istekler.at(-1)!.govde).get('assoscmd'), 'logout');
});

test('gibHatasiniIsle: oturum dışı hatada mesaj aynen döner, oturum kapanmaz', async () => {
  useAuthStore.setState({ token: 'T' });
  const sonuc = await gibHatasiniIsle(new GibApiError('Bir şey ters gitti.'));
  assert.deepEqual(sonuc, { mesaj: 'Bir şey ters gitti.', oturumKapandi: false });
  assert.equal(useAuthStore.getState().token, 'T');
  assert.equal((await gibHatasiniIsle('string hata')).mesaj, 'Beklenmeyen bir hata oluştu.');
});

// ---------------------------------------------------------------------------
// Adıma Düzenlenen Belgeler
// ---------------------------------------------------------------------------

test('adimaDuzenlenenBelgeleriGetir: kullanıcının yakaladığı istekle birebir aynı', async () => {
  yanitla({ status: 200, data: { data: [{ belgeNumarasi: 'X1', saticiUnvanAdSoyad: 'Satıcı A.Ş.' }] } });
  const sonuc = await adimaDuzenlenenBelgeleriGetir('tok', { baslangicTarihi: '01/09/2026', bitisTarihi: '08/09/2026' });
  assert.deepEqual(sonuc, [{ belgeNumarasi: 'X1', saticiUnvanAdSoyad: 'Satıcı A.Ş.' }]);
  const govde = new URLSearchParams(sahteAxios.istekler[0].govde);
  assert.equal(govde.get('cmd'), 'EARSIV_PORTAL_ADIMA_KESILEN_BELGELERI_GETIR');
  assert.equal(govde.get('pageName'), 'RG_ALICI_TASLAKLAR');
  assert.equal(govde.get('token'), 'tok');
  assert.deepEqual(JSON.parse(govde.get('jp')!), {
    baslangic: '01/09/2026',
    bitis: '08/09/2026',
    hourlySearchInterval: 'NONE',
  });
});

test('adimaDuzenlenenBelgeleriGetir: düz dizi de kabul edilir, tanınmayan yanıt boş liste', async () => {
  yanitla({ status: 200, data: [{ belgeNumarasi: 'X2' }] });
  assert.deepEqual(await adimaDuzenlenenBelgeleriGetir('tok', { baslangicTarihi: 'a', bitisTarihi: 'b' }), [
    { belgeNumarasi: 'X2' },
  ]);
  yanitla({ status: 200, data: { data: 'beklenmeyen' } });
  assert.deepEqual(await adimaDuzenlenenBelgeleriGetir('tok', { baslangicTarihi: 'a', bitisTarihi: 'b' }), []);
});
