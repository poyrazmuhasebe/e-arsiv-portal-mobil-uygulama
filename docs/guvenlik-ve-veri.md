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
| `gib_hatirlanan_sifre` | Login formunu önceden doldurmak için şifre | `LoginScreen` — "Şifreyi Hatırla" işaretliyse, **çıkış yapılsa bile** kalır |
| `gib_alici_defteri` | En fazla 50 kayıtlı alıcı (JSON dizi) | `aliciDefteri.ts` — bir fatura başarıyla oluşturulunca otomatik eklenir/güncellenir |

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

- **Şifre asla `gib_token` ile birlikte kalıcı saklanmıyor** — yalnızca
  "Şifreyi Hatırla" işaretliyse, ayrı bir anahtarda (`gib_hatirlanan_sifre`)
  ve yalnızca formu önceden doldurmak amacıyla tutuluyor.
- Fatura içerikleri (kalemler, tutarlar) cihazda kalıcı saklanmıyor — form
  kapatılınca/uygulamadan çıkılınca kaybolur. Kalıcı olan tek şey, başarılı
  bir fatura sonrası **alıcı bilgisinin** adres defterine yazılmasıdır (mal/
  hizmet kalemleri, tutarlar değil).

## Uygulama içi loglama

`gibApi.ts` içinde geliştirme sürecinden kalma, GİB'e giden/gelen ham
veriyi (`console.log`) basan tanı satırları var. Bunlar şifreyi düz metin
**basmıyor** ama gürültülü; canlıya geçmeden önce ayıklanması planlanıyor
(bkz. [Issue #15](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/15)).
`login()`/`logout()` (assos-login) fonksiyonları da giriş isteğinin gövdesini
loglar — bu, şifrenin **düz metin olarak** cihazın kendi konsol/log
çıktısında görünmesi anlamına gelir (uzak bir sunucuya gitmez, ama yerel
log dosyalarına/`adb logcat`'e yansıyabilir).

## Repo güvenliği

- Repo **private**.
- Gerçek bir VKN/TCKN/kullanıcı kodu/şifre hiçbir commit'te
  bulunmamalı — her commit öncesi bu kontrol ediliyor. Kod içinde
  görülen `11111111111` gibi değerler test/örnek VKN'lerdir.
