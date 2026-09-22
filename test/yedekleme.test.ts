import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { TaslakFatura } from '../src/types/gib';
import {
  ARDISIK_HATA_SINIRI,
  belgeTarihiSiralanabilir,
  detaydakiMukellef,
  guvenliAd,
  haftalikParcalar,
  mukellefKlasorAdi,
  mukellefKlasoruMu,
  noktaliTarih,
  oturumdakiMukellef,
  yedekBaslangici,
  yedekDosyaAdi,
  gibBelgeNoCoz,
  siralanabilirTarihiGoster,
  yedekAramayaUyarMi,
  yedekBilgisi,
  yedekDiziniCoz,
  yedekDiziniYazilacak,
  yedekDosyaAdiniCoz,
  yedekFiltreSecenekleri,
  yedekFiltresiBosMu,
  yedekFiltreyeUyarMi,
  yedekle,
  yedeklenecekMi,
  yedekleriSirala,
  type TarihParcasi,
  type YedekIlerleme,
  type YedekOrtami,
} from '../src/utils/yedekleme';
import { GibApiError } from '../src/services/gibApi';

const gun = (g: number, a: number, y = 2026) => new Date(y, a - 1, g);
const aralik = (p: TarihParcasi) => `${noktaliTarih(p.baslangic)}-${noktaliTarih(p.bitis)}`;

// ---------------------------------------------------------------------------
// Dönem ve haftalık parçalar
// ---------------------------------------------------------------------------

test('yedekBaslangici: hafta ve takvim ayları', () => {
  const bugun = gun(21, 9);
  assert.equal(noktaliTarih(yedekBaslangici('1h', bugun)), '15.09.2026'); // bugün dahil 7 gün
  assert.equal(noktaliTarih(yedekBaslangici('1a', bugun)), '21.08.2026');
  assert.equal(noktaliTarih(yedekBaslangici('3a', bugun)), '21.06.2026');
  assert.equal(noktaliTarih(yedekBaslangici('6a', bugun)), '21.03.2026');
  assert.equal(noktaliTarih(yedekBaslangici('1y', bugun)), '21.09.2025');
});

test('yedekBaslangici: ay sonu taşmaz (31 Mart − 1 ay = 28 Şubat)', () => {
  assert.equal(noktaliTarih(yedekBaslangici('1a', gun(31, 3))), '28.02.2026');
  assert.equal(noktaliTarih(yedekBaslangici('1a', gun(15, 1))), '15.12.2025');
});

test('haftalikParcalar: son 1 ay, bugün 21.09.2026 — her parça uçlar dahil 7 gün', () => {
  const bugun = gun(21, 9);
  const parcalar = haftalikParcalar(yedekBaslangici('1a', bugun), bugun);
  assert.deepEqual(parcalar.map(aralik), [
    '15.09.2026-21.09.2026',
    '08.09.2026-14.09.2026',
    '01.09.2026-07.09.2026',
    '25.08.2026-31.08.2026',
    '21.08.2026-24.08.2026',
  ]);
});

test('haftalikParcalar: hiçbir parça 7 günü aşmaz, boşluk ve örtüşme yok', () => {
  const bugun = gun(21, 9);
  const bas = yedekBaslangici('1y', bugun);
  const parcalar = haftalikParcalar(bas, bugun);
  const GUN = 86400000;
  for (const p of parcalar) {
    assert.ok(Math.round((p.bitis.getTime() - p.baslangic.getTime()) / GUN) <= 6); // uçlar dahil ≤ 7 gün
    assert.ok(p.baslangic <= p.bitis);
  }
  for (let i = 1; i < parcalar.length; i++) {
    assert.equal(Math.round((parcalar[i - 1].baslangic.getTime() - parcalar[i].bitis.getTime()) / GUN), 1);
  }
  assert.equal(noktaliTarih(parcalar[0].bitis), '21.09.2026');
  assert.equal(noktaliTarih(parcalar[parcalar.length - 1].baslangic), noktaliTarih(bas));
});

