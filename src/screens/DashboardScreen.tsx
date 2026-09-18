import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Appbar, Card, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuthStore } from '../store/useAuthStore';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

interface MenuOgesi {
  icon: string;
  baslik: string;
  altBaslik: string;
  onPress: () => void;
}

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

  // GİB'in kendi "Belge İşlemleri" ana menüsündeki 4 alt sekmeyle birebir
  // eşleşiyor (bkz. gerçek menü ağacı yakalaması): e-Arşiv Fatura Oluştur,
  // Taslak Faturalar, İptal/İtiraz Talepleri, Adıma Düzenlenen Belgeler.
  // Sonuncusu henüz uygulanmadı — cmd'i canlı bir yakalamayla doğrulanana
  // kadar yer tutucu bir uyarı gösteriyor.
  const belgeIslemleri: MenuOgesi[] = [
    {
      icon: '🧾',
      baslik: 'e-Arşiv Fatura (İnteraktif) Oluştur',
      altBaslik: 'Alıcı bilgilerini girip e-Arşiv faturası oluşturun',
      onPress: () => navigation.navigate('FaturaKesim'),
    },
    {
      icon: '📄',
      baslik: 'Taslak / Kesilen Faturalar',
      altBaslik: 'Daha önce oluşturduğunuz faturaları görüntüleyin',
      onPress: () => navigation.navigate('Taslaklar'),
    },
    {
      icon: '↩️',
      baslik: 'İptal / İtiraz Talepleri',
      altBaslik: 'Gelen iptal/itiraz taleplerini kabul edin veya reddedin',
      onPress: () => navigation.navigate('IptalItirazTalepleri'),
    },
    {
      icon: '📥',
      baslik: 'Adıma Düzenlenen Belgeler',
      altBaslik: 'Bu özellik henüz eklenmedi',
      onPress: () => Alert.alert('Yakında', 'Bu özellik henüz eklenmedi.'),
    },
  ];

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

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="labelLarge" style={styles.bolumBasligi}>
          BELGE İŞLEMLERİ
        </Text>
        {belgeIslemleri.map((oge) => (
          <Card key={oge.baslik} mode="elevated" style={styles.card} onPress={oge.onPress}>
            <Card.Content style={styles.cardContent}>
              <Text variant="displaySmall">{oge.icon}</Text>
              <View style={styles.cardTextGroup}>
                <Text variant="titleMedium">{oge.baslik}</Text>
                <Text variant="bodySmall" style={styles.cardSubtitle}>
                  {oge.altBaslik}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  logoutSpinner: { paddingHorizontal: 16 },
  content: {
    padding: 20,
    gap: 12,
  },
  bolumBasligi: { opacity: 0.6, marginBottom: 4, letterSpacing: 0.5 },
  card: { borderRadius: 16 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  cardTextGroup: { flex: 1, gap: 4 },
  cardSubtitle: { opacity: 0.6 },
});
