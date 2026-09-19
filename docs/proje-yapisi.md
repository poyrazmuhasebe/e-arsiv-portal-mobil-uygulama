# Proje Yapısı

```
index.ts                       # Expo giriş noktası (registerRootComponent)
App.tsx                        # Navigasyon kökü, tema (MD3DarkTheme)
app.json                       # Expo yapılandırması (ad, ikonlar, paket kimliği, eklentiler, engellenen izinler)
eas.json                       # EAS Build profilleri (preview: APK, production)
assets/                        # Uygulama ikonu, Android uyarlanabilir ikon katmanları, favicon, splash
builds/                        # Yerel/EAS derleme çıktıları (APK) — git dışı
docs/                          # Bu dokümantasyon
src/
  screens/
    LoginScreen.tsx
    DashboardScreen.tsx
    FaturaKesimScreen.tsx       # Orkestratör — kartları birleştirir
    TaslaklarScreen.tsx
    IptalItirazTalepleriScreen.tsx
    KullaniciBilgileriScreen.tsx
    AliciDefteriScreen.tsx      # Hesaba özel alıcı defteri yönetimi
    KilitScreen.tsx
    fatura/
      FaturaBilgileriKarti.tsx
      AliciBilgileriKarti.tsx
      IrsaliyeBilgileriKarti.tsx
      MalHizmetKarti.tsx
      ToplamlarKarti.tsx
  components/
    SecimAlani.tsx              # Yeniden kullanılabilir dropdown/seçici
    DuyuruKutusu.tsx            # Giriş ekranındaki GİB duyuru kutusu
    FaturaWebView.tsx           # Fatura HTML görüntüleyici (en az yetkili WebView)
  constants/
    faturaConstants.ts          # Para birimi/fatura tipi/ülke/birim/vergi/tevkifat listeleri
    duyurular.ts                # GİB duyuruları (metin + bitiş anı)
    hukukiMetinler.ts           # Uygulama içi aydınlatma/gizlilik/şartlar TASLAKLARI
  config/
    hesapSunucu.ts              # Hesap sunucusu adresi (EXPO_PUBLIC_HESAP_API_URL)
  services/
    gibApi.ts                   # GİB API istemcisi (dispatch/assos-login)
    hesapApi.ts                 # Hesap sunucusu (Worker) istemcisi — GİB alanlarını reddeder
    gibHataMesajlari.ts         # Bilinen GİB/ağ hata metinlerinin Türkçe açıklamaları
  store/
    useAuthStore.ts             # Zustand — GİB oturumu/token yönetimi
    useHesapStore.ts            # Zustand — uygulama hesabı oturumu (AYRI store)
  types/
    gib.ts                      # Fatura/alıcı/GİB yanıt tipleri
    ortam.d.ts                  # process.env için dar tip tanımı
    faturaForm.ts                # Fatura kesim formunun yerel state tipleri
  utils/
    secureStorage.ts             # Platform-güvenli SecureStore sarmalayıcı
    hesapAnahtari.ts              # Kullanıcı koduna özel SecureStore anahtarı
    bolunmusDefter.ts             # Defterlerin kayıt başına anahtarda saklanması, taşıma
    aliciDefteri.ts               # Kayıtlı alıcılar (adres defteri)
    malHizmetDefteri.ts           # Kayıtlı mal/hizmet adları
    paraBirimi.ts                 # Tutar etiketleri için para birimi simgesi
    vergiDestegi.ts               # Desteklenen vergi türleri, vergi uyumsuzluğu kontrolü
    duyuru.ts                     # Gösterilecek duyuru seçimi, kapatılanlar
    kimlikDogrula.ts              # VKN/TCKN kontrol basamağı
    dosyaTemizlik.ts              # Eski fatura PDF'lerini silme
    uygulamaKilidi.ts             # Cihaz kilidiyle uygulama kilidi
    hesapDogrulama.ts             # Hesap alan kuralları (worker/src/dogrulama.ts ile aynı)
    gibSahibi.ts                  # GİB oturumunun sahibi olan uygulama hesabı
    faturaHesap.ts                 # KDV/iskonto/tevkifat hesaplama mantığı
    pdf.ts                          # HTML → PDF, indirme (SAF) / paylaşma
test/
  calistir.mjs                  # `npm test`: tsc ile CommonJS derle + node --test
  node-tipleri.d.ts             # Testlerde kullanılan Node API'lerinin dar tipleri
  sahte/kurulum.ts              # RN/Expo/axios/fetch sahteleri (Module._load kancası)
  *.test.ts                     # Birim testleri
tsconfig.test.json              # Yalnızca test derlemesi (module: commonjs)
```

## Hesap sunucusu (`worker/`)

Uygulama hesabı sistemi ayrı bir Cloudflare Worker'ında, kendi `package.json`
ve `tsconfig.json`'ı ile. Kök `tsconfig.json` bu klasörü `exclude` eder.
Tasarım: [hesap-sistemi.md](hesap-sistemi.md).

```
worker/
  wrangler.jsonc                # Worker yapılandırması, D1 binding, observability
  .dev.vars.example             # Yerel sırlar için şablon (.dev.vars git dışı)
  vitest.config.ts              # @cloudflare/vitest-plugin + migration okuma
  worker-configuration.d.ts     # `wrangler types` çıktısı (üretilmiş)
  migrations/
    0001_hesap_semasi.sql       # D1 şeması — GİB verisi için HİÇBİR tablo/sütun yok
  src/
    index.ts                    # Yönlendirme, CORS, genel hata yakalama
    turler.ts                   # Ortam (binding + değişken) sözleşmesi
    genel-tipler.d.ts           # Ana modülü Cloudflare tip sistemine tanıtır
    yanit.ts                    # JSON yanıtları ve IstekHatasi
    govde.ts                    # Gövde okuma, boyut sınırı, bilinmeyen alan reddi
    dogrulama.ts                # E-posta/kullanıcı adı/şifre kuralları (saf)
    kripto.ts                   # Sabit zamanlı karşılaştırma, SHA-256, HS256
    sifre.ts                    # scrypt özetleme ve doğrulama
    oturum.ts                   # Oturum oluşturma, rotasyonlu yenileme, iptal
    kodlar.ts                   # Tek kullanımlık 6 haneli kodlar
    oranSinir.ts                # Sabit pencereli oran sınırlama (D1)
    eposta.ts                   # Cloudflare Email Sending (henüz denenmedi)
    cors.ts                     # Açık izin listesi, wildcard yok
    uclar/                      # Uç nokta işleyicileri
  test/
    kurulum.ts                  # Migration'ları yerel D1'e uygular
    yardimci.ts                 # İstek yardımcıları, hesap açma
    *.test.ts                   # Gerçek workerd + gerçek yerel D1'e karşı testler
```
