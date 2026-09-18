# GİB e-Arşiv Portal Entegrasyonu — Derinlemesine

Bu uygulama, GİB'in **resmî/yayınlanmış bir API'si olmadığı için**,
`earsivportal.efatura.gov.tr` portalının kendi web arayüzünün kullandığı iç
(unofficial) servislere doğrudan istek atar. Bu dosya, o servislerin gerçek
DevTools yakalamalarıyla çıkarılmış iç işleyişini belgeler. Kaynak kod:
`src/services/gibApi.ts`.

## İki ayrı uç nokta

Portalın kullandığı iki farklı temel URL var, birbirine karıştırılmamalı:

| Uç nokta | Kullanım alanı |
|---|---|
| `https://earsivportal.efatura.gov.tr/earsiv-services/assos-login` | **Yalnızca** giriş (`assoscmd=anologin`) ve çıkış (`assoscmd=logout`) |
| `https://earsivportal.efatura.gov.tr/earsiv-services/dispatch` | Portaldaki **her şey** (mükellef sorgusu, taslak listesi, fatura oluşturma, SMS imzalama, ...) — tek bir genel amaçlı `cmd` yönlendirme uç noktası |

## `dispatch` protokolü

Her `dispatch` isteği, `application/x-www-form-urlencoded` gövdeli bir POST'tur ve şu alanları taşır:

```
cmd=<KOMUT_ADI>
callid=<benzersiz-string>
pageName=<GİB_SAYFA_ADI>
token=<oturum-token'ı>
jp=<JSON.stringify(payload)>
```

- **`cmd`** — hangi işlemin yapılacağını belirten, GİB'e özgü sabit bir isim
  (ör. `EARSIV_PORTAL_FATURA_OLUSTUR`). **Tanınmayan/geçersiz bir `cmd`
  gönderilirse GİB "Bu işlem için yetkiniz yok" gibi jenerik, yanıltıcı bir
  hata döner** — bu proje boyunca defalarca doğrulanmış bir davranış kalıbı
  (bkz. aşağıdaki "Yaygın hata tuzağı").
- **`callid`** — isteği ayırt etmek için üretilen benzersiz bir değer
  (`benzersizCallId()`: `Date.now().toString(36)-<0-9 arası rastgele
  rakam>`). Tam formatı önemli görünmüyor, ama **eksik olursa GİB isteği
  reddedebiliyor** — `EARSIV_PORTAL_FATURA_OLUSTUR` için bu, ilk denemelerde
  gözden kaçan bir alandı.
- **`pageName`** — isteğin "hangi ekrandan" geldiğini belirten GİB dahili
  sayfa kimliği. Aynı `cmd` bazen farklı `pageName` ile de çalışabiliyor
  gibi görünüyor ama gerçek yakalamalarda hangi kombinasyon kullanıldıysa
  o birebir korunuyor (ör. fatura oluşturma her zaman `RG_BASITFATURA`).
- **`token`** — login'den dönen oturum token'ı; login hariç her istekte
  zorunlu.
- **`jp`** — asıl işe yarayan veri, JSON'un **string'e çevrilmiş** hâli
  (form alanı olarak, ayrı bir Content-Type ile değil).

Portalın kendi web arayüzünden gelmiş gibi görünmek için `DEFAULT_HEADERS`
içinde standart bir tarayıcı isteğine ait `Referer`/`Origin`/`User-Agent`
başlıkları da gönderiliyor — bunlar gizli bir bypass değil, herhangi bir
tarayıcı isteğinde zaten açıkça görünen sıradan HTTP başlıklarıdır.

## GİB'in yanıt zarfı (envelope) tuhaflıkları

GİB'in `dispatch` yanıtları tutarlı bir şema izlemiyor; `dispatch()`
fonksiyonu bunları merkezi olarak normalize ediyor:

1. **`error` alanı boolean OLABİLİR, string de OLABİLİR.** Bazı uçlar
   `error: true/false` döner, bazıları `error: "0"` (başarılı) /
   `error: "1"` (hata) döner. `"0"` JavaScript'te **truthy**'dir — saf bir
   `if (envelope.error)` kontrolü başarılı yanıtları da hataya çevirir.
   `isGibHatasi()` bunu doğru yorumluyor: string ise `""`/`"0"` dışındaki
   her değer hata, boolean ise `true` hata.
2. **`data` alanı, `error` alanı olsun olmasın açılır.** Erken bir sürümde
   yalnızca `error` anahtarı varsa `data` açılıyordu; ama gerçek GİB
   yanıtlarının çoğu `error` hiç içermeden doğrudan
   `{"data": {...}, "metadata": {...}}` şeklinde geliyor. `dispatch()` artık
   `'data' in envelope` kontrolüyle, `error` durumundan bağımsız olarak her
   zaman `data`'yı açıp döndürüyor.
