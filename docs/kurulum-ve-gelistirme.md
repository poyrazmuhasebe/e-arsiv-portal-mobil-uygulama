# Kurulum ve Geliştirme

## Kurulum

```bash
npm install
npx expo start
```

Expo Go ile QR kodu okutarak veya `npx expo start --web` ile tarayıcıda
çalıştırabilirsiniz.

> Bu depoda çalışan oturumda geliştirme sunucusu **her zaman kullanıcı
> tarafından** başlatılır — otomatik/arka planda bir dev server
> çalıştırılmaz.

## Test Modu

`src/services/gibApi.ts` içindeki `IS_TEST_MODE` sabiti:

- `true` → GİB'e hiç istek atılmaz; login/kullanıcı bilgisi/mükellef
  sorgusu/taslak listesi/fatura kaydet/SMS fonksiyonları sahte (mock)
  verilerle çalışır. Arayüz geliştirmesi için kullanılır (GİB'in test
  portalı kararsız davranabildiğinden UI geliştirmesini ondan bağımsız
  tutmak için eklendi).
- `false` → Gerçek/canlı `earsivportal.efatura.gov.tr` adresine gerçek
  istekler atılır.

**Canlıya geçmeden önce bu bayrağın `false` olduğundan emin olun** — bu
kural proje boyunca sabit tutuldu, bir daha `true` yapılmayacak.

## Geliştirme iş akışı — bu projeye özgü kurallar

1. **Hiçbir GİB komut/alan adı tahmin edilerek yazılmaz.** Yeni bir
   `dispatch` cmd'i veya `jp` şeması eklenecekse, gerçek bir DevTools
   Network yakalamasıyla doğrulanmalı. Açık kaynak referanslar (ör.
   `f/fatura`) yalnızca **ikincil, teyide muhtaç** bir kaynak olarak
   kullanılabilir — bkz. [gib-entegrasyonu.md](gib-entegrasyonu.md)'deki
   "Yaygın hata tuzağı" bölümü, tahminin nasıl yanlış giden bir cmd'e
   (`EARSIV_PORTAL_FATURA_KAYDET`) yol açtığının gerçek örneği.
2. Her `gibApi.ts` fonksiyonunun üstüne, doğrulanma durumu açıkça
   yazılır: `DOĞRULANMADI` veya `canlı yanıtla doğrulandı` (bkz.
   [gib-api-durumu.md](gib-api-durumu.md)).
3. `README.md`, bu `docs/` klasörü ve GitHub Issues, kod her değiştiğinde
   senkron tutulur.
4. TypeScript hataları `npx tsc --noEmit` ile her değişiklikten sonra
   kontrol edilir.

## Yayına hazırlık (henüz yapılmadı)

- [ ] `app.json` üzerinden gerçek uygulama ikonu/isim/versiyon ayarları
- [ ] EAS Build ile iOS/Android native paket üretimi ve mağaza yayın
      hazırlığı

Bkz. [Issue #17](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/17).
