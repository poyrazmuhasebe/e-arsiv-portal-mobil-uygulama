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

import DuyuruKutusu from '../components/DuyuruKutusu';
import { useAuthStore } from '../store/useAuthStore';
import { deleteSecureItem, getSecureItem, setSecureItem } from '../utils/secureStorage';

// Bu anahtar useAuthStore'un oturum (token) için kullandığı anahtarlardan
// AYRI: yalnızca giriş FORMUNU önceden doldurmak için, oturum açık
// olsun/olmasın (çıkış yapılsa bile) kalıcı olarak saklanır.
const HATIRLANAN_KULLANICI_KODU_KEY = 'gib_hatirlanan_kullanici_kodu';
// Şifre ARTIK HİÇBİR ZAMAN saklanmıyor. Bu anahtar yalnızca v1.0.0'da "Şifreyi
// Hatırla" ile kaydedilmiş eski şifreleri cihazdan silmek için (göç) tutuluyor.
const ESKI_HATIRLANAN_SIFRE_KEY = 'gib_hatirlanan_sifre';

export default function LoginScreen() {
  const theme = useTheme();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [kullaniciKodu, setKullaniciKodu] = useState('');
  const [kullaniciSifresi, setKullaniciSifresi] = useState('');
  const [sifreGorunur, setSifreGorunur] = useState(false);
  const [kullaniciKoduHatirla, setKullaniciKoduHatirla] = useState(true);

  // Daha önce "hatırla" işaretlenmiş bir kullanıcı kodu varsa formu otomatik
  // doldur (yalnızca kullanıcı kodu — şifre asla doldurulmaz). Eski
  // sürümlerden kalmış kayıtlı bir şifre varsa cihazdan siliniyor.
  useEffect(() => {
    (async () => {
      await deleteSecureItem(ESKI_HATIRLANAN_SIFRE_KEY);
      const kayitliKullaniciKodu = await getSecureItem(HATIRLANAN_KULLANICI_KODU_KEY);
      if (kayitliKullaniciKodu) setKullaniciKodu(kayitliKullaniciKodu);
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
          <DuyuruKutusu />

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
              yalnızca cihazınızdan doğrudan e-Arşiv portalına gönderilir. Şifreniz
              cihazda saklanmaz; her girişte yeniden girmeniz gerekir.
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
