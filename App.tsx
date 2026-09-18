import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { useAuthStore } from './src/store/useAuthStore';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  FaturaKesim: undefined;
  Taslaklar: undefined;
  IptalItirazTalepleri: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const token = useAuthStore((s) => s.token);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    restoreSession().finally(() => setIsRestoring(false));
  }, [restoreSession]);

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
                </Stack.Group>
              ) : (
                <Stack.Screen name="Login" component={LoginScreen} />
              )}
            </Stack.Navigator>
          </NavigationContainer>
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
