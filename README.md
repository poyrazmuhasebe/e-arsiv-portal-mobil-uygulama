# e-Arşiv Portal Mobil Uygulama

Mali müşavirlerin mükelleflerinin GİB e-Arşiv Portal üzerinden kendi hesaplarıyla e-Arşiv faturası kesebilmesi için geliştirilen, sunucusuz (backend gerektirmeyen) React Native (Expo) mobil uygulaması.

## ⚠️ Önemli Uyarılar

- **Bu uygulama GİB'in resmi bir ürünü değildir.** `earsivportal.efatura.gov.tr` adresinin resmi/yayınlanmış bir REST API'si yoktur; uygulama, portalın kendi web arayüzünün kullandığı iç servislere (`/earsiv-services/dispatch`, `/earsiv-services/assos-login`) doğrudan istek atar. GİB bu servisleri haber vermeden değiştirebilir.
- Kullanıcı kodu ve şifre yalnızca cihazdan doğrudan GİB sunucularına gönderilir; hiçbir üçüncü taraf sunucuya iletilmez (backend yoktur).
- `src/services/gibApi.ts` içindeki bazı alan adları/komutlar gerçek Network trafiği yakalanarak doğrulanmıştır, bazıları henüz doğrulanmamıştır — ilgili yerlerde kod içi yorumlarla işaretlenmiştir.
- **Canlı bir e-Arşiv faturası kesmek/imzalamak gerçek, geri alınması zor bir mali işlemdir.** Kodu üretime almadan önce mutlaka küçük/kontrollü bir gerçek denemeyle doğrulayın.

## Özellikler

- **Giriş:** GİB kullanıcı kodu/şifresi ile giriş (`assos-login` uç noktası), oturum token'ı `expo-secure-store` ile cihazda güvenli saklanır.
- **Dashboard:** Mükellef unvanını gösteren, fatura kesme ve taslak/kesilen faturalara erişim sağlayan ana ekran.
- **Fatura Kesim Formu:** Alıcı bilgileri (VKN/TCKN girilince unvan/vergi dairesi otomatik sorgulanır), dinamik kalem ekleme, anlık KDV/toplam hesaplama, taslak olarak kaydetme.
- **Taslak / Kesilen Faturalar:** Liste görünümü, SMS ile onaylama (imzalama) akışı.
- **Güvenli Çıkış:** Hem GİB tarafındaki oturumu hem yerel oturumu sonlandırır.
- **Test Modu:** `IS_TEST_MODE` bayrağı ile GİB'e hiç istek atmadan (mock verilerle) arayüz geliştirmesi yapılabilir.

## Teknoloji Yığını

- React Native + Expo (TypeScript)
- React Navigation (native-stack)
- Zustand (global state — oturum/token)
- React Native Paper (Material Design 3, koyu tema)
- Axios (GİB portalına `application/x-www-form-urlencoded` istekler)
- expo-secure-store (token saklama)

## Kurulum

```bash
npm install
npx expo start
```

Expo Go ile QR kodu okutarak veya `npx expo start --web` ile tarayıcıda çalıştırabilirsiniz.

## Ortam / Test Modu

`src/services/gibApi.ts` içindeki `IS_TEST_MODE` sabiti:

- `true` → GİB'in test/sandbox portalına (`earsivportaltest.efatura.gov.tr`) işaret eder VE login/kullanıcı bilgisi/taslak/fatura kaydet/SMS fonksiyonları gerçek istek atmadan sahte (mock) verilerle çalışır.
- `false` → Gerçek/canlı `earsivportal.efatura.gov.tr` adresine gerçek istekler atılır.

## Proje Yapısı

```
App.tsx                        # Navigasyon kökü, tema (MD3DarkTheme)
src/
  screens/
    LoginScreen.tsx
    DashboardScreen.tsx
    FaturaKesimScreen.tsx
    TaslaklarScreen.tsx
  services/
    gibApi.ts                  # GİB API istemcisi (dispatch/assos-login)
  store/
    useAuthStore.ts            # Zustand — oturum/token yönetimi
  types/
    gib.ts                     # Fatura/alıcı/GİB yanıt tipleri
  utils/
    secureStorage.ts           # Platform-güvenli SecureStore sarmalayıcı
```

## Lisans / Kullanım

Bu proje kişisel/profesyonel kullanım için geliştirilmiştir. GİB'in kullanım şartlarına ve ilgili mevzuata uygunluk kullanıcının sorumluluğundadır.
