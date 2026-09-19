import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Karsilama'>;

/**
 * Uygulamanın yeni açılış ekranı. GİB girişi BURADA YOK — önce uygulama
 * hesabı, sonra GİB. Karar ve gerekçe: docs/hesap-sistemi.md
 */
export default function KarsilamaScreen({ navigation }: Props) {
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.kapsayici} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.icerik}>
        <View style={styles.baslikGrubu}>
          <Text variant="displaySmall">🧾</Text>
          <Text variant="headlineMedium" style={styles.baslik}>
            e-Arşiv Portal
          </Text>
          <Text variant="bodyMedium" style={styles.altBaslik}>
            Devam etmek için bir uygulama hesabı oluşturun ya da hesabınıza
            giriş yapın. GİB girişi bir sonraki adımda.
          </Text>
        </View>

        <View style={styles.butonlar}>
          <Button
            mode="contained"
            icon="account-plus"
            onPress={() => navigation.navigate('HesapKayit')}
            contentStyle={styles.butonIc}
          >
            Kayıt Ol
          </Button>
          <Button
            mode="outlined"
            icon="login"
            onPress={() => navigation.navigate('HesapGiris')}
            contentStyle={styles.butonIc}
          >
            Giriş Yap
          </Button>
        </View>

        <View style={[styles.bilgi, { borderColor: theme.colors.outlineVariant }]}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Uygulama hesabınız GİB hesabınızdan bağımsızdır. GİB kullanıcı
            kodunuz, şifreniz ve fatura verileriniz yalnızca telefonunuz ile
            GİB arasında kalır; hesap sunucumuza gönderilmez.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  icerik: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 36 },
  baslikGrubu: { alignItems: 'center', gap: 10 },
  baslik: { fontWeight: '700' },
  altBaslik: { textAlign: 'center', opacity: 0.75 },
  butonlar: { gap: 12 },
  butonIc: { paddingVertical: 6 },
  bilgi: { borderWidth: 1, borderRadius: 12, padding: 14 },
});
