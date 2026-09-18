# e-Arşiv Portal Mobil Uygulama

Mali müşavirlerin mükelleflerinin GİB e-Arşiv Portal üzerinden kendi hesaplarıyla e-Arşiv faturası kesebilmesi için geliştirilen, sunucusuz (backend gerektirmeyen) React Native (Expo) mobil uygulaması.

## ⚠️ Önemli Uyarılar

- **Bu uygulama GİB'in resmi bir ürünü değildir.** Portalın resmî/yayınlanmış bir REST API'si yoktur; uygulama, portalın kendi web arayüzünün kullandığı iç servislere doğrudan istek atar ve GİB bunları haber vermeden değiştirebilir.
- Kullanıcı kodu ve şifre yalnızca cihazdan doğrudan GİB sunucularına gönderilir, hiçbir üçüncü taraf sunucuya gitmez.
- **Canlı bir e-Arşiv faturası kesmek/imzalamak gerçek, geri alınması zor bir mali işlemdir.** Doğrulanmamış uçları (bkz. [docs/gib-api-durumu.md](docs/gib-api-durumu.md)) üretime almadan önce mutlaka küçük/kontrollü bir gerçek denemeyle doğrulayın.

## Kurulum

```bash
npm install
npx expo start
```

Expo Go ile QR kodu okutarak veya `npx expo start --web` ile tarayıcıda çalıştırabilirsiniz.

## Dokümantasyon

Özellikler, mimari, GİB entegrasyonunun iç işleyişi, hesaplama mantığı,
güvenlik yaklaşımı ve bilinen sınırlamalar gibi tüm detaylar
**[docs/](docs/README.md)** klasöründe. Açık hata/geliştirme takibi için
[GitHub Issues](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues).

## Lisans / Kullanım

Bu proje kişisel/profesyonel kullanım için geliştirilmiştir. GİB'in kullanım şartlarına ve ilgili mevzuata uygunluk kullanıcının sorumluluğundadır.
