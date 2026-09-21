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
  yedekle,
  yedeklenecekMi,
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
  assert.equal(noktaliTarih(yedekBaslangici('1h', bugun)), '14.09.2026');
  assert.equal(noktaliTarih(yedekBaslangici('1a', bugun)), '21.08.2026');
  assert.equal(noktaliTarih(yedekBaslangici('3a', bugun)), '21.06.2026');
  assert.equal(noktaliTarih(yedekBaslangici('6a', bugun)), '21.03.2026');
  assert.equal(noktaliTarih(yedekBaslangici('1y', bugun)), '21.09.2025');
});

test('yedekBaslangici: ay sonu taşmaz (31 Mart − 1 ay = 28 Şubat)', () => {
  assert.equal(noktaliTarih(yedekBaslangici('1a', gun(31, 3))), '28.02.2026');
  assert.equal(noktaliTarih(yedekBaslangici('1a', gun(15, 1))), '15.12.2025');
});

test('haftalikParcalar: kullanıcının örneği (son 1 ay, bugün 21.09.2026)', () => {
  const bugun = gun(21, 9);
  const parcalar = haftalikParcalar(yedekBaslangici('1a', bugun), bugun);
  assert.deepEqual(parcalar.map(aralik), [
    '14.09.2026-21.09.2026',
    '06.09.2026-13.09.2026',
    '29.08.2026-05.09.2026',
    '21.08.2026-28.08.2026',
  ]);
});

test('haftalikParcalar: hiçbir parça 7 günü aşmaz, boşluk ve örtüşme yok', () => {
  const bugun = gun(21, 9);
  const bas = yedekBaslangici('1y', bugun);
  const parcalar = haftalikParcalar(bas, bugun);
  const GUN = 86400000;
  for (const p of parcalar) {
    assert.ok(Math.round((p.bitis.getTime() - p.baslangic.getTime()) / GUN) <= 7);
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
  assert.deepEqual(haftalikParcalar(yedekBaslangici('1h', bugun), bugun).map(aralik), ['14.09.2026-21.09.2026']);
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
  const parcalar = haftalikParcalar(gun(6, 9), gun(21, 9));
  const { ortam, yazilanlar, sorgular } = sahteOrtam([
    [fatura('A1', '20-09-2026'), fatura('A2', '15-09-2026', 'Onaylanmadı')],
    [fatura('B1', '10-09-2026')],
  ]);
  const ilerlemeler: YedekIlerleme[] = [];
  const sonuc = await yedekle(parcalar, ortam, SECENEK, (d) => ilerlemeler.push(d));

  assert.deepEqual(sorgular, ['14.09.2026-21.09.2026', '06.09.2026-13.09.2026']);
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