3. **Hata mesajları `messages[].message` VEYA `messages[].text` alanında
   gelebilir** — hangisi olduğu uca göre değişiyor, `extractErrorMessage()`
   ikisini de deniyor.

## Yaygın hata tuzağı: "Bu işlem için yetkiniz yok"

Bu proje boyunca tekrar tekrar gözlemlenen bir kalıp: **"Bu işlem için
yetkiniz yok" mesajı çoğunlukla GİB'in "geçersiz/tanınmayan `cmd`" için
verdiği jenerik hatadır — bir hesap/yetki kısıtlaması DEĞİL.** Bu proje
sırasında bu mesaj hem geçersiz bir `cmd` (`EARSIV_PORTAL_FATURA_KAYDET`,
`taslakGetir`'in ilk hâli, `logout`'un ilk hâli) hem de eksik bir payload
alanı (`callid` eksikken `EARSIV_PORTAL_FATURA_OLUSTUR`) için görüldü.

Bu yüzden `oturumHatasiMi()` (bkz. aşağıdaki "Oturum hatası tespiti") bu
mesajı **kasıtlı olarak** oturum hatası saymıyor — aksi halde her yanlış
cmd/payload denemesi kullanıcıyı otomatik olarak Login ekranına atar ve
gerçek nedeni gizlerdi.

## Oturum hatası tespiti (`gibHatasiniIsle`)

`OTURUM_HATASI_ANAHTAR_KELIMELER` listesindeki anahtar kelimelerden biri
(`"oturum sonland"`, `"token geçersiz"`, `"tekrar giriş yapınız"`,
`"süresi dol"`) GİB'in mesajında geçiyorsa, `GibApiError.oturumHatasi =
true` işaretlenir. `gibHatasiniIsle()` bunu görünce `useAuthStore.logout()`
çağırıp kullanıcıyı otomatik olarak Login ekranına döndürür. Bu liste,
gerçek bir oturum-süresi-doldu mesajının tam metni görüldükçe genişletilmeli.

## Confirmed cmd'ler ve `jp` şemaları

Hızlı doğrulama durumu tablosu için bkz. [gib-api-durumu.md](gib-api-durumu.md).
Aşağıda her birinin **gerçek** `jp` şeması özetleniyor.

### Giriş / Çıkış (assos-login)

```
assoscmd=anologin&rtype=json&userid=<kod>&sifre=<şifre>&sifre2=<şifre>&parola=1
assoscmd=logout&rtype=json&token=<token>
```

`sifre` ve `sifre2` aynı değeri iki kez taşıyor — GİB'in kendi formunun
şifre+şifre-tekrar alanlarının bir kalıntısı olabilir, ama isteğin
çalışması için ikisi de gerekli.

### Mükellef sorgusu — `SICIL_VEYA_MERNISTEN_BILGILERI_GETIR` (`RG_BASITFATURA`)

```json
{"vknTcknn": "11111111111"}
```

(Evet, alan adı `vknTcknn` — sonda **çift n**, kasıtlı GİB yazım hatası.)

Yanıt:
- VKN (şirket) → `{"unvan": "...", "vergiDairesi": "..."}`
- TCKN (şahıs) → `{"unvan": "", "adi": "...", "soyadi": "...", "vergiDairesi": "..."}`

### Kullanıcı bilgisi — `EARSIV_PORTAL_KULLANICI_BILGILERI_GETIR` (`RG_BASITFATURA`)

Boş `jp: {}`. Yanıtta `unvan` (şirket hesaplarında güvenilir) veya `ad`+`soyad`
(mükellef sorgusundakinden **farklı** alan adları — `adi`/`soyadi` değil).

### Taslak listesi — `EARSIV_PORTAL_TASLAKLARI_GETIR` (`RG_BASITTASLAKLAR`)

```json
{"baslangic": "GG/AA/YYYY", "bitis": "GG/AA/YYYY", "hangiTip": "5000/30000", "table": []}
```

Boş `jp` (tarih filtresi olmadan) "Bu işlem için yetkiniz yok" hatası verir
— filtre her zaman zorunlu, uygulama varsayılan olarak son 7 günü kullanır.

Yanıt dizisindeki her öge: `belgeNumarasi`, `aliciVknTckn`,
`aliciUnvanAdSoyad`, `belgeTarihi` (**"GG-AA-YYYY", tireli** — istek
parametrelerindeki "GG/AA/YYYY" ile karıştırılmamalı), `belgeTuru`,
`onayDurumu` (`"Onaylandı"` | `"Onaylanmadı"` | `"Silinmiş"`), `ettn`.

### Fatura HTML — `EARSIV_PORTAL_FATURA_GOSTER` (`RG_BASITTASLAKLAR`)

```json
{"ettn": "...", "onayDurumu": "Onaylanmadı"}
```

Yanıtın `data` alanı doğrudan ham HTML string'idir.

### Fatura oluşturma akışı — `EARSIV_PORTAL_FATURA_OLUSTUR` (`RG_BASITFATURA`)

**Bu, projenin en kritik ve en çok yanlış anlaşılan ucu.** İki farklı cmd
adayı denendi:

- `EARSIV_PORTAL_FATURA_KAYDET` — GİB'in referans alınan `f/fatura` açık
  kaynak projesinden geliyordu, ama bu hesapta hep "Bu işlem için yetkiniz
  yok" ile reddedildi.
- `EARSIV_PORTAL_FATURA_OLUSTUR` — kullanıcının gerçek DevTools
  yakalamasında, **iki ayrı gerçek fatura** (GENEL İADE ve TEVKİFAT
  tipleri) bu cmd ile başarıyla oluşturuldu:
  `"Faturanız başarıyla oluşturulmuştur. Düzenlenen Belgeler menüsünden
  faturanıza ulaşabilirsiniz."`

