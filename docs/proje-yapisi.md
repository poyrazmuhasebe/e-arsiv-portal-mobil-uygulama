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
