# Özellikler — Ekran Ekran Detaylı Anlatım

## Uygulama hesabı akışı

Uygulama artık doğrudan GİB giriş ekranıyla açılmaz. Önce bir **uygulama
hesabı** gerekir; GİB girişi bu hesaba girdikten sonra gelir. Kararlar ve
gerekçeler: [hesap-sistemi.md](hesap-sistemi.md).

### Karşılama (`src/screens/KarsilamaScreen.tsx`)

"Kayıt Ol" ve "Giriş Yap". GİB girişi burada **yoktur**.

**"Şimdilik atla" (DEMO, 2026-09-21):** hesap oluşturmadan doğrudan GİB giriş
ekranına geçer. Seçim cihaza yazılmaz — uygulama kapatılıp açılınca Karşılama
ekranı tekrar gelir ve bu modda açılan GİB oturumu hatırlanmaz (hiçbir uygulama
hesabına bağlı olmadığı için `hesap_gib_sahibi` kuralı onu geri yüklemez).
Bu modda GİB giriş ekranındaki düğme "Kayıt ol / giriş yap" olur ve Karşılama
ekranına döner; Dashboard'da "Hesabımı Sil" görünmez, çıkış seçeneği
"Tamamen çık" olur. Altta, GİB
verisinin hesap sunucusuna gitmediğini söyleyen kısa bir bilgi kutusu var.

### Kayıt Ol (`src/screens/HesapKayitScreen.tsx`)

E-posta, **Uygulama Kullanıcı Adı** ve şifre. Kullanıcı adı GİB kullanıcı
kodundan bağımsızdır: 3–20 karakter, harf/rakam/nokta/alt çizgi ve **en az bir
harf**. "En az bir harf" kuralı bilinçlidir — yalnızca rakamdan oluşan bir
değer (VKN, TCKN, çoğu GİB kullanıcı kodu) reddedilir.

Girilen kullanıcı adı, cihazda hatırlanan GİB kullanıcı koduyla **yalnızca
cihazda** karşılaştırılır; eşitse istek **hiç gönderilmez** ve kullanıcıya
bunun GİB kodu olduğu söylenir.

Kayıt düğmesinin yakınında Aydınlatma Metni, Gizlilik Politikası ve Hizmet
Şartları bağlantıları bulunur. **Açık rıza kutucuğu bilerek yoktur**:
sözleşmenin kurulması için gerekli veriler açık rızaya bağlanmaz.

### Giriş Yap (`src/screens/HesapGirisScreen.tsx`)

E-posta + şifre. Sunucu, yanlış şifre ile kayıtlı olmayan e-posta için
**birebir aynı** yanıtı döner. "Şifremi unuttum" bağlantısı buradadır.

### E-posta Doğrula (`src/screens/EpostaDogrulaScreen.tsx`)

6 haneli kod. **Doğrulamadan GİB giriş ekranına geçilemez.** Kod 15 dakika
geçerli, tek kullanımlık ve 5 yanlış denemeden sonra geçersiz. "Kodu yeniden
gönder" 60 saniyede bir kullanılabilir. Posta gelmezse kullanıcı buradan
hesaptan çıkabilir.

### Şifremi Unuttum (`src/screens/SifremiUnuttumScreen.tsx`)

İki adım: e-posta ile kod istenir, sonra kod + yeni şifre gönderilir. Şifre
değişince o hesabın **tüm oturumları** kapanır.

### Hesabımı Sil (`src/screens/HesapSilScreen.tsx`)

Dashboard → **Hesabımı Sil**. Şifre yeniden istenir ve ayrıca bir onay
diyaloğu gelir. Silmeden önce GİB oturumu kapatılır (hesap gidince o oturum
sahipsiz kalırdı). Ekran, **cihazdaki GİB defterlerinin silinmediğini**
açıkça söyler. Uygulama olmadan silmek için herkese açık sayfanın adresi de
gösterilir.

### Hukuki Metinler (`src/screens/HukukiMetinScreen.tsx`)

Aydınlatma metni, gizlilik politikası ve hizmet şartları uygulama içinde
gösterilir (Google Play gizlilik politikasının uygulama içinde de bulunmasını
istiyor). **Hepsi taslaktır ve hukuki inceleme bekler.**

## GİB Girişi (`src/screens/LoginScreen.tsx`)

- **GİB duyuru kutusu** (`src/components/DuyuruKutusu.tsx`): formun üstünde,
  süresi dolmamış ve kullanıcının kapatmadığı ilk GİB duyurusu (ör. planlı bakım)
  gösterilir. Duyurular `src/constants/duyurular.ts`'te elle tanımlanır ve
  uygulama güncellemesiyle gelir; **uzaktan çekilmez**. Uygulamanın artık bir
  hesap sunucusu var, ama o sunucu bilerek yalnızca hesap işlerini yapıyor —
  duyuru dağıtmak için kullanılmıyor (bkz. [hesap-sistemi.md](hesap-sistemi.md)).
  Her duyurunun bir `bitis` anı vardır; o an geçince kutu kendiliğinden gizlenir.
  Sağ üstteki × ile kapatılan duyuru cihazda hatırlanır (`gib_kapatilan_duyurular`)
  ve bir daha gösterilmez. Duyurudaki GİB bağlantısına dokununca tarayıcıda açılır.
  İlk duyuru: 19–20/9/2026 planlı bakım (bitiş 20/9/2026 23:59, Türkiye saati).
  Yeni duyuru eklemek için diziye yeni bir `id` ile öge eklenir; metin GİB'in
  duyurusundan birebir alınır.
