import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Button, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuthStore } from '../store/useAuthStore';
import { useHesapStore } from '../store/useHesapStore';
import { SIFRE_EN_FAZLA } from '../utils/hesapDogrulama';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'HesapSil'>;

/**
 * Uygulama içi hesap silme. Google Play, hesap oluşturan uygulamalarda bunu
 * ZORUNLU tutuyor; ayrıca herkese açık bir web sayfası da gerekiyor
 * (Worker'daki `/hesap-sil`).
 *
 * Silme yalnızca SUNUCUDAKİ hesabı kaldırır. Cihazdaki GİB defterleri ve
 * hatırlanan GİB kodu silinmez — bunlar sunucuda zaten yok ve hiçbir
 * yedekleri de yok, dolayısıyla burada silmek geri alınamaz veri kaybı olurdu.
 */
export default function HesapSilScreen({ navigation }: Props) {
  const theme = useTheme();
  const kullanici = useHesapStore((s) => s.kullanici);
  const hesabiSil = useHesapStore((s) => s.hesabiSil);
  const gibLogout = useAuthStore((s) => s.logout);

  const [sifre, setSifre] = useState('');
  const [sifreGorunur, setSifreGorunur] = useState(false);
  const [mesgul, setMesgul] = useState(false);

  const sil = async () => {
    setMesgul(true);
    try {
      // Önce GİB oturumunu kapat: hesap gidince o oturum sahipsiz kalırdı.
      await gibLogout();
      await hesabiSil(sifre);
      // Başarılıysa App.tsx Karşılama ekranına döner.
    } catch (hata) {
      Alert.alert(
        'Hesap silinemedi',
        hata instanceof Error ? hata.message : 'Beklenmeyen bir hata oluştu.',
      );
    } finally {
      setMesgul(false);
    }
  };

  const onayla = () => {
    if (mesgul || sifre.length === 0) return;
    Alert.alert(
      'Hesabınızı silmek üzeresiniz',
      'Bu işlem GERİ ALINAMAZ. Hesabınız, oturumlarınız ve sunucudaki tüm kayıtlarınız kalıcı olarak silinecek.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Kalıcı olarak sil', style: 'destructive', onPress: () => void sil() },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.kapsayici} edges={['top', 'left', 'right']}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Hesabımı Sil" />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.kapsayici}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <View style={[styles.uyari, { borderColor: theme.colors.error }]}>
            <Text variant="titleSmall" style={{ color: theme.colors.error }}>
              Bu işlem geri alınamaz
            </Text>
            <Text variant="bodyMedium" style={styles.uyariGovde}>
              {kullanici?.eposta ?? 'Hesabınız'} adresine ait uygulama hesabı,
              tüm oturumlarınız ve sunucudaki diğer kayıtlarınız kalıcı olarak
              silinir. Dondurma değil, silmedir.
            </Text>
          </View>

          <Text variant="bodyMedium" style={styles.aciklama}>
            <Text style={styles.kalin}>Telefonunuzdaki GİB verileri silinmez.</Text>{' '}
            Alıcı defteriniz, kayıtlı mal/hizmet adlarınız ve hatırlanan GİB
            kullanıcı kodunuz yalnızca bu cihazda duruyor; sunucuda bir
            kopyaları yok. Onları da silmek isterseniz uygulamayı
            kaldırabilirsiniz.
          </Text>

          <Text variant="bodyMedium" style={styles.aciklama}>
            GİB hesabınıza hiçbir şey olmaz — uygulama hesabı ondan
            bağımsızdır.
          </Text>

          <TextInput
            label="Uygulama şifreniz"
            value={sifre}
            onChangeText={setSifre}
            mode="outlined"
            secureTextEntry={!sifreGorunur}
            autoCapitalize="none"
            autoComplete="current-password"
            maxLength={SIFRE_EN_FAZLA}
            style={styles.alan}
            right={
              <TextInput.Icon
                icon={sifreGorunur ? 'eye-off' : 'eye'}
                onPress={() => setSifreGorunur((o) => !o)}
                accessibilityLabel={sifreGorunur ? 'Şifreyi gizle' : 'Şifreyi göster'}
              />
            }
          />
          <Text variant="bodySmall" style={styles.dipnot}>
            Bu, GİB şifreniz değildir.
          </Text>

          <Button
            mode="contained"
            buttonColor={theme.colors.error}
            textColor={theme.colors.onError}
            onPress={onayla}
            loading={mesgul}
            disabled={mesgul || sifre.length === 0}
            style={styles.buton}
            contentStyle={styles.butonIc}
          >
            Hesabımı Kalıcı Olarak Sil
          </Button>

          <Text variant="bodySmall" style={styles.dipnot}>
            Hesabınızı uygulama olmadan da silebilirsiniz:
            https://earsivfatura.poyrazmuhasebe.com/hesap-sil
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  icerik: { padding: 20, paddingBottom: 48 },
  uyari: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  uyariGovde: { opacity: 0.9 },
  aciklama: { marginTop: 16, opacity: 0.8, lineHeight: 20 },
  kalin: { fontWeight: '700' },
  alan: { marginTop: 24 },
  buton: { marginTop: 20 },
  butonIc: { paddingVertical: 6 },
  dipnot: { marginTop: 10, opacity: 0.6 },
});
