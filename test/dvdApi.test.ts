import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteFetch, sahteJsonYanit, sahteleriSifirla, type KaydedilenFetch } from './sahte/kurulum';
import {
  DVD_TABAN,
  DvdApiError,
  dvdCikisYap,
  dvdEarsivFaturalariGetir,
  dvdFaturaCoz,
  dvdFaturalariSirala,
  dvdGirisYap,
  dvdGuvenlikKoduGetir,
  dvdKullaniciBilgisiGetir,
  dvdTarihiGoster,
  dvdTumFaturalariGetir,
} from '../src/services/dvdApi';
import { oturumSifresi, oturumSifresiniAyarla, oturumSifresiniSil } from '../src/utils/oturumSifresi';
import { useAuthStore } from '../src/store/useAuthStore';
import { useDvdStore } from '../src/store/useDvdStore';

// Bu testler GİB'e İSTEK ATMAZ: fetch sahtelenmiştir. Örnek yanıtlar
// kullanıcının 2026-09-22 tarihli DevTools yakalamalarından (kişisel değerler
// değiştirilerek) alınmıştır.

beforeEach(() => {
  sahteleriSifirla();
  oturumSifresiniSil();
  useDvdStore.setState({ token: null, kullaniciKodu: null, girisYapiliyor: false });
  useAuthStore.setState({ token: null, kullaniciKodu: null, kullaniciBilgisi: null });
});

function yanitla(fn: (i: KaydedilenFetch) => Response) {
  sahteFetch.isleyici = fn;
}

async function hataBekle(islem: Promise<unknown>): Promise<DvdApiError> {
  try {
    await islem;
  } catch (e) {
    if (e instanceof DvdApiError) return e;
    return assert.fail(`DvdApiError bekleniyordu: ${String(e)}`);
  }
  return assert.fail('hata bekleniyordu');
}

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAIcAAAAtCAIAAAALAu/VAAAMsklEQVR4Xu2ad5QVRRaHm0UQBhNJiUo6xAOIIKIEGUAUySJZGRRcMktOgkoQBSVLhiWsBAFBwgISJChBJS4SdJXkEpScJP6x3/R9NOWtfv0GPQM4zP3jnZmqetX96qv7q3tvt1PWtXLlypUvX75ChQrPPffc888//8ILL1SqVKly5cpVqlSpWrVqtWrVatSoUbNmzZdeeunll1+uXbt2nTp16tatW79+/QYNGjRs2PBV12JiYho3bvz66683adKkadOmf3etefPmLVq0aNWqVevWrdu0afMP19q3b9+hQ4eOHTt26tSpS5cuXbt27datW48ePd58882ePXv26tXr7bfffuedd3r37t23b99+/fq9++67/fv3f//99wcMGDBw4MAPP/xw0KBBgwcPHjJkyLBhw4YPHz5ixIiRI0eOGjVq9OjRY8aMGTdu3Pjx4ydMmPBP1yZPnjxlypR/uTZt2rTp06fPmDHjk08+mTVr1hzX5s6dO2/evM8++2zBggULFy78t2tLlixZunTp559/vnz58hUrVqxcufKLL75YvXr1mjVr1q5d+9VXX61bt279+vUbNmz4+uuvv/nmm2+//Xbz5s1btmzZunXrtm3b/uPad999t3Pnzt27d+/Zs+f777//r2s//fTT3r179+/ff+DAgYMHD/7PtcOHDx85cuTo0aO//vqrA5Lo6GihApKKFSsKlRdffFGogKR69epCpVatWkKlrmtC5ZVXXgFJo0aNGrsmVN544w2QNGvWrIVrQqVt27YgadeunVABSefOnYVK9+7dhQpI3nrrLaHSp08foQKS9957T6h88MEHQgUkQ4cOFSofffSRUAHJ2LFjhcrEiRNBMmnSJI/Kxx9/PN21mTNnelQ+/fTTea7Nnz/fo7J48WKhsmzZMqECklWrVgmVL7/8UqiAZOPGjUJl06ZNHpXt27eDZMeOHTtdEyo//PADSH788ce9rgmVn3/+GSSHDh064tovv/zyOyriKFARRxEq4ihQEUcRKuIo9erVa+CaUBFHee2115q4JlTEUVq2bNnaNZOKOApUxFGEijgKVMRRhIo4ClTEUYSKOApUxFGEijgKVMRRhMpk16ZOnepREUfBZs+e7VERR8FWrVolVMRRhIo4ClTEUYSKOApU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';

