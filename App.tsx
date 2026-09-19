import React, { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, MD3DarkTheme, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import FaturaKesimScreen from './src/screens/FaturaKesimScreen';
import TaslaklarScreen from './src/screens/TaslaklarScreen';
import IptalItirazTalepleriScreen from './src/screens/IptalItirazTalepleriScreen';
import KullaniciBilgileriScreen from './src/screens/KullaniciBilgileriScreen';
import KilitScreen from './src/screens/KilitScreen';
import { useAuthStore } from './src/store/useAuthStore';
import { eskiOrtakAliciDefteriniSil } from './src/utils/aliciDefteri';
import { eskiFaturaPdfleriniSil } from './src/utils/dosyaTemizlik';
import { kilitGerekliMi, zamanAsimiDolduMu } from './src/utils/uygulamaKilidi';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  FaturaKesim: undefined;
  Taslaklar: undefined;
  IptalItirazTalepleri: undefined;
  KullaniciBilgileri: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const token = useAuthStore((s) => s.token);
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
        await restoreSession();
        // Kayıtlı bir oturum geri yüklendiyse, ana ekran görünmeden ÖNCE kilitle.
        if (useAuthStore.getState().token && (await kilitGerekliMi())) setKilitli(true);
      } finally {
        setIsRestoring(false);
      }
    })();
  }, [restoreSession]);

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
      if (!useAuthStore.getState().token || !zamanAsimiDolduMu(gecis, Date.now())) return;
      kilitGerekliMi().then((gerekli) => {
        if (gerekli) setKilitli(true);
      });
    });
    return () => abonelik.remove();
  }, []);

  // Oturum kapandığında (çıkış/süre dolması) kilit durumu sıfırlanır.
  useEffect(() => {
    if (!token) setKilitli(false);
  }, [token]);

  // Uygulamanın varsayılan teması: tamamen koyu (Dark Mode). Tek bir
  // PaperProvider burada, en üst katmanda kuruluyor — Login, Dashboard,
  // FaturaKesim, Taslaklar dahil her ekran bu temayı otomatik miras alır.
  // Ekranların kendi içinde ayrıca PaperProvider açmasına gerek yok.
  return (
    <SafeAreaProvider>
      <PaperProvider theme={MD3DarkTheme}>
        <StatusBar style="light" />
        {isRestoring ? (
          <View style={[styles.loadingContainer, { backgroundColor: MD3DarkTheme.colors.background }]}>
            <ActivityIndicator size="large" />
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
              <NavigationContainer theme={NavigationDarkTheme}>
                {/* Token varlığına göre iki ayrı ekran grubu render ediliyor
                    (React Navigation'ın önerdiği auth-flow deseni). Token
                    değiştiğinde (login/logout) yığın otomatik olarak takas edilir,
                    ekranların kendi içinden manuel navigate/replace çağırmasına
                    gerek kalmaz. */}
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                  {token ? (
                    <Stack.Group>
                      <Stack.Screen name="Dashboard" component={DashboardScreen} />
                      <Stack.Screen name="FaturaKesim" component={FaturaKesimScreen} />
                      <Stack.Screen name="Taslaklar" component={TaslaklarScreen} />
                      <Stack.Screen name="IptalItirazTalepleri" component={IptalItirazTalepleriScreen} />
                      <Stack.Screen name="KullaniciBilgileri" component={KullaniciBilgileriScreen} />
                    </Stack.Group>
                  ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                  )}
                </Stack.Navigator>
              </NavigationContainer>
            </View>
            {token && kilitli && <KilitScreen onAc={() => setKilitli(false)} />}
          </View>
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1 },
  kilitliIcerik: { pointerEvents: 'none' },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
