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

## Testler

```bash
npm test
```

Ek bağımlılık gerektirmez: `test/calistir.mjs`, `test/` altındaki testleri ve
onların içe aktardığı `src/` modüllerini `tsconfig.test.json` ile geçici bir
klasöre (`node_modules/.cache/earsiv-test`, git dışı) **CommonJS** olarak derler
ve Node'un yerleşik test çalıştırıcısıyla (`node --test`) çalıştırır. Yalnızca
bazı dosyaları çalıştırmak için: `npm test -- aliciDefteri gibApi`.

- **Sahte modüller** (`test/sahte/kurulum.ts`): Node, React Native/Expo'nun
  native modüllerini çalıştıramadığı için `Module._load` kancalanıp şu paketler
  bellekte çalışan sahtelerle değiştirilir: `react-native` (yalnızca
  `Platform`), `expo-secure-store` (Map; `secureStorage.ts` sarmalayıcısının
  kendisi gerçek kodla çalışır), `axios`, `expo-file-system/legacy`,
  `expo-local-authentication`. `__DEV__` testte `false`'tur.
- **SecureStore arızaları** (`sahteDepo`): `yazmaHatasi` (her yazma reddedilir,
  ör. boyut sınırı), `okumaHatasi` / `okumaHakki` (okuma hatası, N okumadan
  sonra), `islemHakki` (uygulamanın yarıda kapanması: N yazma/silmeden sonra
  hepsi başarısız), `sayac` (okuma/yazma/silme sayıları).
- **Testler GİB'e asla istek atmaz**: `axios` tamamen sahtedir; bir testin
  yanıtını tanımlamadığı her istek hata fırlatır.
- **Node tipleri:** TypeScript 6'da `types` varsayılanı boş ve `@types/node`
  projenin doğrudan bağımlılığı değil (yalnızca `@expo/ngrok` üzerinden geçişli
  geliyor). Bu yüzden testlerde kullanılan `node:test`/`node:assert/strict`/
  `node:module` API'lerinin yalnızca kullanılan kısmı `test/node-tipleri.d.ts`'te
  tanımlı; yeni bir assert fonksiyonu kullanırsanız oraya ekleyin.
- `test/` klasörü ana `tsc --noEmit -p .` kontrolüne de dahildir; testler de
  tip kontrolünden geçer.
- Kapsam: `kimlikDogrula`, `faturaHesap`, `aliciDefteri` (hesaplar arası
  yalıtım), `malHizmetDefteri`, `bolunmusDefter` (eski biçimden taşıma — tam,
  her noktada kesilmiş, bozuk, doğrulanamayan; her kesinti noktasında yarım
  yazma tutarlılığı ve artık anahtar temizliği; okuma/yazma reddi; 50 sınırı;
  eşzamanlı yazma; değer boyutu), `dosyaTemizlik`, `uygulamaKilidi`, `gibApi` (login ve dispatch
  yanıt/hata yorumlama, oturum hatası → çıkış). Ekranlar (React bileşenleri)
  test edilmiyor; onlar cihazda Expo Go ile denenir.

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

## Derleme (EAS Build)

```bash
npx eas-cli build -p android --profile preview
```

`eas.json` profilleri:

- `preview` → dahili dağıtım, Android'de **APK** (`buildType: apk`); telefona
  doğrudan kurulabilen paket.
- `production` → mağaza paketi, `autoIncrement` açık.

Sürüm `app.json`'dan okunur (`appVersionSource: local`); yeni bir derlemeden
önce `app.json` ve `package.json` sürümü elle artırılır. Derleme çıktıları
`builds/` klasöründe tutulur, git'e eklenmez (`.gitignore`).
`blockedPermissions` ve release'de logların ayıklanması yalnızca gerçek
derlemede etkilidir, Expo Go'da değil (bkz.
[guvenlik-ve-veri.md](guvenlik-ve-veri.md)).

## Yayına hazırlık

- [x] `app.json`: uygulama adı, özel ikonlar, Android `package` / iOS
      `bundleIdentifier`, EAS `projectId`
- [x] İlk Android APK (v1.0.0, `preview` profili) — **log düzeltmesinden önce
      alındı, kullanılmamalı** (bkz. [guvenlik-ve-veri.md](guvenlik-ve-veri.md))
- [ ] Düzeltmeleri içeren yeni APK (v1.0.1) —
      [Issue #22](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/22)
- [ ] `production` (AAB) derlemesi, iOS paketi ve mağaza yayın hazırlığı —
      [Issue #17](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/17)
