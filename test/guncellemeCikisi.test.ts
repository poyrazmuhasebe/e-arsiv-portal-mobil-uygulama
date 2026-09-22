// Zorunlu güncellemede GİB ve Dijital VD oturumları kapanır; uygulama hesabı
// açık kalır. Ağ hataları yerel temizliği engellemez.

import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteAgHatasi, sahteAxios, sahteFetch, sahteJsonYanit, sahteleriSifirla } from './sahte/kurulum';
import { guncellemeIcinOturumlariKapat } from '../src/utils/guncellemeCikisi';
import { useAuthStore } from '../src/store/useAuthStore';
import { useDvdStore } from '../src/store/useDvdStore';
import { useHesapStore } from '../src/store/useHesapStore';

const HESAP = { id: 'hesap-A', eposta: 'a@ornek.test', kullaniciAdi: 'ali', epostaDogrulandi: true };

beforeEach(() => {
  sahteleriSifirla();
  useHesapStore.setState({ kullanici: HESAP });
  useAuthStore.setState({ token: 'gib-token', kullaniciKodu: '87654321' });
  useDvdStore.setState({ token: 'dvd-token', kullaniciKodu: '87654321' });
});

test('GİB ve Dijital VD oturumları kapanır, uygulama hesabı açık kalır', async () => {
  sahteAxios.isleyici = () => ({ status: 200, data: { data: 'ok' } });
  sahteFetch.isleyici = () => sahteJsonYanit({ result: true });

  await guncellemeIcinOturumlariKapat();

  assert.equal(useAuthStore.getState().token, null);
  assert.equal(useDvdStore.getState().token, null);
  assert.equal(useHesapStore.getState().kullanici?.id, 'hesap-A');
  // Dijital VD'ye tek çıkış isteği gider (GİB çıkışı ikinciyi tetiklemez).
  assert.equal(sahteFetch.istekler.filter((i) => i.url.includes('/logout')).length, 1);
});

test('ağ hatasında da her iki oturum yerelde kapanır', async () => {
  sahteAxios.isleyici = () => {
    throw sahteAgHatasi();
  };
  sahteFetch.isleyici = () => {
    throw new TypeError('Network request failed');
  };

  await guncellemeIcinOturumlariKapat();

  assert.equal(useAuthStore.getState().token, null);
  assert.equal(useDvdStore.getState().token, null);
});

test('oturum yoksa ağa çıkmaz', async () => {
  // Önce DVD: GİB token'ı sıfırlanınca abonelik açık DVD oturumunu kapatır.
  useDvdStore.setState({ token: null, kullaniciKodu: null });
  useAuthStore.setState({ token: null, kullaniciKodu: null });

  await guncellemeIcinOturumlariKapat();

  assert.equal(sahteAxios.istekler.length, 0);
  assert.equal(sahteFetch.istekler.length, 0);
});
