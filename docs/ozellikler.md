# Özellikler — Ekran Ekran Detaylı Anlatım

## Giriş (`src/screens/LoginScreen.tsx`)

- **GİB duyuru kutusu** (`src/components/DuyuruKutusu.tsx`): formun üstünde,
  süresi dolmamış ve kullanıcının kapatmadığı ilk GİB duyurusu (ör. planlı bakım)
  gösterilir. Duyurular `src/constants/duyurular.ts`'te elle tanımlanır; uygulamanın
  kendi sunucusu olmadığı için uzaktan çekilmez, uygulama güncellemesiyle gelir.
  Her duyurunun bir `bitis` anı vardır; o an geçince kutu kendiliğinden gizlenir.
  Sağ üstteki × ile kapatılan duyuru cihazda hatırlanır (`gib_kapatilan_duyurular`)
  ve bir daha gösterilmez. Duyurudaki GİB bağlantısına dokununca tarayıcıda açılır.
  İlk duyuru: 19–20/9/2026 planlı bakım (bitiş 20/9/2026 23:59, Türkiye saati).
  Yeni duyuru eklemek için diziye yeni bir `id` ile öge eklenir; metin GİB'in
  duyurusundan birebir alınır.
- Kullanıcı Kodu + Şifre alanları; şifre alanında göz ikonuyla göster/gizle.
- **"Kullanıcı Kodunu Hatırla"** — varsayılan olarak işaretli gelir.
  İşaretliyse, başarılı girişten sonra kullanıcı kodu `expo-secure-store`'a
  (`gib_hatirlanan_kullanici_kodu` anahtarıyla) yazılır ve bir sonraki uygulama
  açılışında (kullanıcı **çıkış yapmış olsa bile**) form otomatik doldurulur.
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
  4. **Adıma Düzenlenen Belgeler** — henüz uygulanmadı, tıklanınca "Bu
     özellik henüz eklenmedi." uyarısı gösterir (bkz.
     [Issue #19](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/19))
- **"Kullanıcı İşlemleri"** başlıklı ikinci bir bölüm, GİB'in kendi ana
  menüsünün ikinci dalıyla eşleşiyor: **Kullanıcı Bilgileri** →
  `KullaniciBilgileri` (bkz. aşağıda). Ayrıca GİB'de karşılığı olmayan,
  cihazdaki kayıtlar için **Alıcı Defteri** → `AliciDefteri`.
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

- Üstte başlangıç/bitiş tarih seçiciler (varsayılan: son 7 gün) + "Sorgula"
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

**PDF filigranı (canlı doğrulandı):** Bir belgede İptal/İtiraz Durumu
"Aşamasında" veya "Kabul Edildi" ise, "İndir"/"Paylaş" ile üretilen PDF'in
tam ortasına çapraz, yarı saydam kırmızı bir filigran eklenir — metni,
karttaki "İptal/İtiraz Durumu: ..." ile birebir aynı (ör. "İPTAL KABUL
EDİLDİ"). Bkz. `src/utils/pdf.ts`'teki `filigranEkle`.

**"Reddedildi" durumunda filigran EKLENMİYOR** (`filigranMetni()`,
`TaslaklarScreen.tsx`) — reddedilen bir iptal/itiraz talebi faturayı
geçersiz kılmaz, belge normal geçerliliğini sürdürür; kart üzerinde
"İptal/İtiraz Durumu: ... Reddedildi" metni yine de gösterilmeye devam
eder, yalnızca PDF çıktısı işaretlenmez.

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
