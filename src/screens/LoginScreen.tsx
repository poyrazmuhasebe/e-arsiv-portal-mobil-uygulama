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
import { Button, Checkbox, Chip, Text, TextInput, useTheme } from 'react-native-paper';

import DuyuruKutusu from '../components/DuyuruKutusu';
import { useAuthStore } from '../store/useAuthStore';
import { useHesapStore } from '../store/useHesapStore';
import { hatirlananKodlariOku, koduHatirla, koduUnut } from '../utils/hatirlananKodlar';
import { deleteSecureItem } from '../utils/secureStorage';

// Hatırlanan GİB kullanıcı kodları UYGULAMA HESABINA ÖZEL bir listede
// tutulur (bir kullanıcı birden fazla GİB koduyla çalışabilir); yalnızca giriş
// formunu doldurmak için, çıkış yapılsa bile kalır. Bkz. utils/hatirlananKodlar.ts.
// Şifre ARTIK HİÇBİR ZAMAN saklanmıyor. Bu anahtar yalnızca v1.0.0'da "Şifreyi
// Hatırla" ile kaydedilmiş eski şifreleri cihazdan silmek için (göç) tutuluyor.
const ESKI_HATIRLANAN_SIFRE_KEY = 'gib_hatirlanan_sifre';

export default function LoginScreen() {
  const theme = useTheme();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hesapKullanicisi = useHesapStore((s) => s.kullanici);
  const hesaptanCik = useHesapStore((s) => s.hesaptanCik);

  const [kullaniciKodu, setKullaniciKodu] = useState('');
  const [kullaniciSifresi, setKullaniciSifresi] = useState('');
  const [sifreGorunur, setSifreGorunur] = useState(false);
  const [kullaniciKoduHatirla, setKullaniciKoduHatirla] = useState(true);
  const [hatirlananKodlar, setHatirlananKodlar] = useState<string[]>([]);
  const hesapId = hesapKullanicisi?.id ?? null;

  // Daha önce "hatırla" işaretlenmiş bir kullanıcı kodu varsa formu otomatik
  // doldur (yalnızca kullanıcı kodu — şifre asla doldurulmaz). Eski
  // sürümlerden kalmış kayıtlı bir şifre varsa cihazdan siliniyor.
  useEffect(() => {
    (async () => {
      await deleteSecureItem(ESKI_HATIRLANAN_SIFRE_KEY);
      const kodlar = await hatirlananKodlariOku(hesapId);
      setHatirlananKodlar(kodlar);
      if (kodlar.length > 0) setKullaniciKodu(kodlar[0]);
    })();
  }, [hesapId]);

  const handleKoduUnut = (kod: string) => {
    Alert.alert('Kodu unut', `${kod} hatırlanan kodlardan kaldırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          setHatirlananKodlar(await koduUnut(hesapId, kod));
          if (kullaniciKodu.trim() === kod) setKullaniciKodu('');
        },
      },
    ]);
  };

  const girisYapDisabled = isLoading || !kullaniciKodu.trim() || !kullaniciSifresi;

  const handleGirisYap = async () => {
    if (girisYapDisabled) return;

    try {
      // Başarılı girişte store'daki token güncellenir; App.tsx bunu
      // dinleyip otomatik olarak Dashboard yığınına geçer (bkz. App.tsx).
      // GİB oturumunun SAHİBİ olarak açık uygulama hesabının kimliği de
      // cihaza yazılır; böylece bu oturum başka bir hesaba geri yüklenemez
      // (bkz. src/utils/gibSahibi.ts, Issue #31).
      await login(kullaniciKodu.trim(), kullaniciSifresi, hesapKullanicisi?.id ?? '');

      // Yalnızca BU kod eklenir/çıkarılır; hesabın diğer kodları yerinde kalır.
      if (kullaniciKoduHatirla) {
        await koduHatirla(hesapId, kullaniciKodu.trim());
      } else {
        await koduUnut(hesapId, kullaniciKodu.trim());
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

  // "Hesaptan çık" ile "GİB oturumunu kapat" AYRI eylemlerdir. Burada GİB
  // oturumu zaten yok; yalnızca uygulama hesabı kapatılır.
  const handleHesaptanCik = () => {
    // DEMO "Şimdilik atla" modunda kapatılacak bir hesap yok: onay sormadan
    // Karşılama ekranına dön (hesaptanCik atlama bayrağını da sıfırlar).
    if (hesapKullanicisi === null) {
      void hesaptanCik();
      return;
    }
    Alert.alert('Hesaptan çık', 'Uygulama hesabınızdan çıkmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çık', style: 'destructive', onPress: () => void hesaptanCik() },
    ]);
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
            {hatirlananKodlar.length > 1 && (
              <View style={styles.kodlar}>
                <Text variant="labelSmall" style={styles.kodlarBaslik}>
                  Hatırlanan kullanıcı kodları (kaldırmak için basılı tutun)
                </Text>
                <View style={styles.kodSatiri}>
                  {hatirlananKodlar.map((kod) => (
                    <Chip
                      key={kod}
                      compact
                      selected={kullaniciKodu.trim() === kod}
                      showSelectedCheck={false}
                      onPress={() => {
                        setKullaniciKodu(kod);
                        setKullaniciSifresi('');
                      }}
                      onLongPress={() => handleKoduUnut(kod)}
                      disabled={isLoading}
                    >
                      {kod}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            <TextInput
              mode="outlined"
              label="GİB Kullanıcı Kodu"
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
              Bu uygulama GİB'in resmi bir ürünü değildir. GİB kullanıcı kodunuz,
              şifreniz ve fatura verileriniz yalnızca cihazınızdan DOĞRUDAN e-Arşiv
              portalına gider; hesap sunucumuza ya da başka bir üçüncü tarafa hiçbir
              koşulda gönderilmez. GİB şifreniz cihazda da saklanmaz; her girişte
              yeniden girmeniz gerekir.{'\n\n'}
              Uygulama hesabınız (e-posta, kullanıcı adı, şifre özeti) ayrıdır ve
              Cloudflare'de, Avrupa Birliği'nde saklanır.
            </Text>

            <Button
              mode="text"
              onPress={handleHesaptanCik}
              disabled={isLoading}
              style={styles.hesapCikis}
            >
              {hesapKullanicisi === null
                ? 'Kayıt ol / giriş yap'
                : `Hesaptan çık (${hesapKullanicisi.kullaniciAdi})`}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hesapCikis: { marginTop: 4 },
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
  kodlar: { width: '100%', gap: 6 },
  kodlarBaslik: { opacity: 0.7 },
  kodSatiri: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hatirlaOgesi: { paddingHorizontal: 0 },
  hatirlaEtiket: { fontSize: 14 },
  button: { marginTop: 8, borderRadius: 8 },
  buttonContent: { paddingVertical: 6 },
  disclaimer: { marginTop: 16, opacity: 0.5, textAlign: 'center' },
});