test('haftalikParcalar: son 1 hafta tek sorgu', () => {
  const bugun = gun(21, 9);
  assert.deepEqual(haftalikParcalar(yedekBaslangici('1h', bugun), bugun).map(aralik), ['15.09.2026-21.09.2026']);
});

// ---------------------------------------------------------------------------
// Adlar
// ---------------------------------------------------------------------------

test('belgeTarihiSiralanabilir: GİB "GG-AA-YYYY" → "YYYY-AA-GG"', () => {
  assert.equal(belgeTarihiSiralanabilir('15-09-2026'), '2026-09-15');
  assert.equal(belgeTarihiSiralanabilir('15/09/2026'), '2026-09-15');
  assert.equal(belgeTarihiSiralanabilir('2026-09-15'), undefined);
  assert.equal(belgeTarihiSiralanabilir(undefined), undefined);
});

test('guvenliAd: dosya adında yasak karakterler temizlenir', () => {
  assert.equal(guvenliAd('A/B\\C:D*E?"F"<G>|H'), 'A B C D E F G H');
  const kontrol = `ABC${String.fromCharCode(0)}${String.fromCharCode(31)}LTD`;
  assert.equal(guvenliAd(kontrol), 'ABC LTD');
  assert.equal(guvenliAd('x'.repeat(100), 10), 'x'.repeat(10));
});

test('yedekDosyaAdi: onaylı eksiz, diğerleri durum ekli', () => {
  const temel: TaslakFatura = { ettn: 'e1', belgeNumarasi: 'GIB2026000000012', belgeTarihi: '15-09-2026' };
  assert.equal(yedekDosyaAdi({ ...temel, onayDurumu: 'Onaylandı' }), '2026-09-15_GIB2026000000012.pdf');
  assert.equal(yedekDosyaAdi({ ...temel, onayDurumu: 'Onaylanmadı' }), '2026-09-15_GIB2026000000012_ONAYSIZ.pdf');
  assert.equal(yedekDosyaAdi({ ...temel, onayDurumu: 'Silinmiş' }), '2026-09-15_GIB2026000000012_SILINMIS.pdf');
  assert.equal(yedekDosyaAdi({ ettn: 'ettn-9', onayDurumu: 'Onaylandı' }), 'tarihsiz_ettn-9.pdf');
});

test('yedeklenecekMi: varsayılan yalnızca onaylı', () => {
  assert.equal(yedeklenecekMi({ ettn: 'a', onayDurumu: 'Onaylandı' }, false), true);
  assert.equal(yedeklenecekMi({ ettn: 'a', onayDurumu: 'Onaylanmadı' }, false), false);
  assert.equal(yedeklenecekMi({ ettn: 'a', onayDurumu: 'Silinmiş' }, false), false);
  assert.equal(yedeklenecekMi({ ettn: 'a', onayDurumu: 'Silinmiş' }, true), true);
});

test('mukellef klasörü: VKN önekiyle bulunur, unvan değişse de', () => {
  assert.equal(mukellefKlasorAdi('1234567890', 'ABC Ltd. Şti.'), '1234567890 - ABC Ltd. Şti.');
  assert.equal(mukellefKlasorAdi('1234567890'), '1234567890');
  assert.equal(mukellefKlasoruMu('1234567890 - Eski Unvan', '1234567890'), true);
  assert.equal(mukellefKlasoruMu('1234567890', '1234567890'), true);
  assert.equal(mukellefKlasoruMu('12345678901 - Başka', '1234567890'), false);
});

// ---------------------------------------------------------------------------
// Döngü
// ---------------------------------------------------------------------------

function fatura(no: string, tarih: string, onayDurumu = 'Onaylandı'): TaslakFatura {
  return { ettn: `ettn-${no}`, belgeNumarasi: no, belgeTarihi: tarih, onayDurumu };
}