// ---------------------------------------------------------------------------
// Güvenlik kodu
// ---------------------------------------------------------------------------

test('güvenlik kodu: GET getnewcaptcha, resim ve cid', async () => {
  yanitla(() => sahteJsonYanit({ captchaImgBase64: PNG, cid: '78078ab2-2c74-4bb6-9dee-0179ce513d0f', messages: null }));
  const kod = await dvdGuvenlikKoduGetir();
  assert.equal(kod.cid, '78078ab2-2c74-4bb6-9dee-0179ce513d0f');
  assert.equal(kod.resimBase64, PNG);
  const [istek] = sahteFetch.istekler;
  assert.equal(istek.url, `${DVD_TABAN}/captcha/getnewcaptcha`);
  assert.equal(istek.yontem, 'GET');
  assert.equal(istek.govde, null);
  assert.equal(istek.basliklar.authorization, undefined);
});

test('güvenlik kodu: eksik/bozuk yanıt hata', async () => {
  yanitla(() => sahteJsonYanit({ captchaImgBase64: '<html>', cid: 'x' }));
  await hataBekle(dvdGuvenlikKoduGetir());
  yanitla(() => sahteJsonYanit({ captchaImgBase64: PNG }));
  await hataBekle(dvdGuvenlikKoduGetir());
});

// ---------------------------------------------------------------------------
// Giriş / çıkış
// ---------------------------------------------------------------------------

const GIRIS = { kullaniciKodu: ' 12345678 ', sifre: 'gizli', guvenlikKodu: ' wh5bc ', cid: 'cid-1' };

test('giriş: yakalamayla birebir gövde ve başlıklar, token döner', async () => {
  yanitla(() => sahteJsonYanit({ messages: null, result: true, token: 'ab'.repeat(64) }));
  assert.equal(await dvdGirisYap(GIRIS), 'ab'.repeat(64));
  const [istek] = sahteFetch.istekler;
  assert.equal(istek.url, `${DVD_TABAN}/auth/tdvd/login`);
  assert.equal(istek.yontem, 'POST');
  assert.deepEqual(JSON.parse(istek.govde!), { dk: 'wh5bc', userid: '12345678', sifre: 'gizli', imageId: 'cid-1' });
  assert.equal(istek.basliklar['page-name'], 'login');
  assert.equal(istek.basliklar['ui-client'], 'fe');
  assert.equal(istek.basliklar['content-type'], 'application/json');
});

test('giriş: yanlış güvenlik kodu (200 + messages) GİB metniyle hata, bayraklı', async () => {
  yanitla(() =>
    sahteJsonYanit({
      messages: [
        { code: null, text: 'Güvenlik kodunu yanlış girdiniz. Lütfen kontrol ederek tekrar deneyiniz.', type: 'ERROR' },
      ],
    }),
  );
  const h = await hataBekle(dvdGirisYap(GIRIS));
  assert.match(h.message, /^Güvenlik kodunu yanlış girdiniz/);
  assert.equal(h.guvenlikKoduHatasi, true);
  assert.equal(h.oturumHatasi, false);
});

test('giriş: 401/400 + messages oturum hatası SAYILMAZ, GİB metni gösterilir', async () => {
  for (const durum of [400, 401]) {
    yanitla(() => sahteJsonYanit({ messages: [{ text: 'Kullanıcı adı veya şifre hatalı.', type: 'ERROR' }] }, durum));
    const h = await hataBekle(dvdGirisYap(GIRIS));
    assert.equal(h.message, 'Kullanıcı adı veya şifre hatalı.');
    assert.equal(h.oturumHatasi, false);
    assert.equal(h.guvenlikKoduHatasi, false);
  }
});

