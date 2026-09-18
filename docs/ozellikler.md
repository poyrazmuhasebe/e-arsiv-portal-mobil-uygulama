# Özellikler — Ekran Ekran Detaylı Anlatım

## Giriş (`src/screens/LoginScreen.tsx`)

- Kullanıcı Kodu + Şifre alanları; şifre alanında göz ikonuyla göster/gizle.
- **"Kullanıcı Kodunu Hatırla" / "Şifreyi Hatırla"** — ikisi de varsayılan
  olarak işaretli gelir. İşaretliyse, başarılı girişten sonra değer
  `expo-secure-store`'a (`gib_hatirlanan_kullanici_kodu` /
  `gib_hatirlanan_sifre` anahtarlarıyla) yazılır ve bir sonraki uygulama
  açılışında (kullanıcı **çıkış yapmış olsa bile**) form otomatik doldurulur.
  Bu, `useAuthStore`'un oturum token'ı için kullandığı anahtarlardan tamamen
  **ayrı** bir mekanizmadır — biri "formu hatırla", diğeri "oturumu sürdür".
- Giriş başarılı olduğunda `useAuthStore.login()` çağrılır; token state'e
  yazılır ve `App.tsx`'teki navigasyon kökü bunu dinleyip otomatik olarak
  Dashboard yığınına geçer (ayrı bir "git" komutu yok).
- Giriş başarısız olursa GİB'in döndürdüğü Türkçe hata mesajı olduğu gibi
  gösterilir (bkz. [gib-entegrasyonu.md](gib-entegrasyonu.md)).

## Dashboard (`src/screens/DashboardScreen.tsx`)

- Üstte mükellef unvanı (`kullaniciBilgisi.unvan`, yoksa `kullaniciKodu`,
  o da yoksa "Mükellef") tek satır + `ellipsizeMode="tail"` ile kısaltılarak
  gösterilir — çok uzun şirket unvanları (`"... LİMİTED ŞİRKETİ"`) taşmasın
  diye.
- İki büyük kart: **Yeni Fatura Kes** (→ `FaturaKesim`) ve
  **Taslak / Kesilen Faturalar** (→ `Taslaklar`).
- Sağ üstte "Güvenli Çıkış" ikonu; onay diyaloğundan sonra
  `useAuthStore.logout()` çağrılır (bkz. aşağıdaki "Oturum Yönetimi").

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
- Doküman Para Birimi (`PARA_BIRIMLERI`, 176 gerçek ISO kod) ve Döviz Kuru.
- Fatura Tipi (`FATURA_TIPLERI`, 13 gerçek değer: `SATIS`, `IADE`,
  `TEVKIFAT`, `TEVKIFATIADE`, `ISTISNA`, `OZELMATRAH`, `IHRACKAYITLI`,
  `KONAKLAMAVERGISI`, `YTBSATIS`, `YTBISTISNA`, `YTBIADE`, `YTBTEVKIFAT`,
  `YTBTEVKIFATIADE`).

### 2. Alıcı Bilgileri (`AliciBilgileriKarti.tsx`)

- VKN (10 hane) veya TCKN (11 hane) girildiğinde, 400ms debounce sonrası
  `mukellefBilgisiGetir` otomatik tetiklenir.
  - VKN (10 hane) → **Unvan** dolar, Ad/Soyad boş kalır (şirket).
  - TCKN (11 hane) → **Ad/Soyad** dolar, Unvan boş kalır (şahıs).
- Unvan/Ad/Soyad/Vergi Dairesi alanları **her zaman salt okunur**
  (`editable={false}`) — kullanıcı bunları elle giremez, yalnızca GİB
  sorgusuyla dolar. Bu, yanlış/uydurma unvan girilerek hatalı fatura
  kesilmesini engellemek için bilinçli bir tasarım kararıdır.
