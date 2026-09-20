// Uygulama hesabı oturumu: saklama, geri yükleme, çevrimdışı davranış,
// yenileme ve İKİ AYRI ÇIKIŞ.

import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  sahteAxios,
  sahteDepo,
  sahteFetch,
  sahteJsonYanit,
  sahteleriSifirla,
} from './sahte/kurulum';
import { useHesapStore } from '../src/store/useHesapStore';
import { useAuthStore } from '../src/store/useAuthStore';

const SAAT = 3600;

function simdiSn(): number {
  return Math.floor(Date.now() / 1000);
}

function hesapYaniti(ustuneYaz: Record<string, unknown> = {}) {
  return {
    kullanici: {
      id: 'hesap-A',
      eposta: 'ali@ornek.test',
      kullaniciAdi: 'aliveli',
      epostaDogrulandi: false,
    },
    oturum: {
      erisimToken: 'erisim-1',
      erisimBitis: simdiSn() + SAAT,
      yenilemeToken: 'yenileme-1',
      yenilemeBitis: simdiSn() + 60 * 24 * SAAT,
    },
    ...ustuneYaz,
  };
}

beforeEach(() => {
  sahteleriSifirla();
  process.env.EXPO_PUBLIC_HESAP_API_URL = 'https://hesap.ornek.test';
  useHesapStore.setState({ kullanici: null, oturum: null, hazir: false, yukleniyor: false });
  useAuthStore.setState({ token: null, kullaniciKodu: null, kullaniciBilgisi: null });
});

test('girişten sonra oturum hesap_ önekli anahtarlara yazılır', async () => {
  sahteFetch.isleyici = () => sahteJsonYanit(hesapYaniti());

  await useHesapStore.getState().girisYap('ali@ornek.test', 'Kucuk-Kedi-42');

  assert.equal(useHesapStore.getState().kullanici?.id, 'hesap-A');
  assert.ok(sahteDepo.veriler.has('hesap_oturum'));
  // Yenileme token'ı AYRI anahtarda.
  assert.equal(sahteDepo.veriler.get('hesap_yenileme'), 'yenileme-1');
  // gib_ önekli hiçbir anahtara dokunulmadı.
  const gibAnahtarlari = [...sahteDepo.veriler.keys()].filter((k) => k.startsWith('gib_'));
  assert.deepEqual(gibAnahtarlari, []);
});

test('saklanan oturum kaydı 2 KB altında kalır (iOS SecureStore sınırı)', async () => {
  sahteFetch.isleyici = () => sahteJsonYanit(hesapYaniti());
  await useHesapStore.getState().girisYap('ali@ornek.test', 'Kucuk-Kedi-42');

  const kayit = sahteDepo.veriler.get('hesap_oturum') ?? '';
  assert.ok(kayit.length < 2048, `hesap_oturum ${kayit.length} bayt`);
});

test('ÇEVRİMDIŞI: geçerli yenileme süresi varsa sunucuya SORULMADAN geri yüklenir', async () => {
  sahteDepo.veriler.set(
    'hesap_oturum',
    JSON.stringify({
      kullanici: {
        id: 'hesap-A',
        eposta: 'ali@ornek.test',
        kullaniciAdi: 'aliveli',
        epostaDogrulandi: true,
      },
      // Erişim token'ının süresi DOLMUŞ ama yenileme hâlâ geçerli.
      erisimToken: 'eski-erisim',
      erisimBitis: simdiSn() - 10,
      yenilemeBitis: simdiSn() + 30 * 24 * SAAT,
    }),
  );
  sahteDepo.veriler.set('hesap_yenileme', 'yenileme-1');

  // Ağ isteği atılırsa test patlar (sahte fetch varsayılanı hata fırlatır).
  await useHesapStore.getState().oturumuGeriYukle();

  assert.equal(sahteFetch.istekler.length, 0);
  assert.equal(useHesapStore.getState().kullanici?.id, 'hesap-A');
  assert.equal(useHesapStore.getState().hazir, true);
});

test('yenileme süresi dolmuşsa oturum geri yüklenmez ve cihazdan silinir', async () => {
  sahteDepo.veriler.set(
    'hesap_oturum',
    JSON.stringify({
      kullanici: { id: 'hesap-A', eposta: 'a@b.co', kullaniciAdi: 'aliveli', epostaDogrulandi: true },
      erisimToken: 'e',
      erisimBitis: simdiSn() - 100,
      yenilemeBitis: simdiSn() - 10,
    }),
  );
  sahteDepo.veriler.set('hesap_yenileme', 'y');

  await useHesapStore.getState().oturumuGeriYukle();

  assert.equal(useHesapStore.getState().kullanici, null);
  assert.equal(sahteDepo.veriler.has('hesap_oturum'), false);
  assert.equal(sahteDepo.veriler.has('hesap_yenileme'), false);
});

test('bozuk kayıt sessizce temizlenir, çökmez', async () => {
  sahteDepo.veriler.set('hesap_oturum', '{bozuk json');
  sahteDepo.veriler.set('hesap_yenileme', 'y');

  await useHesapStore.getState().oturumuGeriYukle();

  assert.equal(useHesapStore.getState().kullanici, null);
  assert.equal(useHesapStore.getState().hazir, true);
});

