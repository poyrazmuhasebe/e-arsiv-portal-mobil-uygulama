import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Button, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useHesapStore } from '../store/useHesapStore';
import { EPOSTA_EN_FAZLA, SIFRE_EN_FAZLA, epostaNormalize } from '../utils/hesapDogrulama';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'HesapGiris'>;

export default function HesapGirisScreen({ navigation }: Props) {
  const theme = useTheme();
  const girisYap = useHesapStore((s) => s.girisYap);
  const yukleniyor = useHesapStore((s) => s.yukleniyor);

  const [eposta, setEposta] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreGorunur, setSifreGorunur] = useState(false);

  const devamEdilemez = yukleniyor || eposta.trim().length === 0 || sifre.length === 0;

  const handleGiris = async () => {
    if (devamEdilemez) return;
    try {
      await girisYap(epostaNormalize(eposta), sifre);
      // Başarılıysa App.tsx bir sonraki adıma geçer.
    } catch (hata) {
      Alert.alert(
        'Giriş yapılamadı',
        hata instanceof Error ? hata.message : 'Beklenmeyen bir hata oluştu.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.kapsayici} edges={['top', 'left', 'right']}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Giriş Yap" />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.kapsayici}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <Text variant="bodyMedium" style={styles.aciklama}>
            Uygulama hesabınızla giriş yapın. Bu, GİB hesabınız değildir.
          </Text>

          <TextInput
            label="E-posta"
            value={eposta}
            onChangeText={setEposta}
            mode="outlined"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            maxLength={EPOSTA_EN_FAZLA}
            style={styles.alan}
          />

          <TextInput
            label="Şifre"
            value={sifre}
            onChangeText={setSifre}
            mode="outlined"
            secureTextEntry={!sifreGorunur}
            autoCapitalize="none"
            autoComplete="current-password"
            maxLength={SIFRE_EN_FAZLA}
            style={styles.alan}
            onSubmitEditing={handleGiris}
            right={
              <TextInput.Icon
                icon={sifreGorunur ? 'eye-off' : 'eye'}
                onPress={() => setSifreGorunur((o) => !o)}
                accessibilityLabel={sifreGorunur ? 'Şifreyi gizle' : 'Şifreyi göster'}
              />
            }
          />

          <Button
            mode="contained"
            onPress={handleGiris}
            loading={yukleniyor}
            disabled={devamEdilemez}
            style={styles.buton}
            contentStyle={styles.butonIc}
          >
            Giriş Yap
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('SifremiUnuttum', { eposta: eposta.trim() })}
            disabled={yukleniyor}
          >
            Şifremi unuttum
          </Button>

          <Text
            variant="bodySmall"
            style={[styles.dipnot, { color: theme.colors.onSurfaceVariant }]}
          >
            Girişten sonra GİB e-Arşiv Portal giriş ekranı gelir. GİB kullanıcı
            kodunuz ve şifreniz yalnızca cihazınızdan doğrudan GİB'e gönderilir.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  icerik: { padding: 20, paddingBottom: 48 },
  aciklama: { opacity: 0.75, marginBottom: 20 },
  alan: { marginBottom: 14 },
  buton: { marginTop: 6 },
  butonIc: { paddingVertical: 6 },
  dipnot: { marginTop: 20, lineHeight: 18 },
});
