// Taslak Düzenle: FATURA_GETIR yanıtının forma çevrilmesi ve güncelleme
// isteğinin GİB'in kendi Düzenle → Kaydet akışıyla (2026-09-23 canlı
// yakalama) aynı olması. Kişisel veriler sahtedir.

import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteAxios, sahteleriSifirla } from './sahte/kurulum';
import { GibApiError, faturaGetir, faturaGuncelle } from '../src/services/gibApi';
import { DuzenlemeHatasi, gibFaturasiniFormaCevir } from '../src/utils/faturaDuzenleme';
import type { FaturaTaslagi } from '../src/types/gib';

const ETTN = 'f4679cd4-a730-4f48-ba25-4aa36485a21b';

/** Canlı yakalanan yanıtın yapısı (70 V#### alanından birkaçı), sahte kişi verisiyle. */
function getirYaniti(): Record<string, unknown> {
  return {
    faturaUuid: ETTN,
    faturaTarihi: '23/09/2026',
    faturaTipi: 'SATIS',
    paraBirimi: 'TRY',
    dovzTLkur: 0.0,
    vknTckn: '10000000146',
    aliciAdi: 'ALİ',
    aliciSoyadi: 'YILMAZ',
    bulvarcaddesokak: 'Örnek Cad. No 1',
    binaAdi: '',
    mahalleSemtIlce: 'esenler',
    ulke: 'Türkiye',
    tel: '',
    eposta: '',
    sehir: 'İstanbul',
    vergiDairesi: 'ESENLER VERGİ DAİRESİ MÜD.',
    belgeNumarasi: 'GIB2026000000010',
    komisyonOrani: 0.0,
    navlunTutari: 0.0,
    gelirVergisiOrani: 0.0,
    halRusumuKDVTutari: 0.0,
    ozelMatrahTutari: 0,
    malHizmetTable: [
      {
        V0003Orani: 0,
        V9015Orani: 0,
        V9015Tutari: 0,
        birim: 'DAY',
        birimFiyat: 1250,
        fiyat: 10500,
        hesaplananotvtevkifatakatkisi2: 0,
        iskontoArttm: 'İskonto',
        iskontoNedeni: '',
        iskontoOrani: 0,
        iskontoTutari: 0,
        kdvOrani: 20,
        kdvTutari: 1750,
        malHizmet: '34EZB022 ARAÇ KİRALAMA BEDELİ',
        malHizmetTutari: 8750,
        miktar: 7,
        ozelMatrahTutari: 0,
        tevkifatIadeKdvTutari: 0,
        yatirimTesvikVazgecilenKdvOrani: 0,
      },
    ],
    matrah: 8750,
    // GİB bu yanıtta toplam KDV'yi 0 döndürüyor; form toplamları kendisi hesaplar.
    hesaplanankdv: 0,
    odenecekTutar: 10500,
    tip: 'İskonto',
    saat: '11:33:39',
    hata: '',
  };
}

beforeEach(() => {
  sahteleriSifirla();
});

// ---------------------------------------------------------------------------
// Yanıt → form
// ---------------------------------------------------------------------------

