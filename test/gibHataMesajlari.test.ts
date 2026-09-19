import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BAGLANTI_YOK_MESAJI,
  ZAMAN_ASIMI_MESAJI,
  agHatasiMesaji,
  gibMesajiniAnlasilirYap,
} from '../src/services/gibHataMesajlari';

test('bilinen GİB metinleri açıklamaya çevrilir, orijinal metin korunur', () => {
  const yetki = gibMesajiniAnlasilirYap('Bu işlem için yetkiniz yok');
  assert.match(yetki, /^GİB bu isteği reddetti\./);
  assert.match(yetki, /\(GİB mesajı: "Bu işlem için yetkiniz yok"\)$/);

  const npe = gibMesajiniAnlasilirYap('Genel Sistem Hatası: java.lang.NullPointerException');
  assert.match(npe, /beklenmeyen bir sistem hatası/);
  assert.match(npe, /java\.lang\.NullPointerException/);

  assert.match(gibMesajiniAnlasilirYap('Silinmiş belgeler düzenlenemez!'), /Bu belge GİB'de silinmiş/);
  assert.match(gibMesajiniAnlasilirYap('Sisteme giriş için eksik bilgi verildi'), /Giriş bilgileri eksik/);
});

test('eşleşme büyük/küçük harf ve Türkçe İ/ı farkına duyarsız', () => {
  assert.match(gibMesajiniAnlasilirYap('BU İŞLEM İÇİN YETKİNİZ YOK.'), /^GİB bu isteği reddetti/);
  assert.match(gibMesajiniAnlasilirYap('HATA: genel sistem hatası oluştu'), /sistem hatası oluştu\. Bir süre/);
});

test('bilinmeyen metinler değiştirilmeden döner', () => {
  for (const ham of ['Tarih aralığı hatalı.', 'Faturanız bulunamadı', '']) {
    assert.equal(gibMesajiniAnlasilirYap(ham), ham);
  }
});

test('çok uzun GİB metni kısaltılır, boşluklar sadeleşir', () => {
  const uzun = `Genel Sistem Hatası:\n   ${'at com.gib.X.y(X.java:1)\n'.repeat(40)}`;
  const sonuc = gibMesajiniAnlasilirYap(uzun);
  const alinti = /\(GİB mesajı: "(.*)"\)$/.exec(sonuc)?.[1] ?? '';
  assert.ok(alinti.length <= 160, String(alinti.length));
  assert.ok(alinti.endsWith('…'));
  assert.doesNotMatch(alinti, /\n/);
});

test('ağ hataları: zaman aşımı mükerrer işlem uyarısı içerir', () => {
  assert.equal(agHatasiMesaji({ isAxiosError: true, code: 'ECONNABORTED' }), ZAMAN_ASIMI_MESAJI);
  assert.equal(agHatasiMesaji({ isAxiosError: true, code: 'ETIMEDOUT' }), ZAMAN_ASIMI_MESAJI);
  assert.match(ZAMAN_ASIMI_MESAJI, /tekrar denemeden önce/);
  assert.equal(agHatasiMesaji({ isAxiosError: true, code: 'ERR_NETWORK' }), BAGLANTI_YOK_MESAJI);
  assert.equal(agHatasiMesaji({ isAxiosError: true, response: { status: 500 } }), null);
  assert.equal(agHatasiMesaji(new Error('x')), null);
  assert.equal(agHatasiMesaji(null), null);
});
