// Fatura filigranı kuralları (2026-09-21 kullanıcı bildirimi):
// - "İptal Kabul Edildi" / "İptal Reddedildi" filigranı görünmüyordu
// - silinmiş faturada GİB'in "iptal edilmiş" filigranı çıkıyordu → "FATURA SİLİNDİ"
// - talebi olmayan faturada GİB "-99" gönderiyor; bu "Aşamasında" sayılıyordu

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  faturaFiligranMetni,
  filigranEkle,
  filigranliFaturaHtml,
  gibIptalMetniniDegistir,
  iptalItirazDurumMetni,
  iptalKabulEdildiMi,
} from '../src/utils/faturaFiligran';
import type { TaslakFatura } from '../src/types/gib';

const t = (ek: Partial<TaslakFatura>): TaslakFatura => ({ ettn: 'x', onayDurumu: 'Onaylandı', ...ek });

test('iptal kabul edildi ve reddedildi filigranları üretilir', () => {
  assert.equal(faturaFiligranMetni(t({ iptalItiraz: '0', talepDurum: '1' })), 'İptal Kabul Edildi');
  assert.equal(faturaFiligranMetni(t({ iptalItiraz: '0', talepDurum: '2' })), 'İptal Reddedildi');
  assert.equal(faturaFiligranMetni(t({ iptalItiraz: '0', talepDurum: '0' })), 'İptal Aşamasında');
  assert.equal(faturaFiligranMetni(t({ iptalItiraz: '1', talepDurum: '1' })), 'İtiraz Kabul Edildi');
});

test('talebi OLMAYAN fatura ("-99", boş, alan yok) filigransızdır', () => {
  assert.equal(faturaFiligranMetni(t({ iptalItiraz: '-99', talepDurum: '-99' })), undefined);
  assert.equal(iptalItirazDurumMetni(t({ iptalItiraz: '-99', talepDurum: '-99' })), undefined);
  assert.equal(faturaFiligranMetni(t({ talepDurum: '' })), undefined);
  assert.equal(faturaFiligranMetni(t({})), undefined);
});

test('silinmiş fatura "Fatura Silindi" filigranı alır (talep durumu ne olursa olsun)', () => {
  assert.equal(faturaFiligranMetni(t({ onayDurumu: 'Silinmiş' })), 'Fatura Silindi');
  assert.equal(faturaFiligranMetni(t({ onayDurumu: 'Silinmiş', talepDurum: '1' })), 'Fatura Silindi');
});

test('GİB\'in "iptal edilmiş" metni FATURA SİLİNDİ olur (farklı yazımlar)', () => {
  for (const metin of ['İPTAL EDİLMİŞTİR', 'İptal Edilmiş'.replace('Edilmiş', 'edilmiş'), 'iptal edildi', 'İPTAL&nbsp;EDİLMİŞ', 'IPTAL EDILMIS']) {
    assert.equal(gibIptalMetniniDegistir(`<div class="x">${metin}</div>`).html, '<div class="x">FATURA SİLİNDİ</div>', metin);
  }
});

test('GİB metni değişimi YALNIZCA silinmiş faturada uygulanır', () => {
  const html = '<html><body><p>İPTAL EDİLMİŞTİR</p></body></html>';
  assert.match(filigranliFaturaHtml(html, t({ onayDurumu: 'Silinmiş' })), /<p>FATURA SİLİNDİ<\/p>/);
  // Onaylı faturada GİB metnine dokunulmaz.
  assert.match(filigranliFaturaHtml(html, t({ onayDurumu: 'Onaylandı' })), /<p>İPTAL EDİLMİŞTİR<\/p>/);
});

test('filigran body\'nin başına eklenir, Türkçe büyük harfle yazılır', () => {
  const sonuc = filigranEkle('<html><body class="a"><p>fatura</p></body></html>', 'İptal Kabul Edildi');
  assert.match(sonuc, /<body class="a"><div data-earsiv-filigran="1"[^>]*>İPTAL KABUL EDİLDİ<\/div><p>fatura<\/p>/);
});

test('filigran metni yoksa HTML hiç değişmez', () => {
  const html = '<html><body><p>fatura</p></body></html>';
  assert.equal(filigranEkle(html, undefined), html);
  assert.equal(filigranliFaturaHtml(html, t({ talepDurum: '-99' })), html);
});

