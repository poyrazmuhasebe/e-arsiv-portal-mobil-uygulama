import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Alert,
  AppHeader,
  AppInput,
  AppScreen,
  InfoBox,
  PrimaryButton,
  TextButton,
} from '../components/ui';
import {
  sifreSifirlamaBaslat,
  sifreSifirlamaTamamla,
  HesapApiHatasi,
} from '../services/hesapApi';
import {
  EPOSTA_EN_FAZLA,
  SIFRE_EN_FAZLA,
  epostaHatasi,
  epostaNormalize,
  sifreHatasi,
} from '../utils/hesapDogrulama';
import { spacing, typography } from '../theme';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'SifremiUnuttum'>;

const KOD_HANE = 6;

function gelistirmeMi(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/**
 * İki adımlı: önce e-posta ile kod istenir, sonra kod + yeni şifre gönderilir.
 *
 * Sunucu, e-posta kayıtlı olsun olmasın AYNI yanıtı döner (enumeration
 * koruması); bu yüzden ilk adımda "hesap bulunamadı" gibi bir mesaj asla
 * göstermiyoruz.
 */
export default function SifremiUnuttumScreen({ route, navigation }: Props) {
  const [adim, setAdim] = useState<'eposta' | 'kod'>('eposta');
  const [eposta, setEposta] = useState(route.params?.eposta ?? '');
  const [kod, setKod] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [sifreGorunur, setSifreGorunur] = useState(false);
  const [mesgul, setMesgul] = useState(false);
  const [gelistirmeKodu, setGelistirmeKodu] = useState<string | undefined>(undefined);

  const epostaN = epostaNormalize(eposta);
  const epostaHata = epostaHatasi(epostaN);
  const sifreHata = sifreHatasi(yeniSifre, epostaN, '');

  const handleBaslat = async () => {
    if (mesgul || epostaHata !== null) return;
    setMesgul(true);
    try {
      const yanit = await sifreSifirlamaBaslat(epostaN, gelistirmeMi());
      setGelistirmeKodu(yanit.gelistirmeKodu);
      setAdim('kod');
    } catch (hata) {
      Alert.alert(
        'Gönderilemedi',
        hata instanceof Error ? hata.message : 'Beklenmeyen bir hata oluştu.',
      );
    } finally {
      setMesgul(false);
    }
  };

  const handleTamamla = async () => {
    if (mesgul || kod.length !== KOD_HANE || sifreHata !== null) return;
    setMesgul(true);
    try {
      await sifreSifirlamaTamamla(epostaN, kod, yeniSifre, gelistirmeMi());
      Alert.alert(
        'Şifreniz değiştirildi',
        'Yeni şifrenizle giriş yapabilirsiniz. Güvenlik gereği açık olan tüm oturumlarınız kapatıldı.',
        [{ text: 'Tamam', onPress: () => navigation.navigate('HesapGiris') }],
      );
    } catch (hata) {
      const mesaj =
        hata instanceof HesapApiHatasi
          ? hata.message
          : hata instanceof Error
            ? hata.message
            : 'Beklenmeyen bir hata oluştu.';
      Alert.alert('Şifre değiştirilemedi', mesaj);
    } finally {
      setMesgul(false);
    }
  };

  return (
    <AppScreen edges={['top', 'left', 'right']}>
      <AppHeader title="Şifremi Unuttum" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.kapsayici}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView persistentScrollbar indicatorStyle="white" contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          {adim === 'eposta' ? (
            <>
              <Text style={styles.aciklama}>
                Hesabınızın e-posta adresini girin. Adres kayıtlıysa 6 haneli
                bir sıfırlama kodu göndereceğiz.
              </Text>

              <AppInput
                label="E-posta"
                value={eposta}
                onChangeText={setEposta}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                maxLength={EPOSTA_EN_FAZLA}
                errorText={epostaHata !== null && eposta.length > 0 ? epostaHata : null}
              />

              <PrimaryButton
                onPress={handleBaslat}
                loading={mesgul}
                disabled={mesgul || epostaHata !== null}
                fullWidth
              >
                Kod Gönder
              </PrimaryButton>
            </>
          ) : (
            <>
              <Text style={styles.aciklama}>
                {epostaN} adresine bir kod gönderildi (adres kayıtlıysa). Kodu
                ve yeni şifrenizi girin.
              </Text>

              <View style={styles.form}>
                <AppInput
                  label="Sıfırlama kodu"
                  value={kod}
                  onChangeText={(deger) =>
                    setKod(deger.replace(/[^0-9]/g, '').slice(0, KOD_HANE))
                  }
                  keyboardType="number-pad"
                  maxLength={KOD_HANE}
                  autoComplete="one-time-code"
                />

                <AppInput
                  label="Yeni şifre"
                  value={yeniSifre}
                  onChangeText={setYeniSifre}
                  secureTextEntry={!sifreGorunur}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  maxLength={SIFRE_EN_FAZLA}
                  errorText={sifreHata !== null && yeniSifre.length > 0 ? sifreHata : null}
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
                <PrimaryButton
                  onPress={handleTamamla}
                  loading={mesgul}
                  disabled={mesgul || kod.length !== KOD_HANE || sifreHata !== null}
                  fullWidth
                >
                  Şifreyi Değiştir
                </PrimaryButton>

                <TextButton onPress={() => setAdim('eposta')} disabled={mesgul} fullWidth>
                  Adresi değiştir
                </TextButton>
              </View>

              {gelistirmeKodu !== undefined && (
                <InfoBox tone="info" icon="code-tags">
                  {`Yerel geliştirme: kod ${gelistirmeKodu}`}
                </InfoBox>
              )}
            </>
          )}
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
