# Mimari ve Teknoloji Yığını

## İki ayrı veri akışı

Uygulamanın **GİB tarafı sunucusuzdur**, **uygulama hesabı tarafı değildir**.
Bu ayrım bilinçlidir ve her yerde korunur.

### 1. GİB tarafı — sunucusuz

GİB istekleri doğrudan cihazdan portal sunucularına gider (bkz.
[gib-entegrasyonu.md](gib-entegrasyonu.md)). Bunun iki temel sonucu var:

1. **GİB kullanıcı kodu, şifresi, oturum bilgisi, VKN/TCKN, unvan, fatura
   içerikleri ve defterler hiçbir zaman üçüncü bir sunucuya gitmiyor** —
   yalnızca cihaz ↔ GİB arasında (bkz.
   [guvenlik-ve-veri.md](guvenlik-ve-veri.md)).
2. Barındırma/işletme maliyeti yok, ama GİB'in uç noktalarındaki haber
   verilmeden yapılabilecek herhangi bir değişiklik doğrudan uygulamayı
   etkiler — bu yüzden `src/services/gibApi.ts` her fonksiyonun üstünde
   "canlı doğrulandı" / "doğrulanmadı" notu tutuyor.

### 2. Uygulama hesabı tarafı — kendi Worker'ımız

Uygulamayı kullanmak için bir uygulama hesabı gerekir. Bu hesabın verisi
(e-posta, uygulama kullanıcı adı, şifre) kendi Cloudflare Worker'ımıza
**gönderilir**; şifre orada özetlenir ve D1'de **yalnızca özeti saklanır**.
Her istekte IP adresi gibi bağlantı bilgileri Cloudflare'e ulaşır.
Cloudflare **yeni bir üçüncü taraftır** ve veri **yurt dışında** (AB) durur.

İki taraf kodda da ayrıdır: `src/services/hesapApi.ts` `gibApi.ts`'ten hiçbir
şey import etmez, `useHesapStore` ile `useAuthStore` ayrı store'lardır ve
hesap uçları GİB alanlarını gövdede görürse isteği hiç atmaz
(`govdeyiDenetle`). Ayrıntı: [hesap-sistemi.md](hesap-sistemi.md).

## Teknoloji yığını ve neden seçildiği

