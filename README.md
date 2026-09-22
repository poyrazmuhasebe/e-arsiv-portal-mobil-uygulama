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
- Hesaba özel **Alıcı Defteri** ve **Mal/Hizmet Defteri** (yalnızca cihazda, şifreli; ekleme, düzenleme, silme)
- Taslak/kesilen faturalar: tarih aralığıyla sorgulama, görüntüleme, PDF indirme/paylaşma, taslak silme, **SMS ile GİB İmza**, iptal talebi oluşturma
- Gelen iptal/itiraz taleplerini listeleme, kabul/ret
- "Adıma Düzenlenen Belgeler" listesi; tüm sorgularda GİB'in 7 günlük tarih sınırı
- **Faturaları cihazda yedekleme:** seçilen dönemdeki faturaları PDF olarak telefondaki bir klasöre indirme (mükellef başına alt klasör), yedekleri görüntüleme/paylaşma
- Kullanıcı bilgilerini görüntüleme/güncelleme
- Uygulama kilidi (cihazın biyometrik/PIN kilidiyle), giriş ekranında GİB duyuru kutusu, bilinen GİB/ağ hatalarının anlaşılır Türkçe karşılıkları
- Koyu, tutarlı arayüz: ortak tasarım sistemi ([docs/tasarim-sistemi.md](docs/tasarim-sistemi.md))

Ayrıntılar: [docs/ozellikler.md](docs/ozellikler.md). Henüz olmayanlar (GENEL İADE için iade edilen fatura girişi, KDV tevkifatı dışındaki vergi türleri, taslak düzenleme, itiraz talebi, "Adıma Düzenlenen Belgeler"nde talep oluşturma): [docs/bilinen-sinirlamalar.md](docs/bilinen-sinirlamalar.md).

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

### Yerel APK derleme (EAS kuyruğu olmadan, Windows)

```bash
npm run apk:yerel
```

`scripts/yerel-apk.mjs`: `android/` yoksa `expo prebuild` ile üretir (`--temiz` ile baştan), `assembleRelease` çalıştırır ve APK'yı `builds/…-yerel.apk` olarak kopyalar. Sunucu adresi EAS `preview` profiliyle aynı olsun diye `eas.json`'dan okunur.

- **Araçlar** kullanıcı klasörüne taşınabilir kurulumdur (sistem ayarı değiştirmez): `%LOCALAPPDATA%\Android\jdk17` (Microsoft OpenJDK 17) ve `%LOCALAPPDATA%\Android\Sdk` (platform 36, build-tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1). Başka yerdeyse `JAVA_HOME` / `ANDROID_HOME` kullanılır.
- **Sürüm (beta kuralı):** her `apk:yerel` derlemesi `app.json` → `android.versionCode`'u bir artırır ve sürüm adını `<taban>-beta.<versionCode>` yapar (ör. `1.0.1-beta.3`); derleme başarısız olursa `app.json` geri alınır. Taban sürümü değiştirmek için `expo.version`'u elle düzenleyin; `--kararli` ile `-beta` eki konmaz. `app.json` değişikliğini commit'leyin.
- **Zorunlu güncelleme:** APK dağıtıldıktan sonra `npm run surum:yayinla` (isteğe bağlı `-- --adres https://…/x.apk`) sürümü hesap sunucusunun D1'indeki `uygulama_surumleri` tablosuna yazar; bundan eski kurulumlar açılışta kapatılamayan "Güncelleme gerekli" kutusunu görür. `npm run apk:yerel -- --yayinla` ikisini birden yapar. Yayın anında eski sürümdeki herkes kilitlenir — önce yeni APK'yı kurun. Geri çekmek için satırı silin (bkz. `scripts/surum-yayinla.mjs`). İlk kullanımdan önce bir kez: `cd worker && npx wrangler d1 migrations apply earsiv-hesap --remote` ve Worker deploy.
- **İmza:** EAS APK'larının üzerine güncelleme olarak kurulabilmesi için EAS'teki keystore kullanılır: `npx eas-cli credentials -p android` → preview → Keystore → *Download existing keystore*; bilgiler proje kökündeki `yerel-imza.properties` dosyasına yazılır (git'e girmez; `*.jks` de girmez). Şifreler Gradle'a ortam değişkeniyle geçer, dosyalara yazılmaz. Yalnızca deneme için `npm run apk:yerel -- --hata-ayiklama-imzasi` (bu APK EAS sürümünün üzerine kurulmaz).

## Dokümantasyon

Özellikler, mimari, GİB entegrasyonunun iç işleyişi, hesaplama mantığı,
güvenlik yaklaşımı ve bilinen sınırlamalar gibi tüm detaylar
**[docs/](docs/README.md)** klasöründe. Açık hata/geliştirme takibi için
[GitHub Issues](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues).

## Lisans / Kullanım

Kaynak kod [MIT lisansı](LICENSE) ile lisanslanmıştır. Bu proje kişisel/profesyonel kullanım için geliştirilmiştir. GİB'in kullanım şartlarına ve ilgili mevzuata uygunluk kullanıcının sorumluluğundadır.