test('erişim token\'ının süresi dolunca sessizce yenilenir', async () => {
  useHesapStore.setState({
    kullanici: { id: 'hesap-A', eposta: 'a@b.co', kullaniciAdi: 'aliveli', epostaDogrulandi: true },
    oturum: {
      erisimToken: 'eski',
      erisimBitis: simdiSn() - 10,
      yenilemeToken: 'yenileme-1',
      yenilemeBitis: simdiSn() + 30 * 24 * SAAT,
    },
  });

  sahteFetch.isleyici = () =>
    sahteJsonYanit(
      hesapYaniti({
        oturum: {
          erisimToken: 'yeni-erisim',
          erisimBitis: simdiSn() + SAAT,
          yenilemeToken: 'yenileme-2',
          yenilemeBitis: simdiSn() + 60 * 24 * SAAT,
        },
      }),
    );

  const token = await useHesapStore.getState().gecerliErisimToken();

  assert.equal(token, 'yeni-erisim');
  assert.equal(sahteFetch.istekler[0]?.url, 'https://hesap.ornek.test/v1/oturum/yenile');
  // Rotasyon: yeni yenileme token'ı saklandı.
  assert.equal(sahteDepo.veriler.get('hesap_yenileme'), 'yenileme-2');
});

test('sunucu 401 derse oturum yerelde de kapatılır', async () => {
  useHesapStore.setState({
    kullanici: { id: 'hesap-A', eposta: 'a@b.co', kullaniciAdi: 'aliveli', epostaDogrulandi: true },
    oturum: {
      erisimToken: 'eski',
      erisimBitis: simdiSn() - 10,
      yenilemeToken: 'iptal-edilmis',
      yenilemeBitis: simdiSn() + 30 * 24 * SAAT,
    },
  });
  sahteDepo.veriler.set('hesap_oturum', '{}');
  sahteDepo.veriler.set('hesap_yenileme', 'iptal-edilmis');

  sahteFetch.isleyici = () =>
    sahteJsonYanit({ hata: { kod: 'oturum_iptal', mesaj: 'Oturumunuz sona erdi.' } }, 401);

  const token = await useHesapStore.getState().gecerliErisimToken();

  assert.equal(token, null);
  assert.equal(useHesapStore.getState().kullanici, null);
  assert.equal(sahteDepo.veriler.has('hesap_yenileme'), false);
});

test('AĞ HATASI oturumu KAPATMAZ (çevrimdışı çalışmaya devam)', async () => {
  useHesapStore.setState({
    kullanici: { id: 'hesap-A', eposta: 'a@b.co', kullaniciAdi: 'aliveli', epostaDogrulandi: true },
    oturum: {
      erisimToken: 'eski',
      erisimBitis: simdiSn() - 10,
      yenilemeToken: 'yenileme-1',
      yenilemeBitis: simdiSn() + 30 * 24 * SAAT,
    },
  });
  sahteFetch.isleyici = () => {
    throw new TypeError('fetch failed');
  };

  await assert.rejects(() => useHesapStore.getState().gecerliErisimToken(), /ulaşılamadı/);
  assert.equal(useHesapStore.getState().kullanici?.id, 'hesap-A');
});

test('e-posta doğrulanınca durum hem bellekte hem cihazda güncellenir', async () => {
  sahteFetch.isleyici = () => sahteJsonYanit(hesapYaniti());
  await useHesapStore.getState().girisYap('ali@ornek.test', 'Kucuk-Kedi-42');
  assert.equal(useHesapStore.getState().kullanici?.epostaDogrulandi, false);

  sahteFetch.isleyici = () => sahteJsonYanit({ tamam: true, epostaDogrulandi: true });
  await useHesapStore.getState().epostaDogrula('123456');

  assert.equal(useHesapStore.getState().kullanici?.epostaDogrulandi, true);
  const kayit = JSON.parse(sahteDepo.veriler.get('hesap_oturum') ?? '{}') as {
    kullanici: { epostaDogrulandi: boolean };
  };
  assert.equal(kayit.kullanici.epostaDogrulandi, true);
});

// ---------------------------------------------------------------------------
// İKİ AYRI ÇIKIŞ
// ---------------------------------------------------------------------------

test('hesaptanCik yalnızca hesap anahtarlarını siler, GİB anahtarlarına dokunmaz', async () => {
  sahteFetch.isleyici = () => sahteJsonYanit(hesapYaniti());
  await useHesapStore.getState().girisYap('ali@ornek.test', 'Kucuk-Kedi-42');

  sahteDepo.veriler.set('gib_hatirlanan_kullanici_kodu', '34567890');
  sahteDepo.veriler.set('gib_alici_dizin_abc', '[]');

  sahteFetch.isleyici = () => sahteJsonYanit({ tamam: true });
  await useHesapStore.getState().hesaptanCik();

  assert.equal(useHesapStore.getState().kullanici, null);
  assert.equal(sahteDepo.veriler.has('hesap_oturum'), false);
  assert.equal(sahteDepo.veriler.has('hesap_yenileme'), false);
  // Hatırlanan GİB kodu ve defterler YERİNDE KALIR.
  assert.equal(sahteDepo.veriler.get('gib_hatirlanan_kullanici_kodu'), '34567890');
  assert.equal(sahteDepo.veriler.get('gib_alici_dizin_abc'), '[]');
});