test('GETIR yanıtı forma çevrilir: tarih/saat, alıcı, kalem', () => {
  const { form, ekAlici } = gibFaturasiniFormaCevir(getirYaniti());

  assert.equal(form.faturaTarihi.getFullYear(), 2026);
  assert.equal(form.faturaTarihi.getMonth(), 8);
  assert.equal(form.faturaTarihi.getDate(), 23);
  assert.equal(form.faturaSaati.getHours(), 11);
  assert.equal(form.faturaSaati.getMinutes(), 33);
  assert.equal(form.faturaSaati.getSeconds(), 39);
  assert.equal(form.faturaTipi, 'SATIS');
  assert.equal(form.paraBirimi, 'TRY');
  assert.equal(form.dovizKuru, '0');

  assert.equal(form.alici.vknTckn, '10000000146');
  assert.equal(form.alici.ad, 'ALİ');
  assert.equal(form.alici.soyad, 'YILMAZ');
  assert.equal(form.alici.adres, 'Örnek Cad. No 1');
  assert.equal(form.alici.ulke, 'Türkiye');

  assert.equal(form.kalemler.length, 1);
  const k = form.kalemler[0];
  assert.equal(k.malHizmet, '34EZB022 ARAÇ KİRALAMA BEDELİ');
  assert.equal(k.miktar, '7');
  assert.equal(k.birim, 'DAY');
  assert.equal(k.birimFiyat, '1250');
  assert.equal(k.iskontoOrani, '0');
  assert.equal(k.kdvOrani, 20);
  assert.equal(k.ekVergi, undefined);

  // Formda alanı olmayan alıcı bilgileri korunur.
  assert.deepEqual(ekAlici, { il: 'İstanbul', ilce: 'esenler', telefon: undefined, eposta: undefined });
});

test('ondalıklı tutarlar formun virgüllü biçimine çevrilir', () => {
  const v = getirYaniti();
  (v.malHizmetTable as Record<string, unknown>[])[0].birimFiyat = 1250.5;
  (v.malHizmetTable as Record<string, unknown>[])[0].iskontoOrani = 12.5;
  const { form } = gibFaturasiniFormaCevir(v);
  assert.equal(form.kalemler[0].birimFiyat, '1250,5');
  assert.equal(form.kalemler[0].iskontoOrani, '12,5');
});

test('tevkifatlı ya da ek vergili kalem düzenlemeye açılmaz (sessizce silinmesin)', () => {
  for (const alan of ['V9015Orani', 'V0003Orani', 'ozelMatrahTutari', 'tevkifatIadeKdvTutari']) {
    const v = getirYaniti();
    (v.malHizmetTable as Record<string, unknown>[])[0][alan] = 20;
    assert.throws(() => gibFaturasiniFormaCevir(v), DuzenlemeHatasi, alan);
  }
});

test('masraf/stopaj/özel matrah dolu fatura düzenlemeye açılmaz', () => {
  for (const alan of ['komisyonOrani', 'navlunTutari', 'gelirVergisiOrani', 'halRusumuKDVTutari', 'ozelMatrahTutari']) {
    const v = getirYaniti();
    v[alan] = 5;
    assert.throws(() => gibFaturasiniFormaCevir(v), DuzenlemeHatasi, alan);
  }
});

test('arttırım, tanınmayan KDV oranı / birim / fatura tipi / tarih reddedilir', () => {
  const degisiklikler: ((v: Record<string, unknown>) => void)[] = [
    (v) => Object.assign((v.malHizmetTable as Record<string, unknown>[])[0], { iskontoOrani: 5, iskontoArttm: 'Arttırım' }),
    (v) => Object.assign((v.malHizmetTable as Record<string, unknown>[])[0], { kdvOrani: 18 }),
    (v) => Object.assign((v.malHizmetTable as Record<string, unknown>[])[0], { birim: 'XYZ' }),
    (v) => Object.assign(v, { faturaTipi: 'BILINMEYEN' }),
    (v) => Object.assign(v, { faturaTarihi: '2026-09-23' }),
    (v) => Object.assign(v, { malHizmetTable: [] }),
  ];
  for (const degistir of degisiklikler) {
    const v = getirYaniti();
    degistir(v);
    assert.throws(() => gibFaturasiniFormaCevir(v), DuzenlemeHatasi);
  }
});

// ---------------------------------------------------------------------------
// GİB istekleri
// ---------------------------------------------------------------------------