test('giriş: result true ama token yok/boşluklu ise başarı sayılmaz', async () => {
  for (const token of [undefined, '', 'a b']) {
    yanitla(() => sahteJsonYanit({ result: true, token }));
    await hataBekle(dvdGirisYap(GIRIS));
  }
});

test('giriş: 5xx kesinti mesajı; ağ hatası', async () => {
  yanitla(() => sahteJsonYanit({}, 503));
  assert.match((await hataBekle(dvdGirisYap(GIRIS))).message, /HTTP 503/);
  yanitla(() => {
    throw new TypeError('Network request failed');
  });
  assert.match((await hataBekle(dvdGirisYap(GIRIS))).message, /ulaşılamadı/);
});

test('çıkış: POST logout, Bearer, gövdesiz; hata fırlatmaz', async () => {
  yanitla(() => sahteJsonYanit({ data: { redirectUrl: 'login.html' }, result: true }));
  await dvdCikisYap('tok');
  const [istek] = sahteFetch.istekler;
  assert.equal(istek.url, `${DVD_TABAN}/auth/tdvd/logout`);
  assert.equal(istek.yontem, 'POST');
  assert.equal(istek.basliklar.authorization, 'Bearer tok');
  assert.equal(istek.govde, null);
  yanitla(() => {
    throw new TypeError('Network request failed');
  });
  await dvdCikisYap('tok'); // fırlatmamalı
});

// ---------------------------------------------------------------------------
// e-Arşiv Faturalarım (alici-list)
// ---------------------------------------------------------------------------

const LISTE_YANITI = {
  messages: null,
  pageDetail: { pageNo: 1, pageSize: 10, total: 12, totalPage: 2 },
  resultListDenormalized: [
    {
      duzenlenmeTarihi: '2026-08-07 14:29:30',
      faturaNo: 'BEA2026034020634',
      gonderimSekli: 'KAGIT',
      iptalItirazDurum: null,
      iptalItirazTarihi: null,
      mukellefTckn: '           ',
      mukellefVkn: '1790617537',
      odenecekTutar: '920.00',
      paraBirimi: 'TRY',
      tcknVkn: '1790617537',
      tesisatNumarasi: ' ',
      toplamTutar: 826.76,
      unvan: 'ÖRNEK ELEKTRİK A.Ş.',
      vergilerTutari: 83.3,
    },
    {
      duzenlenmeTarihi: '2026-08-06 23:59:00',
      faturaNo: 'N1A2026032025504',
      gonderimSekli: 'ELEKTRONIK',
      mukellefTckn: '           ',
      mukellefVkn: '9250353261',
      odenecekTutar: '596.00',
      paraBirimi: 'TRY',
      tcknVkn: '9250353261',
      tesisatNumarasi: '5432942335',
      toplamTutar: 437.69,
      unvan: 'ÖRNEK TELEKOM A.Ş.',
      vergilerTutari: -279.4,
    },
  ],
};

test('liste: yakalamayla birebir gövde (GG/AA/YYYY, sayfa, sıralama, filtre)', async () => {
  yanitla(() => sahteJsonYanit(LISTE_YANITI));
  await dvdEarsivFaturalariGetir('tok', { baslangic: '01/08/2026', bitis: '07/08/2026', sayfa: 1 });
  const [istek] = sahteFetch.istekler;
  assert.equal(istek.url, `${DVD_TABAN}/eislemler/earsiv/alici-list`);
  assert.equal(istek.yontem, 'POST');
  assert.equal(istek.basliklar.authorization, 'Bearer tok');
  assert.deepEqual(JSON.parse(istek.govde!), {
    data: { duzenlenmeTarihiBas: '01/08/2026', duzenlenmeTarihiSon: '07/08/2026' },
    meta: { pagination: { pageNo: 1, pageSize: 10 }, sortFieldName: 'faturaNo', sortType: 'DESC', filters: [] },
  });
});

