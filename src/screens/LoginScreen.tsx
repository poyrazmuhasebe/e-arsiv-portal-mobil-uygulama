import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Checkbox, Text, TextInput, useTheme } from 'react-native-paper';

import { useAuthStore } from '../store/useAuthStore';
import { deleteSecureItem, getSecureItem, setSecureItem } from '../utils/secureStorage';

// Bunlar useAuthStore'un oturum (token) için kullandığı anahtarlardan
// AYRI: yalnızca giriş FORMUNU önceden doldurmak için, oturum açık
// olsun/olmasın (çıkış yapılsa bile) kalıcı olarak saklanır.
const HATIRLANAN_KULLANICI_KODU_KEY = 'gib_hatirlanan_kullanici_kodu';
const HATIRLANAN_SIFRE_KEY = 'gib_hatirlanan_sifre';

export default function LoginScreen() {
  const theme = useTheme();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [kullaniciKodu, setKullaniciKodu] = useState('');
  const [kullaniciSifresi, setKullaniciSifresi] = useState('');
  const [sifreGorunur, setSifreGorunur] = useState(false);
  const [kullaniciKoduHatirla, setKullaniciKoduHatirla] = useState(true);
  const [sifreyiHatirla, setSifreyiHatirla] = useState(true);

  // Daha önce "hatırla" işaretlenmiş bir kullanıcı kodu/şifre varsa formu
  // otomatik doldur. NOT: Gerçek bir kimlik bilgisini kaynak koduna
  // gömmüyoruz — bu yalnızca cihazda SecureStore'a (şifrelenmiş) kaydedilmiş,
  // kullanıcının kendi rızasıyla oluşturduğu bir kayıttır.
  useEffect(() => {
    (async () => {
      const [kayitliKullaniciKodu, kayitliSifre] = await Promise.all([
        getSecureItem(HATIRLANAN_KULLANICI_KODU_KEY),
        getSecureItem(HATIRLANAN_SIFRE_KEY),
      ]);
      if (kayitliKullaniciKodu) setKullaniciKodu(kayitliKullaniciKodu);
      if (kayitliSifre) setKullaniciSifresi(kayitliSifre);
    })();
  }, []);

  const girisYapDisabled = isLoading || !kullaniciKodu.trim() || !kullaniciSifresi;

  const handleGirisYap = async () => {
    if (girisYapDisabled) return;

    try {
      // Başarılı girişte store'daki token güncellenir; App.tsx bunu
      // dinleyip otomatik olarak Dashboard yığınına geçer (bkz. App.tsx).
      await login(kullaniciKodu.trim(), kullaniciSifresi);

      if (kullaniciKoduHatirla) {
        await setSecureItem(HATIRLANAN_KULLANICI_KODU_KEY, kullaniciKodu.trim());
      } else {
        await deleteSecureItem(HATIRLANAN_KULLANICI_KODU_KEY);
      }
      if (sifreyiHatirla) {
        await setSecureItem(HATIRLANAN_SIFRE_KEY, kullaniciSifresi);
      } else {
        await deleteSecureItem(HATIRLANAN_SIFRE_KEY);
      }
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
            <Text variant="headlineSmall" style={styles.title}>
              E-ARŞİV PORTAL İNTERAKTİF ŞİFRE İLE GİRİŞ EKRANI
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Kullanıcı Bilgileri
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              mode="outlined"
              label="Kullanıcı Kodu"
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

            <View style={styles.hatirlaGrubu}>
              <Checkbox.Item
                label="Kullanıcı Kodunu Hatırla"
                status={kullaniciKoduHatirla ? 'checked' : 'unchecked'}
                onPress={() => setKullaniciKoduHatirla((v) => !v)}
                style={styles.hatirlaOgesi}
                labelStyle={styles.hatirlaEtiket}
              />
              <Checkbox.Item
                label="Şifreyi Hatırla"
                status={sifreyiHatirla ? 'checked' : 'unchecked'}
                onPress={() => setSifreyiHatirla((v) => !v)}
                style={styles.hatirlaOgesi}
                labelStyle={styles.hatirlaEtiket}
              />
            </View>

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
  hatirlaGrubu: { marginTop: -8, marginBottom: -8 },
  hatirlaOgesi: { paddingHorizontal: 0 },
  hatirlaEtiket: { fontSize: 14 },
  button: { marginTop: 8, borderRadius: 8 },
  buttonContent: { paddingVertical: 6 },
  disclaimer: { marginTop: 16, opacity: 0.5, textAlign: 'center' },
});