function sahteOrtam(listeler: TaslakFatura[][], ek: Partial<YedekOrtami> = {}) {
  const yazilanlar = new Map<string, string>();
  const sorgular: string[] = [];
  let sira = 0;
  const ortam: YedekOrtami = {
    listele: async (p) => {
      sorgular.push(aralik(p));
      return listeler[sira++] ?? [];
    },
    pdfUret: async (item) => `pdf:${item.belgeNumarasi}`,
    varMi: (ad) => yazilanlar.has(ad),
    yaz: (ad, b64) => void yazilanlar.set(ad, b64),
    durduruldu: () => false,
    bekle: async () => undefined,
    ...ek,
  };
  return { ortam, yazilanlar, sorgular };
}

const SECENEK = { taslaklarDahil: false, durduranHataMi: () => false };

test('yedekle: parçaları sırayla sorgular, her faturayı ayrı dosyaya yazar', async () => {
  const parcalar = haftalikParcalar(gun(8, 9), gun(21, 9)); // iki tam hafta
  const { ortam, yazilanlar, sorgular } = sahteOrtam([
    [fatura('A1', '20-09-2026'), fatura('A2', '15-09-2026', 'Onaylanmadı')],
    [fatura('B1', '10-09-2026')],
  ]);
  const ilerlemeler: YedekIlerleme[] = [];
  const sonuc = await yedekle(parcalar, ortam, SECENEK, (d) => ilerlemeler.push(d));

  assert.deepEqual(sorgular, ['15.09.2026-21.09.2026', '08.09.2026-14.09.2026']);
  assert.deepEqual([...yazilanlar.keys()], ['2026-09-20_A1.pdf', '2026-09-10_B1.pdf']);
  assert.equal(yazilanlar.get('2026-09-20_A1.pdf'), 'pdf:A1');
  assert.deepEqual(
    { k: sonuc.kaydedilen, a: sonuc.atlanan, h: sonuc.hatali, d: sonuc.durduruldu },
    { k: 2, a: 0, h: 0, d: false },
  );
  // Kutudaki tarih her parçada güncellenir.
  assert.deepEqual([...new Set(ilerlemeler.map((d) => aralik(d.parca)))], sorgular);
});

test('yedekle: taslaklarDahil açıkken onaysızlar da yazılır', async () => {
  const { ortam, yazilanlar } = sahteOrtam([[fatura('A2', '15-09-2026', 'Onaylanmadı')]]);
  await yedekle(haftalikParcalar(gun(14, 9), gun(21, 9)), ortam, { ...SECENEK, taslaklarDahil: true }, () => {});
  assert.deepEqual([...yazilanlar.keys()], ['2026-09-15_A2_ONAYSIZ.pdf']);
});

test('yedekle: zaten yedekli dosya yeniden indirilmez', async () => {
  let pdfSayisi = 0;
  const { ortam, yazilanlar } = sahteOrtam([[fatura('A1', '20-09-2026')]], {
    pdfUret: async () => {
      pdfSayisi += 1;
      return 'x';
    },
  });
  yazilanlar.set('2026-09-20_A1.pdf', 'eski');
  const sonuc = await yedekle(haftalikParcalar(gun(14, 9), gun(21, 9)), ortam, SECENEK, () => {});
  assert.equal(pdfSayisi, 0);
  assert.equal(sonuc.atlanan, 1);
  assert.equal(yazilanlar.get('2026-09-20_A1.pdf'), 'eski');
});

test('yedekle: tek faturanın hatası durdurmaz, listelenir', async () => {
  const { ortam, yazilanlar } = sahteOrtam([[fatura('A1', '20-09-2026'), fatura('A2', '19-09-2026')]], {
    pdfUret: async (item) => {
      if (item.belgeNumarasi === 'A1') throw new Error('HTML alınamadı');
      return 'ok';
    },
  });
  const sonuc = await yedekle(haftalikParcalar(gun(14, 9), gun(21, 9)), ortam, SECENEK, () => {});
  assert.equal(sonuc.hatali, 1);
  assert.deepEqual(sonuc.hatalar, [{ belge: 'A1', mesaj: 'HTML alınamadı' }]);
  assert.deepEqual([...yazilanlar.keys()], ['2026-09-19_A2.pdf']);
});

