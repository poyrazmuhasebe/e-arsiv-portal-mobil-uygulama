import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Alert, AppHeader, AppInput, AppScreen, InfoBox, PrimaryButton, TextButton } from '../components/ui';
import { useHesapStore } from '../store/useHesapStore';
import { spacing, typography } from '../theme';
import { EPOSTA_EN_FAZLA, SIFRE_EN_FAZLA, epostaNormalize } from '../utils/hesapDogrulama';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'HesapGiris'>;

export default function HesapGirisScreen({ navigation }: Props) {
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
    <AppScreen edges={['top', 'left', 'right']}>
      <AppHeader title="Giriş Yap" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.kapsayici}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <Text style={styles.aciklama}>
            Uygulama hesabınızla giriş yapın. Bu, GİB hesabınız değildir.
          </Text>

          <View style={styles.form}>
            <AppInput
              label="E-posta"
              value={eposta}
              onChangeText={setEposta}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              maxLength={EPOSTA_EN_FAZLA}
            />

            <AppInput
              label="Şifre"
              value={sifre}
              onChangeText={setSifre}
              secureTextEntry={!sifreGorunur}
              autoCapitalize="none"
              autoComplete="current-password"
              maxLength={SIFRE_EN_FAZLA}
              onSubmitEditing={handleGiris}
              right={
                <TextInput.Icon
                  icon={sifreGorunur ? 'eye-off' : 'eye'}
                  onPress={() => setSifreGorunur((o) => !o)}
                  accessibilityLabel={sifreGorunur ? 'Şifreyi gizle' : 'Şifreyi göster'}
                />
              }
            />
          </View>

          <View style={styles.butonlar}>
            <PrimaryButton onPress={handleGiris} loading={yukleniyor} disabled={devamEdilemez} fullWidth>
              Giriş Yap
            </PrimaryButton>

            <TextButton
              onPress={() => navigation.navigate('SifremiUnuttum', { eposta: eposta.trim() })}
              disabled={yukleniyor}
              fullWidth
            >
              Şifremi unuttum
            </TextButton>
          </View>

          <InfoBox tone="neutral" icon="shield-lock-outline">
            Girişten sonra GİB e-Arşiv Portal giriş ekranı gelir. GİB kullanıcı kodunuz ve şifreniz yalnızca
            cihazınızdan doğrudan GİB'e gönderilir.
          </InfoBox>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  icerik: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  aciklama: { ...typography.bodySecondary },
  form: { gap: spacing.sm },
  butonlar: { gap: spacing.xxs },
});
