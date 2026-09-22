import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DVD_RAPOR_ON_EKI,
  dvdRaporDosyaAdi,
  dvdRaporDosyaAdiniCoz,
  dvdRaporHtml,
  htmlKacis,
  paraToplamlari,
  topluDonemBaslangici,
  dvdMukellefi,
} from '../src/utils/dvdRapor';
import type { DvdEarsivFatura } from '../src/services/dvdApi';
import { haftalikParcalar, safOgeAdi } from '../src/utils/yedekleme';
import { aralikGecerliMi, gunFarki } from '../src/utils/tarihAraligi';

const FATURALAR: DvdEarsivFatura[] = [
  {
    faturaNo: 'BEA2026034020634',
    duzenlenmeTarihi: '2026-08-07 14:29:30',
    saticiUnvan: 'ÖRNEK ELEKTRİK A.Ş.',
    saticiVknTckn: '1790617537',
    toplamTutar: 826.76,
    vergilerTutari: 83.3,
    odenecekTutar: 920,
    paraBirimi: 'TRY',
    gonderimSekli: 'KAGIT',
  },
  {
    faturaNo: 'N1A2026032025504',
    duzenlenmeTarihi: '2026-08-06 23:59:00',
    saticiUnvan: 'ÖRNEK TELEKOM A.Ş.',
    saticiVknTckn: '9250353261',
    toplamTutar: 437.69,
    vergilerTutari: -279.4,
    odenecekTutar: 596,
    paraBirimi: 'TRY',
    gonderimSekli: 'ELEKTRONIK',
    tesisatNumarasi: '5432942335',
  },
  {
    faturaNo: 'USD2026000000001',
    duzenlenmeTarihi: '2026-08-05 10:00:00',
    saticiUnvan: 'YABANCI',
    toplamTutar: 10.1,
    vergilerTutari: 0,
    odenecekTutar: 10.1,
    paraBirimi: 'USD',
  },
];

test('dosya adı: oluşturma zamanı + kimlik + dönem; çözülebilir', () => {
  const ad = dvdRaporDosyaAdi({
    kimlik: '1234567890',
    baslangic: new Date(2026, 7, 22),
    bitis: new Date(2026, 8, 22),
    olusturma: new Date(2026, 8, 22, 16, 3, 9),
  });
  assert.equal(ad, 'e-Arsiv-Faturalarim_20260922-160309_1234567890_2026-08-22_2026-09-22.pdf');
  assert.ok(ad.startsWith(DVD_RAPOR_ON_EKI));
  assert.deepEqual(dvdRaporDosyaAdiniCoz(ad), {
    olusturma: '22.09.2026 16:03',
    kimlik: '1234567890',
    donem: '22.08.2026 – 22.09.2026',
  });
  assert.equal(dvdRaporDosyaAdiniCoz('baska.pdf'), null);
});

test('dosya adı: kimlikteki dosya adına uygun olmayan karakterler atılır', () => {
  const ad = dvdRaporDosyaAdi({
    kimlik: '../a b/ç',
    baslangic: new Date(2026, 7, 1),
    bitis: new Date(2026, 7, 7),
    olusturma: new Date(2026, 7, 7, 9, 0, 0),
  });
  assert.equal(ad, 'e-Arsiv-Faturalarim_20260807-090000_ab_2026-08-01_2026-08-07.pdf');
  assert.ok(!ad.includes('/'));
  assert.ok(
    dvdRaporDosyaAdi({ kimlik: '///', baslangic: new Date(), bitis: new Date(), olusturma: new Date() }).includes(
      '_mukellef_',
    ),
  );
});

test('para birimine göre toplamlar: TRY önce, kuruş yuvarlanır', () => {
  assert.deepEqual(paraToplamlari(FATURALAR), [
    { paraBirimi: 'TRY', adet: 2, toplamTutar: 1264.45, vergilerTutari: -196.1, odenecekTutar: 1516 },
    { paraBirimi: 'USD', adet: 1, toplamTutar: 10.1, vergilerTutari: 0, odenecekTutar: 10.1 },
  ]);
  assert.deepEqual(paraToplamlari([]), []);
});

test('HTML: başlık, dönem, alıcı, satırlar ve betik yok', () => {
  const html = dvdRaporHtml({
    faturalar: FATURALAR,
    alici: { adSoyad: 'AHMET YILMAZ', vkn: '1234567890' },
    baslangic: new Date(2026, 7, 1),
    bitis: new Date(2026, 7, 7),
    olusturma: new Date(2026, 8, 22, 16, 3),
  });
  assert.ok(html.includes('size: A4 landscape'));
  assert.ok(html.includes('Dönem:</b> 01.08.2026 – 07.08.2026'));
  assert.ok(html.includes('AHMET YILMAZ · VKN/TCKN: 1234567890'));
  assert.ok(html.includes('Fatura sayısı:</b> 3'));
  assert.ok(html.includes('BEA2026034020634'));
  assert.ok(html.includes('07.08.2026 14:29'));
  assert.ok(html.includes('Kâğıt'));
  assert.ok(html.includes('Elektronik'));
  assert.ok(html.includes('5432942335'));
  assert.ok(!/<script/i.test(html));
});