test('yedekle: art arda hatalarda durur (GİB kesintisi)', async () => {
  const faturalar = Array.from({ length: 10 }, (_, i) => fatura(`F${i}`, '20-09-2026'));
  let deneme = 0;
  const { ortam } = sahteOrtam([faturalar], {
    pdfUret: async () => {
      deneme += 1;
      throw new Error('GİB portalı şu an hizmet vermiyor');
    },
  });
  await assert.rejects(
    yedekle(haftalikParcalar(gun(14, 9), gun(21, 9)), ortam, SECENEK, () => {}),
    /hizmet vermiyor/,
  );
  assert.equal(deneme, ARDISIK_HATA_SINIRI);
});

test('yedekle: oturum hatası hemen durdurur', async () => {
  let deneme = 0;
  const { ortam } = sahteOrtam([[fatura('A1', '20-09-2026'), fatura('A2', '19-09-2026')]], {
    pdfUret: async () => {
      deneme += 1;
      throw new GibApiError('Oturum sonlandı', undefined, true);
    },
  });
  const secenek = {
    taslaklarDahil: false,
    durduranHataMi: (e: unknown) => e instanceof GibApiError && e.oturumHatasi,
  };
  await assert.rejects(yedekle(haftalikParcalar(gun(14, 9), gun(21, 9)), ortam, secenek, () => {}), GibApiError);
  assert.equal(deneme, 1);
});

test('yedekle: Durdur sonraki faturada keser', async () => {
  let durdur = false;
  const yazilan: string[] = [];
  const { ortam, sorgular } = sahteOrtam(
    [[fatura('A1', '20-09-2026'), fatura('A2', '19-09-2026')], [fatura('B1', '10-09-2026')]],
    {
      durduruldu: () => durdur,
      yaz: (ad) => {
        yazilan.push(ad);
        durdur = true;
      },
    },
  );
  const sonuc = await yedekle(haftalikParcalar(gun(6, 9), gun(21, 9)), ortam, SECENEK, () => {});
  assert.equal(sonuc.durduruldu, true);
  assert.deepEqual(yazilan, ['2026-09-20_A1.pdf']);
  assert.equal(sorgular.length, 1);
});

test('yedekle: iki parçada gelen aynı belge bir kez işlenir', async () => {
  let pdfSayisi = 0;
  const ayni = fatura('A1', '14-09-2026');
  const { ortam } = sahteOrtam([[ayni], [ayni]], {
    pdfUret: async () => {
      pdfSayisi += 1;
      return 'x';
    },
    varMi: () => false,
  });
  await yedekle(haftalikParcalar(gun(6, 9), gun(21, 9)), ortam, SECENEK, () => {});
  assert.equal(pdfSayisi, 1);
});

// ---------------------------------------------------------------------------
// Mükellef (yedek klasörü) — birden fazla GİB kodu
// ---------------------------------------------------------------------------

test('oturumdakiMukellef: yalnızca geçerli VKN/TCKN; kullanıcı kodu kabul edilmez', () => {
  assert.deepEqual(oturumdakiMukellef({ vknTckn: '1234567890', unvan: 'ABC Ltd.' }), {
    vkn: '1234567890',
    unvan: 'ABC Ltd.',
  });
  assert.deepEqual(oturumdakiMukellef({ vknTckn: '12345678901' }), { vkn: '12345678901', unvan: undefined });
  assert.equal(oturumdakiMukellef({ vknTckn: '34567890' }), null); // 8 haneli kullanıcı kodu
  assert.equal(oturumdakiMukellef({ vknTckn: 'abc1234567' }), null);
  assert.equal(oturumdakiMukellef({ unvan: 'ABC' }), null);
  assert.equal(oturumdakiMukellef(null), null);
});