**Doğru/çalışan cmd `EARSIV_PORTAL_FATURA_OLUSTUR`'dur.**

Önemli: bu cmd'in başarı yanıtı **ettn/uuid içermez**, yalnızca düz bir
başarı metni döner. Bu yüzden `faturaKaydet()`, isteği göndermeden
**önce/sonra** taslak listesini (`taslakGetir`) karşılaştırıp yeni çıkan
kaydın `ettn`'ini bularak sonucu belirliyor — metin formatına bağımlı
olmayan, güvenilir bir yöntem.

`jp` payload'ının tam şeması ve her alanın anlamı için bkz.
[hesaplama-mantigi.md](hesaplama-mantigi.md#gibe-giden-gerçek-alan-adları).

### SMS ile imzalama — `EARSIV_PORTAL_SMSSIFRE_GONDER` / `_ONAYLA` (`RG_BASITFATURA`)

```json
// gönder
{"ettn": "..."}
// onayla
{"ettn": "...", "sifre": "<SMS kodu>"}
```

⚠️ Bu cmd adları ve şema **henüz gerçek bir DevTools yakalamasıyla
doğrulanmadı** — açık kaynak referanstan tahmindir (bkz.
[Issue #6](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/6)).

## Portalın kendi menü ağacından öğrenilenler

GİB portalının kendi tek-sayfa uygulamasının (SPA) menü yükleme çağrısından
(`getUserMenu`) şu gerçek sayfa adları görüldü — henüz bu uygulamada
kullanılmıyor ama ileride ilgili özellikler eklenirken referans olabilir:

| Menü öğesi | Gerçek `pageName` |
|---|---|
| e-Arşiv Fatura (İnteraktif) Oluştur | `RG_BASITFATURA` |
| Düzenlenen Belgeler e-Arşiv Fatura (İnteraktif) | `RG_BASITTASLAKLAR` |
| İptal/İtiraz Talepleri | `RG_IPTALITIRAZTASLAKLAR` |
| Adıma Düzenlenen Belgeler (bana kesilen faturalar) | `RG_ALICI_TASLAKLAR` |
| Kullanıcı Bilgileri | `RG_KULLANICI` |

Bu sayfa adlarına karşılık gelen `cmd`'ler henüz yakalanmadı.

`getUserMenu`/`SIDE.GET_EAGER_BF_DEFS` çağrılarının kendisi ve GİB
portalının kullandığı üçüncü parti JS kütüphaneleri (autoNumeric.js,
jQuery UI datepicker/timepicker, jquery.maskedinput) yalnızca **portalın
kendi web arayüzünün** (jQuery tabanlı SPA) çalışma mantığıdır — bu native
uygulamanın kendi UI'ı için doğrudan kullanılamaz/uygulanamaz; yalnızca
`autoNumeric.js`'in sayı biçimlendirme davranışı (ondalık sıfırları
basmama), GİB'e gönderilen tutarların neden ".00" içermediğini açıklamak
için referans alındı (bkz.
[hesaplama-mantigi.md](hesaplama-mantigi.md#tutar-biçimlendirme)).

## Test Modu (`IS_TEST_MODE`)

`gibApi.ts` içindeki `IS_TEST_MODE` sabiti `true` iken hiçbir gerçek istek
GİB'e gitmez; `login`/`getKullaniciBilgileri`/`mukellefBilgisiGetir`/
`taslakGetir`/`faturaKaydet`/SMS fonksiyonları sabit kodlanmış sahte
verilerle "çalışıyormuş gibi" davranır. Bu, arayüz geliştirmesini GİB'in
kararsız test portalından (`earsivportaltest.efatura.gov.tr`) bağımsız
kılmak için eklendi. **Canlıya geçmeden önce bu bayrağın `false` olduğundan
emin olunmalı** (proje genelinde her zaman `false` tutulacağı konusunda
açık bir kural var).
