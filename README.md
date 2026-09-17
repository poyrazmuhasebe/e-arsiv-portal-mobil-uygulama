# e-Arşiv Portal Mobil Uygulama

Mali müşavirlerin mükelleflerinin GİB e-Arşiv Portal üzerinden kendi hesaplarıyla e-Arşiv faturası kesebilmesi için geliştirilen, sunucusuz (backend gerektirmeyen) React Native (Expo) mobil uygulaması.

## ⚠️ Önemli Uyarılar

- **Bu uygulama GİB'in resmi bir ürünü değildir.** `earsivportal.efatura.gov.tr` adresinin resmi/yayınlanmış bir REST API'si yoktur; uygulama, portalın kendi web arayüzünün kullandığı iç servislere (`/earsiv-services/dispatch`, `/earsiv-services/assos-login`) doğrudan istek atar. GİB bu servisleri haber vermeden değiştirebilir.
- Kullanıcı kodu ve şifre yalnızca cihazdan doğrudan GİB sunucularına gönderilir; hiçbir üçüncü taraf sunucuya iletilmez (backend yoktur). "Beni hatırla" işaretlenirse bu bilgiler yalnızca cihazda `expo-secure-store` (şifrelenmiş) ile tutulur.
- `src/services/gibApi.ts` içindeki komut/alan adlarının doğrulanma durumu değişkendir — bazıları gerçek Network trafiği yakalanarak teyit edilmiştir, bazıları henüz teyit edilmemiştir. Her fonksiyonun üstündeki yorumlar "DOĞRULANMADI" veya "canlı yanıtla doğrulandı" şeklinde bunu belirtir; aşağıdaki tabloya da bakın.
- **Canlı bir e-Arşiv faturası kesmek/imzalamak gerçek, geri alınması zor bir mali işlemdir.** Doğrulanmamış uçları (özellikle `faturaKaydet`, SMS imzalama) üretime almadan önce mutlaka küçük/kontrollü bir gerçek denemeyle doğrulayın.

## Özellikler

- **Giriş:** GİB kullanıcı kodu/şifresi ile giriş (`assos-login` uç noktası), oturum token'ı `expo-secure-store` ile cihazda güvenli saklanır. "Kullanıcı Kodunu Hatırla" / "Şifreyi Hatırla" onay kutuları ile form bir sonraki açılışta (çıkış yapılsa bile) otomatik doldurulur.
- **Dashboard:** Mükellef unvanını (uzun unvanlarda tek satır + "..." ile kısaltılmış) gösteren, fatura kesme ve taslak/kesilen faturalara erişim sağlayan ana ekran.
- **Fatura Kesim Formu:** GİB'in gerçek "e-Arşiv Fatura (interaktif) Oluştur" ekranına yakın, modüler kart tabanlı bir form:
  - Fatura Bilgileri (tarih/saat, para birimi, döviz kuru, fatura tipi) — **7 gün kuralı**: geriye dönük 7 günden eski bir tarih seçilirse otomatik ayarlama teklif eden bir uyarı çıkar.
  - Alıcı Bilgileri — VKN (10 hane) veya TCKN (11 hane) girilince `mukellefBilgisiGetir` otomatik tetiklenir; Unvan/Ad/Soyad/Vergi Dairesi alanları **salt okunur**, yalnızca GİB'den gelen veriyle dolar. "Kayıtlı Alıcılardan Seç" ile daha önce fatura kesilen bir alıcı tek dokunuşla seçilebilir (adres defteri, cihazda saklanır).
  - İrsaliye Bilgileri.
  - Mal/Hizmet Bilgileri — dinamik satır ekleme/silme, kalem başına KDV oranı ve isteğe bağlı "Vergi Ekle" (KDV Tevkifat kodu seçilince oran otomatik dolar, tutarlar anlık yeniden hesaplanır).
  - Toplamlar (Ara Toplam, İskonto, KDV, varsa Tevkifat kırılımı, Ödenecek Tutar) ve Not.