test('liste: kayıtlar normalleştirilir (boşluklu alanlar, metin tutar), sayfa bilgisi', async () => {
  yanitla(() => sahteJsonYanit(LISTE_YANITI));
  const s = await dvdEarsivFaturalariGetir('tok', { baslangic: 'a', bitis: 'b', sayfa: 1 });
  assert.deepEqual({ sayfa: s.sayfa, toplam: s.toplam, toplamSayfa: s.toplamSayfa }, { sayfa: 1, toplam: 12, toplamSayfa: 2 });
  assert.deepEqual(s.faturalar[0], {
    faturaNo: 'BEA2026034020634',
    duzenlenmeTarihi: '2026-08-07 14:29:30',
    saticiUnvan: 'ÖRNEK ELEKTRİK A.Ş.',
    saticiVknTckn: '1790617537',
    toplamTutar: 826.76,
    vergilerTutari: 83.3,
    odenecekTutar: 920,
    paraBirimi: 'TRY',
    gonderimSekli: 'KAGIT',
    tesisatNumarasi: undefined,
    iptalItirazDurum: undefined,
    iptalItirazTarihi: undefined,
  });
  assert.equal(s.faturalar[1].tesisatNumarasi, '5432942335');
  assert.equal(s.faturalar[1].vergilerTutari, -279.4); // eksi olabilir
});

test('liste: fatura numarası olmayan kayıt atlanır; liste yoksa boş; messages varsa hata', async () => {
  assert.equal(dvdFaturaCoz({ unvan: 'X' }), null);
  yanitla(() => sahteJsonYanit({ messages: null, pageDetail: null, resultListDenormalized: null }));
  assert.deepEqual((await dvdEarsivFaturalariGetir('tok', { baslangic: 'a', bitis: 'b', sayfa: 1 })).faturalar, []);
  yanitla(() => sahteJsonYanit({ messages: [{ text: 'Tarih aralığı en fazla 1 ay olabilir.', type: 'ERROR' }] }));
  assert.equal(
    (await hataBekle(dvdEarsivFaturalariGetir('tok', { baslangic: 'a', bitis: 'b', sayfa: 1 }))).message,
    'Tarih aralığı en fazla 1 ay olabilir.',
  );
});

test('liste: 401/403 oturum hatası', async () => {
  for (const durum of [401, 403]) {
    yanitla(() => sahteJsonYanit({}, durum));
    const h = await hataBekle(dvdEarsivFaturalariGetir('tok', { baslangic: 'a', bitis: 'b', sayfa: 1 }));
    assert.equal(h.oturumHatasi, true);
  }
});

test('gösterim: tarih ve sıralama (yeniden eskiye)', () => {
  assert.equal(dvdTarihiGoster('2026-08-07 14:29:30'), '07.08.2026 14:29');
  assert.equal(dvdTarihiGoster('2026-08-07'), '07.08.2026');
  assert.equal(dvdTarihiGoster(undefined), undefined);
  const sirali = dvdFaturalariSirala([
    { faturaNo: 'A', duzenlenmeTarihi: '2026-08-01 10:00:00' },
    { faturaNo: 'B', duzenlenmeTarihi: '2026-08-07 09:00:00' },
    { faturaNo: 'C', duzenlenmeTarihi: '2026-08-03 12:00:00' },
  ]);
  assert.deepEqual(
    sirali.map((f) => f.faturaNo),
    ['B', 'C', 'A'],
  );
});

// ---------------------------------------------------------------------------
// Oturum: bellek içi şifre ve GİB oturumuna bağlılık
// ---------------------------------------------------------------------------

test('Dijital VD girişi e-Arşiv kullanıcı kodu ve bellekteki şifreyle yapılır', async () => {
  useAuthStore.setState({ token: 'gib', kullaniciKodu: '12345678' });
  oturumSifresiniAyarla('bellekteki');
  yanitla(() => sahteJsonYanit({ result: true, token: 'dvd-token' }));
  await useDvdStore.getState().girisYap({ guvenlikKodu: 'abc12', cid: 'c1' });
  assert.equal(useDvdStore.getState().token, 'dvd-token');
  assert.deepEqual(JSON.parse(sahteFetch.istekler[0].govde!), {
    dk: 'abc12',
    userid: '12345678',
    sifre: 'bellekteki',
    imageId: 'c1',
  });
});

