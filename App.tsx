import React, { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import FaturaKesimScreen from './src/screens/FaturaKesimScreen';
import TaslaklarScreen from './src/screens/TaslaklarScreen';
import IptalItirazTalepleriScreen from './src/screens/IptalItirazTalepleriScreen';
import KullaniciBilgileriScreen from './src/screens/KullaniciBilgileriScreen';
import KilitScreen from './src/screens/KilitScreen';
import AliciDefteriScreen from './src/screens/AliciDefteriScreen';
import MalHizmetDefteriScreen from './src/screens/MalHizmetDefteriScreen';
import KarsilamaScreen from './src/screens/KarsilamaScreen';
import HesapKayitScreen from './src/screens/HesapKayitScreen';
import HesapGirisScreen from './src/screens/HesapGirisScreen';
import EpostaDogrulaScreen from './src/screens/EpostaDogrulaScreen';
import SifremiUnuttumScreen from './src/screens/SifremiUnuttumScreen';
import HukukiMetinScreen from './src/screens/HukukiMetinScreen';
import HesapSilScreen from './src/screens/HesapSilScreen';
import AdimaDuzenlenenScreen from './src/screens/AdimaDuzenlenenScreen';
import EarsivFaturalarimScreen from './src/screens/EarsivFaturalarimScreen';
import YedekleScreen from './src/screens/YedekleScreen';
import YedekleriGoruntuleScreen from './src/screens/YedekleriGoruntuleScreen';
import { useAuthStore } from './src/store/useAuthStore';
import { useHesapStore } from './src/store/useHesapStore';
import { eskiOrtakAliciDefteriniSil } from './src/utils/aliciDefteri';
import { eskiFaturaPdfleriniSil } from './src/utils/dosyaTemizlik';
import { kilitGerekliMi, zamanAsimiDolduMu } from './src/utils/uygulamaKilidi';
import type { HukukiMetinAnahtari } from './src/constants/hukukiMetinler';
import { AlertHost } from './src/components/ui/AppAlert';
import HtmlOnIsleyici from './src/components/HtmlOnIsleyici';
import { colors, navigationTheme, paperTheme } from './src/theme';

export type RootStackParamList = {
  Karsilama: undefined;
  HesapKayit: undefined;
  HesapGiris: undefined;
  SifremiUnuttum: { eposta?: string } | undefined;
  HukukiMetin: { metin: HukukiMetinAnahtari };
  EpostaDogrula: undefined;
  HesapSil: undefined;
  Login: undefined;
  Dashboard: undefined;
  FaturaKesim: undefined;
  Taslaklar: undefined;
  IptalItirazTalepleri: undefined;
  KullaniciBilgileri: undefined;
  AliciDefteri: undefined;
  MalHizmetDefteri: undefined;
  AdimaDuzenlenen: undefined;
  // kullaniciKodu: GİB giriş ekranından (e-Arşiv girişi yapılmadan) açılınca formdaki kod.
  EarsivFaturalarim: { kullaniciKodu?: string } | undefined;
  Yedekle: undefined;
  YedekleriGoruntule: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Kilit hem uygulama hesabı hem GİB oturumu için geçerli. */
function oturumVarMi(): boolean {
  return (
    useHesapStore.getState().kullanici !== null || useAuthStore.getState().token !== null
  );
}

export default function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const oturumuGeriYukle = useHesapStore((s) => s.oturumuGeriYukle);
  const token = useAuthStore((s) => s.token);
  const hesapKullanicisi = useHesapStore((s) => s.kullanici);
  // DEMO: "Şimdilik atla" ile hesapsız GİB girişine geçildi mi (yalnızca bellekte).
  const hesapAtlandi = useHesapStore((s) => s.atlandi);
  const [isRestoring, setIsRestoring] = useState(true);
  // Uygulama kilidi (bkz. src/utils/uygulamaKilidi.ts): kayıtlı oturum geri
  // yüklendiğinde ve uzun süre arka planda kaldıktan sonra doğrulama istenir.
  const [kilitli, setKilitli] = useState(false);
  const arkaPlanaGecis = useRef<number | null>(null);

  useEffect(() => {
    // Eski sürümlerden kalan, hesaplar arası ortak alıcı defterini sil.
    eskiOrtakAliciDefteriniSil();
    // Önceki kullanımlardan kalan fatura PDF'lerini (1 saatten eski) temizle.
    eskiFaturaPdfleriniSil();
    (async () => {
      try {
        // ÖNCE uygulama hesabı oturumu: GİB oturumunun geri yüklenip
        // yüklenmeyeceği buna bağlı. restoreSession ARTIK KOŞULSUZ ÇAĞRILMIYOR:
        // cihazdaki GİB oturumunun sahibi, açık olan uygulama hesabıyla
        // eşleşmiyorsa (ya da sahipsizse) oturum geri yüklenmez ve silinir.
        // Bkz. src/utils/gibSahibi.ts, Issue #31.
        await oturumuGeriYukle();
        await restoreSession(useHesapStore.getState().kullanici?.id ?? null);
        // Kayıtlı bir oturum geri yüklendiyse, ana ekran görünmeden ÖNCE kilitle.
        if (oturumVarMi() && (await kilitGerekliMi())) setKilitli(true);
      } finally {
        setIsRestoring(false);
      }
    })();
  }, [restoreSession, oturumuGeriYukle]);

  // Uygulama arka plandan 3 dakikadan uzun sonra dönerse tekrar kilitle.
  useEffect(() => {
    const abonelik = AppState.addEventListener('change', (durum) => {
      if (durum === 'background') {
        arkaPlanaGecis.current = Date.now();
        return;
      }
      if (durum !== 'active') return;

      const gecis = arkaPlanaGecis.current;
      arkaPlanaGecis.current = null;
      if (!oturumVarMi() || !zamanAsimiDolduMu(gecis, Date.now())) return;
      kilitGerekliMi().then((gerekli) => {
        if (gerekli) setKilitli(true);
      });
    });
    return () => abonelik.remove();
  }, []);

  // Her iki oturum da kapandığında kilit durumu sıfırlanır.
  useEffect(() => {
    if (!token && hesapKullanicisi === null) setKilitli(false);
  }, [token, hesapKullanicisi]);

  // Hesapla girildiyse e-posta doğrulaması zorunlu; hesap atlandıysa bu adım yok.
  const epostaDogrulandi = hesapKullanicisi?.epostaDogrulandi === true;
  const hesapAdimiGecildi = hesapKullanicisi !== null ? epostaDogrulandi : hesapAtlandi;
  const kilitGosterilsin = (token !== null || hesapKullanicisi !== null) && kilitli;

  // Uygulamanın teması src/theme'deki token'lardan üretilir (koyu grafit +
  // lacivert, lavanta vurgu; bkz. docs/tasarim-sistemi.md). Tek bir
  // PaperProvider burada, en üst katmanda — her ekran bu temayı miras alır.
  // AlertHost: temalı Alert.alert dialog'larını (components/ui/AppAlert)
  // çizer; Android'in varsayılan beyaz dialog'u kullanılmaz.
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <StatusBar style="light" />
        {isRestoring ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.kok}>
            {/* Kilitliyken altındaki ekranlar silinmez (yarım kalmış fatura formu
                korunur), yalnızca dokunmaya ve erişilebilirlik okuyucularına
                kapatılıp opak kilit ekranıyla örtülür. */}
            <View
              style={[styles.kok, kilitli && styles.kilitliIcerik]}
              importantForAccessibility={kilitli ? 'no-hide-descendants' : 'auto'}
              accessibilityElementsHidden={kilitli}
            >
              <NavigationContainer theme={navigationTheme}>
                {/* Oturum durumuna göre DÖRT ayrı ekran grubu render ediliyor
                    (React Navigation'ın önerdiği auth-flow deseni). Durum
                    değiştiğinde yığın otomatik takas edilir, ekranların kendi
                    içinden manuel navigate/replace çağırmasına gerek kalmaz:

                    1. Uygulama hesabı yok        → Karşılama / Kayıt / Giriş
                       (DEMO: "Şimdilik atla" ile doğrudan 3'e geçilebilir)
                    2. Hesap var, e-posta yok     → E-posta Doğrula (ZORUNLU)
                    3. Hesap var, GİB oturumu yok → GİB Giriş (bugünkü Login)
                    4. İkisi de var               → Dashboard grubu

                    Bkz. docs/hesap-sistemi.md → "Ekran durumları". */}
                <Stack.Navigator
                  screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
                >
                  {hesapKullanicisi === null && !hesapAtlandi ? (
                    <Stack.Group>
                      <Stack.Screen name="Karsilama" component={KarsilamaScreen} />
                      <Stack.Screen name="HesapKayit" component={HesapKayitScreen} />
                      <Stack.Screen name="HesapGiris" component={HesapGirisScreen} />
                      <Stack.Screen name="SifremiUnuttum" component={SifremiUnuttumScreen} />
                      <Stack.Screen name="HukukiMetin" component={HukukiMetinScreen} />
                    </Stack.Group>
                  ) : !hesapAdimiGecildi ? (
                    <Stack.Group>
                      <Stack.Screen name="EpostaDogrula" component={EpostaDogrulaScreen} />
                      <Stack.Screen name="HukukiMetin" component={HukukiMetinScreen} />
                    </Stack.Group>
                  ) : token === null ? (
                    <Stack.Group>
                      <Stack.Screen name="Login" component={LoginScreen} />
                      {/* e-Arşiv Portal girişinden bağımsız (Dijital Vergi Dairesi). */}
                      <Stack.Screen name="EarsivFaturalarim" component={EarsivFaturalarimScreen} />
                      <Stack.Screen name="HesapSil" component={HesapSilScreen} />
                      <Stack.Screen name="HukukiMetin" component={HukukiMetinScreen} />
                    </Stack.Group>
                  ) : (
                    <Stack.Group>
                      <Stack.Screen name="Dashboard" component={DashboardScreen} />
                      <Stack.Screen name="FaturaKesim" component={FaturaKesimScreen} />
                      <Stack.Screen name="Taslaklar" component={TaslaklarScreen} />
                      <Stack.Screen name="IptalItirazTalepleri" component={IptalItirazTalepleriScreen} />
                      <Stack.Screen name="KullaniciBilgileri" component={KullaniciBilgileriScreen} />
                      <Stack.Screen name="AliciDefteri" component={AliciDefteriScreen} />
                      <Stack.Screen name="MalHizmetDefteri" component={MalHizmetDefteriScreen} />
                      <Stack.Screen name="AdimaDuzenlenen" component={AdimaDuzenlenenScreen} />
                      <Stack.Screen name="EarsivFaturalarim" component={EarsivFaturalarimScreen} />
                      <Stack.Screen name="Yedekle" component={YedekleScreen} />
                      <Stack.Screen name="YedekleriGoruntule" component={YedekleriGoruntuleScreen} />
                      <Stack.Screen name="HesapSil" component={HesapSilScreen} />
                      <Stack.Screen name="HukukiMetin" component={HukukiMetinScreen} />
                    </Stack.Group>
                  )}
                </Stack.Navigator>
              </NavigationContainer>
            </View>
            {kilitGosterilsin && <KilitScreen onAc={() => setKilitli(false)} />}
            <AlertHost />
            {/* PDF'ten önce GİB karekodunu çizdiren görünmez WebView. */}
            <HtmlOnIsleyici />
          </View>
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1, backgroundColor: colors.background },
  kilitliIcerik: { pointerEvents: 'none' },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
