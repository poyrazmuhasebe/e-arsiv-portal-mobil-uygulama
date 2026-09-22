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
- [x] Beta APK'ları yerel derlemeyle (`npm run apk:yerel`, `1.0.1-beta.N`)

## Hesap sunucusu (Cloudflare Worker + D1)

Uygulama hesabı sistemi ayrı bir Worker'da, aynı repodaki `worker/`
klasöründe durur (kendi `package.json` ve `tsconfig.json`'ı ile). Tasarım,
kararlar ve gerekçeler: [hesap-sistemi.md](hesap-sistemi.md).

> **Bu Worker'a GİB verisi HİÇBİR KOŞULDA gitmez.** Her uç nokta yalnızca izin
> verilen alanları kabul eder ve bilinmeyen alanı reddeder; D1 şemasında GİB'e
> ait hiçbir tablo ya da sütun yoktur. `worker/test/gibVerisi.test.ts` bunu
> her testte doğrular.

### Kurulum ve yerel çalıştırma

```bash
cd worker
```

```bash
npm install
```

Sırları verin — `.dev.vars.example` dosyasını `.dev.vars` adıyla kopyalayın ve
içindeki açıklamaları izleyin. `.dev.vars` **git'e girmez** ve
`wrangler deploy` ile Cloudflare'e **yüklenmez**.

Yerel veritabanını hazırlayın:

```bash
npx wrangler d1 migrations apply earsiv-hesap --local
```

Sunucuyu başlatın (telefondan erişilecekse `--ip 0.0.0.0` şart):

```bash
npx wrangler dev --ip 0.0.0.0 --port 8787
```

`wrangler dev` varsayılan olarak **yereldir** ve yalnızca localhost'u dinler;
`--ip 0.0.0.0` onu yerel ağa açar. Telefon ile PC aynı Wi-Fi'de olmalı ve
uygulamadaki `EXPO_PUBLIC_HESAP_API_URL` değeri
`http://<PC'nin Wi-Fi IPv4 adresi>:8787` olmalıdır (`ipconfig` ile bulunur).
Windows Güvenlik Duvarı sorduğunda yalnızca **"Özel ağ"** işaretlenir.

### Tip kontrolü ve testler

```bash
cd worker
```

```bash
npm run tip
```

```bash
npm test
```

Testler `@cloudflare/vitest-plugin` ile **gerçek `workerd` çalışma zamanında
ve gerçek (yerel) D1'e karşı** çalışır; bellek içi sahte bir veritabanı
kullanılmaz. Migration'lar her testten önce `test/kurulum.ts` tarafından
uygulanır. Testler hiçbir ağa ve hiçbir gerçek Cloudflare kaynağına
erişmez (binding'lerde `"remote": true` yoktur).

### Çalıştırılmaması gerekenler

Bu komutlar gerçek Cloudflare hesabına dokunur; **yalnızca proje sahibi**
çalıştırır: `wrangler login`, `wrangler d1 create`, `wrangler secret put`,
`wrangler deploy` ve `--remote` alan her komut.

Wrangler varsayılan olarak Cloudflare'e kullanım verisi gönderir;
`wrangler.jsonc`'de `"send_metrics": false` yazılıdır, ayrıca komutlar
`WRANGLER_SEND_METRICS=false` ile de çalıştırılabilir.

### Yayına alma — **2026-09-20'de YAPILDI**

Aşağıdaki adımların tamamı uygulandı; burada kayıt olarak duruyor.
Canlı adres: `https://earsivfatura.poyrazmuhasebe.com`

1. Cloudflare hesabı ve **Workers Paid** planı.
2. `npx wrangler login`
3. `npx wrangler d1 create earsiv-hesap --jurisdiction eu`
   — **geri alınamaz**: jurisdiction yalnızca oluşturmada seçilir, sonradan
   değiştirilemez. Bayrağın tam yazımı önce `npx wrangler d1 create --help`
   ile teyit edilmeli.
4. Çıktıdaki `database_id`'yi `worker/wrangler.jsonc`'ye yazın (sır değildir,
   commit'lenir). **Boş bırakmayın:** Wrangler 4.45+ ID'siz bir binding için
   deploy sırasında kendi veritabanını oluşturabiliyor ve bu durumda
   jurisdiction seçimi atlanır.
5. `npx wrangler secret put OTURUM_IMZA_ANAHTARI` (ve istenirse `PEPPER`).
6. Alan adı Cloudflare'e bağlandıktan sonra `wrangler.jsonc`'ye
   `"send_email": [{ "name": "EMAIL" }]` eklenir ve `POSTA_GONDEREN`
   doldurulur. **Cloudflare Email Sending şu an beta** ve Workers Paid
   gerektiriyor; gerçek bir gönderimle henüz denenmedi
   ([Issue #28](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/28)).
7. `npx wrangler d1 migrations apply earsiv-hesap --remote`
8. `npx wrangler deploy`
9. İlk deploy'dan sonra Workers Logs'ta hangi alanların kaydedildiği kontrol
   edilir. Yapılandırmada istek üstverisi kaydı kapalıdır
   (`observability.logs.invocation_logs: false`).

### Acil durum: bir hesabı elle doğrulama

E-posta gönderimi arızalanırsa kullanıcı uygulamaya giremez (doğrulama
zorunlu). Geçici çözüm:

```bash
npx wrangler d1 execute earsiv-hesap --remote --command "UPDATE kullanicilar SET eposta_dogrulandi = 1 WHERE eposta = 'ADRES'"
```