test('şifre bellekte yoksa ekrandan gelen kullanılır ve bu oturum için belleğe alınır', async () => {
  useAuthStore.setState({ token: 'gib', kullaniciKodu: '12345678' });
  await assert.rejects(useDvdStore.getState().girisYap({ guvenlikKodu: 'x', cid: 'c' }), /şifrenizi/);
  yanitla(() => sahteJsonYanit({ result: true, token: 'dvd-token' }));
  await useDvdStore.getState().girisYap({ guvenlikKodu: 'x', cid: 'c', sifre: 'ekrandaki' });
  assert.equal(oturumSifresi(), 'ekrandaki');
});

test('başarısız girişte ekrandaki şifre belleğe alınmaz', async () => {
  useAuthStore.setState({ token: 'gib', kullaniciKodu: '12345678' });
  yanitla(() => sahteJsonYanit({ messages: [{ text: 'Şifre hatalı', type: 'ERROR' }] }));
  await assert.rejects(useDvdStore.getState().girisYap({ guvenlikKodu: 'x', cid: 'c', sifre: 'yanlis' }));
  assert.equal(oturumSifresi(), null);
  assert.equal(useDvdStore.getState().token, null);
});

test('GİB oturumu kapanınca Dijital VD oturumu GİB\'de kapatılır ve silinir', async () => {
  useAuthStore.setState({ token: 'gib', kullaniciKodu: '12345678' });
  useDvdStore.setState({ token: 'dvd-token', kullaniciKodu: '12345678' });
  yanitla(() => sahteJsonYanit({ result: true }));
  useAuthStore.setState({ token: null, kullaniciKodu: null });
  assert.equal(useDvdStore.getState().token, null);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(sahteFetch.istekler[0]?.url, `${DVD_TABAN}/auth/tdvd/logout`);
  assert.equal(sahteFetch.istekler[0]?.basliklar.authorization, 'Bearer dvd-token');
});

test('başka bir GİB kullanıcı koduna geçilince Dijital VD oturumu kapatılır', () => {
  useAuthStore.setState({ token: 'gib', kullaniciKodu: '11111111' });
  useDvdStore.setState({ token: 'dvd-token', kullaniciKodu: '11111111' });
  yanitla(() => sahteJsonYanit({ result: true }));
  useAuthStore.setState({ token: 'gib2', kullaniciKodu: '22222222' });
  assert.equal(useDvdStore.getState().token, null);
});

test('e-Arşiv girişi şifreyi yalnızca belleğe alır; GİB çıkışında silinir', async () => {
  const { sahteAxios, sahteDepo } = await import('./sahte/kurulum');
  sahteAxios.isleyici = (istek) =>
    istek.url.endsWith('assos-login') && new URLSearchParams(istek.govde).get('assoscmd') === 'anologin'
      ? { status: 200, data: { token: 'gibtoken1' } }
      : { status: 200, data: {} };
  await useAuthStore.getState().login('12345678', 'gizli-sifre', 'hesap-1');
  assert.equal(oturumSifresi(), 'gizli-sifre');
  // Hiçbir kalıcı depoya yazılmadı.
  for (const deger of sahteDepo.veriler.values()) assert.ok(!deger.includes('gizli-sifre'));
  await useAuthStore.getState().logout();
  assert.equal(oturumSifresi(), null);
});

// ---------------------------------------------------------------------------
// Bağımsız giriş: GİB giriş ekranından, e-Arşiv girişi yapılmadan
// ---------------------------------------------------------------------------