test('faturaGetir: GİB ekranındaki istekle aynı (FATURA_GETIR, RG_BASITFATURA, {ettn})', async () => {
  sahteAxios.isleyici = () => ({ status: 200, data: { data: getirYaniti() } });
  const veri = await faturaGetir('tok', ETTN);

  assert.equal(veri.belgeNumarasi, 'GIB2026000000010');
  const govde = new URLSearchParams(sahteAxios.istekler[0].govde);
  assert.equal(govde.get('cmd'), 'EARSIV_PORTAL_FATURA_GETIR');
  assert.equal(govde.get('pageName'), 'RG_BASITFATURA');
  assert.equal(govde.get('token'), 'tok');
  assert.deepEqual(JSON.parse(govde.get('jp')!), { ettn: ETTN });
});

function taslak(): FaturaTaslagi {
  return {
    alici: {
      vknTckn: '10000000146',
      unvan: '',
      ad: 'ALİ',
      soyad: 'YILMAZ',
      vergiDairesi: 'ESENLER VERGİ DAİRESİ MÜD.',
      adres: 'Örnek Cad. No 1',
      ulke: 'Türkiye',
      il: 'İstanbul',
      ilce: 'esenler',
    },
    satirlar: [{ malHizmet: 'KİRALAMA', miktar: 7, birim: 'DAY', birimFiyat: 1250, iskontoOrani: 0, kdvOrani: 20 }],
    faturaTarihi: '23/09/2026',
    saat: '11:33:39',
    faturaTipi: 'SATIS',
    paraBirimi: 'TRY',
    dovizKuru: 0,
    not: '1',
  };
}

test('faturaGuncelle: FATURA_OLUSTUR ile taslağın ETTN ve belge numarasını gönderir (yerinde güncelleme)', async () => {
  sahteAxios.isleyici = () => ({
    status: 200,
    data: { data: 'Faturanız başarıyla oluşturulmuştur. Düzenlenen Belgeler menüsünden faturanıza ulaşabilirsiniz.' },
  });
  await faturaGuncelle('tok', { ettn: ETTN, belgeNumarasi: 'GIB2026000000010' }, taslak());

  // Yeni fatura akışının aksine önce/sonra taslak listesi SORGULANMAZ: tek istek.
  assert.equal(sahteAxios.istekler.length, 1);
  const govde = new URLSearchParams(sahteAxios.istekler[0].govde);
  assert.equal(govde.get('cmd'), 'EARSIV_PORTAL_FATURA_OLUSTUR');
  assert.equal(govde.get('pageName'), 'RG_BASITFATURA');
  const jp = JSON.parse(govde.get('jp')!);
  assert.equal(jp.faturaUuid, ETTN);
  assert.equal(jp.belgeNumarasi, 'GIB2026000000010');
  // Canlı yakalamadaki değerlerle aynı biçim.
  assert.equal(jp.hangiTip, '5000/30000');
  assert.equal(jp.matrah, '8750');
  assert.equal(jp.hesaplanankdv, '1750');
  assert.equal(jp.odenecekTutar, '10500');
  assert.equal(jp.sehir, 'İstanbul');
  assert.equal(jp.mahalleSemtIlce, 'esenler');
  assert.equal(jp.not, '1');
  assert.equal(jp.malHizmetTable[0].malHizmetTutari, '8750');
  assert.equal(jp.malHizmetTable[0].kdvOrani, '20');
});

test('faturaGuncelle: kimlik eksikse istek ATILMAZ (GİB yeni taslak açardı)', async () => {
  for (const kimlik of [{ ettn: '', belgeNumarasi: 'GIB1' }, { ettn: ETTN, belgeNumarasi: '' }]) {
    await assert.rejects(faturaGuncelle('tok', kimlik, taslak()), GibApiError);
  }
  assert.equal(sahteAxios.istekler.length, 0);
});

test('faturaGuncelle: GİB reddederse hata fırlatır', async () => {
  sahteAxios.isleyici = () => ({ status: 200, data: { error: '1', messages: [{ type: '4', text: 'Silinmiş belgeler düzenlenemez!' }] } });
  await assert.rejects(faturaGuncelle('tok', { ettn: ETTN, belgeNumarasi: 'GIB2026000000010' }, taslak()), GibApiError);
});
