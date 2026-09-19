// GİB'in döndürdüğü bilinen hata metinlerini ve ağ hatalarını kullanıcıya
// anlaşılır Türkçe açıklamalara çeviren TEK yer. gibApi.ts, GibApiError
// oluştururken bu fonksiyonları kullanır; böylece hangi ekran hatayı
// gösterirse göstersin aynı açıklamayı görür.
//
// KURAL: Buradaki her kalıp bu projede GERÇEKTEN gözlenmiş bir GİB metnidir
// (bkz. docs/gib-entegrasyonu.md). Görülmemiş metin tahmin edilerek
// eklenmez. Bilinmeyen metinler olduğu gibi gösterilir. Çevrilen mesajlarda
// GİB'in orijinal metni de parantez içinde korunur (destek/araştırma için).

const GIB_METNI_MAX_UZUNLUK = 160;

interface BilinenGibHatasi {
  /** Mesajın (Türkçe küçük harfe çevrilmiş hâlinde) aranacak parça. */
  parca: string;
  aciklama: string;
}

const BILINEN_GIB_HATALARI: readonly BilinenGibHatasi[] = [
  {
    // Bu projede geçersiz/tanınmayan bir komut ya da eksik alanlı istek için
    // defalarca görüldü; hesap yetkisiyle ilgisi olmayabilir.
    parca: 'bu işlem için yetkiniz yok',
    aciklama:
      'GİB bu isteği reddetti. Bu mesaj çoğunlukla uygulamanın gönderdiği isteğin GİB tarafından tanınmadığını gösterir; hesabınızın yetkisiyle ilgili olmayabilir. Sorun sürerse işlemi GİB portalından yapın ve durumu bildirin.',
  },
  {
    // Ör. "Genel Sistem Hatası: java.lang.NullPointerException"
    parca: 'genel sistem hatası',
    aciklama:
      'GİB tarafında beklenmeyen bir sistem hatası oluştu. Bir süre sonra tekrar deneyin; sürerse işlemi GİB portalından yapın.',
  },
  {
    parca: 'silinmiş belgeler düzenlenemez',
    aciklama: 'Bu belge GİB\'de silinmiş; silinmiş belgeler üzerinde işlem yapılamaz. Listeyi yenileyip belgenin durumunu kontrol edin.',
  },
  {
    parca: 'sisteme giriş için eksik bilgi',
    aciklama: 'Giriş bilgileri eksik gönderildi. Kullanıcı kodunu ve şifreyi girip tekrar deneyin.',
  },
];

function kisalt(metin: string): string {
  const tek = metin.replace(/\s+/g, ' ').trim();
  return tek.length > GIB_METNI_MAX_UZUNLUK ? `${tek.slice(0, GIB_METNI_MAX_UZUNLUK - 1)}…` : tek;
}

/**
 * GİB'in ham hata metni biliniyorsa anlaşılır açıklama + orijinal metin;
 * bilinmiyorsa ham metnin kendisi (değiştirilmeden).
 */
export function gibMesajiniAnlasilirYap(hamMesaj: string): string {
  const kucuk = hamMesaj.toLocaleLowerCase('tr-TR');
  const bilinen = BILINEN_GIB_HATALARI.find((h) => kucuk.includes(h.parca));
  if (!bilinen) return hamMesaj;
  return `${bilinen.aciklama}\n\n(GİB mesajı: "${kisalt(hamMesaj)}")`;
}

export const ZAMAN_ASIMI_MESAJI =
  'GİB portalı zamanında yanıt vermedi. İstek GİB\'e ulaşmış olabilir: fatura oluşturma, silme, imzalama ya da iptal gibi bir işlem yapıyorsanız, tekrar denemeden önce "Taslak / Kesilen Faturalar" listesinden sonucunu kontrol edin (aksi halde işlem iki kez yapılabilir).';

export const BAGLANTI_YOK_MESAJI =
  'GİB portalına ulaşılamadı. İnternet bağlantınızı (mobil veri / Wi-Fi) kontrol edin; bağlantınız varsa GİB portalı geçici olarak erişilemiyor olabilir.';

/**
 * Axios'un yanıt alınamayan hatalarını (zaman aşımı, bağlantı yok) açıklamaya
 * çevirir; ağ hatası değilse null. Axios zaman aşımını varsayılan olarak
 * 'ECONNABORTED', `transitional.clarifyTimeoutError` açıkken 'ETIMEDOUT' koduyla
 * bildirir.
 */
export function agHatasiMesaji(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as { code?: unknown; isAxiosError?: unknown; response?: unknown };
  if (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT') return ZAMAN_ASIMI_MESAJI;
  if (e.isAxiosError && !e.response) return BAGLANTI_YOK_MESAJI;
  return null;
}
