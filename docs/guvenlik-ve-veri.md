# Güvenlik ve Veri — Ne Nerede Saklanıyor

## Temel ilke: sunucusuz, üçüncü taraf yok

Uygulamanın kendi backend'i yok. Her ağ isteği doğrudan
`earsivportal.efatura.gov.tr`'ye gider (bkz.
[gib-entegrasyonu.md](gib-entegrasyonu.md)). Kullanıcı kodu, şifre, VKN/TCKN,
fatura içerikleri — hiçbiri Anthropic, Expo, veya başka bir üçüncü taraf
sunucuya **gitmez**.

## Cihazda saklanan veriler (`expo-secure-store`, şifrelenmiş)

| Anahtar | İçerik | Nerede yazılır/silinir |
|---|---|---|
| `gib_token` | Oturum token'ı | `useAuthStore.login()` (yalnızca "beni hatırla" işaretliyse) → `logout()`'ta silinir |
| `gib_kullanici_kodu` | Kullanıcı kodu (şifre değil) | Aynı, token ile birlikte |
| `gib_hatirlanan_kullanici_kodu` | Login formunu önceden doldurmak için kullanıcı kodu | `LoginScreen` — "Kullanıcı Kodunu Hatırla" işaretliyse, **çıkış yapılsa bile** kalır |
| ~~`gib_hatirlanan_sifre`~~ | **Artık kullanılmıyor.** v1.0.0'da "Şifreyi Hatırla" ile kaydedilen şifre | `LoginScreen` açılışta bu anahtarı **siler** (eski kurulumlardan göç) |
| `gib_alici_defteri_<kullanıcı kodu>` | O hesaba özel, en fazla 50 kayıtlı alıcı (JSON dizi). Anahtardaki kod, karakter kodlarının onaltılık gösterimidir | `aliciDefteri.ts` — bir fatura başarıyla oluşturulunca otomatik eklenir/güncellenir. **Defter hesaplar arasında paylaşılmaz**: birden fazla mükellefin hesabına giren bir mali müşavir yalnızca o hesabın alıcılarını görür |
| ~~`gib_alici_defteri`~~ | **Artık kullanılmıyor.** Eski sürümlerdeki, tüm hesapların paylaştığı ortak defter | Uygulama her açılışta bu anahtarı **siler** (kime ait olduğu bilinemediğinden başka bir hesaba taşınamaz) |

**Önemli ayrım:** `gib_token`/`gib_kullanici_kodu` çifti **oturumun kendisi**
içindir (uygulama açıkken "giriş yapılmış" durumunu temsil eder).
`gib_hatirlanan_*` çifti ise tamamen ayrı bir amaç için — yalnızca **login
formunu önceden doldurmak**. Kullanıcı çıkış yapsa bile ikinci grup silinmez
(birinci grup silinir); bu bilinçli bir tasarım kararı, "her seferinde
şifremi yeniden yazmak zorunda kalmama" beklentisini karşılıyor.

`secureStorage.ts` sarmalayıcısı, `expo-secure-store`'un yalnızca
iOS/Android'de çalıştığını (web'de native modül yok) hesaba katıyor —
web'de tüm okuma/yazma/silme işlemleri sessizce no-op.

## Cihazda saklanmayan veriler

- **Şifre hiçbir koşulda cihazda saklanmıyor.** v1.0.0'daki "Şifreyi
  Hatırla" seçeneği kaldırıldı; eski sürümden kalmış kayıtlı şifre, uygulama
  ilk açıldığında otomatik silinir. Şifre her girişte yeniden girilir.
- Fatura içerikleri (kalemler, tutarlar) cihazda kalıcı saklanmıyor — form
  kapatılınca/uygulamadan çıkılınca kaybolur. Kalıcı olan tek şey, başarılı
  bir fatura sonrası **alıcı bilgisinin** adres defterine yazılmasıdır (mal/
  hizmet kalemleri, tutarlar değil).

## Uygulama içi loglama

Tüm tanı logları (`console.log`) `if (__DEV__)` altında: **release
derlemesinde (APK/AAB) Metro bunları koddan tamamen ayıklar**, cihaz
log'una/`adb logcat`'e hiçbir şey yazılmaz. Geliştirme derlemesinde bile:

- İstek gövdesi (oturum token'ı, fatura/kişi verisi) **basılmaz**; yalnızca
  hangi `cmd`/`pageName`'in gönderildiği loglanır.
- `login()` gövdesi (şifre içerir) ve assos-login yanıtı (oturum token'ı
  içerir) ile `logout()` gövdesi (token içerir) **hiç loglanmaz**.
- GİB'in ham yanıtları (mükellef/fatura verisi içerebilir) yalnızca geliştirme
  derlemesinde basılır; canlı doğrulama sırasında yanıt şeklini görmek için
  bilinçli olarak tutuluyor.

> **Not:** v1.0.0 APK'sı (`builds/` klasöründeki dosya) bu düzeltmeden
> ÖNCEKİ koddan üretildi; onda `login()` şifreyi düz metin olarak log'a
> yazıyor. Bu düzeltmeleri içeren yeni bir derleme alınana kadar o APK'yı
> dağıtmayın/kullanmayın (bkz.
> [Issue #15](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/15)).

## Android izinleri

Uygulama yalnızca `INTERNET` (GİB'e bağlanmak) ve `VIBRATE` izinlerini
istiyor (`USE_BIOMETRIC`/`USE_FINGERPRINT`, `expo-secure-store`'un kendi
bağımlılığı olarak manifest'e giriyor). `app.json`'daki
`android.blockedPermissions` ile şu izinler **kaldırılıyor** (kütüphane
manifest'lerinden birleştirilen ya da Expo varsayılanı olarak eklenen, ama
uygulamanın hiç kullanmadığı izinler):

- `SYSTEM_ALERT_WINDOW` — diğer uygulamaların üstüne katman çizme; ekran
  üstü sahte arayüz (tapjacking) saldırılarına zemin hazırlayabilen bir izin.
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` — PDF kaydı
  `StorageAccessFramework` ile (kullanıcının seçtiği klasöre) ve uygulamanın
  kendi dizinine yapıldığı için gerekmiyor.

> Not: `blockedPermissions` Expo Go'da uygulanmaz; yalnızca EAS ile alınan
> gerçek (APK/AAB) derlemede etkilidir.

## Repo güvenliği

- Repo **private**.
- Gerçek bir VKN/TCKN/kullanıcı kodu/şifre hiçbir commit'te
  bulunmamalı — her commit öncesi bu kontrol ediliyor. Kod içinde
  görülen `11111111111` gibi değerler test/örnek VKN'lerdir.
