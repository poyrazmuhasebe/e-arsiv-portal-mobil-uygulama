# e-Arşiv Portal Mobil Uygulama

Mali müşavirlerin mükelleflerinin GİB e-Arşiv Portal üzerinden kendi hesaplarıyla e-Arşiv faturası kesebilmesi için geliştirilen, sunucusuz (backend gerektirmeyen) React Native (Expo) mobil uygulaması.

## ⚠️ Önemli Uyarılar

- **Bu uygulama GİB'in resmi bir ürünü değildir.** Portalın resmî/yayınlanmış bir REST API'si yoktur; uygulama, portalın kendi web arayüzünün kullandığı iç servislere doğrudan istek atar ve GİB bunları haber vermeden değiştirebilir.
- Kullanıcı kodu ve şifre yalnızca cihazdan doğrudan GİB sunucularına gönderilir, hiçbir üçüncü taraf sunucuya gitmez.
- **Canlı bir e-Arşiv faturası kesmek/imzalamak gerçek, geri alınması zor bir mali işlemdir.** Doğrulanmamış uçları (bkz. [docs/gib-api-durumu.md](docs/gib-api-durumu.md)) üretime almadan önce mutlaka küçük/kontrollü bir gerçek denemeyle doğrulayın.

## Özellikler

- GİB e-Arşiv Portal kullanıcı kodu/şifresiyle giriş, güvenli çıkış; şifre cihazda hiçbir koşulda saklanmaz
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

## Test ve tip kontrolü

```bash
npm test
npx tsc --noEmit
```

Testler GİB'e hiçbir istek atmaz (bkz. [docs/kurulum-ve-gelistirme.md](docs/kurulum-ve-gelistirme.md#testler)).

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
