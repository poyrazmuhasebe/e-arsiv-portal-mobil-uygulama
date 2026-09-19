// Giriş ekranında gösterilen GİB duyuruları (ör. planlı bakım). Uygulamanın
// kendi sunucusu olmadığı için duyurular uzaktan çekilmez; buraya elle eklenir
// ve uygulama güncellemesiyle dağıtılır. `bitis` geçince duyuru kendiliğinden
// gösterilmez (bayat bir duyuru ekranda kalmasın diye). Metinler GİB'in
// yayımladığı duyurudan birebir alınır; yalnızca PDF'teki satır kırılımları
// mobil ekrana göre birleştirilir.

export interface Duyuru {
  /** Kalıcı, benzersiz kimlik — kullanıcı kapatınca bu kimlikle hatırlanır. */
  id: string;
  baslik: string;
  /** Duyurunun yayım tarihi (gösterim için, GİB'in yazdığı biçimde). */
  tarih: string;
  /** Paragraflar; "- " ile başlayanlar madde olarak gösterilir. */
  paragraflar: string[];
  /** Duyurunun resmî kaynağı (GİB). */
  baglanti?: string;
  /** ISO 8601 (saat dilimiyle). Bu andan sonra duyuru gösterilmez. */
  bitis: string;
}

export const GIB_DUYURULARI: readonly Duyuru[] = [
  {
    id: 'gib-planli-bakim-2026-09-19',
    baslik: 'ELEKTRONİK BELGE SİSTEMLERİNDE YAPILACAK PLANLI BAKIM ÇALIŞMASI HAKKINDA DUYURU',
    tarih: '18/9/2026',
    paragraflar: [
      'Başkanlığımız bilgi işlem sistemlerinde 19/9/2026 Cumartesi günü saat 00:01 ila 20/9/2026 Pazar günü saat 23:59 saatleri arası planlı bakım çalışması yapılacaktır. Yapılacak çalışma nedeniyle;',
      '- e-Arşiv Fatura Portal Uygulamaları (e-Arşiv Fatura, e-Serbest Meslek Makbuzu, e-Müstahsil Makbuzu),',
      '- Dijital Vergi Dairesi kullanıcı kodu ve şifresiyle giriş yapılan e-Arşiv Fatura Portalı,',
      '- e-Arşiv Raporlarının gönderildiği Başkanlığımız sistemleri,',
      '- e-Arşiv sorgulama servisleri,',
      '20/9/2026 Pazar günü saat:23:59’a kadar kapalı olacaktır.',
      'Bu süre zarfında Başkanlığımız e-Arşiv Fatura Portal Uygulamaları (e-Arşiv Fatura, e-Serbest Meslek Makbuzu, e-Müstahsil Makbuzu) ve Dijital Vergi Dairesi kullanıcı kodu ve şifresiyle giriş yapılan e-Arşiv Fatura Portalı çalışmayacağından, bu Portalları kullanan mükelleflerimizin, düzenlemeleri gereken belgeleri matbu belge olarak düzenlemeleri mümkün bulunmaktadır.',
      'Söz konusu çalışmanın planlanan süreden önce tamamlanması durumunda Başkanlığımızca ayrıca bilgi verilecektir.',
      'Duyurulur.',
    ],
    baglanti: 'https://ebelge.gib.gov.tr/dosyalar/PLANLI_BAKIM_CALISMASI_HAKKINDA_DUYURU-18.9.2026.pdf',
    // Bakımın bitişi: 20/9/2026 23:59 Türkiye saati (UTC+3).
    bitis: '2026-09-20T23:59:00+03:00',
  },
];
