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

// Kullanıcının paylaştığı kapsamlı, kod+oran eşleşmeli resmi referans
// tabloyla (601-627 kısmi tevkifat + 801-825 tam tevkifat, "1 Mart 2021
// öncesi" tarihsel oranlar hariç sadece güncel oranlar) tam olarak
// doğrulandı. Önceki sürümde 620-623 arası kodlar bir kayma içeriyordu
// (Ağaç ve Orman Ürünleri 622 sanılmıştı, gerçekte 623), bu tabloyla
// düzeltildi.
export const TEVKIFAT_KODLARI: TevkifatKodu[] = [
  { value: '601', label: '601 - Yapım İşleri ile Bu İşlerle Birlikte İfa Edilen Mühendislik-Mimarlık ve Etüt-Proje Hizmetleri', oran: 4 },
  { value: '602', label: '602 - Etüt, Plan-Proje, Danışmanlık, Denetim ve Benzeri Hizmetler', oran: 9 },
  { value: '603', label: '603 - Makine, Teçhizat, Demirbaş ve Taşıtlara Ait Tadil, Bakım ve Onarım Hizmetleri', oran: 7 },
  { value: '604', label: '604 - Yemek Servis Hizmeti', oran: 5 },
  { value: '605', label: '605 - Organizasyon Hizmeti', oran: 5 },
  { value: '606', label: '606 - İşgücü Temin Hizmetleri', oran: 9 },
  { value: '607', label: '607 - Özel Güvenlik Hizmeti', oran: 9 },
  { value: '608', label: '608 - Yapı Denetim Hizmetleri', oran: 9 },
  {
    value: '609',
    label: '609 - Fason Olarak Yaptırılan Tekstil ve Konfeksiyon İşleri, Çanta ve Ayakkabı Dikim İşleri ve Bu İşlere Aracılık Hizmetleri',
    oran: 7,
  },
  { value: '610', label: '610 - Turistik Mağazalara Verilen Müşteri Bulma / Götürme Hizmetleri', oran: 9 },
  { value: '611', label: '611 - Spor Kulüplerinin Yayın, Reklâm ve İsim Hakkı Gelirlerine Konu İşlemleri', oran: 9 },
  { value: '612', label: '612 - Temizlik Hizmeti', oran: 9 },
  { value: '613', label: '613 - Çevre ve Bahçe Bakım Hizmetleri', oran: 9 },
  { value: '614', label: '614 - Servis Taşımacılığı Hizmeti', oran: 5 },
  { value: '615', label: '615 - Her Türlü Baskı ve Basım Hizmetleri', oran: 7 },
  {
    value: '616',
    label: '616 - 5018 Sayılı Kanuna Ekli Cetvellerdeki İdare, Kurum ve Kuruluşlara Yapılan Diğer Hizmetler',
    oran: 5,
  },
  { value: '617', label: '617 - Hurda Metalden Elde Edilen Külçe Teslimleri', oran: 7 },
  { value: '618', label: '618 - Hurda Metalden Elde Edilenler Dışındaki Bakır, Çinko ve Alüminyum Külçe Teslimleri', oran: 7 },
  { value: '619', label: '619 - Bakır, Çinko ve Alüminyum Ürünlerinin Teslimi', oran: 7 },
  { value: '620', label: '620 - İstisnadan Vazgeçenlerin Hurda ve Atık Teslimi', oran: 7 },
  {
    value: '621',
    label: '621 - Metal, Plastik, Lastik, Kauçuk, Kâğıt ve Cam Hurda ve Atıklardan Elde Edilen Hammadde Teslimi',
    oran: 9,
  },
  { value: '622', label: '622 - Pamuk, Tiftik, Yün ve Yapağı ile Ham Post ve Deri Teslimleri', oran: 9 },
  { value: '623', label: '623 - Ağaç ve Orman Ürünleri Teslimi', oran: 5 },
  { value: '624', label: '624 - Yük Taşımacılığı Hizmeti', oran: 2 },
  { value: '625', label: '625 - Ticari Reklam Hizmetleri', oran: 3 },
  { value: '626', label: '626 - Diğer Teslimler', oran: 2 },
  { value: '627', label: '627 - Demir-Çelik Ürünlerinin Teslimi', oran: 5 },

  // --- Tam Tevkifat (10/10) varyantları — aynı işlemler, tam tevkifat
  // uygulanması gereken durumlarda (ör. KDV mükellefi olmayan taraf) ---
  { value: '801', label: '801 - Yapım İşleri ile Bu İşlerle Birlikte İfa Edilen Mühendislik-Mimarlık ve Etüt-Proje Hizmetleri (Tam Tevkifat)', oran: 10 },
  { value: '802', label: '802 - Etüt, Plan-Proje, Danışmanlık, Denetim ve Benzeri Hizmetler (Tam Tevkifat)', oran: 10 },
  { value: '803', label: '803 - Makine, Teçhizat, Demirbaş ve Taşıtlara Ait Tadil, Bakım ve Onarım Hizmetleri (Tam Tevkifat)', oran: 10 },
  { value: '804', label: '804 - Yemek Servis Hizmeti (Tam Tevkifat)', oran: 10 },
  { value: '805', label: '805 - Organizasyon Hizmeti (Tam Tevkifat)', oran: 10 },
  { value: '806', label: '806 - İşgücü Temin Hizmetleri (Tam Tevkifat)', oran: 10 },
  { value: '807', label: '807 - Özel Güvenlik Hizmeti (Tam Tevkifat)', oran: 10 },
  { value: '808', label: '808 - Yapı Denetim Hizmetleri (Tam Tevkifat)', oran: 10 },
  {
    value: '809',
    label: '809 - Fason Olarak Yaptırılan Tekstil ve Konfeksiyon İşleri, Çanta ve Ayakkabı Dikim İşleri ve Bu İşlere Aracılık Hizmetleri (Tam Tevkifat)',
    oran: 10,
  },
  { value: '810', label: '810 - Turistik Mağazalara Verilen Müşteri Bulma/Götürme Hizmetleri (Tam Tevkifat)', oran: 10 },
  { value: '811', label: '811 - Spor Kulüplerinin Yayın, Reklâm ve İsim Hakkı Gelirlerine Konu İşlemleri (Tam Tevkifat)', oran: 10 },
  { value: '812', label: '812 - Temizlik Hizmeti (Tam Tevkifat)', oran: 10 },
  { value: '813', label: '813 - Çevre ve Bahçe Bakım Hizmetleri (Tam Tevkifat)', oran: 10 },
  { value: '814', label: '814 - Servis Taşımacılığı Hizmeti (Tam Tevkifat)', oran: 10 },
  { value: '815', label: '815 - Her Türlü Baskı ve Basım Hizmetleri (Tam Tevkifat)', oran: 10 },
  { value: '816', label: '816 - Hurda Metalden Elde Edilen Külçe Teslimleri (Tam Tevkifat)', oran: 10 },
  {
    value: '817',
    label: '817 - Hurda Metalden Elde Edilenler Dışındaki Bakır, Çinko, Demir Çelik, Alüminyum ve Kurşun Külçe Teslimi (Tam Tevkifat)',
    oran: 10,
  },
  { value: '818', label: '818 - Bakır, Çinko, Alüminyum ve Kurşun Ürünlerinin Teslimi (Tam Tevkifat)', oran: 10 },
  { value: '819', label: '819 - İstisnadan Vazgeçenlerin Hurda ve Atık Teslimi (Tam Tevkifat)', oran: 10 },
  {
    value: '820',
    label: '820 - Metal, Plastik, Lastik, Kauçuk, Kâğıt ve Cam Hurda ve Atıklardan Elde Edilen Hammadde Teslimi (Tam Tevkifat)',
    oran: 10,
  },
  { value: '821', label: '821 - Pamuk, Tiftik, Yün ve Yapağı İle Ham Post ve Deri Teslimleri (Tam Tevkifat)', oran: 10 },
  { value: '822', label: '822 - Ağaç ve Orman Ürünleri Teslimi (Tam Tevkifat)', oran: 10 },
  { value: '823', label: '823 - Yük Taşımacılığı Hizmeti (Tam Tevkifat)', oran: 10 },
  { value: '824', label: '824 - Ticari Reklam Hizmetleri (Tam Tevkifat)', oran: 10 },
  { value: '825', label: '825 - Demir-Çelik Ürünlerinin Teslimi (Tam Tevkifat)', oran: 10 },
];
