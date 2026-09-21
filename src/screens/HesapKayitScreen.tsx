import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Alert, AppHeader, AppInput, AppScreen, InfoBox, PrimaryButton } from '../components/ui';
import { useHesapStore } from '../store/useHesapStore';
import { colors, spacing, typography } from '../theme';
import {
  EPOSTA_EN_FAZLA,
  GIB_KODU_CAKISMA_MESAJI,
  KULLANICI_ADI_EN_FAZLA,
  SIFRE_EN_FAZLA,
  epostaHatasi,
  epostaNormalize,
  gibKoduylaCakisiyorMu,
  kullaniciAdiHatasi,
  kullaniciAdiNormalize,
  sifreHatasi,
} from '../utils/hesapDogrulama';
import { kayitIcinBilinenKodlar } from '../utils/hatirlananKodlar';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'HesapKayit'>;

// Cihazda hatırlanan GİB kodları yalnızca CİHAZDA karşılaştırma yapmak için
// okunur; hiçbir koşulda sunucuya gönderilmez (bkz. utils/hatirlananKodlar.ts).

export default function HesapKayitScreen({ navigation }: Props) {
  const kayitOl = useHesapStore((s) => s.kayitOl);
  const yukleniyor = useHesapStore((s) => s.yukleniyor);

  const [eposta, setEposta] = useState('');
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreGorunur, setSifreGorunur] = useState(false);
  const [bilinenGibKodlari, setBilinenGibKodlari] = useState<string[]>([]);
  const [dokunuldu, setDokunuldu] = useState(false);

  useEffect(() => {
    (async () => setBilinenGibKodlari(await kayitIcinBilinenKodlar()))();
  }, []);

  const epostaN = epostaNormalize(eposta);
  const kullaniciAdiN = kullaniciAdiNormalize(kullaniciAdi);

  const epostaHata = epostaHatasi(epostaN);
  const kullaniciAdiHata = bilinenGibKodlari.some((kod) => gibKoduylaCakisiyorMu(kullaniciAdi, kod))
    ? GIB_KODU_CAKISMA_MESAJI
    : kullaniciAdiHatasi(kullaniciAdiN);
  const sifreHata = sifreHatasi(sifre, epostaN, kullaniciAdiN);

  const gecerli = epostaHata === null && kullaniciAdiHata === null && sifreHata === null;

  const handleKayit = async () => {
    setDokunuldu(true);
    if (!gecerli || yukleniyor) return;

    try {
      // Kullanıcı adı GİB koduyla eşleşiyorsa buraya HİÇ gelinmez: yukarıdaki
      // kontrol yalnızca cihazda yapılır ve istek atılmaz.
      await kayitOl(epostaN, kullaniciAdiN, sifre);
      // Başarılıysa App.tsx e-posta doğrulama ekranına geçer.
    } catch (hata) {
      Alert.alert(
        'Kayıt yapılamadı',
        hata instanceof Error ? hata.message : 'Beklenmeyen bir hata oluştu.',
      );
    }
  };

  const hataGoster = (hata: string | null, deger: string): boolean =>
    hata !== null && (dokunuldu || deger.length > 0);

  return (
    <AppScreen edges={['top', 'left', 'right']}>
      <AppHeader title="Kayıt Ol" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.kapsayici}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <AppInput
              label="E-posta"
              value={eposta}
              onChangeText={setEposta}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              maxLength={EPOSTA_EN_FAZLA}
              errorText={hataGoster(epostaHata, eposta) ? epostaHata : null}
            />

            <AppInput
              label="Uygulama Kullanıcı Adı"
              value={kullaniciAdi}
              onChangeText={setKullaniciAdi}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={KULLANICI_ADI_EN_FAZLA}
              errorText={hataGoster(kullaniciAdiHata, kullaniciAdi) ? kullaniciAdiHata : null}
              helperText="GİB kullanıcı kodunuz değildir. 3–20 karakter, en az bir harf."
            />

            <AppInput
              label="Şifre"
              value={sifre}
              onChangeText={setSifre}
              secureTextEntry={!sifreGorunur}
              autoCapitalize="none"
              autoComplete="new-password"
              maxLength={SIFRE_EN_FAZLA}
              errorText={hataGoster(sifreHata, sifre) ? sifreHata : null}
              helperText="En az 8 karakter. GİB şifrenizden farklı olmalı."
              right={
                <TextInput.Icon
                  icon={sifreGorunur ? 'eye-off' : 'eye'}
                  onPress={() => setSifreGorunur((o) => !o)}
                  accessibilityLabel={sifreGorunur ? 'Şifreyi gizle' : 'Şifreyi göster'}
                />
              }
            />
          </View>

          <PrimaryButton onPress={handleKayit} loading={yukleniyor} disabled={yukleniyor} fullWidth>
            Kayıt Ol
          </PrimaryButton>

          {/* Aydınlatma metni ve gizlilik politikası kayıt düğmesinin
              YAKININDA. Açık rıza kutucuğu BİLEREK YOK: sözleşmenin kurulması
              için gerekli veriler açık rızaya bağlanmaz (KVKK 2026/347). */}
          <Text style={styles.hukukMetni}>
            Kayıt olarak{' '}
            <Text
              style={styles.baglanti}
              accessibilityRole="link"
              onPress={() => navigation.navigate('HukukiMetin', { metin: 'sartlar' })}
            >
              Hizmet Şartları
            </Text>
            'nı kabul etmiş olursunuz. Kişisel verilerinizin nasıl işlendiği
            için{' '}
            <Text
              style={styles.baglanti}
              accessibilityRole="link"
              onPress={() => navigation.navigate('HukukiMetin', { metin: 'aydinlatma' })}
            >
              Aydınlatma Metni
            </Text>{' '}
            ve{' '}
            <Text
              style={styles.baglanti}
              accessibilityRole="link"
              onPress={() => navigation.navigate('HukukiMetin', { metin: 'gizlilik' })}
            >
              Gizlilik Politikası
            </Text>
            'nı inceleyin.
          </Text>

          <InfoBox tone="primary" icon="shield-lock-outline" title="Verileriniz nereye gider?">
            Bu bilgiler hesap sunucumuza (Cloudflare, Avrupa Birliği) gönderilir. Şifreniz orada geri döndürülemez
            biçimde özetlenir, açık hâli hiçbir yerde saklanmaz. GİB kullanıcı kodunuz, GİB şifreniz ve fatura
            verileriniz buraya hiçbir koşulda gönderilmez.
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
  form: { gap: spacing.xxs },
  hukukMetni: { ...typography.bodySecondary },
  baglanti: { color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
});
