# Devam Rehberi (yeni oturum / yeni bilgisayar)

Bu dosya, projeye başka bir bilgisayarda ya da yeni bir Claude oturumunda
kaldığı yerden devam etmek için gereken her şeyi tek yerde toplar.
Son güncelleme: 2026-10-12.

## Proje özeti

- **Ne:** GİB e-Arşiv Portalı'nın mobil istemcisi (Expo SDK 57 / React Native
  0.86, TypeScript, Zustand, React Native Paper). Android'de aktif kullanılıyor.
- **Uygulama hesabı sunucusu:** Cloudflare Worker + D1 (`worker/`), canlı adres
  `https://earsivfatura.poyrazmuhasebe.com`, D1 veritabanı `earsiv-hesap`
  (AB yetki alanı). GİB verisi bu sunucuya HİÇ gitmez.
- **Repo:** `https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama`
  (gizli, `poyrazmuhasebe` kişisel hesabı, dal: `master`).
- **Yayındaki sürüm:** `1.0.1-beta.7` (versionCode 7) — sunucudaki
  `uygulama_surumleri` tablosunda kayıtlı; daha eski kurulumlar kilitlenir.
- Ayrıntılar: [ozellikler.md](ozellikler.md), [mimari.md](mimari.md),
  [gib-entegrasyonu.md](gib-entegrasyonu.md), [hesap-sistemi.md](hesap-sistemi.md).

## Kurallar (her oturumda geçerli)

1. **Türkçe yaz** — kullanıcıyla iletişim, commit mesajları, kod yorumları ve
   dokümanlar Türkçe.
2. **GİB'e canlı istek atma.** Geliştirme sırasında GİB'e deneme/sorgu isteği
   gönderilmez. Testler axios/fetch'i sahteler (`test/sahte/kurulum.ts`).
3. **GİB alanlarını uydurma.** Yeni bir `dispatch` komutu ya da `jp` alanı
   ancak GİB'in kendi ekranından **canlı yakalanmış** bir istekle eklenir
   (yöntem: aşağıda "GİB isteği yakalama"). Açık kaynak projeler yalnızca
   teyide muhtaç ikincil kaynaktır.
4. **`IS_TEST_MODE` her zaman `false`** kalır (`src/services/gibApi.ts`).
5. **Loglara şifre/token/kişisel veri yazılmaz.** Uygulamada tanı logları
   yalnızca `__DEV__` altında; Worker'da yalnızca sabit hata kodları.
6. **Sunucuları kendiliğinden başlatma / deploy etme** — kullanıcı açıkça
   istemedikçe `wrangler dev`, `wrangler deploy`, uzak migration, sürüm yayını
   yapılmaz.
7. **Doğrulamadığını "doğruladım" deme.** Cihazda/canlıda denenmeyen şey
   "denenmedi" diye raporlanır.
8. **Her değişiklikten sonra kontroller:**
   - `npm test` (uygulama, ~307 test)
   - `npx tsc --noEmit`
   - `npx expo export --platform android` (çıktı klasörünü sonra silin)
   - Worker değiştiyse: `cd worker && npx vitest run && npx tsc --noEmit -p .`
9. **Sırlar commit'lenmez:** `.jks`, `yerel-imza.properties`,
   `credentials.json`, `.env.local`, `worker/.dev.vars` git dışıdır
   (`.gitignore`). Cloudflare API token'ı HİÇBİR dosyaya yazılmaz; yalnızca
   komut çalışırken `CLOUDFLARE_API_TOKEN` ortam değişkeni olarak verilir.
10. **Dokümanlar kodla senkron tutulur** (`README.md`, `docs/`). GitHub
    Issues 2026-09-23'te topluca kapatıldı; yeni iş gelirse yeniden açılabilir.
11. Expo kodu yazmadan önce sürüme özel dokümana bakılır:
    https://docs.expo.dev/versions/v57.0.0/ (bkz. `AGENTS.md`).

## Yeni bilgisayar kurulumu (Windows)

1. **Node.js 24** ve **Git** kurun. GitHub için: `gh auth login`
   (hesap: `poyrazmuhasebe`).
2. Zip'i bir klasöre açın (ör. `E:\earsiv-app`). Zip `.git` klasörünü içerir;
   uzak depo zaten tanımlıdır (`git remote -v`).
3. Bağımlılıklar:
   ```
   npm install
   cd worker && npm install && cd ..
   ```