test('hesaptanCik sunucuya ulaşılamasa bile yerel oturumu kapatır', async () => {
  sahteFetch.isleyici = () => sahteJsonYanit(hesapYaniti());
  await useHesapStore.getState().girisYap('ali@ornek.test', 'Kucuk-Kedi-42');

  sahteFetch.isleyici = () => {
    throw new TypeError('fetch failed');
  };
  await useHesapStore.getState().hesaptanCik();

  assert.equal(useHesapStore.getState().kullanici, null);
  assert.equal(sahteDepo.veriler.has('hesap_oturum'), false);
});

test('GİB oturum hatası HESAP oturumunu KAPATMAZ', async () => {
  sahteFetch.isleyici = () => sahteJsonYanit(hesapYaniti());
  await useHesapStore.getState().girisYap('ali@ornek.test', 'Kucuk-Kedi-42');

  // GİB tarafında oturum düşüyor: useAuthStore.logout() çağrılır.
  useAuthStore.setState({ token: 'gib-token' });
  sahteDepo.veriler.set('gib_token', 'gib-token');
  sahteDepo.veriler.set('hesap_gib_sahibi', 'hesap-A');
  sahteAxios.isleyici = () => ({ status: 200, data: { data: 'ok' } });

  await useAuthStore.getState().logout();

  assert.equal(useAuthStore.getState().token, null);
  assert.equal(sahteDepo.veriler.has('gib_token'), false);
  // HESAP oturumu ayakta.
  assert.equal(useHesapStore.getState().kullanici?.id, 'hesap-A');
  assert.ok(sahteDepo.veriler.has('hesap_oturum'));
});

// ---------------------------------------------------------------------------
// HESAP SİLME
// ---------------------------------------------------------------------------

test('hesabiSil başarılı olursa yerel oturum da temizlenir', async () => {
  sahteFetch.isleyici = () => sahteJsonYanit(hesapYaniti());
  await useHesapStore.getState().girisYap('ali@ornek.test', 'Kucuk-Kedi-42');

  sahteDepo.veriler.set('gib_hatirlanan_kullanici_kodu', '34567890');
  sahteDepo.veriler.set('gib_alici_dizin_abc', '[]');

  sahteFetch.isleyici = () => sahteJsonYanit({ tamam: true, silindi: true });
  await useHesapStore.getState().hesabiSil('Kucuk-Kedi-42');

  const istek = sahteFetch.istekler[sahteFetch.istekler.length - 1];
  assert.ok(istek);
  assert.equal(istek.yontem, 'DELETE');
  assert.equal(istek.url, 'https://hesap.ornek.test/v1/hesap');
  assert.deepEqual(Object.keys(JSON.parse(istek.govde ?? '{}')), ['sifre']);

  assert.equal(useHesapStore.getState().kullanici, null);
  assert.equal(sahteDepo.veriler.has('hesap_oturum'), false);
  assert.equal(sahteDepo.veriler.has('hesap_yenileme'), false);
  // CİHAZDAKİ GİB verileri silinmez: sunucuda kopyaları yok, yedekleri de yok.
  assert.equal(sahteDepo.veriler.get('gib_hatirlanan_kullanici_kodu'), '34567890');
  assert.equal(sahteDepo.veriler.get('gib_alici_dizin_abc'), '[]');
});

test('hesabiSil şifre yanlışsa yerel oturumu KORUR', async () => {
  sahteFetch.isleyici = () => sahteJsonYanit(hesapYaniti());
  await useHesapStore.getState().girisYap('ali@ornek.test', 'Kucuk-Kedi-42');

  sahteFetch.isleyici = () =>
    sahteJsonYanit({ hata: { kod: 'sifre_hatali', mesaj: 'Şifre hatalı.' } }, 401);

  await assert.rejects(
    () => useHesapStore.getState().hesabiSil('Yanlis-Sifre-11'),
    /Şifre hatalı/,
  );

  assert.equal(useHesapStore.getState().kullanici?.id, 'hesap-A');
  assert.ok(sahteDepo.veriler.has('hesap_oturum'));
});

test('silme isteğinde GİB verisi gönderilmez', async () => {
  sahteFetch.isleyici = () => sahteJsonYanit(hesapYaniti());
  await useHesapStore.getState().girisYap('ali@ornek.test', 'Kucuk-Kedi-42');

  sahteFetch.isleyici = () => sahteJsonYanit({ tamam: true, silindi: true });
  await useHesapStore.getState().hesabiSil('Kucuk-Kedi-42');

  for (const istek of sahteFetch.istekler) {
    const govde = (istek.govde ?? '').toLowerCase();
    assert.doesNotMatch(govde, /gibtoken|gibkullanicikodu|kullanicibilgisi|"vkn"|"tckn"/);
  }
});