- Sorgu başarısız olursa (`sorguHatali`) alanlar temizlenir ve kullanıcıya
  kırmızı bir uyarı metni gösterilir.
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
- Kalem altında anlık hesaplanan **Mal/Hizmet Tutarı** ve **KDV Tutarı**
  gösterilir (bkz. [hesaplama-mantigi.md](hesaplama-mantigi.md)).
- **"Vergi Seçiniz"** — `VERGI_TURLERI` (29 gerçek GİB kodu) listesinden
  seçim yapılabilir, ama **yalnızca `V9015` (KDV Tevkifat)** gerçekten
  hesaplanıp GİB'e gönderiliyor; diğer 28 kod şu an seçilse de sessizce
  hiçbir etkisi olmuyor (bkz.
  [bilinen-sinirlamalar.md](bilinen-sinirlamalar.md) ve
  [Issue #1](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/1)).
- `V9015` seçilip Fatura Tipi de tevkifatı destekliyorsa (`TEVKIFAT`,
  `TEVKIFATIADE`, `YTBTEVKIFAT`, `YTBTEVKIFATIADE`) Tevkifat Kodu seçici
  (`TEVKIFAT_KODLARI`, 52 kod) açılır; kod seçilince oran otomatik dolar ve
  Tevkifat Tutarı anlık hesaplanır. Fatura Tipi uyumsuzsa kırmızı bir uyarı
  metni gösterilir.

### 5. Toplamlar (`ToplamlarKarti.tsx`)

- Mal/Hizmet Toplam Tutarı, Toplam İskonto, Hesaplanan KDV.
- Tevkifat varsa (herhangi bir kalemde): Tevkifata Tabi İşlem Tutarı,
  Tevkifata Tabi İşlem Üzerinden Hesaplanan KDV, Hesaplanan KDV Tevkifat.
- Vergiler Dahil Toplam Tutar ve **Ödenecek Tutar** (tevkifat varsa
  toplamdan düşülmüş hali).
- Serbest metin "Not" alanı.

Form geçerliliği (`formGecerli`) alıcı (VKN/TCKN uzunluğu + Unvan ya da
Ad+Soyad + Adres dolu) ve kalemler (her kalemde Mal/Hizmet adı + miktar>0 +
birim fiyat>0) kontrolüyle belirlenir; "Oluştur" butonu bu koşul
sağlanmadan aktif olmaz.

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
- Yatay kaydırılabilir aksiyon butonları:
  - **Görüntüle** — `faturaHTMLGetir` ile HTML çekilip tam ekran WebView
    modalında gösterilir; modalın üst çubuğunda **İndir** (PDF, paylaşım
    penceresi açmadan) ve **Paylaş** (native paylaşım sayfası) ikonları var.
  - **Düzenle** — yalnızca "Taslak" (onaylanmamış) durumundaki belgelerde
    görünür; şu an yalnızca `console.log` yer tutucu (`handleAksiyon`),
    gerçek işlevi yok.
  - **Sil** — yalnızca "Taslak" durumunda; GİB'in kendi arayüzündeki gerçek
    iki adımlı akış birebir uygulandı: (1) "Bu belgeyi silmek üzeresiniz."
    uyarısı + "Uyarıyı okudum" onay kutusu işaretlenmeden ilerlenemez,
    (2) "Silme gerekçenizi giriniz" metin girişi. İkinci "Sil"e basılınca
    gerçek `EARSIV_PORTAL_FATURA_SIL` isteği gönderilir, başarılı olursa
    liste yenilenir ve "1 fatura başarıyla silindi." bildirimi gösterilir.
  - **GİB İmza** — yalnızca "Taslak" durumunda; `smsSifreGonder` çağrılır,
    SMS kodu girme diyaloğu açılır, `smsSifreOnayla` ile onaylanır. Bu uç
    henüz canlı doğrulanmadı (bkz.
    [gib-api-durumu.md](gib-api-durumu.md)).
  - **İndir** — kartın kendi satırından, modal açmadan doğrudan HTML çekilip
    PDF'e çevrilip cihaza kaydedilir.
  - **İtiraz / İptal** — şu an yalnızca `console.log` yer tutucu.

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
