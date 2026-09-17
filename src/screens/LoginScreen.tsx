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
import { Button, Text, TextInput, useTheme } from 'react-native-paper';

import { useAuthStore } from '../store/useAuthStore';

export default function LoginScreen() {
  const theme = useTheme();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [kullaniciKodu, setKullaniciKodu] = useState('');
  const [kullaniciSifresi, setKullaniciSifresi] = useState('');
  const [sifreGorunur, setSifreGorunur] = useState(false);

  const girisYapDisabled = isLoading || !kullaniciKodu.trim() || !kullaniciSifresi;

  const handleGirisYap = async () => {
    if (girisYapDisabled) return;

    try {
      // Başarılı girişte store'daki token güncellenir; App.tsx bunu
      // dinleyip otomatik olarak Dashboard yığınına geçer (bkz. App.tsx).
      await login(kullaniciKodu.trim(), kullaniciSifresi);
    } catch (err) {
      // GİB'den dönen Türkçe hata mesajını (varsa) doğrudan göster,
      // yoksa genel bir bağlantı hatası mesajı ver.
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Giriş yapılamadı. Lütfen kullanıcı kodu ve şifrenizi kontrol edin.';
      Alert.alert('Giriş Başarısız', message);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>
              GİB e-Arşiv Girişi
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              e-Arşiv portalı kullanıcı kodunuz ve şifrenizle giriş yapın.
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              mode="outlined"
              label="Kullanıcı Kodu / VKN-TCKN"
              value={kullaniciKodu}
              onChangeText={setKullaniciKodu}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              keyboardType="default"
              returnKeyType="next"
              style={styles.input}
              disabled={isLoading}
            />

            <TextInput
              mode="outlined"
              label="Şifre"
              value={kullaniciSifresi}
              onChangeText={setKullaniciSifresi}
              secureTextEntry={!sifreGorunur}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleGirisYap}
              style={styles.input}
              disabled={isLoading}
              right={
                <TextInput.Icon
                  icon={sifreGorunur ? 'eye-off' : 'eye'}
                  onPress={() => setSifreGorunur((v) => !v)}
                  forceTextInputFocus={false}
                />
              }
            />

            <Button
              mode="contained"
              onPress={handleGirisYap}
              loading={isLoading}
              disabled={girisYapDisabled}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Giriş Yap
            </Button>

            <Text variant="bodySmall" style={styles.disclaimer}>
              Bu uygulama GİB'in resmi bir ürünü değildir; kullanıcı kodu ve şifreniz
              yalnızca cihazınızdan doğrudan e-Arşiv portalına gönderilir.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: { marginBottom: 32 },
  title: { fontWeight: '700', marginBottom: 8 },
  subtitle: { opacity: 0.6 },
  form: { gap: 16 },
  input: { width: '100%' },
  button: { marginTop: 8, borderRadius: 8 },
  buttonContent: { paddingVertical: 6 },
  disclaimer: { marginTop: 16, opacity: 0.5, textAlign: 'center' },
});