- Kullanıcı Kodu + Şifre alanları; şifre alanında göz ikonuyla göster/gizle.
- **"Kullanıcı Kodunu Hatırla"** — varsayılan olarak işaretli gelir.
  İşaretliyse, başarılı girişten sonra kullanıcı kodu, **uygulama hesabına
  özel** bir listenin başına yazılır (`src/utils/hatirlananKodlar.ts`, en fazla
  10 kod); işaretsizse yalnızca o kod listeden çıkarılır. Bir kullanıcı birden
  fazla GİB koduyla çalışabildiği için birden çok kod hatırlanıyorsa giriş
  ekranının üstünde çipler olarak görünür: dokununca kod alana gelir, basılı
  tutunca listeden kaldırılır. Form en son kullanılan kodla (kullanıcı
  **çıkış yapmış olsa bile**) doldurulur. Başka bir uygulama hesabı bu kodları
  görmez.
  Bu, `useAuthStore`'un oturum token'ı için kullandığı anahtarlardan tamamen
  **ayrı** bir mekanizmadır — biri "formu hatırla", diğeri "oturumu sürdür".
  **Şifre hiçbir zaman saklanmaz** (eski "Şifreyi Hatırla" seçeneği kaldırıldı;
  eski sürümden kalmış kayıtlı şifre açılışta silinir).
- Giriş başarılı olduğunda `useAuthStore.login()` çağrılır; token state'e
  yazılır ve `App.tsx`'teki navigasyon kökü bunu dinleyip otomatik olarak
  Dashboard yığınına geçer (ayrı bir "git" komutu yok).
