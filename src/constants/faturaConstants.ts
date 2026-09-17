// GİB e-Arşiv "e-Arşiv Fatura (interaktif) Oluştur" ekranındaki dropdown/liste
// verileri. Bu listeler GİB'in kendi portal ekranından gözlemlenerek
// derlenmiştir; bazı alanlar (özellikle tevkifat oranları) GİB'in resmi
// tebliğlerine göre tam ve güncel olmayabilir — canlı kullanım öncesi
// muhasebe/mevzuat açısından doğrulanmalıdır.

export interface SecenekOgesi {
  value: string;
  label: string;
}

export const PARA_BIRIMLERI: SecenekOgesi[] = [
  { value: 'TRY', label: 'Türk Lirası' },
  { value: 'USD', label: 'US Dollar' },
  { value: 'EUR', label: 'Euro' },
  { value: 'GBP', label: 'Pound Sterling' },
  { value: 'CHF', label: 'İsviçre Frangı' },
  { value: 'JPY', label: 'Japon Yeni' },
  { value: 'RUB', label: 'Rus Rublesi' },
  { value: 'AED', label: 'BAE Dirhemi' },
];
export const VARSAYILAN_PARA_BIRIMI = 'TRY';

export const FATURA_TIPLERI: SecenekOgesi[] = [
  { value: 'SATIS', label: 'SATIŞ' },
  { value: 'GENELIADE', label: 'GENEL İADE' },
  { value: 'TEVKIFAT', label: 'TEVKİFAT' },
  { value: 'TEVKIFATIADE', label: 'TEVKİFAT İADE' },
  { value: 'ISTISNA', label: 'İSTİSNA' },
  { value: 'OZELMATRAH', label: 'ÖZEL MATRAH' },
  { value: 'IHRACKAYITLI', label: 'İHRAÇ KAYITLI' },
  { value: 'KONAKLAMAVERGISI', label: 'KONAKLAMA VERGİSİ' },
  { value: 'YATIRIMTESVIKSATIS', label: 'YATIRIM TEŞVİK SATIŞ' },
  { value: 'YATIRIMTESVIKISTISNA', label: 'YATIRIM TEŞVİK İSTİSNA' },
  { value: 'YATIRIMTESVIKIADE', label: 'YATIRIM TEŞVİK İADE' },
  { value: 'YATIRIMTESVIKTEVKIFAT', label: 'YATIRIM TEŞVİK TEVKİFAT' },
  { value: 'YATIRIMTESVIKTEVKIFATIADE', label: 'YATIRIM TEŞVİK TEVKİFAT İADE' },
];
export const VARSAYILAN_FATURA_TIPI = 'SATIS';

export const ULKELER: SecenekOgesi[] = [
  { value: 'Türkiye', label: 'Türkiye' },
  { value: 'Almanya', label: 'Almanya' },
  { value: 'Amerika Birleşik Devletleri', label: 'Amerika Birleşik Devletleri' },
  { value: 'İngiltere', label: 'İngiltere' },
  { value: 'Fransa', label: 'Fransa' },
  { value: 'Hollanda', label: 'Hollanda' },
  { value: 'İtalya', label: 'İtalya' },
  { value: 'İspanya', label: 'İspanya' },
  { value: 'Rusya', label: 'Rusya' },
  { value: 'Azerbaycan', label: 'Azerbaycan' },
  { value: 'Birleşik Arap Emirlikleri', label: 'Birleşik Arap Emirlikleri' },
  { value: 'Diğer', label: 'Diğer' },
];
export const VARSAYILAN_ULKE = 'Türkiye';

export const BIRIMLER: SecenekOgesi[] = [
  { value: 'C62', label: 'Adet' },
  { value: 'DAY', label: 'Gün' },
  { value: 'MON', label: 'Ay' },
  { value: 'ANN', label: 'Yıl' },
  { value: 'HUR', label: 'Saat' },
  { value: 'PK', label: 'Paket' },
  { value: 'BX', label: 'Kutu' },
  { value: 'KGM', label: 'kg' },
  { value: 'LTR', label: 'lt' },
  { value: 'TNE', label: 'ton' },
  { value: 'MTR', label: 'metre' },
  { value: 'MTK', label: 'm2' },
  { value: 'MTQ', label: 'm3' },
];
export const VARSAYILAN_BIRIM = 'C62';

export const KDV_ORANLARI: readonly number[] = [0, 1, 10, 20];

export const VERGI_TURLERI: SecenekOgesi[] = [
  { value: 'KDVTEVKIFAT', label: 'KDV TEVKİFAT' },
  { value: 'GVSTOPAJI', label: 'GV. STOPAJI' },
  { value: 'KVSTOPAJI', label: 'KV. STOPAJI' },
  { value: 'OTV1', label: 'ÖTV 1. LİSTE' },
  { value: 'OTV2', label: 'ÖTV 2. LİSTE' },
  { value: 'OTV3', label: 'ÖTV 3. LİSTE' },
  { value: 'OTV4', label: 'ÖTV 4. LİSTE' },
  { value: 'KONAKLAMAVERGISI', label: 'KONAKLAMA VERGİSİ' },
];

export interface TevkifatKodu extends SecenekOgesi {
  /**
   * GİB tevkifat oranlarını "pay/10" kesri olarak ifade eder (ör. 5 => "5/10").
   * Hesaplanan KDV Tevkifat Tutarı = KDV Tutarı * (oran / 10).
   */
  oran: number;
}

// GİB'in tam listesi 60+ kod içerir (601-...); en sık kullanılan bir alt
// küme eklendi. Gerekirse buraya yenisi eklenebilir.
export const TEVKIFAT_KODLARI: TevkifatKodu[] = [
  { value: '601', label: '601 - Yapım İşleri ile Mühendislik-Mimarlık ve Etüt-Proje Hizmetleri', oran: 3 },
  { value: '602', label: '602 - Etüt, plan-proje, danışmanlık, denetim vb.', oran: 9 },
  { value: '603', label: '603 - Makine, Teçhizat, Demirbaş ve Taşıtlara Ait Tadil, Bakım ve Onarım Hizmetleri', oran: 5 },
  { value: '604', label: '604 - Yemek servis hizmeti', oran: 5 },
  { value: '605', label: '605 - Organizasyon hizmeti', oran: 5 },
  { value: '606', label: '606 - İşgücü temin hizmetleri', oran: 9 },
  { value: '607', label: '607 - Özel güvenlik hizmeti', oran: 9 },
  { value: '608', label: '608 - Yapı denetim hizmetleri', oran: 9 },
  { value: '612', label: '612 - Temizlik Hizmeti', oran: 7 },
  { value: '614', label: '614 - Servis taşımacılığı', oran: 5 },
];
