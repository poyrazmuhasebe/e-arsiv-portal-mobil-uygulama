// İtiraz Talebi Oluştur: form kuralları ve GÖNDERİM KİLİDİ.
// GİB'e giden istek henüz yakalanmadığı için hiçbir koşulda ağa çıkılmamalı.

import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { sahteAxios, sahteFetch, sahteleriSifirla } from './sahte/kurulum';
import {
  ITIRAZ_ACIKLAMA_EN_FAZLA,
  ITIRAZ_UYARI_METNI,
  ITIRAZ_YONTEMLERI,
  bosItirazFormu,
  itirazFormHatasi,
  itirazIstekVerisi,
  itirazTarihiBicimle,
  type ItirazFormu,
} from '../src/utils/itirazTalebi';
import { GibApiError, ITIRAZ_GONDERIMI_DOGRULANDI, itirazTalebiOlustur } from '../src/services/gibApi';

beforeEach(() => sahteleriSifirla());

const BUGUN = new Date(2026, 8, 21, 12, 0);

function gecerliForm(ek: Partial<ItirazFormu> = {}): ItirazFormu {
  return {
    belgeNumarasi: 'NOT-2026-001',
    belgeTarihi: new Date(2026, 8, 20),
    yontem: 'NOTER',
    aciklama: '',
    uyariOkundu: true,
    ...ek,
  };
}

test('GİB\'in 4 itiraz yöntemi değer ve etiketleriyle birebir', () => {
  assert.deepEqual(
    ITIRAZ_YONTEMLERI.map((y) => [y.deger, y.etiket]),
    [
      ['NOTER', 'Noter Aracılığıyla'],
      ['TAAHHUTLU_MEKTUP', 'Taahhütlü Mektup'],
      ['TELGRAF', 'Telgraf'],
      ['KEP', 'KEP'],
    ],
  );
});

test('GİB\'in uyarı metni birebir', () => {
  assert.equal(
    ITIRAZ_UYARI_METNI,
    'Düzenlemiş olduğunuz belge için itiraz talebi oluşturmak istiyorsunuz. İtiraz talebi oluşturduğunuzda bu talep geri çekilemeyecek ve alıcıya iletilecektir.',
  );
});

test('boş form gönderilemez; zorunlu alanlar sırayla istenir', () => {
  assert.match(itirazFormHatasi(bosItirazFormu(), BUGUN) ?? '', /belge numarası/);
  assert.match(itirazFormHatasi(gecerliForm({ belgeNumarasi: '   ' }), BUGUN) ?? '', /belge numarası/);
  assert.match(itirazFormHatasi(gecerliForm({ belgeTarihi: null }), BUGUN) ?? '', /belge tarihi/);
  assert.match(itirazFormHatasi(gecerliForm({ yontem: '' }), BUGUN) ?? '', /yöntem/);
  assert.match(itirazFormHatasi(gecerliForm({ uyariOkundu: false }), BUGUN) ?? '', /Uyarıyı/);
});

test('açıklama isteğe bağlı ama 255 karakteri geçemez', () => {
  assert.equal(itirazFormHatasi(gecerliForm({ aciklama: '' }), BUGUN), null);
  assert.equal(itirazFormHatasi(gecerliForm({ aciklama: 'x'.repeat(ITIRAZ_ACIKLAMA_EN_FAZLA) }), BUGUN), null);
  assert.notEqual(itirazFormHatasi(gecerliForm({ aciklama: 'x'.repeat(ITIRAZ_ACIKLAMA_EN_FAZLA + 1) }), BUGUN), null);
});

test('belge tarihi ileri bir tarih olamaz; bugün olabilir', () => {
  assert.equal(itirazFormHatasi(gecerliForm({ belgeTarihi: new Date(2026, 8, 21, 23, 59) }), BUGUN), null);
  assert.match(itirazFormHatasi(gecerliForm({ belgeTarihi: new Date(2026, 8, 22) }), BUGUN) ?? '', /ileri/);
});

test('tanınmayan yöntem reddedilir', () => {
  assert.notEqual(itirazFormHatasi(gecerliForm({ yontem: 'FAKS' as never }), BUGUN), null);
});

test('tarih GİB alanının biçiminde (GG/AA/YYYY)', () => {
  assert.equal(itirazTarihiBicimle(new Date(2026, 0, 5)), '05/01/2026');
});

test('istek verisi formdaki rel adlarını taşır (DOĞRULANMAMIŞ biçim)', () => {
  const veri = itirazIstekVerisi(
    { ettn: '00000000-0000-4000-8000-000000000002', onayDurumu: 'Onaylandı', belgeTuru: 'FATURA' },
    gecerliForm({ belgeNumarasi: '  NOT-2026-001 ', aciklama: ' not ' }),
  );
  assert.deepEqual(veri, {
    ettn: '00000000-0000-4000-8000-000000000002',
    onayDurumu: 'Onaylandı',
    belgeTuru: 'FATURA',
    referansBelgeId: 'NOT-2026-001',
    referansBelgeTarihi: '20/09/2026',
    itirazYontemi: 'NOTER',
    talepAciklama: 'not',
  });
});

test('GÖNDERİM KİLİTLİ: itirazTalebiOlustur ağa ÇIKMADAN reddeder', async () => {
  assert.equal(ITIRAZ_GONDERIMI_DOGRULANDI, false);
  await assert.rejects(
    () => itirazTalebiOlustur('sahte-token', { ettn: 'x' }),
    (hata: unknown) => hata instanceof GibApiError && /doğrulanmadığı/.test(hata.message),
  );
  // Ne GİB'e (axios) ne başka bir yere (fetch) istek gitti.
  assert.equal(sahteAxios.istekler.length, 0);
  assert.equal(sahteFetch.istekler.length, 0);
});
