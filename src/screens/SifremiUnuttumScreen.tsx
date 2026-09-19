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
import { Appbar, Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

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
  const theme = useTheme();

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
    <SafeAreaView style={styles.kapsayici} edges={['top', 'left', 'right']}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Şifremi Unuttum" />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.kapsayici}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          {adim === 'eposta' ? (
            <>
              <Text variant="bodyMedium" style={styles.aciklama}>
                Hesabınızın e-posta adresini girin. Adres kayıtlıysa 6 haneli
                bir sıfırlama kodu göndereceğiz.
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
                error={epostaHata !== null && eposta.length > 0}
              />
              <HelperText type="error" visible={epostaHata !== null && eposta.length > 0}>
                {epostaHata ?? ''}
              </HelperText>

              <Button
                mode="contained"
                onPress={handleBaslat}
                loading={mesgul}
                disabled={mesgul || epostaHata !== null}
                contentStyle={styles.butonIc}
              >
                Kod Gönder
              </Button>
            </>
          ) : (
            <>
              <Text variant="bodyMedium" style={styles.aciklama}>
                {epostaN} adresine bir kod gönderildi (adres kayıtlıysa). Kodu
                ve yeni şifrenizi girin.
              </Text>

              <TextInput
                label="Sıfırlama kodu"
                value={kod}
                onChangeText={(deger) =>
                  setKod(deger.replace(/[^0-9]/g, '').slice(0, KOD_HANE))
                }
                mode="outlined"
                keyboardType="number-pad"
                maxLength={KOD_HANE}
                autoComplete="one-time-code"
                style={styles.alan}
              />

              <TextInput
                label="Yeni şifre"
                value={yeniSifre}
                onChangeText={setYeniSifre}
                mode="outlined"
                secureTextEntry={!sifreGorunur}
                autoCapitalize="none"
                autoComplete="new-password"
                maxLength={SIFRE_EN_FAZLA}
                error={sifreHata !== null && yeniSifre.length > 0}
                right={
                  <TextInput.Icon
                    icon={sifreGorunur ? 'eye-off' : 'eye'}
                    onPress={() => setSifreGorunur((o) => !o)}
                    accessibilityLabel={sifreGorunur ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  />
                }
              />
              <HelperText type="error" visible={sifreHata !== null && yeniSifre.length > 0}>
                {sifreHata ?? ''}
              </HelperText>

              <Button
                mode="contained"
                onPress={handleTamamla}
                loading={mesgul}
                disabled={mesgul || kod.length !== KOD_HANE || sifreHata !== null}
                contentStyle={styles.butonIc}
              >
                Şifreyi Değiştir
              </Button>

              <Button mode="text" onPress={() => setAdim('eposta')} disabled={mesgul}>
                Adresi değiştir
              </Button>

              {gelistirmeKodu !== undefined && (
                <View style={[styles.gelistirme, { borderColor: theme.colors.tertiary }]}>
                  <Text variant="bodySmall" style={{ color: theme.colors.tertiary }}>
                    Yerel geliştirme: kod {gelistirmeKodu}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  icerik: { padding: 20, paddingBottom: 48 },
  aciklama: { opacity: 0.75, marginBottom: 18 },
  alan: { marginBottom: 14 },
  butonIc: { paddingVertical: 6 },
  gelistirme: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
    alignSelf: 'center',
  },
});
