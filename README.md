# e-Arşiv Portal Mobil Uygulama

Mali müşavirlerin mükelleflerinin GİB e-Arşiv Portal üzerinden kendi hesaplarıyla e-Arşiv faturası kesebilmesi için geliştirilen React Native (Expo) mobil uygulaması.

## ⚠️ Önemli Uyarılar

- **Bu uygulama GİB'in resmi bir ürünü değildir.** Portalın resmî/yayınlanmış bir REST API'si yoktur; uygulama, portalın kendi web arayüzünün kullandığı iç servislere doğrudan istek atar ve GİB bunları haber vermeden değiştirebilir.
- **GİB tarafı sunucusuzdur:** GİB kullanıcı kodu, şifre, oturum bilgisi, VKN/TCKN, unvan, fatura içerikleri ile alıcı ve mal/hizmet defterleri yalnızca cihaz ile GİB arasında kalır. Bunların hiçbiri Cloudflare'e ya da başka bir üçüncü tarafa **gitmez**. GİB şifresi cihazda da saklanmaz.
- **Uygulama hesabı tarafı sunucusuz DEĞİLDİR.** Uygulamayı kullanmak için bir hesap gerekir; e-posta, uygulama kullanıcı adı ve şifre **Cloudflare'e gönderilir**. Şifre orada geri döndürülemez biçimde özetlenir ve veritabanında **yalnızca özeti saklanır**. Her istekte IP adresi gibi bağlantı bilgileri Cloudflare'e ulaşır. Cloudflare yeni bir üçüncü taraftır ve veri **yurt dışında** (Avrupa Birliği) durur. Ayrıntı: [docs/hesap-sistemi.md](docs/hesap-sistemi.md), [docs/hukuk/](docs/hukuk/).
- **Canlı bir e-Arşiv faturası kesmek/imzalamak gerçek, geri alınması zor bir mali işlemdir.** Doğrulanmamış uçları (bkz. [docs/gib-api-durumu.md](docs/gib-api-durumu.md)) üretime almadan önce mutlaka küçük/kontrollü bir gerçek denemeyle doğrulayın.

## Özellikler

- **Uygulama hesabı:** e-posta + uygulama kullanıcı adı + şifre ile kayıt, e-posta doğrulama (6 haneli kod), şifremi unuttum; hesap oturumu ile GİB oturumu ayrı ayrı kapatılabilir
- GİB e-Arşiv Portal kullanıcı kodu/şifresiyle giriş; GİB şifresi cihazda hiçbir koşulda saklanmaz
- Fatura kesim formu: VKN/TCKN'den otomatik alıcı bilgisi (kontrol basamağı doğrulamalı), irsaliye, çok kalemli mal/hizmet, iskonto, KDV ve KDV tevkifatı (52 kod), seçilen para biriminin simgesiyle anlık toplamlar
- Hesaba özel **Alıcı Defteri** ve **Kayıtlı Mal/Hizmet** defteri (yalnızca cihazda, şifreli)
- Taslak/kesilen faturalar: tarih aralığıyla sorgulama, görüntüleme, PDF indirme/paylaşma, taslak silme, **SMS ile GİB İmza**, iptal talebi oluşturma
- Gelen iptal/itiraz taleplerini listeleme, kabul/ret
- Kullanıcı bilgilerini görüntüleme/güncelleme
- Uygulama kilidi (cihazın biyometrik/PIN kilidiyle), giriş ekranında GİB duyuru kutusu, bilinen GİB/ağ hatalarının anlaşılır Türkçe karşılıkları

Ayrıntılar: [docs/ozellikler.md](docs/ozellikler.md). Henüz olmayanlar (GENEL İADE için iade edilen fatura girişi, KDV tevkifatı dışındaki vergi türleri, taslak düzenleme, itiraz talebi, "Adıma Düzenlenen Belgeler"): [docs/bilinen-sinirlamalar.md](docs/bilinen-sinirlamalar.md).

## Kurulum

Gereksinimler: Node.js (LTS), Expo SDK 57 ile uyumlu Expo Go yüklü bir telefon.

```bash
npm install
npx expo start
```

Expo Go ile QR kodu okutarak çalıştırabilirsiniz. `npx expo start --web` ile tarayıcıda da açılır, ancak güvenli depolama, uygulama kilidi, fatura görüntüleyici (WebView) ve PDF kaydetme gibi cihaz özellikleri web'de sınırlıdır; gerçek deneme telefonda yapılmalıdır.

Uygulama açılışta hesap sunucusuna bağlanır. Adres `.env.example`'de; yerel geliştirme için bu dosyayı `.env.local` adıyla kopyalayıp değeri değiştirin (git'e girmez).

## Hesap sunucusu (`worker/`)

Uygulama hesabı sistemi ayrı bir Cloudflare Worker'ında:
`https://earsivfatura.poyrazmuhasebe.com`

```bash
cd worker
npm install
npm test
```

Yerel çalıştırma, sırlar ve dağıtım adımları:
[docs/kurulum-ve-gelistirme.md](docs/kurulum-ve-gelistirme.md#hesap-sunucusu-cloudflare-worker--d1).
Tasarım ve kararlar: [docs/hesap-sistemi.md](docs/hesap-sistemi.md).

## Test ve tip kontrolü

```bash
npm test
npx tsc --noEmit
```

Testler GİB'e ve hesap sunucusuna hiçbir istek atmaz — hem `axios` hem `globalThis.fetch` sahtelenmiştir (bkz. [docs/kurulum-ve-gelistirme.md](docs/kurulum-ve-gelistirme.md#testler)). Worker'ın kendi testleri `worker/` içinde, gerçek `workerd` çalışma zamanında ve gerçek yerel D1'e karşı çalışır.

## Android APK derleme (EAS)

```bash
npx eas-cli build -p android --profile preview
```

`preview` profili dahili dağıtım için APK üretir (`eas.json`). Derleme çıktıları `builds/` klasöründe tutulur ve git'e eklenmez.

## Dokümantasyon

Özellikler, mimari, GİB entegrasyonunun iç işleyişi, hesaplama mantığı,
güvenlik yaklaşımı ve bilinen sınırlamalar gibi tüm detaylar
**[docs/](docs/README.md)** klasöründe. Açık hata/geliştirme takibi için
[GitHub Issues](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues).

## Lisans / Kullanım

Kaynak kod [MIT lisansı](LICENSE) ile lisanslanmıştır. Bu proje kişisel/profesyonel kullanım için geliştirilmiştir. GİB'in kullanım şartlarına ve ilgili mevzuata uygunluk kullanıcının sorumluluğundadır.
