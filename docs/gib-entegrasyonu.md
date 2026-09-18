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
{"baslangic": "GG/AA/YYYY", "bitis": "GG/AA/YYYY", "hangiTip": "5000/30000"}
```

(Önceki sürümde spekülatif olarak eklenmiş bir `"table": []` alanı vardı — gerçek yakalamada bu alan yok, kaldırıldı.)

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

### Taslak fatura silme — `EARSIV_PORTAL_FATURA_SIL` (`RG_BASITTASLAKLAR`)

```json
{
  "silinecekler": [{
    "faturaOid": "", "toplamTutar": "0", "belgeNumarasi": "GIB2026000000001",
    "aliciVknTckn": "...", "aliciUnvanAdSoyad": "...",
    "saticiVknTckn": "", "saticiUnvanAdSoyad": "",
    "belgeTarihi": "18-09-2026", "belgeTuru": "FATURA",
    "onayDurumu": "Onaylanmadı", "ettn": "...",
    "talepDurumColumn": "----------", "iptalItiraz": "-99", "talepDurum": "-99"
  }],
  "aciklama": "hatali duzenlenmistir"
}
```

**Kritik gözlem:** GİB'in kendi arayüzü, `EARSIV_PORTAL_TASLAKLARI_GETIR`
yanıtındaki satırı **aynen geri gönderiyor** — `ettn` dışındaki hiçbir alanı
yeniden hesaplamıyor/oluşturmuyor. Bu yüzden `faturaSil(token, taslak,
aciklama)` da `taslakGetir()`'in döndürdüğü ham `TaslakFatura` objesini
parametre olarak alıyor, yeniden inşa etmiyor.

GİB'in kendi web arayüzündeki gerçek kullanıcı akışı **iki adımlı**:
1. "Uyarı" popup'ı: "Bu belgeyi silmek üzeresiniz." + "Uyarıyı okudum"
   onay kutusu işaretlenmeden "Sil" ilerlemiyor.
2. "Açıklama" popup'ı: "Silme gerekçenizi giriniz:" metin alanı — bu değer
   `aciklama` olarak isteğe eklenir.
3. İkinci "Sil"e basılınca gerçek istek gönderiliyor; başarı mesajı GİB'in
   kendi arayüzünde "1 fatura başarıyla silindi." şeklinde çıkıyor.

Bu iki adımlı akış `TaslaklarScreen.tsx`'te (`silHedefi`/`silUyariOkundu`/
`silAciklamaAcik` state'leri) birebir uygulandı.

**Bilinen GİB hata mesajı:** zaten silinmiş bir belgeyi tekrar silmeye/
düzenlemeye çalışmak "Silinmiş belgeler düzenlenemez!" mesajıyla
reddediliyor (canlı gözlemlendi). Bu, `dispatch()`'in genel `messages`
işleyişiyle otomatik olarak yakalanıp çağırana iletiliyor; özel bir kod
yolu gerektirmiyor.

### İptal talebi oluşturma — `EARSIV_PORTAL_IPTAL_TALEBI_OLUSTUR` (`RG_BASITTASLAKLAR`)

```json
{"ettn": "...", "onayDurumu": "Onaylandı", "belgeTuru": "FATURA", "talepAciklama": "sehven hatali duzenlenmistir"}
```

`faturaSil`'in aksine, bu istek taslağın tüm alanlarını değil yalnızca
dördünü taşıyor. **Yalnızca ONAYLANMIŞ (imzalanmış) faturalar için
anlamlı** — `onayDurumu: "Onaylandı"` gönderilir; taslak (henüz
onaylanmamış) bir fatura silinir (`EARSIV_PORTAL_FATURA_SIL`), iptal
edilmez. Bu, GİB'in kendi arayüzünde bir kategorik ayrım: **Sil** =
kesilmemiş bir taslağı yok et, **İptal Talebi** = zaten kesilmiş/imzalanmış
bir faturayı geçersiz kılmayı talep et (alıcının onayına tabi).

Kullanıcı akışı: gerekçe metni (max 255 karakter, canlı `x/255` sayaç) +
"Düzenlemiş olduğunuz belge için iptal talebi oluşturmak istiyorsunuz...
geri çekilemeyecek ve alıcıya iletilecektir." uyarısı + "Uyarıyı Okudum"
onayı (işaretlenmeden buton devre dışı). Başarı mesajı: "İptal talebiniz
başarıyla oluşturulmuştur."

Başarılı bir iptal talebinden sonra, taslak listesindeki (`taslakGetir`)
ilgili satırın gerçek alan adları **kullanıcının konsol yakalamasıyla
doğrulandı**: `iptalItiraz` ve `talepDurum`. İkisi de yalnızca belgede bir
iptal/itiraz talebi VARSA gelir (talepsiz belgelerde bu alanlar taslak
listesi yanıtında hiç yok). Gözlemlenen tek somut örnek:

```json
{"iptalItiraz": "0", "talepDurum": "1"}
```

Bu, GİB'in kendi ekranında "İptal/İtiraz Durumu: İptal Kabul Edildi" olarak
gösteriliyordu ve gerçekten bir İPTAL talebiydi (İtiraz değil). Buradan
çıkarılan yorum: `iptalItiraz` talebin TÜRÜNÜ taşıyor (`"0"` = İptal
doğrulandı, `"1"` = İtiraz **tahmin**), `talepDurum` ise
`EARSIV_PORTAL_IPTAL_ITIRAZ_TALEP_DURUM_GUNCELLE`'ye gönderilen
`talepCevabi`yi yansıtıyor (`"1"` = Kabul Edildi doğrulandı). "İptal
Aşamasında" (henüz cevaplanmamış) durumunun ham `talepDurum` değeri henüz
yakalanmadı — `TaslaklarScreen.tsx`'teki `iptalItirazDurumMetni()`, `"1"`
dışındaki her değer için güvenli, genel bir "Aşamasında" metni gösteriyor.

Ayrıca bu, `EARSIV_PORTAL_FATURA_SIL` payload'ındaki `iptalItiraz: "-99"` /
`talepDurum: "-99"` varsayılan değerlerini de geriye dönük doğruluyor: "-99"
gerçekten "hiç talep yok" sentinel değeriymiş — talep olmayan belgelerde bu
alanlar zaten taslak listesi yanıtında hiç gelmiyor.

### İptal/İtiraz Talepleri ekranı — iki cmd

**Listeleme — `EARSIV_PORTAL_GELEN_IPTAL_ITIRAZ_TALEPLERINI_GETIR` (`RG_IPTALITIRAZTASLAKLAR`)**

```json
{"baslangic": "GG/AA/YYYY", "bitis": "GG/AA/YYYY"}
```

Yanıt satırlarının gerçek sütunları (GİB'in kendi tablo başlıklarından):
Belge Numarası, Satıcı/Alıcı Vkn-Tckn ve Unvan/Ad Soyad, İptal/İtiraz Talep
Tarihi, Belge Türü, İtiraz Yöntemi, İtiraz Belge Numarası (`referansBelgeId`),
İtiraz Belge Tarihi (`referansBelgeTarihi`), İptal/İtiraz Durumu
(`iptalItirazDurumuColumn`).

**Durum güncelleme — `EARSIV_PORTAL_IPTAL_ITIRAZ_TALEP_DURUM_GUNCELLE` (`RG_IPTALITIRAZTASLAKLAR`)**

```json
{"iptalItirazOid": "1amu3wkp5w1s61", "talepCevabi": 1, "belgeTuru": "FATURA", "retAciklama": ""}
```

`talepCevabi: 1` = **Kabul** — canlı yanıtla doğrulandı ("İptal Talebi
Kabul" popup'ı: "{belgeNumarası} numaralı belge için iptal talebini
onaylamak istiyorsunuz... geri çekilemeyecektir." + "Uyarıyı Okudum" onayı).
Kabulden sonra liste otomatik yeniden sorgulanıyor (GİB'in kendi arayüzü
de aynısını yapıyor).

`talepCevabi: 0` (**Reddet**) ve dolu bir `retAciklama` gönderme, alan
adlarından çıkarılan mantıklı ama **henüz canlı doğrulanmamış** bir
varsayımdır (bkz.
[Issue #18](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/18)).

`iptalItirazOid` — tabloda görünen bir sütun değil, ama durum güncelleme
isteğinde zorunlu; satır objesinde geldiği varsayılıyor (ayrı bir liste
yanıtı yakalamasıyla henüz teyit edilmedi).

### SMS ile imzalama (GİB İmza) — üç adımlı akış

Bu akış, gerçek DevTools yakalamasıyla **uçtan uca canlı doğrulandı**
(gerçek bir fatura "SMS şifreniz doğrulandı, işlem başarılı." yanıtıyla
imzalandı). Önceki sürümdeki `{ettn}`/`{ettn, sifre}` şeması ve
`RG_BASITFATURA` sayfa adı tamamen yanlıştı; gerçek akış üç ayrı isteğe
dayanıyor:

**1) Kayıtlı telefon numarasını sorgula — `EARSIV_PORTAL_TELEFONNO_SORGULA` (`RG_BASITTASLAKLAR`)**

"GİB İmza" tıklanır tıklanmaz, boş `jp: {}` ile atılıyor. Yanıt, GİB'e
kayıtlı cep telefonu numarasıdır — SMS Onay ekranında maskeli gösterilir
(ör. `(555) 123 45 67`).

**2) SMS'i gönder — `EARSIV_PORTAL_SMSSIFRE_GONDER` (`RG_SMSONAY`)**

```json
{"CEPTEL": "5551234567", "KCEPTEL": false, "TIP": ""}
```

Kritik nokta: bu istekte **`ettn` hiç yok**. SMS, belirli bir faturaya değil,
doğrudan GİB'e kayıtlı telefon numarasına gönderiliyor — fatura ile bağlantı
yalnızca 3. adımda kuruluyor. `CEPTEL` alanı, 1. adımdaki telefon numarasının
ham hâli (boşluksuz, parantezsiz rakamlar).

**3) SMS kodunu onayla — opak bir cmd (`RG_SMSONAY`)**

```json
{
  "SIFRE": "V5VYSC", "OID": "2qmu3wkv6a1rxf", "OPR": 1,
  "DATA": [{
    "faturaOid": "", "toplamTutar": "0", "belgeNumarasi": "GIB2026000000001",
    "aliciVknTckn": "...", "aliciUnvanAdSoyad": "...",
    "saticiVknTckn": "", "saticiUnvanAdSoyad": "",
    "belgeTarihi": "18-09-2026", "belgeTuru": "FATURA",
    "onayDurumu": "Onaylanmadı", "ettn": "...",
    "talepDurumColumn": "----------", "iptalItiraz": "-99", "talepDurum": "-99"
  }]
}
```

**En dikkat çekici bulgu: bu isteğin `cmd` alanı GİB'in standart
`EARSIV_PORTAL_*` isimlendirmesine hiç uymuyor — opak, anlamsız görünen bir
string: `"0lhozfib5410mp"`.** Bu proje içinde daha önce, açık kaynak
`f/fatura` referansında bu TAM DEĞER görülüp şüpheli/enjekte edilmiş bir
değer olabileceği düşünülerek reddedilmişti. Kullanıcının kendi GERÇEK,
canlı DevTools yakalamasında AYNI değerle karşılaşılması — hem de başarılı
bir sonuçla — bunun üçüncü taraf bir kaynaktan gelen şüpheli bir enjeksiyon
değil, GİB'in kendi JavaScript kodunda sabit kodlanmış gerçek bir cmd
olduğunu doğruluyor. İki bağımsız kaynakta (farklı hesap, farklı zaman)
birebir aynı string'in görülmesi, bunun oturuma/işleme özgü rastgele bir
değer değil, **sabit bir sabit** olduğuna işaret ediyor.

Diğer alanlar:
- `DATA` — imzalanacak taslak(lar), `EARSIV_PORTAL_FATURA_SIL`'deki
  `silinecekler` ile AYNI desende: `taslakGetir()`'den gelen ham satır, hiç
  değiştirilmeden bir dizi içinde gönderiliyor.
- `OID` — `smsSifreGonder`'in (2. adım) yanıtından gelen bir işlem kimliği
  olduğu düşünülüyor; `gibApi.ts`'teki `smsSifreGonder`, `dispatch()`'in
  açtığı `data` değerini doğrudan bu OID olarak döndürüyor. **Bu tek bağlantı
  henüz bağımsız bir yanıt yakalamasıyla teyit edilmedi** — sonraki canlı
  denemede `smsSifreGonder`'in ham yanıtı (konsola zaten basılıyor) kontrol
  edilmeli.
- `OPR` — sabit `1` (muhtemelen "onayla" işlem tipi; başka değerler
  gözlemlenmedi).

GİB'in kendi arayüzündeki gerçek kullanıcı akışı, `TaslaklarScreen.tsx`'te
birebir uygulandı:
1. **1. Adım** — "Bu belge imzalandığında geçerlilik kazanacak olup,
   imzalandıktan sonra düzeltilmesi mümkün değildir." uyarısı + "Uyarıyı
   Okudum" onay kutusu (işaretlenmeden ilerlenemez) + kayıtlı telefon
   numarası (maskeli) + "Şifre Gönder".
2. **2. Adım** — SMS'in 180 saniyelik geçerlilik süresi için geri sayım +
   6 haneli şifre girişi + "Onayla". Süre dolarsa "Onayla" devre dışı kalır.
3. Başarılı onaydan sonra GİB'in kendi mesajı ("SMS şifreniz doğrulandı,
   işlem başarılı.") aynen gösterilir ve taslak listesi yenilenir.

## Portalın kendi menü ağacından öğrenilenler

GİB portalının kendi tek-sayfa uygulamasının (SPA) menü yükleme çağrısından
(`getUserMenu`) şu gerçek sayfa adları görüldü:

| Menü öğesi | Gerçek `pageName` | Durum |
|---|---|---|
| e-Arşiv Fatura (İnteraktif) Oluştur | `RG_BASITFATURA` | ✅ Uygulandı |
| Düzenlenen Belgeler e-Arşiv Fatura (İnteraktif) | `RG_BASITTASLAKLAR` | ✅ Uygulandı |
| İptal/İtiraz Talepleri | `RG_IPTALITIRAZTASLAKLAR` | ✅ Uygulandı (`IptalItirazTalepleriScreen`) |
| Adıma Düzenlenen Belgeler (bana kesilen faturalar) | `RG_ALICI_TASLAKLAR` | ⏳ Henüz uygulanmadı — cmd'ler yakalanmadı (bkz. [Issue #19](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/19)) |
| Kullanıcı Bilgileri | `RG_KULLANICI` | ⏳ `getKullaniciBilgileri` şu an `RG_BASITFATURA` ile çalışıyor (canlı doğrulandı), bu daha "doğru" sayfa adı henüz denenmedi |

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
