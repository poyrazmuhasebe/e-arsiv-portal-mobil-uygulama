// GİB oturumunun sahibi: cihazda kalan bir GİB oturumu, sonra giren BAŞKA bir
// uygulama hesabına geri yüklenmemeli (Issue #31).

import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteAxios, sahteDepo, sahteFetch, sahteleriSifirla } from './sahte/kurulum';
import {
  GIB_SAHIBI_KEY,
  gibOturumuGeriYuklenebilirMi,
  gibSahibiniKaydet,
  gibSahibiniOku,
  gibSahibiniSil,
} from '../src/utils/gibSahibi';
import { useAuthStore } from '../src/store/useAuthStore';

beforeEach(() => {
  sahteleriSifirla();
  useAuthStore.setState({
    token: null,
    kullaniciKodu: null,
    kullaniciBilgisi: null,
    isLoading: false,
    isLoggingOut: false,
    error: null,
  });
});

test('sahip kaydedilir, okunur ve silinir; anahtar hesap_ önekli', async () => {
  assert.equal(GIB_SAHIBI_KEY, 'hesap_gib_sahibi');
  assert.equal(await gibSahibiniOku(), null);

  await gibSahibiniKaydet('kullanici-1');
  assert.equal(await gibSahibiniOku(), 'kullanici-1');
  assert.equal(sahteDepo.veriler.get('hesap_gib_sahibi'), 'kullanici-1');

  await gibSahibiniSil();
  assert.equal(await gibSahibiniOku(), null);
});

test('geri yükleme kuralı: yalnızca sahip ile aktif hesap aynıysa', () => {
  assert.equal(gibOturumuGeriYuklenebilirMi('k1', 'k1'), true);
  // Sahipsiz oturum (güncellemeden önce açılmış)
  assert.equal(gibOturumuGeriYuklenebilirMi(null, 'k1'), false);
  assert.equal(gibOturumuGeriYuklenebilirMi('', 'k1'), false);
  // Uygulama hesabı oturumu yok
  assert.equal(gibOturumuGeriYuklenebilirMi('k1', null), false);
  assert.equal(gibOturumuGeriYuklenebilirMi('k1', ''), false);
  // Başka bir hesap
  assert.equal(gibOturumuGeriYuklenebilirMi('k1', 'k2'), false);
});

test('restoreSession: SAHİPSİZ gib_token silinir, oturum geri yüklenmez', async () => {
  // Güncellemeden önceki durum: token var, sahip kaydı yok.
  sahteDepo.veriler.set('gib_token', 'eski-token');
  sahteDepo.veriler.set('gib_kullanici_kodu', '34567890');
  sahteDepo.veriler.set('gib_hatirlanan_kullanici_kodu', '34567890');

  // GİB logout isteği denenecek; başarılı yanıt verelim.
  sahteAxios.isleyici = () => ({ status: 200, data: { data: 'ok' } });

  await useAuthStore.getState().restoreSession('yeni-hesap');

  assert.equal(useAuthStore.getState().token, null);
  assert.equal(sahteDepo.veriler.has('gib_token'), false);
  assert.equal(sahteDepo.veriler.has('gib_kullanici_kodu'), false);
  // Hatırlanan kullanıcı kodu ve defterler SİLİNMEZ.
  assert.equal(sahteDepo.veriler.get('gib_hatirlanan_kullanici_kodu'), '34567890');
});

test('restoreSession: BAŞKA hesabın GİB oturumu geri yüklenmez ve silinir', async () => {
  sahteDepo.veriler.set('gib_token', 'baskasinin-tokeni');
  sahteDepo.veriler.set('gib_kullanici_kodu', '34567890');
  sahteDepo.veriler.set('hesap_gib_sahibi', 'hesap-A');
  sahteAxios.isleyici = () => ({ status: 200, data: { data: 'ok' } });

  await useAuthStore.getState().restoreSession('hesap-B');

  assert.equal(useAuthStore.getState().token, null);
  assert.equal(sahteDepo.veriler.has('gib_token'), false);
  assert.equal(sahteDepo.veriler.has('hesap_gib_sahibi'), false);
});

test('restoreSession: uygulama hesabı oturumu yokken GİB oturumu geri yüklenmez', async () => {
  sahteDepo.veriler.set('gib_token', 'token');
  sahteDepo.veriler.set('hesap_gib_sahibi', 'hesap-A');
  sahteAxios.isleyici = () => ({ status: 200, data: { data: 'ok' } });

  await useAuthStore.getState().restoreSession(null);

  assert.equal(useAuthStore.getState().token, null);
  assert.equal(sahteDepo.veriler.has('gib_token'), false);
});

test('restoreSession: SAHİBİ eşleşen oturum geri yüklenir', async () => {
  sahteDepo.veriler.set('gib_token', 'dogru-token');
  sahteDepo.veriler.set('gib_kullanici_kodu', '34567890');
  sahteDepo.veriler.set('hesap_gib_sahibi', 'hesap-A');
  // getKullaniciBilgileri çağrılacak.
  sahteAxios.isleyici = () => ({ status: 200, data: { data: JSON.stringify({ unvan: 'Örnek Ltd' }) } });

  await useAuthStore.getState().restoreSession('hesap-A');

  assert.equal(useAuthStore.getState().token, 'dogru-token');
  assert.equal(useAuthStore.getState().kullaniciKodu, '34567890');
  assert.equal(sahteDepo.veriler.get('gib_token'), 'dogru-token');
});

test('restoreSession: cihazda GİB oturumu yoksa hiçbir şey yapmaz', async () => {
  await useAuthStore.getState().restoreSession('hesap-A');
  assert.equal(useAuthStore.getState().token, null);
  // Ağa çıkılmadı.
  assert.equal(sahteAxios.istekler.length, 0);
  assert.equal(sahteFetch.istekler.length, 0);
});

test('login sahip kaydını yazar', async () => {
  sahteAxios.isleyici = (istek) => {
    if (istek.url.includes('assos-login')) return { status: 200, data: { token: 'yeni-token' } };
    return { status: 200, data: { data: JSON.stringify({ unvan: 'Örnek Ltd' }) } };
  };

  await useAuthStore.getState().login('34567890', 'gizli-sifre', 'hesap-A');

  assert.equal(sahteDepo.veriler.get('hesap_gib_sahibi'), 'hesap-A');
  assert.equal(useAuthStore.getState().token, 'yeni-token');
});

test('logout sahip kaydını da siler', async () => {
  sahteDepo.veriler.set('gib_token', 'token');
  sahteDepo.veriler.set('hesap_gib_sahibi', 'hesap-A');
  useAuthStore.setState({ token: 'token' });
  sahteAxios.isleyici = () => ({ status: 200, data: { data: 'ok' } });

  await useAuthStore.getState().logout();

  assert.equal(sahteDepo.veriler.has('hesap_gib_sahibi'), false);
  assert.equal(useAuthStore.getState().token, null);
});
