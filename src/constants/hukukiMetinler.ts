// Kayıt ekranından açılan uygulama içi hukuki metinler.
//
// ⚠️ TASLAKTIR — HUKUKİ İNCELEME GEREKİR. Tam sürümleri docs/hukuk/ altında.
// Herkese açık URL'ler (gizlilik politikası, hesap silme) yayına hazır olunca
// bu ekranlar o adreslere bağlanacak; o zamana kadar metin uygulama içinde
// gösteriliyor. Köşeli parantezli alanlar veri sorumlusu bilgileri hazır
// olunca doldurulacak (Issue #36).

export type HukukiMetinAnahtari = 'aydinlatma' | 'gizlilik' | 'sartlar';

export interface HukukiMetin {
  baslik: string;
  bolumler: { baslik: string; govde: string }[];
}

const TASLAK_UYARISI =
  'Bu metin TASLAKTIR ve hukuki inceleme beklemektedir. Yayın öncesi bir hukuk danışmanı tarafından onaylanacaktır.';

const VERI_SORUMLUSU =
  'Veri sorumlusu: [doldurulacak — unvan, adres, VKN]\nİletişim: [doldurulacak — e-posta]';

export const HUKUKI_METINLER: Record<HukukiMetinAnahtari, HukukiMetin> = {
  aydinlatma: {
    baslik: 'Aydınlatma Metni',
    bolumler: [
      { baslik: 'Taslak uyarısı', govde: TASLAK_UYARISI },
      { baslik: 'Veri sorumlusu', govde: VERI_SORUMLUSU },
      {
        baslik: 'İki ayrı veri akışı var',
        govde:
          'GİB tarafı: GİB kullanıcı kodunuz, GİB şifreniz, oturum bilginiz, unvan ve vergi kimlik bilgileriniz, faturalarınız, alıcı defteriniz ve mal/hizmet defteriniz YALNIZCA telefonunuz ile GİB arasında gidip gelir. Bunların hiçbiri bize ya da başka bir üçüncü tarafa aktarılmaz. GİB şifreniz telefonda da saklanmaz.\n\nUygulama hesabı tarafı: bu metnin konusu budur. Hesabınıza ilişkin veriler Cloudflare, Inc. altyapısında işlenir.',
      },
      {
        baslik: 'İşlenen kişisel veriler',
        govde:
          '• E-posta adresi — kimlik, giriş, doğrulama, şifre sıfırlama\n• Uygulama kullanıcı adı — hesabınızı tanımlamak\n• Uygulama şifresi — HİÇBİR YERDE açık hâliyle saklanmaz; güvenli bağlantıyla gönderilir, sunucuda geri döndürülemez biçimde özetlenir (scrypt) ve yalnızca bu özet saklanır\n• Oturum bilgisi — telefonunuzda; sunucuda yalnızca geri döndürülemez özeti\n• IP adresi ve bağlantı bilgileri — bağlantı kurulurken Cloudflare altyapısına ulaşır',
      },
      {
        baslik: 'Hukuki sebep',
        govde:
          '6698 sayılı Kanun m.5/2-(c) (sözleşmenin kurulması ve ifası) ve m.5/2-(f) (meşru menfaat — hesap güvenliği). Bu sebeplere dayanıldığı için ayrıca açık rıza alınmamaktadır.\n\nKVKK Kurulu\'nun 18.02.2026 tarihli 2026/347 sayılı İlke Kararı uyarınca bu bir AYDINLATMA metnidir; onayınız istenmez.',
      },
      {
        baslik: 'Yurt dışına aktarım',
        govde:
          'Uygulama hesabı verileriniz Cloudflare, Inc. altyapısında, Cloudflare\'in AVRUPA BİRLİĞİ yetki alanındaki veri merkezlerinde saklanır. Türkiye\'de barındırma seçeneği bulunmamaktadır. Bu, Kanun\'un 9. maddesi anlamında bir yurt dışına aktarımdır.\n\nGİB\'e ilişkin hiçbir veri aktarılmaz.\n\n[Aktarımın hukuki dayanağı hukuk danışmanı tarafından doldurulacaktır.]',
      },
      {
        baslik: 'Saklama ve haklarınız',
        govde:
          'Hesap verileriniz hesabınız var olduğu sürece saklanır. Hesabınızı sildiğinizde kullanıcı kaydınız, oturumlarınız ve tek kullanımlık kodlarınız veritabanından silinir. Telefonunuzdaki GİB verileri bundan etkilenmez.\n\nKanun m.11 kapsamındaki haklarınız (bilgi talep etme, düzeltme, silme, itiraz, zararın giderilmesi) için yukarıdaki iletişim adresine başvurabilirsiniz.',
      },
    ],
  },

  gizlilik: {
    baslik: 'Gizlilik Politikası',
    bolumler: [
      { baslik: 'Taslak uyarısı', govde: TASLAK_UYARISI },
      {
        baslik: 'Kısaca',
        govde:
          '• Vergi verileriniz bize hiç ulaşmaz. GİB kullanıcı kodunuz, GİB şifreniz, faturalarınız ve defterleriniz yalnızca telefonunuzda ve GİB\'in sunucularındadır.\n• Sunucumuzda yalnızca uygulama hesabınız durur: e-posta adresiniz, uygulama kullanıcı adınız ve şifrenizin geri döndürülemez özeti.\n• GİB şifrenizi hiçbir yerde saklamayız — telefonda bile.\n• Reklam yok, izleme yok, analitik yok. Uygulamada hiçbir reklam ağı, analitik SDK\'sı ya da çökme raporlama servisi yoktur.\n• Verinizi satmayız, kiralamayız, pazarlama amacıyla paylaşmayız.',
      },
      {
        baslik: 'Üçüncü taraflar',
        govde:
          '• Gelir İdaresi Başkanlığı — faturalarınızı kesmek için; GİB bilgileriniz DOĞRUDAN telefonunuzdan gider, biz aracı olmayız.\n• Cloudflare, Inc. — uygulama hesabı altyapısı (sunucu, veritabanı, e-posta gönderimi). E-posta adresiniz, kullanıcı adınız, şifre özetiniz ve bağlantı bilgileriniz buraya ulaşır.\n\nBunların dışında hiçbir üçüncü tarafa veri aktarılmaz.',
      },
      {
        baslik: 'Kayıtlar (loglar)',
        govde:
          'Sunucumuzda istek üstverisi kaydı KAPATILMIŞTIR. Hiçbir koşulda kayıtlara yazılmayanlar: şifreler, oturum bilgileri, istek içerikleri, e-posta adresleri ve kullanıcı adları. Hatalar yalnızca sabit bir hata koduyla kaydedilir.',
      },
      {
        baslik: 'Güvenlik',
        govde:
          '• Sunucuyla tüm haberleşme HTTPS üzerindendir.\n• Şifreler scrypt ile geri döndürülemez biçimde özetlenir.\n• Telefondaki hassas veriler cihazın şifreli güvenli deposunda, yalnızca cihaz kilidi açıkken erişilebilir olacak şekilde tutulur.\n• İsteğe bağlı uygulama kilidi ile uygulama cihazınızın biyometrik doğrulaması veya PIN\'i ile korunabilir.\n• Giriş ve şifre sıfırlama uçlarında otomatik saldırılara karşı istek sınırlaması vardır.\n\nHiçbir sistem tamamen güvenli değildir; mutlak güvenlik taahhüdü verilemez.',
      },
      {
        baslik: 'Hesabınızı silme',
        govde:
          'Hesabınızı iki şekilde silebilirsiniz:\n\n1. Uygulama içinden: Menü → Hesabımı Sil\n2. Herkese açık sayfadan: https://earsivfatura.poyrazmuhasebe.com/hesap-sil\n\nSilme ile kullanıcı kaydınız, oturumlarınız ve tek kullanımlık kodlarınız veritabanından kaldırılır — dondurma değil, silmedir.\n\nTelefonunuzdaki alıcı ve mal/hizmet defterleri bundan ETKİLENMEZ; bunlar sunucuda zaten yoktur. Uygulamayı kaldırmak Android\'de bu verileri siler.',
      },
    ],
  },

  sartlar: {
    baslik: 'Hizmet Şartları',
    bolumler: [
      { baslik: 'Taslak uyarısı', govde: TASLAK_UYARISI },
      {
        baslik: 'Uygulamanın niteliği',
        govde:
          'Bu uygulama Gelir İdaresi Başkanlığı\'nın resmî bir ürünü DEĞİLDİR ve GİB ile hiçbir bağlantısı, ortaklığı veya onayı yoktur.\n\nGİB e-Arşiv Portalının yayımlanmış resmî bir REST API\'si yoktur; uygulama portalın kendi web arayüzünün kullandığı iç servislere doğrudan istek atar. GİB bu servisleri haber vermeden değiştirebilir ve bu, uygulamanın çalışmasını durdurabilir.',
      },
      {
        baslik: 'Mali sorumluluk',
        govde:
          'Canlı bir e-Arşiv faturası kesmek ve imzalamak gerçek, geri alınması zor bir mali işlemdir.\n\nKestiğiniz her faturanın içeriğinden, doğruluğundan ve mevzuata uygunluğundan yalnızca siz sorumlusunuz. Uygulama hiçbir mali, vergisel veya hukuki danışmanlık vermez. İlk kullanımda küçük ve kontrollü bir denemeyle başlamanız önerilir.',
      },
      {
        baslik: 'Hesabınız',
        govde:
          'Uygulama hesabı şifreniz ile GİB şifreniz FARKLI olmalıdır. Uygulama, kullanıcı adı alanına GİB kullanıcı kodunuzu yazmanızı engeller; aynı ayrımı şifreniz için de yapmanızı öneririz.\n\nHesabınızın güvenliğinden ve hesabınız üzerinden yapılan işlemlerden siz sorumlusunuz.',
      },
      {
        baslik: 'Telefonunuzdaki veriler',
        govde:
          'Alıcı defteriniz ve kayıtlı mal/hizmet adlarınız YALNIZCA telefonunuzda tutulur. Sunucuda bir kopyaları yoktur; yedeklenmez ve cihazlar arasında eşitlenmez.\n\nUygulamayı kaldırmanız, cihaz verilerini silmeniz veya cihazınızı kaybetmeniz hâlinde bu veriler geri getirilemez.',
      },
      {
        baslik: 'Hizmetin sürekliliği',
        govde:
          'Hizmet "olduğu gibi" sunulur; kesintisiz veya hatasız çalışacağı taahhüt edilmez. GİB\'in sunucularındaki kesintiler ve arayüz değişiklikleri denetimimiz dışındadır.\n\nTelefonunuzda geçerli bir oturum varsa, hesap sunucusu erişilemez olsa bile GİB işlemlerinize devam edebilirsiniz.',
      },
      {
        baslik: 'Sorumluluk ve uygulanacak hukuk',
        govde: '[Hukuk danışmanı tarafından doldurulacaktır.]',
      },
    ],
  },
};