- Giriş başarısız olursa GİB'in döndürdüğü kısa Türkçe hata mesajı gösterilir;
  bilinen metinler anlaşılır bir açıklamaya çevrilir (bkz.
  [gib-entegrasyonu.md — Hata mesajlarının çevrilmesi](gib-entegrasyonu.md#hata-mesajlarının-çevrilmesi-gibhatamesajlarits)).

## Dashboard (`src/screens/DashboardScreen.tsx`)

- Üstte mükellef unvanı (`kullaniciBilgisi.unvan`, yoksa `kullaniciKodu`,
  o da yoksa "Mükellef") tek satır + `ellipsizeMode="tail"` ile kısaltılarak
  gösterilir — çok uzun şirket unvanları (`"... LİMİTED ŞİRKETİ"`) taşmasın
  diye.
- **"Belge İşlemleri"** başlıklı bir bölüm, GİB'in kendi ana menüsündeki
  4 alt sekmeyle birebir eşleşiyor (bkz. gerçek menü ağacı yakalaması):
  1. **e-Arşiv Fatura (İnteraktif) Oluştur** → `FaturaKesim`
  2. **Taslak / Kesilen Faturalar** → `Taslaklar`
  3. **İptal / İtiraz Talepleri** → `IptalItirazTalepleri` (bkz. aşağıda)
  4. **Adıma Düzenlenen Belgeler** → `AdimaDuzenlenen` (bkz. aşağıda)
- **"Faturaları Cihazımda Yedekleme"** bölümü (GİB'de yok): **Faturaları
  Şimdi Yedekle** → `Yedekle`, **Yedeklenen Faturaları Görüntüle** →
  `YedekleriGoruntule` (bkz. aşağıda).
- **"Kullanıcı İşlemleri"** başlıklı ikinci bir bölüm, GİB'in kendi ana
  menüsünün ikinci dalıyla eşleşiyor: **Kullanıcı Bilgileri** →
  `KullaniciBilgileri` (bkz. aşağıda). Ayrıca GİB'de karşılığı olmayan,
  cihazdaki kayıtlar için **Alıcı Defteri** → `AliciDefteri` ve **Mal/Hizmet
  Defteri** → `MalHizmetDefteri`.
- Sağ üstte "Güvenli Çıkış" ikonu; onay diyaloğundan sonra
  `useAuthStore.logout()` çağrılır (bkz. aşağıdaki "Oturum Yönetimi").

- **Uygulama Kilidi** kartı (sayfanın altında): cihazın kilit yöntemiyle
  doğrulama istenip istenmeyeceğini açıp kapatan anahtar. Kapatmak için önce
  kimlik doğrulanır. Ayrıntılar için bkz.
  [guvenlik-ve-veri.md — Uygulama kilidi](guvenlik-ve-veri.md).

## Kullanıcı Bilgileri (`src/screens/KullaniciBilgileriScreen.tsx`)

GİB'e kayıtlı mükellef/firma bilgilerini görüntüleme ve düzenleme ekranı —
"Kullanıcı İşlemleri > Kullanıcı Bilgileri" (`RG_KULLANICI`).

- Üç kart: kimlik bilgileri (VKN/TCKN, Unvan, Ad, Soyad, Sicil No, Mersis
  No, Vergi Dairesi), adres (Cadde, Apartman Adı/No, Kapı No, Mahalle,
  İlçe, İl seçici, Posta Kodu, Ülke seçici), iletişim (Tel No, Faks No,
  e-Posta, Web Sitesi, İş Merkezi).
- **VKN/TCKN salt okunur** — GİB'in kendi ekranında da bir `<span>` (input
  değil); mükellef tarafında değiştirilemez. Diğer tüm alanlar
  düzenlenebilir.
- İl/Ülke seçicileri, fatura kesim formundaki `ULKELER` listesinden
  **kasıtlı olarak ayrı** tutulan `KULLANICI_ILLERI`/`KULLANICI_ULKELERI`
  listelerini kullanıyor — GİB bu iki ekranda farklı (ve farklı
  biçimlendirilmiş) ülke listeleri sunuyor.
- Ekran açılır açılmaz mevcut bilgiler çekilir; "Kaydet" butonu
  `EARSIV_PORTAL_KULLANICI_BILGILERI_KAYDET` isteğini gönderir.
- **Bu ekran, "GİB İmza" akışındaki kayıtlı telefon numarasının da tek
  güvenilir kaynağı** — bkz. [gib-entegrasyonu.md](gib-entegrasyonu.md).

## Mal/Hizmet Defteri (`src/screens/MalHizmetDefteriScreen.tsx`)

"Kullanıcı İşlemleri"nde Alıcı Defteri'nin altında. Açık GİB hesabına
(kullanıcı koduna) özel kayıtlı mal/hizmet adları (en fazla 50; yalnızca ad,
tutar/miktar yok):

- **Ekle** (sağ üstte +): ad en üste eklenir. Aynı ad (büyük/küçük harf
  farkı gözetmeksizin) zaten varsa eklenmez, "Zaten kayıtlı" denir. Defter
  doluysa onay sorulur, en alttaki kayıt düşer.
- **Düzenle**: adı değiştirir, kaydın sıradaki yeri korunur. Yeni ad başka
  bir kayıtla aynıysa kayıtlar birleştirilmez, uyarı verilir.
- **Sil**: onaylı silme.
- Arama. Ad en fazla 500 karakter (`MAL_HIZMET_AD_EN_UZUN`; uygulamanın
  depolama sınırı, GİB kuralı değil).
- Fatura başarıyla oluşturulunca kalem adları yine otomatik eklenir; fatura
  formundaki "Kayıtlı Mal/Hizmet Seç" aynı defteri kullanır.
- İşlemler: `malHizmetEkle`, `malHizmetAdiniDegistir`, `malHizmetSil`
  (`src/utils/malHizmetDefteri.ts`, testli).

## Alıcı Defteri (`src/screens/AliciDefteriScreen.tsx`)

"Kullanıcı İşlemleri > Alıcı Defteri" — GİB'de karşılığı olmayan, uygulamanın
cihazda tuttuğu **bu hesaba özel** kayıtlı alıcıların yönetimi
(`src/utils/aliciDefteri.ts`).

- Liste: unvan (ya da ad soyad), VKN/TCKN, vergi dairesi, ülke, adres; üstte
  kayıt sayısı (`x/50`) ve unvan/ad/VKN ile arama.
- **Adresi Düzenle:** yalnızca **adres ve ülke** değiştirilebilir; kaydın
  sırası değişmez. Unvan/Ad/Soyad/Vergi Dairesi burada da düzenlenemez
  (`aliciAdresGuncelle` yalnızca bu iki alanı yazar).
- **Sil:** onay penceresinden sonra kayıt defterden silinir.
- **Elle ekleme** (sağ üstteki kişi+ ikonu): fatura formundaki
  `AliciBilgileriKarti` birebir kullanılır — VKN/TCKN kontrol basamağı yerelde
  doğrulanır, Unvan/Ad/Soyad/Vergi Dairesi **salt okunurdur ve yalnızca GİB
  sorgusuyla** (`mukellefBilgisiGetir`) dolar; adres zorunludur. "Deftere
  Kaydet" ancak sorgu başarılı olunca aktifleşir. Veri katmanı da
  (`aliciKaydedilebilirMi`) kontrol basamağı geçersiz ya da unvanı/ad-soyadı
  boş bir kaydı reddeder. Aynı VKN zaten kayıtlıysa güncelleme onayı, defter
  doluysa (50) en eski kaydın düşeceği uyarısı gösterilir.
- Ekleme formu açıkken geri tuşu/hareketi önce formu kapatır.
- Cihaz depolaması yazmayı reddederse (bkz.
  [guvenlik-ve-veri.md](guvenlik-ve-veri.md) — boyut notu) işlem sessizce
  kaybolmaz, "Kaydedilemedi" uyarısı gösterilir. Fatura oluşturma sonrası
  otomatik kayıt başarısız olursa da başarı mesajına not düşülür.

## Fatura Kesim Formu (`src/screens/FaturaKesimScreen.tsx` + `src/screens/fatura/*`)

Orkestratör ekran (`FaturaKesimScreen`) beş bağımsız "kart" bileşenini
birleştirir ve tek bir `FaturaFormState` (bkz. `src/types/faturaForm.ts`)
üzerinde tutar:

### 1. Fatura Bilgileri (`FaturaBilgileriKarti.tsx`)

- Düzenlenme Tarihi/Saati (`@react-native-community/datetimepicker`).
- **7 gün kuralı**: Seçilen tarih bugünden ileriyse sessizce bugüne çekilir;
  geriye dönük 7 günden eskiyse bir `Alert` ile kullanıcıya "7 gün öncesine
  otomatik ayarlayayım mı?" diye sorulur (`yediGunKuraliUygula`). Bu kural
  GİB'in kendi kısıtlamasının **istemci tarafında** tekrarıdır — GİB
  teknik olarak daha eskiye izin verse de uygulama önden uyarır.
- Doküman Para Birimi (`PARA_BIRIMLERI`, 177 gerçek kod) ve Döviz Kuru.
- Fatura Tipi (`FATURA_TIPLERI`, 13 gerçek değer: `SATIS`, `IADE`,
  `TEVKIFAT`, `TEVKIFATIADE`, `ISTISNA`, `OZELMATRAH`, `IHRACKAYITLI`,
  `KONAKLAMAVERGISI`, `YTBSATIS`, `YTBISTISNA`, `YTBIADE`, `YTBTEVKIFAT`,
  `YTBTEVKIFATIADE`).

### 2. Alıcı Bilgileri (`AliciBilgileriKarti.tsx`)

- VKN (10 hane) veya TCKN (11 hane) girildiğinde önce **kontrol basamağı**
  yerelde doğrulanır (`src/utils/kimlikDogrula.ts`); hatalıysa alanın altında
  uyarı gösterilir, GİB'e sorgu atılmaz ve önceki sorgudan kalan unvan/ad
  temizlenir. Geçerliyse 400ms debounce sonrası `mukellefBilgisiGetir`
  otomatik tetiklenir.
  - VKN (10 hane) → **Unvan** dolar, Ad/Soyad boş kalır (şirket).
  - TCKN (11 hane) → **Ad/Soyad** dolar, Unvan boş kalır (şahıs).
- Unvan/Ad/Soyad/Vergi Dairesi alanları **her zaman salt okunur**
  (`editable={false}`) — kullanıcı bunları elle giremez, yalnızca GİB
  sorgusuyla dolar. Bu, yanlış/uydurma unvan girilerek hatalı fatura
  kesilmesini engellemek için bilinçli bir tasarım kararıdır.
- Sorgu başarısız olursa (`sorguHatali`) alanlar temizlenir ve kullanıcıya
  kırmızı bir uyarı metni gösterilir.
- VKN/TCKN alanı **her değiştiğinde** önceki sorgudan kalan Unvan/Ad/Soyad/
  Vergi Dairesi hemen temizlenir; yeni numaranın sorgusu dönene kadar eski
  alıcının unvanı yeni numaranın yanında görünmez ve "Oluştur" bu arada aktif
  olmaz. Kayıtlı bir alıcı seçildiğinde de unvan bilgisi GİB'den yeniden
  sorgulanır (adres/ülke korunur).
- **"Kayıtlı Alıcılardan Seç"** — `aliciDefteri.ts` üzerinden cihazda
  (SecureStore, en fazla 50 kayıt) tutulan, daha önce fatura kesilmiş
  alıcılar arasından tek dokunuşla seçim yapılabilir. Bir fatura başarıyla
  oluşturulduğunda alıcı otomatik olarak bu deftere kaydedilir/güncellenir
  (aynı VKN/TCKN varsa listenin başına taşınır).
- Ülke seçimi `ULKELER` (260 gerçek GİB değeri) listesinden yapılır.

### 3. İrsaliye Bilgileri (`IrsaliyeBilgileriKarti.tsx`)

- İrsaliye No (opsiyonel metin) ve İrsaliye Tarihi (opsiyonel tarih seçici).

### 4. Mal/Hizmet Bilgileri (`MalHizmetKarti.tsx`)

- Dinamik kalem listesi: "Satır Ekle" ile yeni kalem, en az 1 kalem kalacak
  şekilde silme.
- Her kalem için: Mal/Hizmet Adı, Miktar, Birim Fiyat, Birim (`BIRIMLER`),
  İskonto Oranı %, KDV Oranı (`SegmentedButtons`, `%0/%1/%10/%20`).
- **"Kayıtlı Mal/Hizmet Seç"** (her kalemde, adın altında): bu hesaba özel,
  cihazda tutulan en fazla 50 mal/hizmet adından biri seçilip o kalemin adına
  yazılır (`src/utils/malHizmetDefteri.ts`). Fatura başarıyla oluşturulunca
  kalemlerdeki adlar otomatik eklenir (aynı ad büyük/küçük harf farkı
  gözetilmeden tek kayıt olur ve en üste taşınır; en eski kayıtlar 50'yi
  aşınca düşer). Diyalogdaki çöp kutusu ikonuyla, onaydan sonra kayıt silinir.
  Yalnızca **adlar** saklanır; tutar/miktar/birim saklanmaz.
- Kalem altında anlık hesaplanan **Mal/Hizmet Tutarı** ve **KDV Tutarı**
  gösterilir (bkz. [hesaplama-mantigi.md](hesaplama-mantigi.md)).
- **"Vergi Seçiniz"** — `VERGI_TURLERI`'nin 29 gerçek GİB kodu listelenir,
  ama **yalnızca `V9015` (KDV Tevkifat)** seçilebilir; diğer 28 kod
  "(henüz desteklenmiyor)" ekiyle **pasif** gösterilir (`VERGI_SECENEKLERI`,
  `src/utils/vergiDestegi.ts`) çünkü GİB'e nasıl gönderildikleri bilinmiyor
  (bkz. [Issue #1](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/1)).
  Seçicinin altında bu kısıtı anlatan kısa bir not var.
- `V9015` seçilip Fatura Tipi de tevkifatı destekliyorsa (`TEVKIFAT`,
  `TEVKIFATIADE`, `YTBTEVKIFAT`, `YTBTEVKIFATIADE`) Tevkifat Kodu seçici
  (`TEVKIFAT_KODLARI`, 52 kod) açılır; kod seçilince oran otomatik dolar ve
  Tevkifat Tutarı anlık hesaplanır.
- Kalemde **tevkifat kodu seçilmemişse** ya da **Fatura Tipi tevkifatla
  uyumsuzsa**, kalemin altında ve "Oluştur"un altında kırmızı uyarı çıkar ve
  "Oluştur" pasif kalır (`vergiUyumsuzlukHatasi`). Önceden kod seçildikten
  sonra tip SATIŞ'a çevrilirse uyarıya rağmen tevkifat hesaplanıp GİB'e
  gönderiliyordu; kod seçilmezse tevkifat sessizce uygulanmıyordu.

### 5. Toplamlar (`ToplamlarKarti.tsx`)

- Mal/Hizmet Toplam Tutarı, Toplam İskonto, Hesaplanan KDV.
- Tevkifat varsa (herhangi bir kalemde): Tevkifata Tabi İşlem Tutarı,
  Tevkifata Tabi İşlem Üzerinden Hesaplanan KDV, Hesaplanan KDV Tevkifat.
- Vergiler Dahil Toplam Tutar ve **Ödenecek Tutar** (tevkifat varsa
  toplamdan düşülmüş hali).
- Serbest metin "Not" alanı.

Bu karttaki ve Mal/Hizmet kartındaki tüm tutar etiketleri, Fatura Bilgileri'nde
seçilen **Doküman Para Birimi**'nin simgesini gösterir: TRY → ₺, USD → $,
EUR → €, GBP → £; diğer kodlarda kodun kendisi (ör. "1.250,00 CHF"). "$"/"¥"
gibi birden çok para biriminde kullanılan simgeler karışıklık olmasın diye
USD dışındakilere verilmez (`paraBirimiSimgesi`, `src/utils/paraBirimi.ts`).
Bu yalnızca gösterimdir; GİB'e giden `paraBirimi` kodu ve tutarlar değişmez.

Form geçerliliği (`formGecerli`) alıcı (VKN/TCKN kontrol basamağı geçerli + Unvan ya da
Ad+Soyad + Adres dolu) ve kalemler (her kalemde Mal/Hizmet adı + miktar>0 +
birim fiyat>0) kontrolüyle belirlenir; "Oluştur" butonu bu koşul
sağlanmadan aktif olmaz.

**Sayı girdileri (miktar, birim fiyat, iskonto, döviz kuru)** yalnızca rakam ve
tek bir ondalık ayraç (nokta ya da virgül) kabul eder (`parseNumara`,
`src/utils/faturaHesap.ts`). JavaScript'in `Number()`'ının kabul ettiği
`0x10`, `0b11`, `1e3`, `-5` gibi girdiler reddedilir (0 sayılır).
Ayrıca `kalemlerAralikHatasi` şu sınırları uygular ve ihlalde "Oluştur"
düğmesinin altında kırmızı bir uyarı gösterir: **iskonto 0–100**, **miktar en
fazla 1.000.000.000**, **birim fiyat en fazla 10.000.000.000**. Boş alanlar bu
uyarıyı tetiklemez (onları zorunlu-alan kontrolü yakalar).

**"Oluştur"a basıldığında** ne olduğu için bkz.
[gib-entegrasyonu.md](gib-entegrasyonu.md#faturakaydet-fatura-oluşturma-akışı).

## Taslak / Kesilen Faturalar (`src/screens/TaslaklarScreen.tsx`)

- Üstte başlangıç/bitiş tarih seçiciler (varsayılan: son 7 gün) + "Sorgula".
  **Aralık en fazla 7 gün, başlangıç ve bitiş dahil** (ör. 01/08–07/08;
  GİB artık 1 haftadan uzun aralığa izin vermiyor, 2026-09-21): bir uç seçilince aralık 7 günü aşarsa DİĞER uç otomatik
  kaydırılır ve kullanıcıya bildirilir; hiçbir uç bugünü geçemez
  (`src/utils/tarihAraligi.ts`)
  butonu; liste yalnızca butona basınca (veya aşağı çekip yenilemeyle)
  güncellenir, tarih değiştirmek otomatik sorgu tetiklemez.
- Her kart: alıcı, tarih, belge no/türü, tutar, durum rozeti:
  - 🟢 **Onaylı** (`onayDurumu === 'Onaylandı'` veya SMS ile bu oturumda
    onaylanmışsa)
  - 🟡 **Taslak** (`'Onaylanmadı'`)
  - 🔴 **Silinmiş** (`'Silinmiş'`)
- Belgede bir iptal/itiraz talebi varsa (yalnızca o durumda `taslakGetir`
  yanıtında `iptalItiraz`/`talepDurum` alanları geliyor — canlı konsol
  yakalamasıyla doğrulandı), kartta ayrıca "İptal/İtiraz Durumu: ..." satırı
  gösterilir (`iptalItirazDurumMetni()`, bkz.
  [gib-entegrasyonu.md](gib-entegrasyonu.md)).
- Yatay kaydırılabilir aksiyon butonları:
  - **Görüntüle** — `faturaHTMLGetir` ile HTML çekilip tam ekran WebView
    modalında gösterilir; modalın üst çubuğunda **İndir** (PDF, paylaşım
    penceresi açmadan) ve **Paylaş** (native paylaşım sayfası) ikonları var.
  - **Düzenle** — yalnızca "Taslak" (onaylanmamış) durumundaki belgelerde
    görünür; şu an yalnızca yer tutucu (`handleAksiyon`: geliştirme modunda
    `console.log`, GİB'e istek yok), gerçek işlevi yok (bkz.
    [Issue #11](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/11)).
  - **Sil** — yalnızca "Taslak" durumunda; GİB'in kendi arayüzündeki gerçek
    iki adımlı akış birebir uygulandı: (1) "Bu belgeyi silmek üzeresiniz."
    uyarısı + "Uyarıyı okudum" onay kutusu işaretlenmeden ilerlenemez,
    (2) "Silme gerekçenizi giriniz" metin girişi. İkinci "Sil"e basılınca
    gerçek `EARSIV_PORTAL_FATURA_SIL` isteği gönderilir, başarılı olursa
    liste yenilenir ve "1 fatura başarıyla silindi." bildirimi gösterilir.
  - **GİB İmza** — yalnızca "Taslak" durumunda; GİB'in kendi arayüzündeki
    gerçek iki adımlı SMS onay akışı birebir uygulandı: (1) "Bu belge
    imzalandığında geçerlilik kazanacak olup, imzalandıktan sonra
    düzeltilmesi mümkün değildir." uyarısı + "Uyarıyı Okudum" onay kutusu
    + kayıtlı cep telefonu numarası (`telefonnoSorgula` ile sorgulanıp
    maskeli gösterilir) + "Şifre Gönder"; (2) 180 saniyelik geri sayım + SMS
    kodu girişi + "Onayla". Uçtan uca canlı doğrulandı — bkz.
    [gib-entegrasyonu.md](gib-entegrasyonu.md).
  - **İndir** — kartın kendi satırından, modal açmadan doğrudan HTML çekilip
    PDF'e çevrilip cihaza kaydedilir.
  - **İtiraz** — şu an yalnızca `console.log` yer tutucu (muhtemelen faturayı
    alan tarafın başlattığı ayrı bir akış, bkz.
    [Issue #7](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/7)).
  - **İptal** — Sil'in tam tersi: yalnızca **"Onaylı" (imzalanmış)**
    durumundaki belgelerde görünür (taslak bir fatura iptal edilmez, silinir).
    GİB'in kendi akışı birebir uygulandı: gerekçe metni (max 255 karakter,
    canlı `x/255` sayaç) + "Bu belge imzalandığında..." uyarısı + "Uyarıyı
    Okudum" onayı. Başarılı olursa `EARSIV_PORTAL_IPTAL_TALEBI_OLUSTUR`
    isteği gönderilir ve "İptal talebiniz başarıyla oluşturulmuştur."
    bildirimi gösterilir. GİB, zaten silinmiş bir belgede bu işlem
    denendiğinde "Silinmiş belgeler düzenlenemez!" ile reddediyor — bu,
    genel hata gösterimiyle otomatik olarak yakalanıyor.
  - **İtiraz/İptal, zaten bir talep varsa gizlenir** — belgede
    `iptalItirazDurumMetni(item)` dolu geliyorsa (ör. "İptal Kabul Edildi",
    "İptal Aşamasında") her iki buton da kartta hiç gösterilmiyor; yeni bir
    talep oluşturmanın anlamı yok.

**Liste rozeti:** İptal talebi **kabul edilmiş** fatura GİB'de hâlâ
"Onaylandı" görünür ama artık geçersizdir; listede yeşil "Onaylı" yerine
**kırmızı "İptal"** rozeti gösterilir (2026-09-21). Aşamadaki ya da
reddedilen iptal talebinde ve itiraz kabulünde rozet "Onaylı" kalır.

**Filigran (2026-09-21'de yenilendi):** faturanın ortasına çapraz, yarı
saydam kırmızı bir metin. Artık **hem görüntüleme ekranında hem PDF'te**
görünür (önceden yalnızca PDF'teydi). Kurallar tek yerde:
`src/utils/faturaFiligran.ts`.

| Durum | Filigran |
|---|---|
| Silinmiş | **FATURA SİLİNDİ** |
| İptal/İtiraz Aşamasında (`talepDurum` "0") | İPTAL AŞAMASINDA |
| İptal/İtiraz Kabul Edildi ("1") | İPTAL KABUL EDİLDİ |
| İptal/İtiraz Reddedildi ("2") | İPTAL REDDEDİLDİ (kullanıcı isteği; önceden eklenmiyordu) |
| Talep yok (`talepDurum` "-99" / boş) | yok |

**Talebi olmayan fatura:** GİB bu durumda `talepDurum: "-99"` gönderiyor.
Önceki kod bunu tanımadığı için talebi olmayan faturaları "İptal/İtiraz
Aşamasında" sayıyordu; artık yalnızca "0"/"1"/"2" bir talep sayılıyor.

**Silinmiş fatura:** GİB, silinmiş belgenin HTML'ine kendi "İPTAL EDİLMİŞ"
filigranını METİN olarak çiziyor (2026-09-21'de geliştirme loguyla görüldü:
`<p style='…rotate(310deg)…color:lightcoral'>İPTAL EDİLMİŞ</p>`). Bu yazı
yerinde "FATURA SİLİNDİ" yapılıyor ve ikinci bir filigran eklenmiyor. GİB
biçimini değiştirir de eşleşme bulunamazsa bizim filigranımız eklenir.

## İptal / İtiraz Talepleri (`src/screens/IptalItirazTalepleriScreen.tsx`)

"Belge İşlemleri" menüsünün 3. sekmesi — bu mükellefin **düzenlediği**
faturalara ait, alıcı veya başka bir taraftan gelen iptal/itiraz taleplerini
listeler.

- Başlangıç/Bitiş tarih seçiciler (varsayılan bugün) + "Sorgula".
- GİB'in kendi ekranı geniş bir masaüstü tablosu (satır seçim kutucuğu +
  üstte paylaşılan "Talep Kabul Et"/"Talep Reddet" butonları); mobilde bu,
  uygulamanın geri kalanıyla tutarlı olması için her satırın kendi
  Kabul/Reddet butonlarına sahip olduğu bir kart listesine uyarlandı.
  Gösterilen alanlar: Belge Numarası, Satıcı/Alıcı Vkn-Tckn ve Unvan/Ad
  Soyad, İptal/İtiraz Talep Tarihi, Belge Türü, İtiraz Yöntemi, İtiraz
  Belge Numarası/Tarihi, İptal/İtiraz Durumu.
- **Talep Kabul Et** — "{belgeNumarası} numaralı belge için iptal talebini
  onaylamak istiyorsunuz..." uyarısı + "Uyarıyı Okudum" onayı (işaretlenmeden
  ilerlenemez). Onaylanınca `EARSIV_PORTAL_IPTAL_ITIRAZ_TALEP_DURUM_GUNCELLE`
  isteği (`talepCevabi: 1`) gönderilir — uçtan uca canlı doğrulandı.
- **Talep Reddet** — GİB'in kendi "İptal Talebi Ret" ekranıyla aynı desende:
  "Gerekçenizi Giriniz" metin alanı (max 255 karakter, canlı `x/255` sayaç)
  + "{belgeNumarası} numaralı belge için iptal talebini reddetmek
  istiyorsunuz..." uyarısı + "Uyarıyı Okudum" onayı (işaretlenmeden
  ilerlenemez). Onaylanınca aynı cmd, **`talepCevabi: 2`** ile gönderilir
  (Kabul'ün `1` değerinden farklı — basit bir 0/1 ikili değil). Uçtan uca
  canlı doğrulandı.
- Her iki işlemden sonra liste otomatik yenilenir.

## Oturum Yönetimi (`src/store/useAuthStore.ts`)

- `login(kullaniciKodu, sifre, remember=true)` — `gibApi.login()`'i çağırır,
  ardından `getKullaniciBilgileri`'yi **hataya toleranslı** şekilde dener
  (`.catch(() => null)` — mükellef bilgisi çekilemese bile giriş
  engellenmez). `remember` true ise token + kullanıcı kodu (şifre **değil**)
  SecureStore'a yazılır.
- `restoreSession()` — uygulama soğuk başladığında SecureStore'dan token
  okunur; varsa state'e yazılıp mükellef bilgisi arka planda tekrar çekilir.
  Bu, "Beni Hatırla" seçilip token saklanmışsa kullanıcının her açılışta
  yeniden giriş yapmasını gereksiz kılar.
- `logout()` — önce GİB tarafında oturumu kapatmayı **dener**
  (`gibLogout`), bu istek başarısız olsa bile (ağ hatası, süresi dolmuş
  token) yerel token/state her zaman temizlenir — kullanıcı asla
  uygulamada "kilitli" kalmaz.

## Tarih aralığı sınırı (tüm sorgu ekranları)

GİB 1 haftadan uzun aralıkta sorgulamaya izin vermiyor. Bir hafta = başlangıç ve
bitiş **dahil** 7 takvim günü (01/08–07/08, 15/08–21/08; iki uç arasında en fazla
6 gün fark — 2026-09-22 düzeltmesi, önceden 8 güne izin veriliyordu). Varsayılan
"son 7 gün" = bugün dahil 7 gün. Taslaklar, İptal/İtiraz Talepleri, Adıma
Düzenlenen Belgeler ve e-Arşiv Faturalarım ekranlarında bir uç seçildiğinde diğer
uç gerekirse kaydırılır (`src/utils/tarihAraligi.ts`); ortak filtre çubuğu
`src/components/TarihAraligiFiltresi.tsx`.

## Adıma Düzenlenen Belgeler

`AdimaDuzenlenenScreen` — başkalarının kullanıcı adına düzenlediği belgeler.
Liste `adimaDuzenlenenBelgeleriGetir` ile gelir
(`EARSIV_PORTAL_ADIMA_KESILEN_BELGELERI_GETIR`, `RG_ALICI_TASLAKLAR`,
`hourlySearchInterval: "NONE"` — istek canlı yakalamayla doğrulandı; yanıtın
şekli henüz görülmedi). Kartta GİB tablosunun sütunları: Belge Numarası,
Satıcı VKN/TCKN, Satıcı Unvan, Belge Tarihi, Belge Türü, Onaylı, İptal/İtiraz
Durumu. "İtiraz Talebi Oluştur" / "İptal Talebi Oluştur" düğmeleri istekleri
yakalanmadığı için GİB'e bir şey göndermez; kapatılabilir "Bu bölümden sonrası
test edilemediği için geliştirilememiştir." kutusu açar. Belgeyi görüntüleme
henüz yok (isteği yakalanmadı).

## Faturaları Cihazımda Yedekleme

**Faturaları Şimdi Yedekle** (`YedekleScreen`):

- Yedek klasörü: Android'de sistem klasör seçicisiyle seçilir
  (`Directory.pickDirectoryAsync`, izin kalıcı; adres SecureStore'da
  `yedek_klasor_uri`). iOS'ta klasör seçilemez; uygulamanın Belgeler
  klasöründeki "Fatura Yedekleri" kullanılır (EAS derlemesinde Dosyalar
  uygulamasında görünür, `UIFileSharingEnabled`).
- Dönem: son 1 hafta / 1 ay / 3 ay / 6 ay / 1 yıl. Dönem, GİB'in 7 gün
  sınırı yüzünden bugünden geriye haftalık parçalara bölünür
  Her parça uçlar dahil en fazla 7 gün (bugün 21.09.2026, son 1 ay:
  15–21.09, 08–14.09, 01–07.09, 25–31.08, 21–24.08).
- Her parçanın listesi `taslakGetir` ile çekilir; her fatura
  `faturaHTMLGetir` + filigran + `expo-print` ile tek tek PDF yapılıp
  `<klasör>/<VKN - Unvan>/<YYYY-AA-GG>_<BelgeNo>.pdf` olarak yazılır.
  Onaylı, onaylanmamış (`_ONAYSIZ`) ve silinmiş (`_SILINMIS`) TÜM faturalar
  yedeklenir (kullanıcı isteği, 2026-09-21; önceki "onaylanmamış ve silinmiş
  de" seçeneği kaldırıldı).
- Her mükellef klasöründe `yedek-bilgileri.json`: dosya adı → belge no,
  tarih, alıcı unvanı, alıcı VKN/TCKN, onay durumu, iptal/itiraz durumu
  (yedekleme anındaki). Zaten yedekli faturalar için de güncellenir; eski
  yedeklerin bilgileri aynı dönem yeniden yedeklenince dolar. SAF'ta üzerine
  yazma içeriği kesmeyebildiği için dosya her yazımda silinip yeniden
  oluşturulur.
- Aynı adda dosya varsa yeniden indirilmez (yarıda kalan yedekleme kaldığı
  yerden devam eder). Tek faturanın hatası yedeklemeyi durdurmaz; art arda
  3 hata ya da oturum hatası durdurur. İki GİB isteği arası 300 ms beklenir.
- Kutu: "Yedekleme devam ediyor" + o an yedeklenen tarih aralığı + sayaçlar
  + Durdur. Bitince "Yedekleme tamamlanmıştır" ve 2 sn sonra Görüntüle
  ekranına geçilir (hatalı belge varsa geçilmez, liste okunabilsin diye).
- Yedekleme sürerken ekran kararmaz (`expo-keep-awake`).
- Döngü saf ve testli: `src/utils/yedekleme.ts`; dosya tarafı
  `src/services/yedekDeposu.ts`.

**Yedeklenen Faturaları Görüntüle** (`YedekleriGoruntuleScreen`): yedek
klasöründeki PDF'ler mükellef klasörlerine göre listelenir.

- Satır: belge no, alıcı unvanı, alıcı VKN/TCKN, tarih, durum rozetleri
  (Silinmiş / Onaylanmamış / İptal Kabul Edildi / İptal Reddedildi /
  Aşamasında), boyut.
- **Sırala:** tarih (yeni→eski, eski→yeni), belge numarası (yeni→eski,
  eski→yeni; GİB biçimi GIB + 4 haneli yıl + 9 haneli sıra, önce yıl sonra
  sıra karşılaştırılır, biçime uymayanlar sonda), alıcı unvanı.
- **Filtrele:** alıcı unvanı, alıcı VKN/TCKN (yedeklerden çıkan listeden),
  tarih aralığı (7 gün sınırı yok — yedekler telefonda). Etkin filtre özet
  kartında gösterilir, tek dokunuşla temizlenir.
- **Ara:** belge no, tarih (GG.AA.YYYY), unvan, VKN/TCKN (ı/i farkı yok sayılır).
- **Sil:** satırdaki çöp kutusu ya da başlıktaki seçim modu (uzun basma da
  açar) ile çoklu silme; onay istenir. Yalnızca telefondaki PDF silinir,
  GİB'deki faturaya dokunulmaz; bilgi dosyasından da çıkarılır.

Dokununca telefonun PDF görüntüleyicisinde açılır (Android:
`expo-intent-launcher` ile ACTION_VIEW; iOS: sistem önizleme/paylaşım
sayfası); paylaş düğmesi e-posta/WhatsApp/Drive/"Dosyalara Kaydet" için
paylaşım sayfasını açar.

GİB verisi bu akışların hiçbirinde uygulama sunucusuna (Cloudflare) gitmez.

## e-Arşiv Faturalarım (Dijital Vergi Dairesi) — `src/screens/EarsivFaturalarimScreen.tsx`

Ana menüde "Adıma Düzenlenen Belgeler"in altında. e-Arşiv Portal'ın DEĞİL,
**Dijital Vergi Dairesi**'nin "e-Arşiv Faturalarım" sayfasının karşılığı:
mükellefin **alıcı** olduğu tüm e-Arşiv faturaları (elektrik, doğalgaz,
telefon…), hangi firma keserse kessin.

- **Giriş:** e-Arşiv girişindeki kullanıcı kodu ve şifre kullanılır; kullanıcı
  yalnızca GİB'in güvenlik kodunu (resim) yazar. Yenile düğmesiyle yeni kod.
  Her başarısız denemeden sonra yeni kod alınır. Uygulama yeniden açılıp GİB
  oturumu kayıtlı token'dan geri geldiyse şifre bellekte olmadığından ekran
  şifreyi bir kez sorar.
- **Liste:** tarih aralığı (ortak filtre, 7 gün — Dijital VD'nin gerçek sınırı
  henüz bilinmiyor), girişten sonra son 7 gün kendiliğinden sorgulanır.
  Kartta satıcı unvanı, fatura no, düzenlenme tarihi, satıcı VKN/TCKN, tesisat
  no, toplam tutar, vergiler, **ödenecek tutar** (öne çıkan), gönderim şekli
  (Kâğıt/Elektronik) ve varsa iptal/itiraz durumu. GİB sayfa başına 10 kayıt
  veriyor; "Daha fazla göster" ile sonraki sayfalar. Liste düzenlenme
  tarihine göre yeniden eskiye sıralanır (GİB'in sırası güvenilmez).
- Tutarlar GİB'in verdiği gibi gösterilir (toplam + vergi, ödenecek tutarı
  tutmayabiliyor; hesaplanmaz).
- Faturalar tıklanmaz: yanıtta açmaya yarayan bir kimlik yok, GİB'in kendi
  sayfasında da liste yalnızca metin.
- **e-Arşiv girişi olmadan:** GİB giriş ekranında "Giriş Yap"ın altındaki
  "e-Arşiv Faturalarım (Dijital Vergi Dairesi)" düğmesiyle de açılır (e-Arşiv
  Portal hizmet vermediğinde kullanılabilsin diye). Bu yolda ekran kullanıcı
  kodunu (formdan dolu gelir) ve şifreyi de ister; şifre belleğe alınmaz.
  Uygulama hesabından çıkınca Dijital VD oturumu da kapatılır.
- **Oturum:** Dijital VD token'ı yalnızca bellekte; uygulama kapanınca, GİB
  oturumundan çıkınca ya da başka bir GİB kullanıcı koduna geçince GİB'de de
  kapatılır (`src/store/useDvdStore.ts`). Başlıktaki düğmeyle elle de
  kapatılabilir.