test('detaydakiMukellef: unvan yoksa ad soyad, o da yoksa oturumdaki unvan', () => {
  assert.deepEqual(detaydakiMukellef({ vknTckn: '1234567890', unvan: 'ABC A.Ş.' }), {
    vkn: '1234567890',
    unvan: 'ABC A.Ş.',
  });
  assert.deepEqual(detaydakiMukellef({ vknTckn: '12345678901', unvan: '', ad: 'Ali', soyad: 'Veli' }), {
    vkn: '12345678901',
    unvan: 'Ali Veli',
  });
  assert.deepEqual(detaydakiMukellef({ vknTckn: '1234567890' }, 'Yedek Unvan'), {
    vkn: '1234567890',
    unvan: 'Yedek Unvan',
  });
  assert.equal(detaydakiMukellef({ vknTckn: '' }), null);
});

test('iki farklı mükellefin klasörleri karışmaz', () => {
  const a = mukellefKlasorAdi('1234567890', 'A Ltd.');
  const b = mukellefKlasorAdi('9876543210', 'B Ltd.');
  assert.equal(mukellefKlasoruMu(a, '1234567890'), true);
  assert.equal(mukellefKlasoruMu(b, '1234567890'), false);
  assert.equal(mukellefKlasoruMu(a, '9876543210'), false);
});

// ---------------------------------------------------------------------------
// Yedek bilgileri, sıralama, filtre, arama
// ---------------------------------------------------------------------------

test('yedekBilgisi: alıcı, tarih ve iptal/itiraz durumu', () => {
  const b = yedekBilgisi({
    ettn: 'e1',
    belgeNumarasi: 'GIB1',
    belgeTarihi: '15-09-2026',
    aliciUnvanAdSoyad: ' ABC Ltd. ',
    aliciVknTckn: '1234567890',
    onayDurumu: 'Onaylandı',
    iptalItiraz: '0',
    talepDurum: '1',
  });
  assert.deepEqual(b, {
    belgeNo: 'GIB1',
    belgeTarihi: '2026-09-15',
    aliciUnvan: 'ABC Ltd.',
    aliciVknTckn: '1234567890',
    onayDurumu: 'Onaylandı',
    talepDurumu: 'İptal Kabul Edildi',
  });
  assert.equal(yedekBilgisi({ ettn: 'e2', talepDurum: '2' }).talepDurumu, 'İptal Reddedildi');
  assert.equal(yedekBilgisi({ ettn: 'e3', talepDurum: '-99' }).talepDurumu, undefined);
});

test('yedek bilgi dosyası: yaz → oku aynı; bozuk içerik boş', () => {
  const dizin = { 'a.pdf': { belgeNo: 'A', aliciUnvan: 'X', talepDurumu: 'İptal Aşamasında' } };
  assert.deepEqual(yedekDiziniCoz(yedekDiziniYazilacak(dizin)), {
    'a.pdf': {
      belgeNo: 'A',
      belgeTarihi: undefined,
      aliciUnvan: 'X',
      aliciVknTckn: undefined,
      onayDurumu: undefined,
      talepDurumu: 'İptal Aşamasında',
    },
  });
  assert.deepEqual(yedekDiziniCoz('{bozuk'), {});
  assert.deepEqual(yedekDiziniCoz(JSON.stringify({ v: 2, dosyalar: {} })), {});
  assert.deepEqual(yedekDiziniCoz(null), {});
});

test('yedekDosyaAdiniCoz ve tarih gösterimi', () => {
  assert.deepEqual(yedekDosyaAdiniCoz('2026-09-15_GIB1_SILINMIS.pdf'), {
    tarih: '2026-09-15',
    belgeNo: 'GIB1',
    durum: 'SILINMIS',
  });
  assert.deepEqual(yedekDosyaAdiniCoz('2026-09-15_GIB2.pdf'), { tarih: '2026-09-15', belgeNo: 'GIB2', durum: null });
  assert.deepEqual(yedekDosyaAdiniCoz('baska.pdf'), { belgeNo: 'baska.pdf', durum: null });
  assert.equal(siralanabilirTarihiGoster('2026-09-15'), '15.09.2026');
  assert.equal(siralanabilirTarihiGoster(undefined), undefined);
});