test('body etiketi yoksa filigran başa eklenir', () => {
  assert.match(filigranEkle('<p>x</p>', 'Fatura Silindi'), /^<div data-earsiv-filigran="1"[^>]*>FATURA SİLİNDİ<\/div><p>x<\/p>$/);
});

// ---------------------------------------------------------------------------
// GİB'in gerçek silinmiş-fatura filigranı (2026-09-21 geliştirme logundan;
// kişisel veri içermeyen stil parçası)
// ---------------------------------------------------------------------------

const GIB_SILINMIS_PARCA =
  "<html><body><div><p style='position:absolute;top:300px;transform:rotate(310deg);" +
  "-webkit-transform:rotate(310deg);color:lightcoral'>İPTAL EDİLMİŞ</p></div>" +
  "<div style='z-index:1'><table><tr><td>fatura</td></tr></table></div></body></html>";

test('GİB\'in gerçek "İPTAL EDİLMİŞ" filigranı YERİNDE "FATURA SİLİNDİ" olur', () => {
  const sonuc = filigranliFaturaHtml(GIB_SILINMIS_PARCA, t({ onayDurumu: 'Silinmiş' }));
  assert.match(sonuc, /color:lightcoral'>FATURA SİLİNDİ<\/p>/);
  assert.doesNotMatch(sonuc, /İPTAL EDİLMİŞ/);
});

test('GİB filigranı değiştirildiyse İKİNCİ bir filigran EKLENMEZ', () => {
  const sonuc = filigranliFaturaHtml(GIB_SILINMIS_PARCA, t({ onayDurumu: 'Silinmiş' }));
  assert.doesNotMatch(sonuc, /data-earsiv-filigran/);
  assert.equal((sonuc.match(/FATURA SİLİNDİ/g) ?? []).length, 1);
});

test('"İ" iki kod noktası (I + U+0307) olarak kodlanmışsa da eşleşir', () => {
  const ayrisik = GIB_SILINMIS_PARCA.replace('İPTAL EDİLMİŞ', 'İPTAL EDİLMİŞ');
  assert.notEqual(ayrisik, GIB_SILINMIS_PARCA);
  const { degisti, html } = gibIptalMetniniDegistir(ayrisik);
  assert.equal(degisti, true);
  assert.match(html, />FATURA SİLİNDİ</);
});

test('uzun bir metnin İÇİNDE geçen "iptal edildi" değiştirilmez (ör. fatura notu)', () => {
  const not = '<html><body><p>Önceki sipariş iptal edildi, yenisi düzenlendi.</p></body></html>';
  const { degisti, html } = gibIptalMetniniDegistir(not);
  assert.equal(degisti, false);
  assert.equal(html, not);
});

test('GİB filigranı bulunamazsa (biçim değişirse) bizim filigranımız eklenir', () => {
  const sonuc = filigranliFaturaHtml('<html><body><p>fatura</p></body></html>', t({ onayDurumu: 'Silinmiş' }));
  assert.match(sonuc, /data-earsiv-filigran="1"[^>]*>FATURA SİLİNDİ</);
});

// ---------------------------------------------------------------------------
// Liste rozeti: iptali kabul edilmiş fatura "Onaylı" değil "İptal"
// ---------------------------------------------------------------------------

test('iptal talebi KABUL EDİLMİŞ fatura iptal sayılır', () => {
  assert.equal(iptalKabulEdildiMi(t({ iptalItiraz: '0', talepDurum: '1' })), true);
});

test('aşamada, reddedilmiş, talepsiz ya da İTİRAZ kabulü iptal sayılmaz', () => {
  assert.equal(iptalKabulEdildiMi(t({ iptalItiraz: '0', talepDurum: '0' })), false);
  assert.equal(iptalKabulEdildiMi(t({ iptalItiraz: '0', talepDurum: '2' })), false);
  assert.equal(iptalKabulEdildiMi(t({ iptalItiraz: '-99', talepDurum: '-99' })), false);
  assert.equal(iptalKabulEdildiMi(t({})), false);
  assert.equal(iptalKabulEdildiMi(t({ iptalItiraz: '1', talepDurum: '1' })), false);
});