test('HTML: dışarıdan gelen metin kaçışlanır (kod olarak işlenmez)', () => {
  assert.equal(htmlKacis(`<a href="x">'&`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
  const html = dvdRaporHtml({
    faturalar: [{ faturaNo: 'X1', saticiUnvan: '<script>alert(1)</script><img src=x onerror=y>' }],
    baslangic: new Date(2026, 7, 1),
    bitis: new Date(2026, 7, 7),
    olusturma: new Date(2026, 7, 7),
  });
  assert.ok(!html.includes('<script>alert'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});

test('HTML: fatura yoksa bilgi yazılır; alıcı bilinmiyorsa kullanıcı kodu', () => {
  const html = dvdRaporHtml({
    faturalar: [],
    kullaniciKodu: '12345678',
    baslangic: new Date(2026, 7, 1),
    bitis: new Date(2026, 7, 7),
    olusturma: new Date(2026, 7, 7),
  });
  assert.ok(html.includes('Bu dönemde adınıza düzenlenmiş e-Arşiv faturası bulunmuyor.'));
  assert.ok(html.includes('Kullanıcı kodu: 12345678'));
  assert.ok(!html.includes('<table'));
});

test('toplu dönem: son 1 ay = önceki ayın 1i, son 2 ay = iki önceki ayın 1i', () => {
  const g = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];
  assert.deepEqual(g(topluDonemBaslangici('1a', new Date(2026, 8, 22))), [2026, 8, 1]);
  assert.deepEqual(g(topluDonemBaslangici('2a', new Date(2026, 8, 22))), [2026, 7, 1]);
  assert.deepEqual(g(topluDonemBaslangici('1a', new Date(2026, 8, 1))), [2026, 8, 1]);
  assert.deepEqual(g(topluDonemBaslangici('2a', new Date(2026, 8, 30))), [2026, 7, 1]);
  // Yıl geçişi
  assert.deepEqual(g(topluDonemBaslangici('1a', new Date(2026, 0, 15))), [2025, 12, 1]);
  assert.deepEqual(g(topluDonemBaslangici('2a', new Date(2026, 1, 3))), [2025, 12, 1]);
});

test('toplu: tek sorgu değil; parçalar ≤ 7 gün, aynı ay, boşluksuz, 01.07 – bugün', () => {
  const bugun = new Date(2026, 8, 22);
  const bas = topluDonemBaslangici('2a', bugun);
  const parcalar = haftalikParcalar(bas, bugun);
  assert.ok(parcalar.length > 1);
  for (const p of parcalar) assert.ok(aralikGecerliMi(p.baslangic, p.bitis));
  assert.equal(parcalar[0].bitis.getTime(), bugun.getTime());
  assert.equal(parcalar[parcalar.length - 1].baslangic.getTime(), new Date(2026, 6, 1).getTime());
  for (let i = 1; i < parcalar.length; i++) assert.equal(gunFarki(parcalar[i].bitis, parcalar[i - 1].baslangic), 1);
});

test('dvdMukellefi: önce geçerli VKN, sonra TCKN; kullanıcı kodu kabul edilmez', () => {
  assert.deepEqual(dvdMukellefi({ adSoyad: 'AHMET YILMAZ', vkn: '1234567890', tckn: '12345678901' }), {
    vkn: '1234567890',
    unvan: 'AHMET YILMAZ',
  });
  assert.deepEqual(dvdMukellefi({ vkn: '   ', tckn: '12345678901' }), { vkn: '12345678901', unvan: undefined });
  assert.equal(dvdMukellefi({ vkn: '', tckn: '', kullaniciKodu: '12345678' }), null);
  assert.equal(dvdMukellefi({ vkn: 'ABC' }), null);
  assert.equal(dvdMukellefi(undefined), null);
});

test('safOgeAdi: SAF adresinden görünen ad', () => {
  assert.equal(
    safOgeAdi('content://com.android.externalstorage.documents/tree/primary%3ADownload/document/primary%3ADownload%2F1234567890%20-%20AHMET'),
    '1234567890 - AHMET',
  );
  assert.equal(safOgeAdi('content://x/tree/primary%3ADownload/document/primary%3AFaturalar'), 'Faturalar');
  assert.equal(safOgeAdi('content://x/document/%E0%A4%A'), '');
});