const YEDEKLER = [
  { ad: '2026-09-10_GIB10.pdf', bilgi: { aliciUnvan: 'Zeytin A.Ş.', aliciVknTckn: '2222222222' } },
  { ad: '2026-09-15_GIB2.pdf', bilgi: { aliciUnvan: 'Çiçek Ltd.', aliciVknTckn: '1111111111' } },
  { ad: '2026-09-12_GIB3.pdf' },
  { ad: '2026-09-15_GIB1.pdf', bilgi: { aliciUnvan: 'ahmet yılmaz', aliciVknTckn: '12345678901' } },
];
const adlar = (l: { ad: string }[]) => l.map((x) => x.ad);

test('yedekleriSirala: tarih, belge no (sayısal), unvan (Türkçe, bilinmeyen sonda)', () => {
  assert.deepEqual(adlar(yedekleriSirala(YEDEKLER, 'tarihYeni')), [
    '2026-09-15_GIB2.pdf',
    '2026-09-15_GIB1.pdf',
    '2026-09-12_GIB3.pdf',
    '2026-09-10_GIB10.pdf',
  ]);
  assert.deepEqual(adlar(yedekleriSirala(YEDEKLER, 'tarihEski'))[0], '2026-09-10_GIB10.pdf');
  // GİB biçimine uymayan kısa numaralar: kendi aralarında yeniden eskiye.
  assert.deepEqual(adlar(yedekleriSirala(YEDEKLER, 'belgeNo')), [
    '2026-09-10_GIB10.pdf',
    '2026-09-12_GIB3.pdf',
    '2026-09-15_GIB2.pdf',
    '2026-09-15_GIB1.pdf',
  ]);
  assert.deepEqual(adlar(yedekleriSirala(YEDEKLER, 'unvan')), [
    '2026-09-15_GIB1.pdf', // ahmet
    '2026-09-15_GIB2.pdf', // Çiçek
    '2026-09-10_GIB10.pdf', // Zeytin
    '2026-09-12_GIB3.pdf', // bilinmiyor → sonda
  ]);
  assert.equal(YEDEKLER[0].ad, '2026-09-10_GIB10.pdf'); // özgün dizi değişmez
});

test('yedek filtresi: unvan, VKN/TCKN, tarih aralığı (dahil)', () => {
  const s = (f: Parameters<typeof yedekFiltreyeUyarMi>[1]) => adlar(YEDEKLER.filter((y) => yedekFiltreyeUyarMi(y, f)));
  assert.equal(yedekFiltresiBosMu({}), true);
  assert.deepEqual(s({}), adlar(YEDEKLER));
  assert.deepEqual(s({ aliciUnvan: 'Çiçek Ltd.' }), ['2026-09-15_GIB2.pdf']);
  assert.deepEqual(s({ aliciVknTckn: '2222222222' }), ['2026-09-10_GIB10.pdf']);
  assert.deepEqual(s({ baslangic: '2026-09-12', bitis: '2026-09-15' }), [
    '2026-09-15_GIB2.pdf',
    '2026-09-12_GIB3.pdf',
    '2026-09-15_GIB1.pdf',
  ]);
  assert.deepEqual(s({ bitis: '2026-09-11' }), ['2026-09-10_GIB10.pdf']);
  assert.deepEqual(yedekFiltreSecenekleri(YEDEKLER), {
    unvanlar: ['ahmet yılmaz', 'Çiçek Ltd.', 'Zeytin A.Ş.'],
    vknler: ['1111111111', '12345678901', '2222222222'],
  });
});