4. **APK derleme araçları** (yalnızca yerel APK için):
   - JDK 17 (Microsoft OpenJDK) → `%USERPROFILE%\Android\jdk17`
   - Android SDK → `%USERPROFILE%\Android\Sdk` (platform 36, build-tools
     36.0.0, NDK 27.1.12297006, CMake 3.22.1, platform-tools)
   - ⚠️ **`%LOCALAPPDATA%` altına KURMAYIN** — Claude masaüstü uygulamasının
     içinden oraya yazılan dosyalar sanallaştırılıyor ve normal terminal
     görmüyor (2026-09-22'de yaşandı). Başka yerdeyse `JAVA_HOME` /
     `ANDROID_HOME` verin.
5. Kontrol: `npm test`, `npx tsc --noEmit`.

## Özel dosyalar (zip'te var, git'te YOK)

| Dosya | Ne işe yarar |
|---|---|
| `@dursuncanmuhasebe__earsiv-app.jks` | Android imza anahtarı (EAS keystore). **Kaybolursa güncelleme APK'ları mevcut kurulumun üzerine kurulamaz.** |
| `@dursuncanmuhasebe__earsiv-app_OLD_1.jks` | Aynı keystore'un önceki indirmesi (yedek) |
| `yerel-imza.properties` | `npm run apk:yerel`'in imza ayarları (keystore yolu, şifreler, alias) |
| `credentials.json` | EAS'ten indirilen keystore bilgileri (şifreler içerir) |
| `.env.local` | Geliştirmede hesap sunucusu adresi (`EXPO_PUBLIC_HESAP_API_URL`) |
| `worker/.dev.vars` | Yerel Worker geliştirme sırları (`wrangler dev` için) |

Cloudflare API token'ı dosya olarak saklanmaz (bkz. kural 9). Gerekirse
Cloudflare panelinden yeni token oluşturun (D1 + Workers düzenleme izni).

## Rutin işler

### Expo Go ile deneme
```
npx expo start -c            # aynı Wi-Fi
npx expo start -c --tunnel   # farklı ağ
```
Expo Go'da zorunlu güncelleme kutusu çıkmaz (sürüm kodu yok).

### Beta APK derleme
```
npm run apk:yerel
```
- Her derleme `app.json` → `versionCode`'u bir artırır, sürüm adı
  `1.0.1-beta.<versionCode>` olur; derleme başarısızsa geri alınır.
- Çıktı: `builds\e-Arsiv-Portal-v<sürüm>-<commit>-yerel.apk`.
- Sonra `app.json` değişikliği commit'lenir ("Sürüm 1.0.1-beta.N …").
- `AccessDeniedException … android\app\build` hatası: `android\app\build`
  klasörünü silip yeniden derleyin (üretilen klasör, güvenli).
- Telefona kurulum: `& "$env:USERPROFILE\Android\Sdk\platform-tools\adb.exe" install -r "<apk yolu>"`

### Sürümü yayınlama (eski sürümleri kilitler)
APK telefonlara kurulduktan SONRA:
```
$env:CLOUDFLARE_API_TOKEN = "<token>" ; npm run surum:yayinla
```
- İsteğe bağlı `-- --adres https://…/x.apk` → kutuda "Güncellemeyi İndir".
- Kontrol: `https://earsivfatura.poyrazmuhasebe.com/v1/surum?platform=android`
- Geri çekme: `scripts/surum-yayinla.mjs` başındaki DELETE komutu.
- Eski sürümü açan kullanıcı: kapatılamayan "Güncelleme gerekli" kutusu;
  GİB ve Dijital VD oturumları kapanır, uygulama hesabı açık kalır.

### Worker değişikliği yayına alma
```
cd worker
npx vitest run
$env:CLOUDFLARE_API_TOKEN = "<token>"
npx wrangler d1 migrations apply earsiv-hesap --remote   # yeni migration varsa
npx wrangler deploy
```

### GİB isteği yakalama (yeni özellik için)
Kural 3 gereği yeni GİB komutu canlı yakalamayla eklenir. 2026-09-23'te
(Taslak Düzenle) kullanılan yöntem:
1. Claude in Chrome uzantısıyla Claude sekme grubunda yeni sekme açılır,
   `https://earsivportal.efatura.gov.tr/intragiris.html` yüklenir.
2. **Kullanıcı kendisi giriş yapar** (şifre asistan tarafından girilmez).
3. Sayfaya yalnızca okuyan bir XHR dinleyicisi eklenir (`dispatch` isteklerinin
   gövdesini ve yanıtını bellekte tutar), kullanıcı işlemi GİB ekranında yapar.
4. `cmd`, `pageName`, `jp` ve yanıt yapısı okunur; token ve kişisel veriler
   maskelenir. GİB'de kalıcı değişiklik yapan düğmelere (Kaydet, Sil, İmza)
   kullanıcı basar.

## Yapılanlar (özet zaman çizelgesi)

- Temel GİB akışları: giriş, fatura kesme, taslak listesi, görüntüleme/PDF,
  SMS ile imza, silme, iptal/itiraz talepleri, kullanıcı bilgileri, alıcı ve
  mal/hizmet defterleri, uygulama kilidi (ayrıntı: `TODO.md` → Tamamlanan).
- 2026-09-20: Uygulama hesabı sistemi (Kayıt/Giriş, e-posta doğrulama,
  şifre sıfırlama, hesap silme) + Cloudflare Worker/D1 canlıya alındı.
- 2026-09-21/22: Dijital VD (e-Arşiv Faturalarım, PDF/Toplu PDF, Kaydedilen
  PDF'ler), mükellef bazlı klasörler, geliştirici satırı.
- 2026-09-22: "Şimdilik atla" kaldırıldı (hesap zorunlu); yerel APK derleme
  (`apk:yerel`); beta sürüm numarası; zorunlu güncelleme
  (`GET /v1/surum`, `uygulama_surumleri`, `surum:yayinla`).
- 2026-09-23: Taslak **Düzenle** (FATURA_GETIR + FATURA_OLUSTUR ile yerinde
  güncelleme); `cihazda-denenecekler.md` kaldırıldı, tüm Issue'lar kapatıldı;
  beta.7 yayınlandı.

## Açık konular

- Bilinen sınırlamalar: [bilinen-sinirlamalar.md](bilinen-sinirlamalar.md)
  (desteklenmeyen 28 vergi türü, tevkifatlı taslak düzenleme yok, GENEL İADE
  `iadeTable` formu yok vb.).
- `SECURITY-AUDIT.md` (2026-09-22 güvenlik denetimi raporu) ve
  `scripts/canli-aktarici.mjs` (web önizlemeyi canlı hesap sunucusuna bağlayan
  yerel aktarıcı) başka bir oturumda üretildi, henüz commit'lenmedi.
- Bu oturumda kullanılan Cloudflare API token'ı sohbete düz metin yazıldı;
  iptal edilip yenisi oluşturulmalı.
- Depoya yalnızca okuma yetkisiyle kişi eklemek için depo bir GitHub
  organizasyonuna taşınmalı (kişisel depoda "read" yetkisi yok).
