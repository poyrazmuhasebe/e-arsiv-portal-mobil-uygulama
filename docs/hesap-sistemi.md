# Uygulama Hesabı Sistemi

> **DURUM: SUNUCU TARAFI YAZILDI, UYGULAMA TARAFI HENÜZ YOK.**
> **(b) aşaması tamamlandı:** `worker/` klasörü, D1 şeması ve hesap uçları
> yazıldı ve yerelde çalışıyor. **Uygulama tarafı henüz yok:** Kayıt Ol /
> Giriş Yap ekranları ve `hesap_*` SecureStore anahtarları yazılmadı, uygulama
> hâlâ doğrudan GİB giriş ekranıyla açılıyor ve Worker'a hiçbir istek atmıyor.
> Worker **hiçbir yere deploy edilmedi**.
> Takip: [Issue #26](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/26).

## Neden bu dosya var

Uygulama bugüne kadar **tamamen sunucusuzdu**: her istek cihazdan doğrudan
GİB'e gidiyordu ve "sunucusuz, üçüncü taraf yok" ilkesi
[mimari.md](mimari.md), [guvenlik-ve-veri.md](guvenlik-ve-veri.md) ve giriş
ekranındaki uyarıda yazılıydı. Bir uygulama hesabı eklemek bu ilkeyi
değiştiriyor. Eski ilke silinmiyor; **ikiye ayrılıyor.**

## Temel ilke (yeni)

GİB verisi yalnızca **cihaz ile GİB arasında** kalır. Cloudflare'e **yalnızca
uygulama hesabı verisi** gider: e-posta, uygulama kullanıcı adı, şifre.

- Şifre HTTPS ile Worker'a **gönderilir**, orada özetlenir; D1'de **yalnızca
  özeti saklanır**. Düz şifre hiçbir yerde saklanmaz.
- Sosyal girişte sağlayıcı token'ı yalnızca doğrulama için gönderilir ve
  **saklanmaz**; D1'e yalnızca sağlayıcı kimliği (`sub`) yazılır.
- Her istekte IP adresi gibi bağlantı bilgileri Cloudflare'e **ulaşır**.
- Cloudflare **yeni bir üçüncü taraftır** ve veri **yurt dışında** (AB) durur.

"Gönderilen" ile "saklanan" arasındaki ayrım dokümanlarda, ekrandaki uyarıda ve
aydınlatma metninde dürüstçe yapılır.

### Cloudflare'e hiçbir koşulda gitmeyecekler

GİB kullanıcı kodu · GİB şifresi · GİB token'ı · `kullaniciBilgisi`
(unvan/VKN) · VKN/TCKN · fatura verisi · alıcı defteri · mal/hizmet defteri.

Bu, yalnızca bir niyet beyanı değil, **testle doğrulanan bir kural**:
`worker/test/gibVerisi.test.ts` bu alanların her birini tek tek Worker'a
göndermeyi dener ve hepsinin `bilinmeyen_alan` ile reddedildiğini, hiçbir
kayıt oluşmadığını ve D1 şemasında GİB'i çağrıştıran tek bir sütun adı bile
bulunmadığını doğrular.

## Hangi veri nerede

| Veri | Cihaz (SecureStore) | Cloudflare D1 (AB) | Workers Logs | Sağlayıcı |
|---|---|---|---|---|
| E-posta | ✔ | ✔ | ✖ | (sosyal girişte) ✔ |
| Uygulama kullanıcı adı | ✔ | ✔ | ✖ | ✖ |
| Uygulama şifresi | **✖ hiç saklanmaz** | yalnızca **scrypt özeti** | ✖ | ✖ |
| Oturum token'ları | ✔ | yenileme token'ının **SHA-256 özeti** | ✖ | ✖ |
| Sağlayıcı `sub` kimliği | ✖ | ✔ | ✖ | ✔ |
| Sağlayıcı access/ID token'ı | ✖ | **✖ asla** | ✖ | ✔ |
| IP adresi / bağlantı bilgisi | — | ✖ | Cloudflare'e **ulaşır** | — |
| GİB kullanıcı kodu / token'ı | ✔ | **✖ asla** | **✖ asla** | — |
| GİB şifresi | **✖ hiç saklanmaz** | **✖ asla** | **✖ asla** | — |
| VKN/TCKN, unvan, fatura, defterler | ✔ | **✖ asla** | **✖ asla** | — |

**Workers Logs:** yeni Worker'larda varsayılan olarak açık; console çıktısı ve
istek meta verisi Cloudflare'de saklanır (Free 3 gün, Paid 7 gün). Bizde
`observability.logs.invocation_logs` **kapatıldı** (`worker/wrangler.jsonc`),
böylece istek meta verisi loglanmaz. `console.*` ile istek gövdesi, Authorization başlığı, şifre, token,
e-posta ve kullanıcı adı **hiçbir koşulda** yazılmaz.

## Alınan kararlar (2026-09-20)

| Konu | Karar | Gerekçe |
|---|---|---|
| Kayıttaki "kullanıcı kodu" | **Bağımsız uygulama kullanıcı adı** | GİB kodu olsaydı mükellefi tanımlayan veri yurt dışına taşınırdı; ayrıca projede "kullanıcı kodu" her yerde GİB portal kodu demek |
| Biçim | 3–20 karakter, harf/rakam/nokta/alt çizgi, **en az bir harf** | "En az bir harf" kuralı yalnızca rakamdan oluşan VKN/TCKN ve GİB kodlarını reddeder |
| Ekran etiketi | **"Uygulama Kullanıcı Adı"** | GİB tarafı "GİB Kullanıcı Kodu" olarak ayrışır |
| Cloudflare bağlantısı | **Worker + D1 binding** (`env.DB`) | Uygulamadan doğrudan D1 REST API'si keyfi SQL çalıştırır ve hesap düzeyinde bir API token'ı ister; o token APK'dan çıkarılabilir |
| Giriş alanı | **E-posta + şifre** | GİB girişiyle (kod+şifre) görsel olarak karışmaz |
| Hesap zorunluluğu | **Zorunlu** — hesapsız GİB'e geçilemez | Kullanıcı kararı. iOS riski aşağıda |
| Çevrimdışı | Cihazda geçerli oturum varsa Worker'a **sorulmadan** GİB ekranına geçilir | Cloudflare kesintisi ya da günlük limit uygulamayı tamamen kilitlemesin |
| Platform | **Yalnız Android**, şimdilik | Apple ile Giriş, `.p8`, Apple token iptali ve `bekleyen_kayitlar` tablosu kapsam dışı |
| Plan | **Workers Paid** | İstek başına varsayılan 30 sn CPU; scrypt rahat sığar |
| Şifre özeti | **scrypt** (`node:crypto`) | Bellek-sert. Free planın 10 ms CPU sınırı olsaydı riskliydi, Paid'de değil |
| D1 konumu | **`--jurisdiction=eu`** | Garantili AB. **Geri alınamaz** — yalnızca oluşturmada seçilir. Türkiye seçeneği yok |
| E-posta doğrulama | **Zorunlu**, 6 haneli kod | Kod yolu deep link gerektirmediği için akış Expo Go'da uçtan uca çalışır |
| Şifremi unuttum | **Dahil** | Hesap zorunlu olduğu için şifresini unutan kullanıcının başka kurtulma yolu yok |
| Posta gönderimi | **Cloudflare Email Sending** | Yeni bir üçüncü taraf ve yeni bir KVKK aktarımı eklenmiyor. **Ürün beta** — risk aşağıda |
| Instagram | **Kapsam dışı** | Kişisel hesaplar için resmî API yok ([Issue #35](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/35)) |
| Sosyal girişler | **Ayrı aşama**, ayrı onayla | Yerel SDK'lar Expo Go'da çalışmaz, development build gerektirir |
| Yeni bağımlılık | Uygulamaya **sıfır**; Worker'a yalnızca devDependency (`wrangler`, `typescript`, `vitest`, `@cloudflare/vitest-plugin`, `@types/node`) | Expo Go deneyimi bozulmaz; hiçbiri uygulama paketine girmez |
| Worker kodu | Aynı repoda **`worker/`** alt klasörü | İstemci ile sunucunun sözleşmesi tek commit'te değişir |
| Alan adı | **Baştan özel alan adı** | Posta gönderimi, gizlilik politikası ve web hesap silme sayfası zaten alan adı istiyor; adres derlemeye gömüldüğü için sonradan değişirse yeni APK gerekir |
| CORS | Yalnızca `http://localhost:8081` | **Wildcard hiçbir koşulda yok** |

## Akış

### Ekran durumları

| # | Koşul | Ekran |
|---|---|---|
| 1 | Hesap oturumu yok | **Karşılama** → "Kayıt Ol" / "Giriş Yap". GİB girişi burada **yok** |
| 2 | Hesap var, e-posta doğrulanmamış | **E-posta Doğrula** (6 haneli kod + "yeniden gönder") |
| 3 | Hesap var + doğrulanmış; GİB token'ı yok **ya da** `hesap_gib_sahibi` eşleşmiyor | **GİB Giriş** — bugünkü `LoginScreen`; etiket "GİB Kullanıcı Kodu", duyuru kutusu burada kalır |
| 4 | İkisi de var | Mevcut Dashboard grubu (değişmez) |

Sosyal kayıt yarıda kalmışsa (bilet var, kullanıcı adı girilmemiş) araya bir
**Kayıt Tamamla** durumu girer — yalnızca (e) aşamasında.

### Kayıt

E-posta, Uygulama Kullanıcı Adı, şifre.

- Girilen kullanıcı adı **yalnızca cihazda** `gib_hatirlanan_kullanici_kodu`
  ile karşılaştırılır; eşitse **istek hiç gönderilmez** ve kullanıcıya bunun
  GİB kodu olduğu söylenir.
- "En az bir harf" kuralı istemcide de var — yalnızca rakamdan oluşan bir
  değer ağa hiç çıkmaz.
- Kayıt düğmesinin yakınında **Aydınlatma Metni** ve **Gizlilik Politikası**
  bağlantıları bulunur. Herkese açık URL hazır olana kadar uygulama içi bir
  ekranda taslak metin gösterilir.
- **Açık rıza kutucuğu konmaz** — sözleşmenin kurulması için gerekli veriler
  açık rızaya bağlanmaz (bkz. "KVKK").

### Oturum ve çevrimdışı davranış

- **Erişim token'ı:** HS256 JWT, 1 saat. Web Crypto ile üretilir (`jose`
  kurulmadı; `src/kripto.ts`).
- **Yenileme token'ı:** 256 bit rastgele, 60 gün, D1'de **yalnızca SHA-256
  özeti**, her yenilemede rotasyon.
- Ekran geçişi cihazdaki `hesap_oturum` kaydına bakar. **Yenileme token'ının
  yerel bitiş tarihi geçmediyse Worker'a hiç sorulmadan GİB ekranına geçilir.**
  Ağ varsa arka planda sessizce yenilenir; Worker `401 oturum_iptal` derse
  oturum kapatılır ve kullanıcı bilgilendirilir.
- Cookie kullanılmaz.

Artık risk: sunucuda iptal edilen bir oturum, erişim token'ının süresi dolana
kadar cihazda çalışmaya devam eder.

### GİB oturumunun sahibi

Bugün `gib_token` ve `gib_kullanici_kodu` anahtarlarında hesap kimliği yok.
Hesap sistemi eklendiği anda bu bir sızma yolu olur: cihazda kalan bir GİB
oturumu sonra giren **herhangi bir** uygulama hesabına sessizce geri yüklenir.

Çözüm:

- GİB oturumu kaydedilirken sahibinin kimliği de cihazda tutulur:
  **`hesap_gib_sahibi`**.
- Açılışta hesap oturumu yoksa ya da kimlik eşleşmiyorsa GİB oturumu geri
  yüklenmez: mümkünse GİB logout yapılır, `gib_token` ve `gib_kullanici_kodu`
  silinir.
- Güncellemeden sonraki ilk açılışta cihazda duran **sahipsiz `gib_token`
  silinir** (ilk giren hesaba bağlanmaz).
- `gib_hatirlanan_kullanici_kodu` ve defterler **silinmez**.
- `restoreSession()` artık koşulsuz çağrılmaz.

Takip: [Issue #31](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/31).

### İki ayrı çıkış

| Eylem | Ne yapar |
|---|---|
| **GİB oturumunu kapat** | Yalnızca GİB oturumunu kapatır, uygulama hesabı açık kalır, GİB Giriş ekranına döner. Başka bir mükellef hesabına geçmenin yolu budur |
| **Hesaptan çık** | Önce GİB oturumunu, sonra hesap oturumunu kapatır; sunucuda yenileme token'ını iptal eder |

`gibHatasiniIsle` (`src/services/gibApi.ts`) GİB oturum hatasında **yalnızca
GİB oturumunu** kapatır; hesap oturumuna dokunmaz.

"Hesaptan çık" cihazda **hiçbir şeyi silmez**: `gib_hatirlanan_kullanici_kodu`
ve defterler yerinde kalır. Gerekçe: defterlerin hiçbir yedeği yok (D1'e
gitmiyorlar), yanlışlıkla çıkış yapan kullanıcı 50 kayda kadar veri
kaybedebilirdi.

### Uygulama kilidi

Kilit bugün yalnızca GİB token'ı varken çalışıyor. Bundan sonra **hesap
oturumu varken de** çalışacak; `KilitScreen`'deki düğme "Hesaptan çık" olacak.

## Uygulama tarafı tasarımı

### Ayrı store, ayrı istemci

- **`useAuthStore` GİB'e özel kalır.** Uygulama hesabı alanları buraya
  eklenmez — alıcı ve mal/hizmet defterlerinin anahtarları
  `useAuthStore.kullaniciKodu`'ndan üretiliyor
  (`src/utils/hesapAnahtari.ts` → `bolunmusDefter.ts`); bu alanın anlamı ya da
  adı değişirse **mevcut defterler sahipsiz kalır.**
- `src/store/useHesapStore.ts` — uygulama hesabı oturumu.
- `src/services/hesapApi.ts` — Worker istemcisi. **`gibApi.ts`'ten hiçbir şey
  import etmez** ve `gibApi ↔ useAuthStore` döngüsel bağımlılığına girmez.

### Yeni SecureStore anahtarları

Hepsi `hesap_` önekli (`gib_` öneki kullanılmaz), hepsi
`keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY` ile yazılır.

| Anahtar | İçerik |
|---|---|
| `hesap_oturum` | `{kullaniciId, eposta, kullaniciAdi, epostaDogrulandi, erisimToken, erisimBitis, yenilemeBitis}` |
| `hesap_yenileme` | Yenileme token'ı (ayrı anahtarda) |
| `hesap_gib_sahibi` | GİB oturumunun sahibi olan `kullaniciId` |
| `hesap_kayit_bileti` | *Yalnızca (e) aşamasında* — yarıda kalmış sosyal kayıt bileti |

**Boyut kuralı:** SecureStore'un dokümanı *"some iOS releases refused values
above roughly 2048 bytes"* diyor. `hesap_oturum` ve `hesap_kayit_bileti` 2 KB
altında tutulur. (Aynı konu: [Issue #23](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/23).)

### Worker adresi

- **Sır değildir.** Tek bir modülde `process.env.EXPO_PUBLIC_HESAP_API_URL`
  ile okunur.
- Yerel değer git dışı `.env.local`'de, örnek değer commit'lenen
  `.env.example`'da.
- EAS derlemelerinde değer `eas.json`'daki ilgili profilin `env` alanına
  yazılır — **EAS Build git dışı `.env` dosyalarını görmez.**
- Değer tanımsızsa istemci **istek atmaz** ve "Hesap sunucusu
  yapılandırılmamış" hatası gösterir.
- Release derlemesinde yalnızca `https` kullanılır; cleartext **açılmaz**.

`EXPO_PUBLIC_*` değişkenleri uygulama paketine **düz metin gömülür** — oraya
yalnızca Worker adresi konur.

### Hata gösterimi

Worker hata sayfaları JSON değil **HTML** döner: 1101 (yakalanmayan istisna),
1102 (CPU/bellek aşımı), 1027 (günlük sınır). İstemci content-type kontrolü
yapar ve ağ yok / zaman aşımı / HTML hata sayfası durumlarında anlamlı Türkçe
mesaj gösterir.

## Worker ve D1 tasarımı

### Konum ve tip kontrolü

`worker/` — kendi `package.json` ve `tsconfig.json`'ı ile. Kök
`tsconfig.json`'da bugün `include`/`exclude` yok ve `allowJs: true` açık, bu
yüzden kökte `exclude` gerekir. Kökte `exclude` yazılınca taban listedeki
değerler **miras alınmaz**, yeniden yazılır:
`node_modules`, `babel.config.js`, `metro.config.js`, `jest.config.js`,
`android`, `ios`, `worker`.

### D1 şeması

Sorgular `prepare().bind()` ile, çok adımlı yazmalar `batch()` ile.
**GİB verisi için hiçbir tablo ya da sütun yok.**

| Tablo | Sütunlar |
|---|---|
| `kullanicilar` | `id` (UUID), `eposta` NOT NULL UNIQUE (küçük harfe normalize), `kullanici_adi` NOT NULL UNIQUE (küçük harfe normalize), `sifre_ozeti` (sosyal kayıtta NULL olabilir), `eposta_dogrulandi`, `olusturma`, `guncelleme` |
| `kimlik_saglayicilar` | `saglayici`, `saglayici_kullanici_id`, `kullanici_id`, UNIQUE(`saglayici`, `saglayici_kullanici_id`) |
| `oturumlar` | `id`, `kullanici_id`, `yenileme_ozeti` (SHA-256), `bitis`, `iptal`, `olusturma` |
| `tek_kullanimlik_kodlar` | `tip` (`eposta_dogrulama` / `sifre_sifirlama`), `kullanici_id`, `kod_ozeti` (SHA-256), `bitis`, `deneme`, `kullanildi` |
| `oran_sinir` | `anahtar`, `pencere`, `sayac` |

Kimlik anahtarı **e-posta değil**, sağlayıcının `sub`/id değeridir.

**`bekleyen_kayitlar` tablosu şimdi yazılmıyor.** Tek gerekçesi Apple'ın yalnızca
ilk girişte verdiği e-postanın kaybolmaması olurdu; iOS kapsam dışı olduğu için
gerekmiyor. iOS kapsama girerse eklenecek ([Issue #34](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/34)).

### Uç noktalar

Aşama (b) ile **yazılanlar**:

```
GET    /v1/saglik                                              → {tamam:true}
POST   /v1/kayit                    {eposta, kullaniciAdi, sifre}
POST   /v1/giris                    {eposta, sifre}
POST   /v1/oturum/yenile            {yenilemeToken}
POST   /v1/cikis                    {yenilemeToken}
POST   /v1/eposta/kod-gonder        (auth, gövdesiz)
POST   /v1/eposta/dogrula           {kod}   (auth)
POST   /v1/sifre/sifirlama-baslat   {eposta}
POST   /v1/sifre/sifirlama-tamamla  {eposta, kod, yeniSifre}
```

Aşama (d)'de eklenecekler:

```
DELETE /v1/hesap                    {sifre} (auth)
GET    /hesap-sil                   (herkese açık HTML — Play şartı)
POST   /hesap-sil                   (herkese açık form)
```

Her uç nokta **yalnızca izin verilen alanları** kabul eder ve **bilinmeyen
alanı reddeder**. Kullanıcı adı biçim kuralını sunucu da uygular. Gövde en
fazla 4 KB'dır ve `application/json` olmayan içerik tipi 415 ile reddedilir.

Yanıtlar **her zaman JSON**'dur (404 ve 500 dahil) ve `cache-control: no-store`
taşır. Cloudflare'in kendi hata sayfaları (1101/1102/1027) HTML döndüğü için
istemci ayrıca content-type kontrolü yapar.

### Yerel geliştirme modu

`GELISTIRME="1"` iken doğrulama ve sıfırlama kodları yanıt gövdesinde
`gelistirmeKodu` alanıyla döner ve konsola yazılır; böylece akış e-posta
altyapısı olmadan telefonda denenebilir.

Bu değişken **yalnızca git dışı `.dev.vars` dosyasından** gelir:
`wrangler.jsonc`'deki `vars` bloğunda bilerek yoktur ve `.dev.vars`
`wrangler deploy` ile yüklenmez. `worker/test/hesapUclari.test.ts` içindeki
"geliştirme modu" testi, değişken kapalıyken yanıtta `gelistirmeKodu`
bulunmadığını doğrular.

### Worker dosya haritası

| Dosya | İş |
|---|---|
| `src/index.ts` | Yönlendirme, CORS, genel hata yakalama |
| `src/turler.ts` | Ortam (binding + değişken) sözleşmesi |
| `src/yanit.ts` | JSON yanıtları ve `IstekHatasi` |
| `src/govde.ts` | Gövde okuma, boyut sınırı, **bilinmeyen alan reddi** |
| `src/dogrulama.ts` | E-posta, kullanıcı adı ve şifre kuralları (saf) |
| `src/kripto.ts` | Sabit zamanlı karşılaştırma, rastgele değerler, SHA-256, HS256 |
| `src/sifre.ts` | scrypt özetleme ve doğrulama |
| `src/oturum.ts` | Oturum oluşturma, rotasyonlu yenileme, iptal |
| `src/kodlar.ts` | Tek kullanımlık 6 haneli kodlar |
| `src/oranSinir.ts` | Sabit pencereli oran sınırlama |
| `src/eposta.ts` | Cloudflare Email Sending (**denenmedi**) |
| `src/cors.ts` | Açık izin listesi, wildcard yok |
| `src/uclar/` | Uç nokta işleyicileri |

### Şifre özeti

`scrypt$16384$8$1$<salt>$<hash>` — algoritma ve parametreler özetle birlikte
saklanır, böylece ileride değiştirilebilir. İsteğe bağlı `PEPPER` secret'ı
eklenebilir.

- `node:crypto` üzerinden. Compatibility date 2026-08-04 ve sonrasında
  `nodejs_compat` **varsayılan olarak açık**.
- N=16384, r=8, p=1 → yaklaşık 16 MB; Workers'ın 128 MB bellek sınırının
  altında. `maxmem` açıkça verilir.
- **Karşılaştırma sabit zamanlı ve elle yazılmış bir fonksiyonla** yapılır.
  Workers'a özgü `crypto.subtle.timingSafeEqual` **kullanılmaz** — Node 24'te
  yok, paylaşılan saf fonksiyonlar iki ortamda da çalışmalı.

**Neden PBKDF2 değil:** Cloudflare üretimde PBKDF2'de en fazla 100.000
iterasyon kabul ediyor (*"iteration counts above 100000 are not supported"*) ve
bu OWASP'ın önerdiği 600.000'in altında kalıyor. Yerel `workerd`/`wrangler dev`
ve Node'da bu tavan **yok** — yani 100.000'in üstü yerelde geçer, üretimde her
kayıt ve girişi kırardı. `argon2` Workers'ta desteklenmiyor.

### Enumeration dengesi

- `/v1/giris`: her zaman tek tip "E-posta veya şifre hatalı".
- `/v1/sifre/sifirlama-baslat`: e-posta kayıtlı olsun olmasın **aynı yanıt**.
- `/v1/kayit`: **burada ayrım kaçınılmaz** — kullanıcıya hangi alanı
  düzelteceğini söylemek için "bu e-posta kullanımda" ile "bu kullanıcı adı
  alınmış" ayrı mesajlar olmalı. Kayıt ucu bu yüzden bir e-posta enumeration
  yüzeyidir; oran sınırlamasıyla karşılanır. Karar bilerek verildi.

### Sırlar

- **Sır** (yalnızca `wrangler secret` ya da git dışı `.dev.vars`): oturum imza
  anahtarı, `PEPPER`, ileride OAuth client secret'ları ve Apple `.p8`.
- **Cloudflare API token'ı** hiçbir zaman Worker'a, uygulamaya ya da git'e
  girmez; yalnızca `wrangler login` ile ya da CI secret'ı olarak.
- **Sır değil:** `database_name` ve `database_id` — `worker/wrangler.jsonc`'ye
  yazılıp commit'lenir. `account_id` yapılandırmaya yazılmaz.
- **D1 binding ID'siz bırakılmaz:** Wrangler 4.45 ve sonrası, ID'si yazılmamış
  bir binding için deploy sırasında kendisi yeni bir veritabanı oluşturabiliyor
  ve bu durumda **jurisdiction seçimi atlanır**. Binding'lerde `"remote": true`
  kullanılmaz.
- `.gitignore`'a eklenir: `.env`, `.env.*` (`.env.example` hariç),
  `.dev.vars*`, `.wrangler/`.

## Sosyal girişler (aşama e)

Yalnızca ayrı onayla ve development build kararıyla yapılır.

| Sağlayıcı | Durum | Issue |
|---|---|---|
| Google | Dev build gerekir | [#32](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/32) |
| Facebook | Dev build **ve geçerli Play Store URL'si** gerekir — uygulama Play'de olmadığı için şu an fiilen imkânsız | [#33](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/33) |
| Apple | iOS kapsam dışı olduğu sürece beklemede | [#34](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/34) |
| Instagram | **Kapsam dışı** — kişisel hesaplar için resmî API yok | [#35](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/35) |

### Değişmeyecek kurallar

- **Çalışmayan ya da sahte sosyal giriş düğmesi EKLENMEZ.** Bir sağlayıcının
  düğmesi yalnızca akışı uçtan uca (Worker doğrulaması dahil) yazılmışsa ve
  çalıştığı derlemede görünür.
- Yerel sosyal SDK'lar yalnızca korumalı ya da dinamik import ile yüklenir.
  Expo Go'da (`Constants.executionEnvironment === ExecutionEnvironment.StoreClient`)
  düğmeler gösterilmez ve **modül hiç require edilmez** — böylece e-posta/şifre
  ve GİB akışları Expo Go'da çalışmaya devam eder.
- **OAuth asla `react-native-webview` içinde açılmaz.** Kimlik her zaman
  sunucuda doğrulanır.
- `aud` izin listeleri Worker ortam değişkeninde durur. **Üretimde Expo Go'nun
  kimliği (`host.exp.Exponent`) ya da başka bir uygulamanın kimliği asla kabul
  edilmez.**
- Hesap, **kullanıcı adı gelmeden oluşmaz**: Worker kısa ömürlü (~30 dk)
  imzalı bir kayıt bileti döner, uygulama bunu SecureStore'da tutar.
- Sosyal kayıtta e-posta zaten başka bir hesapta kayıtlıysa **hesap oluşmaz ve
  sağlayıcı bağlanmaz**; kullanıcıya "Bu e-postayla bir hesap var; e-posta ve
  şifrenizle giriş yapın" denir.

### Kullanılmayacak yollar

- `expo-auth-session/providers/google` ve `providers/facebook` — SDK 57'de
  `@deprecated`.
- `auth.expo.io` proxy API'leri — expo-auth-session 5.0.0'da (2023) kaldırıldı.
- Gömülü WebView — Android'de Google reddediyor (`disallowed_useragent`).

## Testler

İki ayrı takım var ve **hiçbiri ağa çıkmaz**.

### Uygulama tarafı — `npm test` (kök)

Mevcut altyapı (tsc → CommonJS → `node:test`). **98 test.**

`globalThis.fetch` artık sahtelendi (`test/sahte/kurulum.ts`): varsayılan
olarak "Testte beklenmeyen ağ isteği (fetch)" hatası fırlatır, istekleri
(url, yöntem, başlıklar, gövde) kaydeder ve `sahteleriSifirla()` içinde
sıfırlanır. Bu, (b) aşamasında eklendi çünkü Node 24'te `fetch` yerleşiktir ve
sahte axios yalnızca `axios` modülünü kapsıyordu — hesap istemcisi Worker'a
fetch ile gidecek. `test/agKorumasi.test.ts` bunu doğrular.

### Worker tarafı — `npm test` (`worker/` içinde)

vitest + `@cloudflare/vitest-plugin` ile **gerçek `workerd` çalışma zamanında
ve gerçek (yerel) D1'e** karşı. Bellek içi sahte veritabanı kullanılmaz.
**72 test.**

| Dosya | Kapsam |
|---|---|
| `test/gibVerisi.test.ts` | GİB alanlarının tek tek reddi, reddedilen istekten sonra kayıt oluşmaması, şemada GİB'i çağrıştıran sütun bulunmaması, yalnızca rakamlı kullanıcı adının reddi, oran sınırı tablosunda düz metin e-posta/IP bulunmaması |
| `test/hesapUclari.test.ts` | Kayıt, giriş, oturum rotasyonu, çıkış, e-posta doğrulama, şifre sıfırlama, oran sınırlama, yanıt biçimi, CORS, geliştirme modu, eksik yapılandırma |
| `test/sifre.test.ts` | scrypt özetleme/doğrulama, düz metin saklanmaması, parametrelerin kayıtla taşınması, pepper, bozuk kayıtlar, devasa N koruması |
| `test/kripto.test.ts` | Sabit zamanlı karşılaştırma, rastgelelik, HS256 üretme/doğrulama, yanlış anahtar, kurcalanmış gövde, süre dolması |
| `test/dogrulama.test.ts` | E-posta, kullanıcı adı ve şifre kuralları |

Özellikle doğrulananlar:

- **GİB verisinin hesap API'sine gitmemesi** (10 ayrı alan tek tek denenir)
- Şifrenin düz metin saklanmaması; özetin `scrypt$16384$8$1$…` biçiminde olması
- Doğrulama kodunun düz metin saklanmaması
- Yanlış şifre ile olmayan e-postanın **birebir aynı yanıtı** vermesi
- Yenileme token'ının rotasyonu — eskisinin bir daha geçmemesi
- Kodun tek kullanımlık olması ve 5 yanlış denemeden sonra kilitlenmesi
- Şifre sıfırlamanın **tüm oturumları düşürmesi**
- Oran sınırının gerçekten devreye girmesi (6. kayıt 429)
- Yanıtların **her zaman JSON** olması, CORS'un **hiçbir koşulda wildcard
  olmaması**
- `GELISTIRME` kapalıyken kodun yanıta **eklenmemesi**

### (c) aşamasında eklenecek testler

- Yalnızca rakamdan oluşan ya da hatırlanan GİB koduna eşit kullanıcı adının
  **istemciden hiç gönderilmemesi**
- Oturumu saklama, geri yükleme ve **iki ayrı çıkış**
- **GİB oturum hatasının hesap oturumunu kapatmaması**
- Sahipsiz `gib_token`'ın silinmesi; farklı bir hesap girince önceki GİB
  oturumunun geri yüklenmemesi
- Sunucu erişilemezken ve HTML hata sayfası gelince davranış; çevrimdışıyken
  kayıtlı oturumla GİB ekranına geçilmesi

## Bilinen riskler ve artık riskler

### E-posta doğrulama zorunlu + beta posta servisi

Cloudflare Email Sending **beta** ve Workers Paid ile bir gönderen alan adı
gerektiriyor. Posta gecikir, spam'e düşer ya da servis arızalanırsa **yeni
kullanıcı uygulamaya hiç giremez.** Hafifletmeler: "kodu yeniden gönder"
(60 sn bekleme), doğrulama ekranında iletişim yolu, acil durumda
`wrangler d1 execute --remote` ile elle doğrulama.
Takip: [Issue #28](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/28).

### Aynı telefonda iki hesap, aynı GİB hesabı

Defter anahtarları GİB kullanıcı kodundan üretiliyor ve **bilerek
değiştirilmiyor** — değiştirilseydi cihazlarda duran tüm defterler sahipsiz
kalır ve hangisinin hangi yeni hesaba ait olduğu bilinemezdi. Bu yüzden aynı
telefonda iki farklı uygulama hesabı aynı GİB hesabına girerse **aynı defteri
görürler**. Senaryo dar; risk bilerek kabul edildi.

### iOS

Şu an kapsam dışı. iOS'a çıkılırsa iki Apple kuralı devreye girer:

- **5.1.1(v):** *"If your app doesn't include significant account-based
  features, let people use it without a login."* GİB verisi D1'e gitmediği için
  hesabın kattığı işlev sınırlı; **zorunlu hesap red riski taşır.** Ayrıca
  uygulama içi hesap silme zorunlu ve sosyal ağ token'ları cihaz dışında
  saklanamaz.
- **4.8:** Google/Facebook ile hesap oluşturma sunulursa eşdeğer bir seçenek de
  sunulmalı. İstisna: *"Your app exclusively uses your company's own account
  setup and sign-in systems"* — yani **sosyal giriş hiç eklenmezse Apple ile
  Giriş gerekmez.**

**iOS Keychain (SecureStore) uygulama silinip yeniden kurulunca da korunur.**
Yeniden kurulumdan sonra hesap ve GİB oturumları kendiliğinden geri gelir. iOS
kapsama girerse: ilk açılışta, uygulama silinince kaybolan bir kurulum işareti
(ör. `documentDirectory`'de bir dosya) yoksa `hesap_*` ve `gib_*` oturum
anahtarları silinir, sonra işaret yazılır.

### Cloudflare limitleri

Workers Paid'de istek başına varsayılan 30 sn CPU var, dolayısıyla scrypt
sorun değil. Yine de D1'in kendi sınırları geçerli: sorgu başına en fazla 100
bağlı parametre, en fazla 100 KB SQL, satır/BLOB en fazla 2 MB.

## KVKK

> **Bu bölüm bilgilendirme amaçlıdır, hukuki görüş değildir.**
> Aydınlatma metni, gizlilik politikası ve hizmet şartları **taslak** olarak
> yazılır ve **hukuki inceleme gerektirir.**
> Takip: [Issue #36](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/36).

- **E-posta kişisel veridir.** KVKK m.10 aydınlatma yükümlülüğü veri elde
  edilirken — yani kayıt ekranında — yerine getirilir.
- **İlke Kararı 2026/347** (18.02.2026): aydınlatma metni ile açık rıza metni
  **ayrı başlıklar altında, ayrı metinler** olarak düzenlenmeli; aydınlatma
  metni için onay/rıza istenmemeli. Sözleşmenin kurulması için gerekli veriler
  açık rızaya bağlanmaz — bu yüzden kayıt ekranında **açık rıza kutucuğu
  yoktur.**
- **m.9 yurt dışına aktarım** (1.6.2024'ten itibaren): D1'e yazılan her kayıt
  yurt dışına aktarım sayılır. Araştırmada Cloudflare için bir **yeterlilik
  kararı bulunamadı.** Pratik yol: Cloudflare ile **standart sözleşme**
  imzalamak ve imzadan sonra **5 iş günü içinde Kurum'a bildirmek.**
  Cloudflare'in bunu imzalayıp imzalamayacağı **belirsizdir.**

## Aşamalar

| Aşama | İçerik | Durum |
|---|---|---|
| **(a)** | Bu dosya + `docs/README.md` satırı + hukuki taslaklar | ✅ yapıldı |
| **(b)** | `worker/` iskeleti + D1 migration + kayıt/giriş/oturum + e-posta doğrulama + şifre sıfırlama + oran sınırlama + testler | ✅ yapıldı |
| **(c)** | Uygulama tarafı: store, istemci, ekranlar, navigasyon, `hesap_gib_sahibi`, iki çıkış, kilit. **İlke değişikliği dokümanları aynı commit'te** | ⬜ |
| **(d)** | Hesap silme: uygulama içi + herkese açık web sayfası | ⬜ |
| **(e)** | Sosyal girişler, sağlayıcı sağlayıcı — **yalnızca ayrı onayla** | ⬜ |

## İlgili dokümanlar

- [guvenlik-ve-veri.md](guvenlik-ve-veri.md) — hangi veri nerede, SecureStore
  anahtarları
- [mimari.md](mimari.md) — teknoloji yığını
- [hukuk/](hukuk/) — aydınlatma metni, gizlilik politikası ve hizmet şartları
  **taslakları**
- [bilinen-sinirlamalar.md](bilinen-sinirlamalar.md)
- [cihazda-denenecekler.md](cihazda-denenecekler.md)