test('bağımsız giriş: ekrandaki kod ve şifre kullanılır; şifre belleğe alınmaz', async () => {
  // e-Arşiv oturumu yok; bellekte (başka bir koda ait olabilecek) eski şifre var.
  oturumSifresiniAyarla('baska-kodun-sifresi');
  yanitla(() => sahteJsonYanit({ result: true, token: 'dvd-token' }));
  await useDvdStore.getState().girisYap({ guvenlikKodu: 'k1', cid: 'c', kullaniciKodu: ' 87654321 ', sifre: 'ekrandaki' });
  assert.deepEqual(JSON.parse(sahteFetch.istekler[0].govde!), {
    dk: 'k1',
    userid: '87654321',
    sifre: 'ekrandaki',
    imageId: 'c',
  });
  assert.equal(useDvdStore.getState().kullaniciKodu, '87654321');
  assert.equal(oturumSifresi(), 'baska-kodun-sifresi'); // değişmedi
});

test('bağımsız giriş: bellekteki şifre kullanılmaz; kod ve şifre zorunlu', async () => {
  oturumSifresiniAyarla('bellekteki');
  await assert.rejects(useDvdStore.getState().girisYap({ guvenlikKodu: 'k', cid: 'c', kullaniciKodu: '87654321' }), /şifrenizi/);
  await assert.rejects(useDvdStore.getState().girisYap({ guvenlikKodu: 'k', cid: 'c', sifre: 'x' }), /kullanıcı kodunuzu/);
  assert.equal(sahteFetch.istekler.length, 0);
});

test('bağımsız oturum: uygulama hesabından çıkınca Dijital VD oturumu kapatılır', async () => {
  const { useHesapStore } = await import('../src/store/useHesapStore');
  useHesapStore.setState({ kullanici: { id: 'hesap-A', eposta: 'a@ornek.test', kullaniciAdi: 'ali', epostaDogrulandi: true } });
  useDvdStore.setState({ token: 'dvd-token', kullaniciKodu: '87654321' });
  yanitla(() => sahteJsonYanit({ result: true }));
  useHesapStore.setState({ kullanici: null });
  assert.equal(useDvdStore.getState().token, null);
});

test('bağımsız oturum: aynı kodla e-Arşiv girişi yapılınca korunur, başka kodla kapanır', () => {
  useDvdStore.setState({ token: 'dvd-token', kullaniciKodu: '87654321' });
  useAuthStore.setState({ token: 'gib', kullaniciKodu: '87654321' });
  assert.equal(useDvdStore.getState().token, 'dvd-token');
  yanitla(() => sahteJsonYanit({ result: true }));
  useAuthStore.setState({ token: 'gib2', kullaniciKodu: '11112222' });
  assert.equal(useDvdStore.getState().token, null);
});

// ---------------------------------------------------------------------------
// PDF'e aktarma için: kullanıcı bilgisi ve bir dönemin TÜM faturaları
// ---------------------------------------------------------------------------

test('user-info: yalnızca ad, VKN, TCKN, kullanıcı kodu okunur', async () => {
  yanitla(() =>
    sahteJsonYanit({ name: 'AHMET', surname: 'YILMAZ', vkn: '1234567890', tckn: null, userCode: '12345678', sessionId: 'x' }),
  );
  const k = await dvdKullaniciBilgisiGetir('tok');
  const [istek] = sahteFetch.istekler;
  assert.equal(istek.url, `${DVD_TABAN}/auth/tdvd/user-info`);
  assert.equal(istek.yontem, 'GET');
  assert.equal(istek.basliklar.authorization, 'Bearer tok');
  assert.deepEqual(k, { adSoyad: 'AHMET YILMAZ', vkn: '1234567890', tckn: undefined, kullaniciKodu: '12345678' });
});

function sayfaYaniti(pageNo: number, totalPage: number, nolar: string[]) {
  return {
    messages: null,
    pageDetail: { pageNo, pageSize: 10, total: 99, totalPage },
    resultListDenormalized: nolar.map((no, i) => ({
      faturaNo: no,
      duzenlenmeTarihi: `2026-08-0${(i % 9) + 1} 10:00:00`,
      tcknVkn: '1790617537',
      unvan: 'S',
      toplamTutar: 1,
    })),
  };
}

