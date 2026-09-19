# Proje Yapısı

```
App.tsx                        # Navigasyon kökü, tema (MD3DarkTheme)
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
  constants/
    faturaConstants.ts          # Para birimi/fatura tipi/ülke/birim/vergi/tevkifat listeleri
    duyurular.ts                # GİB duyuruları (metin + bitiş anı)
  services/
    gibApi.ts                   # GİB API istemcisi (dispatch/assos-login)
    gibHataMesajlari.ts         # Bilinen GİB/ağ hata metinlerinin Türkçe açıklamaları
  store/
    useAuthStore.ts             # Zustand — oturum/token yönetimi
  types/
    gib.ts                      # Fatura/alıcı/GİB yanıt tipleri
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
    faturaHesap.ts                 # KDV/iskonto/tevkifat hesaplama mantığı
    pdf.ts                          # HTML → PDF, indirme (SAF) / paylaşma
test/
  calistir.mjs                  # `npm test`: tsc ile CommonJS derle + node --test
  node-tipleri.d.ts             # Testlerde kullanılan Node API'lerinin dar tipleri
  sahte/kurulum.ts              # RN/Expo/axios sahteleri (Module._load kancası)
  *.test.ts                     # Birim testleri
tsconfig.test.json              # Yalnızca test derlemesi (module: commonjs)
```
