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
| `gib_alici_dizin_<kullanıcı kodu>` + `gib_alici_kayit_<kullanıcı kodu>_<yuva>` | O hesaba özel, en fazla 50 kayıtlı alıcı: **her alıcı ayrı bir anahtarda** (tek kaydın JSON'u), sırayı küçük bir dizin anahtarı tutar (bkz. aşağıda "Parçalı saklama"). Anahtardaki kod, karakter kodlarının onaltılık gösterimidir (`hesapAnahtari.ts`) | `aliciDefteri.ts` → `bolunmusDefter.ts` — bir fatura başarıyla oluşturulunca otomatik eklenir/güncellenir; "Alıcı Defteri" ekranından adres/ülke düzenlenir, silinir, elle eklenir. **Defter hesaplar arasında paylaşılmaz**: birden fazla mükellefin hesabına giren bir mali müşavir yalnızca o hesabın alıcılarını görür |
| `gib_malhizmet_dizin_<kullanıcı kodu>` + `gib_malhizmet_kayit_<kullanıcı kodu>_<yuva>` | O hesaba özel, en fazla 50 mal/hizmet **adı** (her ad ayrı anahtarda, en son kullanılan başta). Anahtarlar alıcı defteriyle aynı biçimde üretilir | `malHizmetDefteri.ts` → `bolunmusDefter.ts` — fatura başarıyla oluşturulunca kalem adları eklenir; fatura formundaki "Kayıtlı Mal/Hizmet Seç" diyaloğundan silinir. Hesaplar arasında paylaşılmaz |
| ~~`gib_alici_defteri_<kullanıcı kodu>`~~, ~~`gib_malhizmet_defteri_<kullanıcı kodu>`~~ | **Artık kullanılmıyor.** Önceki sürümün hesaba özel ama TEK değerli defterleri (JSON dizi) | Defterin ilk okunmasında/yazılmasında yeni biçime **taşınır**, taşıma doğrulanınca silinir (bkz. "Eski biçimden taşıma") |
| `gib_kapatilan_duyurular` | Giriş ekranında kapatılan GİB duyurularının kimlikleri (JSON dizi; kişisel veri yok, hesaba özel değil) | `src/utils/duyuru.ts` — × ile kapatınca eklenir; yalnızca hâlâ tanımlı duyuruların kimlikleri tutulur |
| ~~`gib_alici_defteri`~~ | **Artık kullanılmıyor.** Eski sürümlerdeki, tüm hesapların paylaştığı ortak defter | Uygulama her açılışta bu anahtarı **siler** (kime ait olduğu bilinemediğinden başka bir hesaba taşınamaz) |

**Önemli ayrım:** `gib_token`/`gib_kullanici_kodu` çifti **oturumun kendisi**
içindir (uygulama açıkken "giriş yapılmış" durumunu temsil eder).
`gib_hatirlanan_*` çifti ise tamamen ayrı bir amaç için — yalnızca **login
formunu önceden doldurmak**. Kullanıcı çıkış yapsa bile ikinci grup silinmez
(birinci grup silinir); bu bilinçli bir tasarım kararı, "her seferinde
şifremi yeniden yazmak zorunda kalmama" beklentisini karşılıyor.

### Değer boyutu (SecureStore)

Expo SDK 57 dokümanı SecureStore için sabit bir boyut sınırı **belgelemiyor**;
yalnızca büyük değerlerin işletim sistemi tarafından reddedilebileceğini ve
bazı iOS sürümlerinin tarihsel olarak ~2048 baytın üstünü reddettiğini
belirtiyor. Anahtar **sayısı** için de bir sınır belgelenmiyor. Bu projede
ikisi de **varsayılmıyor**.

Önceki sürümde her defter TEK bir değerde JSON dizi olarak duruyordu; dolu bir
alıcı defteri ~13,5 KB (uçta ~48 KB) ile o tarihsel iOS rakamının çok
üstündeydi. Artık defterler **kayıt başına ayrı anahtara bölünüyor**; hiçbir
değer defterin toplam boyutuna bağlı değil. Ölçülen boyutlar (UTF-8,
`JSON.stringify` çıktısı; Türkçe harfler 2 bayt; `npm test` altyapısıyla 50
kayıtlık dolu defterde ölçüldü):

| Defter | En büyük tek değer | Dizin değeri | Eski biçimde (tek değer) |
|---|---|---|---|
| Alıcı (tipik: 45 karakter unvan, 55 karakter adres) | 269 B | 160 B | 13,5 KB |
| Alıcı (uç: 150 karakter unvan, 250 karakter adres, tümü Türkçe harf) | 955 B | 160 B | 47,8 KB |
| Mal/hizmet adı (tipik: 30 karakter) | 37 B | 160 B | 1,9 KB |
| Mal/hizmet adı (uç: 200 Türkçe harf) | 399 B | 160 B | 20 KB |

Dizin değeri en kötü durumda (yarım kalmış bir yazmadan sonra temizlenecek
yuvalar da listelenirken) ~310 B'ı geçmez. En büyük tek değer artık **tek bir
uç alıcı kaydı** (~1 KB): o tarihsel iOS rakamının altında, ama bir kaydın
kendisi (ör. çok uzun bir adres) bir cihazın kabul ettiğinden büyükse yine
reddedilebilir. **Gerçek cihazda hangi boyutun kabul edildiği hâlâ
doğrulanmadı.** `setSecureItem` yazmanın başarılı olup olmadığını döndürür ve
defter ekranları reddedilen bir yazmayı kullanıcıya "Kaydedilemedi" diye
bildirir; reddedilen bir yazmada defter bir önceki hâlinde kalır.

Mal/hizmet defterinde kayıt tarihi gibi ek alanlar tutulmuyor, yalnızca adlar
saklanıyor; sıra dizindeki konumla korunuyor.

### Parçalı saklama (`src/utils/bolunmusDefter.ts`)

Her defter, hesap başına bir **dizin** ve kayıt başına bir **kayıt** anahtarından
oluşur (`<hex>`: kullanıcı kodunun onaltılık gösterimi, yalnızca `[0-9a-f-]`):

- `gib_alici_dizin_<hex>` → `{"v":1,"k":[3,0,7,…],"t":[]}` — `k`: liste
  sırasıyla kayıtların yuva numaraları; `t`: veri içerebilecek ama artık
  listede olmayan (temizlenecek) yuvalar.
- `gib_alici_kayit_<hex>_<yuva>` → tek bir kaydın JSON'u. Yuva 0…99
  (2×50): dizindeki en fazla 50 yuvaya dokunmadan tek seferde 50 yeni kayıt
  yazılabilsin diye. Hesap başına defter başına en fazla 100 anahtar, sabit
  durumda 50 + 1.
- Mal/hizmet defteri aynı biçimde: `gib_malhizmet_dizin_<hex>`,
  `gib_malhizmet_kayit_<hex>_<yuva>`.

Şifreleme değişmedi: hepsi `expo-secure-store` değeridir (Android'de Keystore
ile şifreli `SharedPreferences`, iOS'ta Keychain). Şifresiz dosya ya da
veritabanı yok; yeni bağımlılık yok. Değerlendirilen alternatifler:
`expo-sqlite` Expo Go'da yalnızca şifresiz çalışıyor (SQLCipher Expo Go'da
desteklenmiyor, SDK 57 dokümanı); `expo-crypto` + dosya ile şifreli tek dosya
yeni bağımlılık ve uygulamanın kendi anahtar yönetimini gerektirdiği için
seçilmedi.

**Yarım yazma güvenliği.** Bir işlem (ekle/güncelle/sil) şu sırayla yazar:
(1) yazılacak yeni yuvalar dizinin `t`'sine eklenir, (2) yeni/değişen kayıtlar
mevcut dizinin **kullanmadığı** yuvalara yazılır, (3) yeni dizin yazılır —
kesinleştirme anı budur, (4) artık kullanılmayan yuvalar silinir ve `t`
boşaltılır. Değişmeyen kayıtlara dokunulmaz. Uygulama herhangi bir adımda
kapanırsa okunan defter ya tamamen eski ya tamamen yeni hâlidir; arada kalan
sahipsiz anahtarlar `t`'de kayıtlı olduğundan bir sonraki yazmada silinir.
SecureStore anahtarları listeleyemediği için sahipsizler böyle **kesin
olarak** izleniyor; 100 yuvanın hepsi hiçbir zaman taranmaz (Android'de her
silme diske senkron yazar). Aynı defter üzerindeki işlemler uygulama içinde
sırayla çalışır (aynı anda iki kayıt aynı boş yuvayı paylaşmaz).

**Okuma hatası ≠ boş defter.** Bir değer okunamazsa (ör. Keystore çözme
hatası) yazma yapılmaz ve işlem `false` döner ("Kaydedilemedi"); okunamayan
kaydın üzerine yazılıp kaybolması önlenir. Bozuk (JSON'u okunamayan) tek bir
kayıt listede atlanır, anahtarı bir sonraki yazmada silinir. Dizin bozuksa
defter boş görünür (önceki sürümde bozuk defterin davranışı da buydu) ve
bir sonraki yazma eski yuvaların hepsini temizler.

**İşlem maliyeti** (SecureStore çağrısı, 50 kayıtlı dolu defterde, testte
sayıldı): listeyi okumak 52 okuma (eski biçim kontrolü + dizin + 50 kayıt,
paralel istenir); alıcı ekleme/güncelleme/adres düzenleme 52 okuma + 4 yazma +
1 silme; silme 52 okuma + 2 yazma + 1 silme. Önceki biçimde bunlar 1–2 okuma +
1 yazmaydı. **Cihazda ne kadar sürdüğü ölçülmedi** (bkz.
[cihazda-denenecekler.md](cihazda-denenecekler.md)).

### Eski biçimden taşıma

Bir defterin her okunmasında/yazılmasında önce eski tek değerli anahtar
(`gib_alici_defteri_<hex>` / `gib_malhizmet_defteri_<hex>`) okunur; yoksa
(normal durum) tek bir okumaya mal olur. Varsa:

1. Eski liste çözülür (geçersiz öğeler atlanır, en fazla 50).
2. Kayıtlar 0, 1, 2… yuvalarına yazılır, sonra dizin yazılır.
3. Dizin ve kayıtlar **geri okunup** eski listeyle karşılaştırılır.
4. **Ancak eşleşirse** eski anahtar silinir. Eşleşmezse dizin silinir, eski
   anahtar yerinde kalır ve taşıma bir sonraki erişimde baştan denenir.

Taşıma yarıda kesilirse eski anahtar yerinde olduğu için veri kaybolmaz:
dizin yazılmadan kesildiyse bir sonraki erişim taşımayı baştan yapar (aynı
yuvalara aynı içerik); dizin yazılıp eski anahtar silinmeden kesildiyse bir
sonraki erişim doğrulayıp eski anahtarı siler (dizin varken içerik eski
listeyle eşleşmiyorsa yeni defter geçerli sayılır, eski anahtara yine
dokunulmaz). Dolu bir defterin taşınması bir kereliğine ~104 okuma + 51 yazma
+ 1 silme tutar. Taşıma tamamlanamazsa (ör.
cihaz yazmayı reddederse) defter **eski değerden okunarak gösterilmeye devam
eder**, ama o defter üzerindeki yazmalar `false` döner. Eski değer bozuksa
(JSON okunamıyor ya da dizi değil — önceki sürüm de bunu boş gösteriyordu ve
kullanıcı silemiyordu) boş bir yeni defter oluşturulur ve bozuk değer silinir.
Taşıma yalnızca oturumdaki hesabın anahtarına dokunur; her hesabın defteri, o
hesapla ilk girişte taşınır.

`secureStorage.ts` sarmalayıcısı, `expo-secure-store`'un yalnızca
iOS/Android'de çalıştığını (web'de native modül yok) hesaba katıyor —
web'de tüm okuma/yazma/silme işlemleri sessizce no-op.

## Cihazda saklanmayan veriler

- **Şifre hiçbir koşulda cihazda saklanmıyor.** v1.0.0'daki "Şifreyi
  Hatırla" seçeneği kaldırıldı; eski sürümden kalmış kayıtlı şifre, uygulama
  ilk açıldığında otomatik silinir. Şifre her girişte yeniden girilir.
- **Fatura PDF'leri geçici tutuluyor.** "Paylaş"/"İndir" ile üretilen
  `Fatura_<zaman>.pdf` dosyaları (alıcı VKN/unvan/tutar içerir, şifresiz)
  uygulamanın belge dizinine yazılır ve otomatik silinir: yeni bir PDF
  üretilmeden önce ve uygulama her açıldığında **1 saatten eski** olanlar,
  **çıkış yapıldığında ise hepsi** silinir (`src/utils/dosyaTemizlik.ts`;
  yalnızca `Fatura_<sayı>.pdf` desenine uyan dosyalara dokunur). Taze dosyalar,
  paylaşılan uygulamanın dosyayı okuyabilmesi için 1 saat korunur. Bu dosyalar
  Android otomatik yedeğine girmez (yedek kuralı yalnızca `sharedpref` içerir,
  `SecureStore` hariç). "İndir" ile kullanıcının seçtiği klasöre kaydedilen
  kopyalar bu temizliğin dışındadır — onlar kullanıcının kendi dosyasıdır.
- Fatura içerikleri (kalemler, tutarlar) cihazda kalıcı saklanmıyor — form
  kapatılınca/uygulamadan çıkılınca kaybolur. Kalıcı olan tek şey, başarılı
  bir fatura sonrası **alıcı bilgisinin** adres defterine yazılmasıdır (mal/
  hizmet kalemleri, tutarlar değil) ve kalemlerin yalnızca **mal/hizmet
  adlarının** mal/hizmet defterine yazılmasıdır.

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

## Uygulama kilidi

Oturum (token) cihazda kalıcı saklandığı için, kilidi açık bir telefonu eline
geçiren biri uygulamayı açıp mükellef adına işlem yapamasın diye
`expo-local-authentication` ile **cihazın kendi kilit yöntemi** (parmak izi, yüz,
PIN, desen, parola) istenir. Uygulamaya özel ayrı bir şifre **tutulmaz**;
doğrulamayı işletim sistemi yapar.

- **Ne zaman:** kayıtlı bir oturum geri yüklendiğinde (uygulama açılışı) ve
  uygulama arka planda **3 dakikadan** uzun kaldıktan sonra öne dönünce. Yeni bir
  girişten hemen sonra sorulmaz (şifre zaten girildi). 3 dakikalık pay, SMS
  imza kodunu okuyup dönmek gibi kısa dışarı çıkışlarda sürekli sorulmaması içindir
  (`KILIT_ZAMAN_ASIMI_MS`, `src/utils/uygulamaKilidi.ts`).
- **Kilitliyken altındaki ekranlar silinmez:** kilit ekranı, yarım kalmış bir fatura
  formunu koruyacak şekilde üste biner; doğrulanınca kullanıcı kaldığı yerden devam eder.
- **Ayar:** Dashboard'daki "Uygulama Kilidi" anahtarı (varsayılan **açık**). Kapatmak
  için önce kimlik doğrulanır. Ayar `gib_uygulama_kilidi` anahtarında saklanır.
- **Kilit uygulanamıyorsa açık kalır (fail-open):** cihazda hiç kilit yöntemi
  tanımlı değilse (ya da doğrulama API'si hata verirse) kilit uygulanmaz; kullanıcı
  kendi telefonunda dışarıda kalmasın diye. Kilit ekranındaki "Oturumu Kapat"
  düğmesi her durumda bir çıkış yolu sağlar.
- **Sınırlama:** son uygulamalar (recents) önizlemesi ayrıca korunmuyor (bkz.
  bilinen sınırlamalar). Expo Go'da iOS'ta Face ID desteklenmez, cihaz parolasına
  düşülür; gerçek derlemede Face ID çalışır.

## Fatura görüntüleme (WebView)

"Görüntüle" ile GİB'in döndürdüğü fatura HTML'i `src/components/FaturaWebView.tsx`
içinde, **en az yetkiyle** gösterilir. İçerikteki alanlar (alıcı unvanı, mal/hizmet
adı, not) üçüncü tarafça belirlenebildiği için HTML güvenilmez sayılır:

- **JavaScript varsayılan olarak kapalıdır.** Fatura boş/bozuk görünürse
  kullanıcı, uyarıyı onaylayarak "Fatura boş mu görünüyor?" düğmesiyle
  *gelişmiş görünümü* (JavaScript açık) o oturum için açabilir; her yeni
  fatura yine kapalı başlar.
- **Gezinme engellenir:** yalnızca `about:`/`data:` adresleri (yani verdiğimiz
  HTML'in kendisi) yüklenir; fatura içindeki bağlantılar, `tel:`, `intent:`,
  `file:` vb. hiçbir yere götürmez.
- Yeni pencere açma, dosya sistemi erişimi, DOM depolama, çerezler ve önbellek
  kapalıdır; `incognito` sayesinde fatura içeriği WebView önbelleğinde kalmaz.

PDF üretimi (`expo-print`) ayrı bir yoldur ve bu ayarlardan etkilenmez.

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