test('tüm faturalar: her parçanın tüm sayfaları, tekrarlar bir kez, ilerleme bildirilir', async () => {
  yanitla((i) => {
    const g = JSON.parse(i.govde!);
    const bas = g.data.duzenlenmeTarihiBas;
    const sayfa = g.meta.pagination.pageNo;
    if (bas === '25/08/2026') return sahteJsonYanit(sayfa === 1 ? sayfaYaniti(1, 2, ['A', 'B']) : sayfaYaniti(2, 2, ['C']));
    return sahteJsonYanit(sayfaYaniti(1, 1, ['C', 'D']));
  });
  const ilerlemeler: number[] = [];
  const parcaSonuclari: [number, number][] = [];
  const s = await dvdTumFaturalariGetir(
    'tok',
    [
      { baslangic: '25/08/2026', bitis: '31/08/2026' },
      { baslangic: '18/08/2026', bitis: '24/08/2026' },
    ],
    { bekleMs: 0, ilerleme: (d) => ilerlemeler.push(d.parcaSirasi), parcaTamam: (i, n) => parcaSonuclari.push([i, n]) },
  );
  // 2. parçada gelen C daha önce görüldüğü için yalnızca D yeni sayılır.
  assert.deepEqual(parcaSonuclari, [
    [1, 3],
    [2, 1],
  ]);
  assert.equal(sahteFetch.istekler.length, 3);
  assert.deepEqual(
    s.faturalar.map((f) => f.faturaNo).sort(),
    ['A', 'B', 'C', 'D'],
  );
  assert.equal(s.durduruldu, false);
  assert.deepEqual(ilerlemeler, [1, 1, 2]);
});

test('tüm faturalar: durdurulunca istek atılmaz, o ana kadar toplananlar döner', async () => {
  let durdur = false;
  yanitla(() => {
    durdur = true;
    return sahteJsonYanit(sayfaYaniti(1, 3, ['A']));
  });
  const s = await dvdTumFaturalariGetir('tok', [{ baslangic: 'a', bitis: 'b' }], {
    bekleMs: 0,
    durduruldu: () => durdur,
  });
  assert.equal(sahteFetch.istekler.length, 1);
  assert.equal(s.durduruldu, true);
  assert.deepEqual(s.faturalar.map((f) => f.faturaNo), ['A']);
});

test('tüm faturalar: oturum hatası dışarı iletilir', async () => {
  yanitla(() => sahteJsonYanit({}, 401));
  const h = await hataBekle(dvdTumFaturalariGetir('tok', [{ baslangic: 'a', bitis: 'b' }], { bekleMs: 0 }));
  assert.equal(h.oturumHatasi, true);
});

test('tüm faturalar: anlık hata bir kez yeniden denenir', async () => {
  let n = 0;
  yanitla(() => (n++ === 0 ? sahteJsonYanit({}, 502) : sahteJsonYanit(sayfaYaniti(1, 1, ['A']))));
  const s = await dvdTumFaturalariGetir('tok', [{ baslangic: '01/09/2026', bitis: '07/09/2026' }], {
    bekleMs: 0,
    tekrarBekleMs: 0,
  });
  assert.equal(sahteFetch.istekler.length, 2);
  assert.deepEqual(s.faturalar.map((f) => f.faturaNo), ['A']);
});

test('tüm faturalar: iki kez başarısız olursa hangi sorguda koptuğu yazılır', async () => {
  yanitla(() => sahteJsonYanit({}, 502));
  const h = await hataBekle(
    dvdTumFaturalariGetir('tok', [{ baslangic: '01/09/2026', bitis: '07/09/2026' }], { bekleMs: 0, tekrarBekleMs: 0 }),
  );
  assert.equal(sahteFetch.istekler.length, 2);
  assert.match(h.message, /^01\/09\/2026 – 07\/09\/2026 \(sayfa 1\) sorgulanamadı: /);
  assert.equal(h.oturumHatasi, false);
});

