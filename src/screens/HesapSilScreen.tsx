import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Alert,
  AppCard,
  AppHeader,
  AppInput,
  AppScreen,
  DangerButton,
  Icon,
  InfoBox,
} from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';
import { useHesapStore } from '../store/useHesapStore';
import { colors, spacing, typography } from '../theme';
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
    <AppScreen edges={['top', 'left', 'right']}>
      <AppHeader title="Hesabımı Sil" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.kapsayici}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <InfoBox tone="danger" icon="alert-outline" title="Bu işlem geri alınamaz">
            <Text style={styles.uyariMetni}>
              {kullanici?.eposta ?? 'Hesabınız'} adresine ait uygulama hesabı,
              tüm oturumlarınız ve sunucudaki diğer kayıtlarınız kalıcı olarak
              silinir. Dondurma değil, silmedir.
            </Text>
          </InfoBox>

          <AppCard style={styles.kart}>
            <View style={styles.madde}>
              <Icon name="cellphone-lock" size={20} color={colors.textSecondary} />
              <Text style={styles.aciklama}>
                <Text style={styles.kalin}>Telefonunuzdaki GİB verileri silinmez.</Text>{' '}
                Alıcı defteriniz, kayıtlı mal/hizmet adlarınız ve hatırlanan GİB
                kullanıcı kodunuz yalnızca bu cihazda duruyor; sunucuda bir
                kopyaları yok. Onları da silmek isterseniz uygulamayı
                kaldırabilirsiniz.
              </Text>
            </View>
            <View style={styles.ayirici} />
            <View style={styles.madde}>
              <Icon name="shield-check-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.aciklama}>
                GİB hesabınıza hiçbir şey olmaz — uygulama hesabı ondan
                bağımsızdır.
              </Text>
            </View>
          </AppCard>

          <AppInput
            label="Uygulama şifreniz"
            value={sifre}
            onChangeText={setSifre}
            secureTextEntry={!sifreGorunur}
            autoCapitalize="none"
            autoComplete="current-password"
            maxLength={SIFRE_EN_FAZLA}
            helperText="Bu, GİB şifreniz değildir."
            right={
              <TextInput.Icon
                icon={sifreGorunur ? 'eye-off' : 'eye'}
                onPress={() => setSifreGorunur((o) => !o)}
                accessibilityLabel={sifreGorunur ? 'Şifreyi gizle' : 'Şifreyi göster'}
              />
            }
          />

          <DangerButton
            icon="delete-forever-outline"
            onPress={onayla}
            loading={mesgul}
            disabled={mesgul || sifre.length === 0}
            fullWidth
          >
            Hesabımı Kalıcı Olarak Sil
          </DangerButton>

          <Text style={styles.dipnot} selectable>
            Hesabınızı uygulama olmadan da silebilirsiniz:
            https://earsivfatura.poyrazmuhasebe.com/hesap-sil
          </Text>
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
  uyariMetni: { ...typography.bodySecondary, color: colors.textSecondary },
  kart: { gap: spacing.sm },
  madde: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  aciklama: { ...typography.bodySecondary, flex: 1 },
  kalin: { fontWeight: '700', color: colors.textPrimary },
  ayirici: { height: 1, backgroundColor: colors.border },
  dipnot: { ...typography.caption },
});
