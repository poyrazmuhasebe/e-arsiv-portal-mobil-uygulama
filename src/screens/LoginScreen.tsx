import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import DuyuruKutusu from '../components/DuyuruKutusu';
import {
  Alert,
  AppInput,
  AppScreen,
  CheckRow,
  Icon,
  InfoBox,
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';
import { useHesapStore } from '../store/useHesapStore';
import { hatirlananKodlariOku, koduHatirla, koduUnut } from '../utils/hatirlananKodlar';
import { deleteSecureItem } from '../utils/secureStorage';
import { colors, radius, spacing, typography } from '../theme';
import type { RootStackParamList } from '../../App';

// Hatırlanan GİB kullanıcı kodları UYGULAMA HESABINA ÖZEL bir listede
// tutulur (bir kullanıcı birden fazla GİB koduyla çalışabilir); yalnızca giriş
// formunu doldurmak için, çıkış yapılsa bile kalır. Bkz. utils/hatirlananKodlar.ts.
// Şifre ARTIK HİÇBİR ZAMAN saklanmıyor. Bu anahtar yalnızca v1.0.0'da "Şifreyi
// Hatırla" ile kaydedilmiş eski şifreleri cihazdan silmek için (göç) tutuluyor.
const ESKI_HATIRLANAN_SIFRE_KEY = 'gib_hatirlanan_sifre';

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
    <AppScreen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView persistentScrollbar indicatorStyle="white"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.govde}>
            <DuyuruKutusu />

            <View style={styles.header}>
              <View style={styles.logo}>
                <Icon name="file-document-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.title} accessibilityRole="header">
                e-Arşiv Portal
              </Text>
              <Text style={styles.subtitle}>GİB İnteraktif Giriş</Text>
            </View>

            <View style={styles.form}>
              {hatirlananKodlar.length > 1 && (
                <View style={styles.kodlar}>
                  <Text style={styles.kodlarBaslik}>
                    Hatırlanan kullanıcı kodları (kaldırmak için basılı tutun)
                  </Text>
                  <View style={styles.kodSatiri}>
                    {hatirlananKodlar.map((kod) => {
                      const secili = kullaniciKodu.trim() === kod;
                      return (
                        <Pressable
                          key={kod}
                          onPress={() => {
                            setKullaniciKodu(kod);
                            setKullaniciSifresi('');
                          }}
                          onLongPress={() => handleKoduUnut(kod)}
                          disabled={isLoading}
                          accessibilityRole="button"
                          accessibilityLabel={`Kullanıcı kodu ${kod}`}
                          accessibilityHint="Kaldırmak için basılı tutun"
                          accessibilityState={{ selected: secili, disabled: isLoading }}
                          hitSlop={4}
                          style={({ pressed }) => [
                            styles.kodHapi,
                            secili && styles.kodHapiSecili,
                            pressed && styles.kodHapiBasili,
                            isLoading && styles.kodHapiPasif,
                          ]}
                        >
                          {secili ? <Icon name="account-check-outline" size={16} color={colors.primary} /> : null}
                          <Text style={[styles.kodYazi, secili && styles.kodYaziSecili]} numberOfLines={1}>
                            {kod}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              <AppInput
                label="GİB Kullanıcı Kodu"
                value={kullaniciKodu}
                onChangeText={setKullaniciKodu}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                keyboardType="default"
                returnKeyType="next"
                disabled={isLoading}
              />

              <AppInput
                label="Şifre"
                value={kullaniciSifresi}
                onChangeText={setKullaniciSifresi}
                secureTextEntry={!sifreGorunur}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleGirisYap}
                disabled={isLoading}
                right={
                  <TextInput.Icon
                    icon={sifreGorunur ? 'eye-off' : 'eye'}
                    onPress={() => setSifreGorunur((v) => !v)}
                    forceTextInputFocus={false}
                    accessibilityLabel={sifreGorunur ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  />
                }
              />

              <CheckRow
                label="Kullanıcı Kodunu Hatırla"
                checked={kullaniciKoduHatirla}
                onChange={() => setKullaniciKoduHatirla((v) => !v)}
              />

              <PrimaryButton
                icon="login"
                onPress={handleGirisYap}
                loading={isLoading}
                disabled={girisYapDisabled}
                fullWidth
              >
                Giriş Yap
              </PrimaryButton>

              {/* e-Arşiv Portal'dan BAĞIMSIZ: Dijital Vergi Dairesi'nden
                  (dijital.gib.gov.tr) alıcı olunan e-Arşiv faturaları. e-Arşiv
                  Portal hizmet vermediğinde de kullanılabilsin diye girişten
                  önce erişilebilir (kullanıcı isteği, 2026-09-22). Formdaki
                  kullanıcı kodu taşınır; şifre TAŞINMAZ, orada ayrıca sorulur. */}
              <SecondaryButton
                icon="receipt-text-outline"
                onPress={() =>
                  navigation.navigate('EarsivFaturalarim', { kullaniciKodu: kullaniciKodu.trim() || undefined })
                }
                disabled={isLoading}
                fullWidth
              >
                e-Arşiv Faturalarım (Dijital Vergi Dairesi)
              </SecondaryButton>
              <Text style={styles.dvdNotu}>
                e-Arşiv Portal'a girmeden, Dijital Vergi Dairesi'nden adınıza düzenlenen e-Arşiv faturalarını
                görüntüleyin.
              </Text>

              <InfoBox tone="primary" icon="shield-lock-outline" title="Güvenliğiniz">
                <Text style={styles.guvenlikMetni}>
                  Bu uygulama GİB'in resmi bir ürünü değildir. GİB kullanıcı kodunuz,
                  şifreniz ve fatura verileriniz yalnızca cihazınızdan DOĞRUDAN e-Arşiv
                  portalına gider; hesap sunucumuza ya da başka bir üçüncü tarafa hiçbir
                  koşulda gönderilmez. GİB şifreniz cihazda da saklanmaz; her girişte
                  yeniden girmeniz gerekir.
                </Text>
                <Text style={styles.guvenlikMetni}>
                  Uygulama hesabınız (e-posta, kullanıcı adı, şifre özeti) ayrıdır ve
                  Cloudflare'de, Avrupa Birliği'nde saklanır.
                </Text>
              </InfoBox>

              <TextButton onPress={handleHesaptanCik} disabled={isLoading} fullWidth>
                {hesapKullanicisi === null
                  ? 'Kayıt ol / giriş yap'
                  : `Hesaptan çık (${hesapKullanicisi.kullaniciAdi})`}
              </TextButton>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.xl,
  },
  // Geniş ekranda (tablet) form ortada, okunabilir genişlikte kalır.
  govde: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: spacing.xl },
  header: { alignItems: 'center', gap: spacing.xs },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.xlarge,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  title: { ...typography.screenTitle, textAlign: 'center' },
  subtitle: { ...typography.bodySecondary, textAlign: 'center' },
  form: { gap: spacing.md },
  kodlar: { gap: spacing.xs },
  kodlarBaslik: { ...typography.caption },
  kodSatiri: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  // Hatırlanan kod "hapı": 40dp yükseklik + hitSlop ile ≥ 44dp dokunma alanı.
  kodHapi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: 40,
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
  },
  kodHapiSecili: { borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
  kodHapiBasili: { backgroundColor: colors.surfaceSoft },
  kodHapiPasif: { opacity: 0.6 },
  kodYazi: { ...typography.label, color: colors.textPrimary, flexShrink: 1 },
  kodYaziSecili: { color: colors.primary, fontWeight: '600' },
  guvenlikMetni: { ...typography.bodySecondary, color: colors.textSecondary },
  dvdNotu: { ...typography.caption, textAlign: 'center', marginTop: -spacing.xxs },
});