test('yedek araması: belge no, GG.AA.YYYY tarih, unvan, VKN/TCKN', () => {
  const a = (q: string) => adlar(YEDEKLER.filter((y) => yedekAramayaUyarMi(y, q)));
  assert.deepEqual(a('gib10'), ['2026-09-10_GIB10.pdf']); // "GIB" Türkçe küçük harfte "gıb" olur
  assert.deepEqual(a('GIB10'), ['2026-09-10_GIB10.pdf']);
  assert.deepEqual(a('12.09.2026'), ['2026-09-12_GIB3.pdf']);
  assert.deepEqual(a('ÇİÇEK'), ['2026-09-15_GIB2.pdf']);
  assert.deepEqual(a('1111'), ['2026-09-15_GIB2.pdf']);
  assert.deepEqual(a('  '), adlar(YEDEKLER));
});

test('yedekle: bilgiKaydet hem yeni yazılan hem zaten yedekli fatura için çağrılır', async () => {
  const kayitlar: string[] = [];
  const { ortam, yazilanlar } = sahteOrtam([[fatura('A1', '20-09-2026'), fatura('A2', '19-09-2026')]], {
    bilgiKaydet: (ad) => void kayitlar.push(ad),
  });
  yazilanlar.set('2026-09-19_A2.pdf', 'eski');
  await yedekle(haftalikParcalar(gun(14, 9), gun(21, 9)), ortam, SECENEK, () => {});
  assert.deepEqual(kayitlar, ['2026-09-20_A1.pdf', '2026-09-19_A2.pdf']);
});

test('belge no sıralaması: GIB + yıl + 9 haneli sıra, yeniden eskiye; biçimsizler sonda', () => {
  assert.deepEqual(gibBelgeNoCoz('GIB2026000000012'), { yil: 2026, sira: 12 });
  assert.equal(gibBelgeNoCoz('GIB202600000012'), null); // 8 haneli sıra
  assert.equal(gibBelgeNoCoz('ABC2026000000012'), null);
  const liste = [
    { ad: '2025-12-30_GIB2025000000950.pdf' },
    { ad: '2026-01-02_GIB2026000000001.pdf' },
    { ad: 'tarihsiz_ettn-1.pdf' },
    { ad: '2026-09-20_GIB2026000000012.pdf' },
    { ad: '2026-09-01_GIB2026000000009.pdf' },
  ];
  assert.deepEqual(adlar(yedekleriSirala(liste, 'belgeNo')), [
    '2026-09-20_GIB2026000000012.pdf',
    '2026-09-01_GIB2026000000009.pdf',
    '2026-01-02_GIB2026000000001.pdf',
    '2025-12-30_GIB2025000000950.pdf', // önceki yıl, sırası büyük olsa da sonra
    'tarihsiz_ettn-1.pdf',
  ]);
});

test('belge no sıralaması eskiden yeniye: biçimsizler yine sonda', () => {
  const liste = [
    { ad: 'tarihsiz_ettn-1.pdf' },
    { ad: '2026-09-20_GIB2026000000012.pdf' },
    { ad: '2025-12-30_GIB2025000000950.pdf' },
    { ad: '2026-01-02_GIB2026000000001.pdf' },
  ];
  assert.deepEqual(adlar(yedekleriSirala(liste, 'belgeNoEski')), [
    '2025-12-30_GIB2025000000950.pdf',
    '2026-01-02_GIB2026000000001.pdf',
    '2026-09-20_GIB2026000000012.pdf',
    'tarihsiz_ettn-1.pdf',
  ]);
});

test('haftalikParcalar: parçalar ay sınırını geçmez; her parça ay içinde en fazla 7 gün', () => {
  assert.deepEqual(haftalikParcalar(gun(21, 8), gun(3, 9)).map(aralik), [
    '01.09.2026-03.09.2026',
    '25.08.2026-31.08.2026',
    '21.08.2026-24.08.2026',
  ]);
  // Son 1 hafta, bugün 03.09: iki sorgu (ay geçişi).
  assert.deepEqual(haftalikParcalar(yedekBaslangici('1h', gun(3, 9)), gun(3, 9)).map(aralik), [
    '01.09.2026-03.09.2026',
    '28.08.2026-31.08.2026',
  ]);
});