test('liste: "e-Arşiv Faturanız bulunmamaktadır." hata değil, boş sayfa (200 ya da 4xx)', async () => {
  const mesaj = { messages: [{ text: 'e-Arşiv Faturanız bulunmamaktadır.', type: 'ERROR' }] };
  for (const durum of [200, 400, 404]) {
    yanitla(() => sahteJsonYanit(mesaj, durum));
    const s = await dvdEarsivFaturalariGetir('tok', { baslangic: 'a', bitis: 'b', sayfa: 1 });
    assert.deepEqual(s, { faturalar: [], sayfa: 1, toplam: 0, toplamSayfa: 0 });
  }
});

test('tüm faturalar: faturasız hafta aktarmayı durdurmaz, yeniden denenmez', async () => {
  yanitla((i) => {
    const bas = JSON.parse(i.govde!).data.duzenlenmeTarihiBas;
    if (bas === '16/09/2026') {
      return sahteJsonYanit({ messages: [{ text: 'e-Arşiv Faturanız bulunmamaktadır.', type: 'ERROR' }] });
    }
    return sahteJsonYanit(sayfaYaniti(1, 1, ['A']));
  });
  const parcalar: [number, number][] = [];
  const s = await dvdTumFaturalariGetir(
    'tok',
    [
      { baslangic: '16/09/2026', bitis: '22/09/2026' },
      { baslangic: '09/09/2026', bitis: '15/09/2026' },
    ],
    { bekleMs: 0, tekrarBekleMs: 0, parcaTamam: (i, n) => parcalar.push([i, n]) },
  );
  assert.equal(sahteFetch.istekler.length, 2);
  assert.deepEqual(s.faturalar.map((f) => f.faturaNo), ['A']);
  assert.deepEqual(parcalar, [
    [1, 0],
    [2, 1],
  ]);
});

test('mükellef: Dijital VD user-info VKN/TCKN; bellekte tutulur, çıkışta silinir', async () => {
  useDvdStore.setState({ token: 'tok', kullaniciKodu: '12345678', mukellef: null });
  yanitla(() => sahteJsonYanit({ name: 'AHMET', surname: 'YILMAZ', vkn: '', tckn: '12345678901', userCode: '12345678' }));
  assert.deepEqual(await useDvdStore.getState().mukellefiBelirle(), { vkn: '12345678901', unvan: 'AHMET YILMAZ' });
  assert.equal(sahteFetch.istekler.length, 1);
  await useDvdStore.getState().mukellefiBelirle(); // önbellekten
  assert.equal(sahteFetch.istekler.length, 1);
  useDvdStore.getState().oturumuUnut();
  assert.equal(useDvdStore.getState().mukellef, null);
});

test('mükellef: user-info VKN vermezse ve e-Arşiv oturumu yoksa null (yanlış klasöre yazılmaz)', async () => {
  useDvdStore.setState({ token: 'tok', kullaniciKodu: '12345678', mukellef: null });
  yanitla(() => sahteJsonYanit({ name: 'A', vkn: null, tckn: null, userCode: '12345678' }));
  assert.equal(await useDvdStore.getState().mukellefiBelirle(), null);
});

test('mükellef: e-Arşiv oturumu aynı koddaysa oradaki geçerli VKN kullanılır; farklı koddaysa kullanılmaz', async () => {
  yanitla(() => sahteJsonYanit({}, 500));
  useAuthStore.setState({ token: 'gib', kullaniciKodu: '12345678', kullaniciBilgisi: { vknTckn: '1234567890', unvan: 'X A.Ş.' } as never });
  useDvdStore.setState({ token: 'tok', kullaniciKodu: '12345678', mukellef: null });
  assert.deepEqual(await useDvdStore.getState().mukellefiBelirle(), { vkn: '1234567890', unvan: 'X A.Ş.' });
  useDvdStore.setState({ token: 'tok', kullaniciKodu: '99999999', mukellef: null });
  assert.equal(await useDvdStore.getState().mukellefiBelirle(), null);
});
