import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppScreen, InfoBox, PrimaryButton, SecondaryButton } from '../components/ui';
import { colors, radius, spacing, typography } from '../theme';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Karsilama'>;

/**
 * Uygulamanın yeni açılış ekranı. GİB girişi BURADA YOK — önce uygulama
 * hesabı, sonra GİB. Karar ve gerekçe: docs/hesap-sistemi.md
 */
export default function KarsilamaScreen({ navigation }: Props) {
  return (
    <AppScreen>
      <ScrollView persistentScrollbar indicatorStyle="white" contentContainerStyle={styles.icerik}>
        <View style={styles.govde}>
          <View style={styles.baslikGrubu}>
            <View style={styles.logo}>
              <Image source={require('../../assets/splash-icon.png')} style={styles.marka} resizeMode="contain" accessible={false} />
            </View>
            <Text style={styles.baslik} accessibilityRole="header">
              e-Arşiv Portal
            </Text>
            <Text style={styles.altBaslik}>
              Devam etmek için bir uygulama hesabı oluşturun ya da hesabınıza giriş yapın. GİB girişi bir sonraki
              adımdadır.
            </Text>
          </View>

          <View style={styles.butonlar}>
            <PrimaryButton icon="account-plus" onPress={() => navigation.navigate('HesapKayit')} fullWidth>
              Kayıt Ol
            </PrimaryButton>
            <SecondaryButton icon="login" onPress={() => navigation.navigate('HesapGiris')} fullWidth>
              Giriş Yap
            </SecondaryButton>
          </View>

          <InfoBox tone="primary" icon="shield-lock-outline" title="Gizliliğiniz">
            Uygulama hesabınız GİB hesabınızdan bağımsızdır. GİB kullanıcı kodunuz, şifreniz ve fatura verileriniz
            yalnızca telefonunuz ile GİB arasında kalır; hesap sunucumuza gönderilmez.
          </InfoBox>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  icerik: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.xxl,
  },
  // Geniş ekranda (tablet) içerik ortada, okunabilir genişlikte kalır.
  govde: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: spacing.xxl },
  baslikGrubu: { alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.xlarge,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  baslik: { ...typography.screenTitle, textAlign: 'center' },
  marka: { width: 64, height: 64 },
  altBaslik: { ...typography.bodySecondary, textAlign: 'center', maxWidth: 420 },
  butonlar: { gap: spacing.sm },
});