| Katman | Seçim | Not |
|---|---|---|
| Framework | React Native + Expo (TypeScript) | Yönetilen (managed) workflow, EAS Build ile native paket üretimi |
| Navigasyon | React Navigation (native-stack) | `App.tsx`'te tek bir `RootStackParamList` |
| Global state | Zustand | Redux'a göre çok daha az boilerplate; yalnızca oturumlar için kullanılıyor — GİB oturumu `useAuthStore`, uygulama hesabı oturumu `useHesapStore` (AYRI store'lar, birbirine alan taşınmaz). Form state'leri (fatura kesim formu gibi) bilerek yerel (`useState`) tutuluyor |
| UI kütüphanesi | React Native Paper (Material Design 3, koyu tema) | Hazır, erişilebilir bileşenler; kendi `Select`'i olmadığı için `SecimAlani.tsx` bir Dialog+RadioButton sarmalayıcısı olarak yazıldı |
| Hesap sunucusu | Cloudflare Workers + D1 | Yalnızca uygulama hesabı için. Uygulamadan doğrudan D1 REST API'sine bağlanmak keyfi SQL çalıştıran bir hesap token'ını APK'ya gömmek demekti; bkz. [hesap-sistemi.md](hesap-sistemi.md) |
| HTTP | Axios (GİB) + fetch (hesap sunucusu) | `application/x-www-form-urlencoded` gövdeli isteklerde `URLSearchParams` ile form kodlaması |
| Güvenli depolama | expo-secure-store | Token, "beni hatırla" bilgileri, alıcı ve mal/hizmet defterleri — hepsi şifrelenmiş yerel depoda, yalnızca o telefonda (sunucu/bulut/eşitleme yok). Defterler kayıt başına ayrı anahtara bölünür (`bolunmusDefter.ts`, bkz. [guvenlik-ve-veri.md](guvenlik-ve-veri.md)) |
| PDF | expo-print + expo-sharing + expo-file-system/legacy | Bkz. aşağıdaki "PDF üretim akışı" |
| Tarih/saat seçici | @react-native-community/datetimepicker v9 | `onValueChange`/`onDismiss` API'si (v9'da `onChange` deprecated) |
| Fatura HTML önizleme | react-native-webview | GİB'in döndürdüğü HTML güvenilmez sayılıp `FaturaWebView.tsx` içinde en az yetkiyle gösteriliyor (JavaScript varsayılan kapalı, gezinme engelli, önbellek/çerez yok — bkz. [guvenlik-ve-veri.md](guvenlik-ve-veri.md#fatura-görüntüleme-webview)) |
| Uygulama kilidi | expo-local-authentication | Açılışta ve uzun arka plandan sonra cihazın kendi kilidiyle (biyometri/PIN) doğrulama (`uygulamaKilidi.ts`, `KilitScreen.tsx`) |
| Test | Node'un yerleşik test çalıştırıcısı (`node --test`) + `tsc` | Ek bağımlılık yok; RN/Expo/axios modülleri sahtelenir, GİB'e istek atılmaz (bkz. [kurulum-ve-gelistirme.md](kurulum-ve-gelistirme.md#testler)) |

## Veri akışı — Fatura Kesim Formu örneği

```
FaturaKesimScreen (yerel useState: FaturaFormState)
   │
   ├─ FaturaBilgileriKarti  ─┐
   ├─ AliciBilgileriKarti    │  her biri (value, onChange) prop'larıyla
   ├─ IrsaliyeBilgileriKarti │  "controlled component" — kendi state'i yok
   ├─ MalHizmetKarti         │
   └─ ToplamlarKarti        ─┘
         │
         │ "Oluştur" basılınca:
         ▼
   FaturaTaslagi'ye dönüştürülür (kalemHesapla ile hesaplanmış tevkifat
   oranı dahil) → faturaKaydet(token, taslak)
         │
         ▼
   gibApi.ts: buildFaturaOlusturPayload() → dispatch() → GİB
```

Kart bileşenleri **kendi state'ini tutmuyor** (SecimAlani'nin dialog açık/
kapalı durumu gibi salt-UI state'ler hariç) — bu, formun tamamının tek bir
yerden (`FaturaKesimScreen`) doğrulanabilmesini ve "Oluştur" butonunun
geçerlilik kontrolünü basitleştiriyor.

## Neden state yerel, global değil?

Yalnızca **oturum** (token, kullanıcı bilgisi) Zustand'da global —
uygulamanın her yerinden erişilmesi gerektiği ve tek bir "doğruluk kaynağı"
olması gerektiği için. Fatura kesim formu gibi tek bir ekranın ömrü kadar
yaşayan state'ler global store'a taşınmadı; bu hem gereksiz karmaşıklığı
önlüyor hem de ekrandan çıkıldığında formun otomatik sıfırlanmasını
(temizlenmesini) sağlıyor.

## PDF üretim akışı ve Android'e özgü çözüm

`src/utils/pdf.ts`, GİB'in döndürdüğü ham HTML'i PDF'e çevirirken
Android'e özgü bir kısıtlamayı aşıyor:

- İlk yaklaşım (`expo-print`'in ürettiği geçici dosyayı `expo-file-system`
  ile kopyalamak) Android'de **"isn't readable"** hatası veriyordu, çünkü
  Android bir modülün (expo-file-system) başka bir modülün (expo-print)
  kendi cache dizinine yazdığı dosyayı doğrudan okumasına izin vermiyor.
- Çözüm: `Print.printToFileAsync({ base64: true })` ile PDF içeriği hiç
  "dosya olarak okunmadan" doğrudan **Base64 metni** olarak alınıyor, sonra
  bu Base64 uygulamanın kendi belge dizinine yazılıyor. Ayrı bir modülün
  dosya okuması hiç gerekmiyor.
- **"Paylaş"** (`pdfPaylas`) → `expo-sharing` ile native paylaşım sayfası.
- **"İndir"** (`pdfIndir`) → Android'de `StorageAccessFramework` ile
  kullanıcıya klasör seçtirilip PDF paylaşım penceresi **açılmadan**
  doğrudan oraya yazılıyor (kullanıcının "gerçekten indirmek" istediği,
  paylaşmak değil senaryosu için). iOS'ta SAF karşılığı olmadığından
  (Apple'ın "Dosyalara Kaydet"i yalnızca paylaşım sayfası üzerinden
  sunulur) orada paylaşım sayfasına düşülüyor — bu iOS'un kendi standart
  yoludur, bir eksiklik değil.
- `expo-file-system/legacy` importu **kasıtlı** korunuyor: `copyAsync`/
  `writeAsStringAsync`/`EncodingType`/`documentDirectory` bu SDK
  sürümünde "classic" API ailesinin parçası; standart `expo-file-system`a
  dönmek aynı deprecation uyarısını geri getirir.
- **Filigran:** `generatePDF`/`pdfPaylas`/`pdfIndir` isteğe bağlı bir
  `filigranMetni` parametresi alıyor — verilirse, PDF'e çevrilecek HTML'in
  `<body>` etiketinin hemen içine `position: fixed` + `rotate(-35deg)`
  ile ortalanmış, yarı saydam kırmızı bir metin `<div>`'i ekleniyor
  (`filigranEkle`, `src/utils/pdf.ts`). Native bir PDF kütüphanesi/watermark
  API'si gerekmiyor — filigran GİB'in HTML'i PDF'e dönüştürülmeden ÖNCE
  ham HTML'e enjekte ediliyor, `expo-print`'in Chromium tabanlı motoru
  onu normal sayfa içeriği gibi render edip PDF'e gömüyor. Cihazda canlı
  denenip sorunsuz çalıştığı doğrulandı.

## Modüler kart mimarisinin amacı

`FaturaKesimScreen.tsx` bilinçli olarak yalnızca bir **orkestratör**:
state'i tutar, hesaplama fonksiyonlarını çağırır, "Oluştur" akışını
yönetir. Görsel/etkileşim mantığının tamamı `src/screens/fatura/*.tsx`
altındaki 5 bağımsız karta dağıtılmış durumda. Bu sayede:

- Her kart tek başına test edilebilir/anlaşılabilir boyutta kalıyor.
- GİB'in gerçek "e-Arşiv Fatura (interaktif) Oluştur" ekranındaki
  bölümlemeyle birebir eşleşiyor (Fatura Bilgileri / Alıcı Bilgileri /
  İrsaliye Bilgileri / Mal-Hizmet Bilgileri / Toplamlar) — GİB'in kendi
  arayüzüne aşina bir mali müşavir için tanıdık geliyor.
