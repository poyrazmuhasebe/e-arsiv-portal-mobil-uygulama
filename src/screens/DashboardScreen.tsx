import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Appbar, Card, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuthStore } from '../store/useAuthStore';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const theme = useTheme();
  const kullaniciBilgisi = useAuthStore((s) => s.kullaniciBilgisi);
  const kullaniciKodu = useAuthStore((s) => s.kullaniciKodu);
  const logout = useAuthStore((s) => s.logout);
  const isLoggingOut = useAuthStore((s) => s.isLoggingOut);

  const [localBusy, setLocalBusy] = useState(false);

  const unvan = (kullaniciBilgisi?.unvan as string | undefined) ?? kullaniciKodu ?? 'Mükellef';

  const handleGuvenliCikis = () => {
    Alert.alert('Güvenli Çıkış', 'Oturumu kapatmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          setLocalBusy(true);
          try {
            // logout() önce GİB'e EARSIV_PORTAL_LOGOUT isteği atar, o istek
            // hata verse bile yerel token'ı (SecureStore + state) temizler.
            // Bkz. src/store/useAuthStore.ts
            await logout();
          } finally {
            setLocalBusy(false);
          }
        },
      },
    ]);
  };

  const cikisYapiliyor = isLoggingOut || localBusy;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <Appbar.Header elevated>
        {/* Appbar.Content'in "subtitle" prop'u MD3 temasında (Paper v5
            varsayılanı) render edilmiyor, bu yüzden tek satır title kullanıyoruz.
            Şirket unvanları çok uzun olabildiğinden (ör. "...LİMİTED ŞİRKETİ")
            title'ı numberOfLines/ellipsizeMode kontrollü kendi Text'imizle
            veriyoruz — Appbar.Content'in "title" string'i bunu garanti etmez. */}
        <Appbar.Content
          title={
            <Text variant="titleLarge" numberOfLines={1} ellipsizeMode="tail">
              {unvan}
            </Text>
          }
        />
        {cikisYapiliyor ? (
          <View style={styles.logoutSpinner}>
            <ActivityIndicator size="small" />
          </View>
        ) : (
          <Appbar.Action icon="logout" accessibilityLabel="Güvenli Çıkış" onPress={handleGuvenliCikis} />
        )}
      </Appbar.Header>

      <View style={styles.content}>
        <Card mode="elevated" style={styles.card} onPress={() => navigation.navigate('FaturaKesim')}>
          <Card.Content style={styles.cardContent}>
            <Text variant="displaySmall">🧾</Text>
            <View style={styles.cardTextGroup}>
              <Text variant="titleLarge">Yeni Fatura Kes</Text>
              <Text variant="bodyMedium" style={styles.cardSubtitle}>
                Alıcı bilgilerini girip e-Arşiv faturası oluşturun
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Card mode="elevated" style={styles.card} onPress={() => navigation.navigate('Taslaklar')}>
          <Card.Content style={styles.cardContent}>
            <Text variant="displaySmall">📄</Text>
            <View style={styles.cardTextGroup}>
              <Text variant="titleLarge">Taslak / Kesilen Faturalar</Text>
              <Text variant="bodyMedium" style={styles.cardSubtitle}>
                Daha önce oluşturduğunuz faturaları görüntüleyin
              </Text>
            </View>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  logoutSpinner: { paddingHorizontal: 16 },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  card: { borderRadius: 16 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  cardTextGroup: { flex: 1, gap: 4 },
  cardSubtitle: { opacity: 0.6 },
});