- **Taslak / Kesilen Faturalar:** Tarih aralığı filtresi (varsayılan son 7 gün) ile listeleme, durum rozeti (Onaylı / Taslak / Silinmiş), SMS ile onaylama (imzalama), fatura HTML'ini tam ekran WebView'de görüntüleme, PDF olarak indirme/paylaşma.
- **PDF İndir/Paylaş:** GİB'in döndürdüğü HTML, `expo-print` ile Base64 PDF'e çevrilir (Android'de ham dosya `uri`'sini ayrı bir modülle okumaya çalışmak "isn't readable" hatası verdiği için Base64 içerik doğrudan uygulamanın kendi dizinine yazılır). "Paylaş" native paylaşım penceresini açar; "İndir" Android'de `StorageAccessFramework` ile kullanıcının seçtiği klasöre **paylaşım penceresi açmadan** doğrudan yazar, iOS'ta paylaşım sayfasına düşer (Apple'ın "Dosyalara Kaydet"i sunduğu tek yol).
- **Vergi/Tevkifat Kodları:** `faturaConstants.ts` içinde GİB'in resmi KDV Genel Uygulama Tebliği oranlarıyla doğrulanmış **52 tevkifat kodu** (601-627 kısmi tevkifat + 801-825 tam tevkifat/10 varyantları). Para Birimi (185), Ülke (250) ve Vergi Türü (29, KDV Tevkifat=`V9015`) listeleri GİB'in gerçek ekranından DevTools ile yakalanan ham `<select>` verileriyle birebir doğrulandı.
- **Merkezi hata yönetimi:** `gibHatasiniIsle()` — bir GİB yanıtı oturum/token geçersizliğine işaret eden anahtar kelimeler içeriyorsa yerel oturumu otomatik temizleyip Login ekranına döner; diğer hatalarda GİB'in Türkçe mesajını olduğu gibi gösterir.
- **Güvenli Çıkış:** Hem GİB tarafındaki oturumu hem yerel oturumu sonlandırır.
- **Test Modu:** `IS_TEST_MODE` bayrağı ile GİB'e hiç istek atmadan (mock verilerle) arayüz geliştirmesi yapılabilir.

## Teknoloji Yığını

- React Native + Expo (TypeScript)
- React Navigation (native-stack)
- Zustand (global state — oturum/token)
- React Native Paper (Material Design 3, koyu tema)
- Axios (GİB portalına `application/x-www-form-urlencoded` istekler)
- expo-secure-store (token + "beni hatırla" + adres defteri saklama)
- expo-print, expo-sharing, expo-file-system (fatura PDF üretme/indirme/paylaşma)
- @react-native-community/datetimepicker, react-native-webview

## Kurulum

```bash
npm install
npx expo start
```

Expo Go ile QR kodu okutarak veya `npx expo start --web` ile tarayıcıda çalıştırabilirsiniz.

## Ortam / Test Modu

`src/services/gibApi.ts` içindeki `IS_TEST_MODE` sabiti:

- `true` → GİB'e hiç istek atılmaz; login/kullanıcı bilgisi/mükellef sorgusu/taslak listesi/fatura kaydet/SMS fonksiyonları sahte (mock) verilerle çalışır. Arayüz geliştirmesi için kullanılır.
- `false` → Gerçek/canlı `earsivportal.efatura.gov.tr` adresine gerçek istekler atılır.

**Canlıya geçmeden önce bu bayrağın `false` olduğundan emin olun.**

## GİB Komutlarının Doğrulanma Durumu

| Fonksiyon | Uç nokta / cmd | Durum |
|---|---|---|
| `login` | `assos-login`, `assoscmd=anologin` | ✅ Canlı yanıtla doğrulandı |
| `logout` | `assos-login`, `assoscmd=logout` | ✅ Canlı yanıtla doğrulandı |
| `getKullaniciBilgileri` | `dispatch`, `EARSIV_PORTAL_KULLANICI_BILGILERI_GETIR` | ✅ Canlı yanıtla doğrulandı |
| `mukellefBilgisiGetir` | `dispatch`, `SICIL_VEYA_MERNISTEN_BILGILERI_GETIR` | ✅ Canlı yanıtla doğrulandı |
| `taslakGetir` | `dispatch`, `EARSIV_PORTAL_TASLAKLARI_GETIR` | ✅ Canlı yanıtla doğrulandı |
| `faturaHTMLGetir` | `dispatch`, `EARSIV_PORTAL_FATURA_GOSTER` | ✅ Canlı yanıtla doğrulandı |
| `faturaKaydet` | `dispatch`, `EARSIV_PORTAL_FATURA_OLUSTUR` | 🟡 **Payload gerçek DevTools yakalamasıyla birebir doğrulandı**, ama bu tam istekle bir fatura başarıyla oluşturulduğu henüz teyit edilmedi (bir önceki deneme "yetkiniz yok" ile reddedilmişti; bu sefer eksik olan `callid` parametresi ve hatalı `hangiTip`/tip uyumsuzlukları düzeltildi). Sıradaki canlı denemenin sonucu bekleniyor. |
| `smsSifreGonder` / `smsSifreOnayla` | `dispatch`, `EARSIV_PORTAL_SMSSIFRE_*` | ⚠️ **Doğrulanmadı** |
| `faturaIndir` (ham base64/PDF indirme, HTML değil) | `dispatch`, `EARSIV_PORTAL_FATURA_INDIR` | ⚠️ **Doğrulanmadı**, kullanılmıyor (yerine `faturaHTMLGetir` + PDF üretimi kullanılıyor) |

## Proje Yapısı

```
App.tsx                        # Navigasyon kökü, tema (MD3DarkTheme)
src/
  screens/
    LoginScreen.tsx
    DashboardScreen.tsx
    FaturaKesimScreen.tsx       # Orkestratör — kartları birleştirir
    TaslaklarScreen.tsx
    fatura/
      FaturaBilgileriKarti.tsx
      AliciBilgileriKarti.tsx
      IrsaliyeBilgileriKarti.tsx
      MalHizmetKarti.tsx
      ToplamlarKarti.tsx
  components/
    SecimAlani.tsx              # Yeniden kullanılabilir dropdown/seçici
  constants/
    faturaConstants.ts          # Para birimi/fatura tipi/ülke/birim/vergi/tevkifat listeleri
  services/
    gibApi.ts                   # GİB API istemcisi (dispatch/assos-login)
  store/
    useAuthStore.ts             # Zustand — oturum/token yönetimi
  types/
    gib.ts                      # Fatura/alıcı/GİB yanıt tipleri
    faturaForm.ts                # Fatura kesim formunun yerel state tipleri
  utils/
    secureStorage.ts             # Platform-güvenli SecureStore sarmalayıcı
    aliciDefteri.ts               # Kayıtlı alıcılar (adres defteri)
    faturaHesap.ts                 # KDV/iskonto/tevkifat hesaplama mantığı
    pdf.ts                          # HTML → PDF, indirme (SAF) / paylaşma
```

## Lisans / Kullanım

Bu proje kişisel/profesyonel kullanım için geliştirilmiştir. GİB'in kullanım şartlarına ve ilgili mevzuata uygunluk kullanıcının sorumluluğundadır.
