import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Alert,
  AppInput,
  AppScreen,
  DangerSoftButton,
  Icon,
  InfoBox,
  PrimaryButton,
  TextButton,
} from '../components/ui';
import { useHesapStore } from '../store/useHesapStore';
import { colors, radius, spacing, typography } from '../theme';

const KOD_HANE = 6;
/** Sunucudaki sınırla aynı: kod-gönder ucu hesap başına 60 saniyede bir. */
const YENIDEN_GONDER_SN = 60;

/**
 * E-posta doğrulama. Karar gereği bu adım ZORUNLU: doğrulanmadan GİB giriş
 * ekranına geçilmez.
 *
 * Bilinen risk (docs/hesap-sistemi.md): Cloudflare Email Sending şu an beta.
 * Posta gecikir ya da düşerse kullanıcı burada kalır — bu yüzden "yeniden
 * gönder" ve "hesaptan çık" her zaman erişilebilir durumda.
 */
export default function EpostaDogrulaScreen() {
  const kullanici = useHesapStore((s) => s.kullanici);
  const kodGonder = useHesapStore((s) => s.kodGonder);
  const epostaDogrula = useHesapStore((s) => s.epostaDogrula);
  const hesaptanCik = useHesapStore((s) => s.hesaptanCik);

  const [kod, setKod] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [bekleme, setBekleme] = useState(YENIDEN_GONDER_SN);
  // Yerel geliştirme Worker'ı kodu yanıtta döndürür; üretimde bu her zaman
  // undefined olur (bkz. worker/src/uclar/ortak.ts).
  const [gelistirmeKodu, setGelistirmeKodu] = useState<string | undefined>(undefined);
  const sayacRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    sayacRef.current = setInterval(() => {
      setBekleme((kalan) => (kalan > 0 ? kalan - 1 : 0));
    }, 1000);
    return () => {
      if (sayacRef.current !== null) clearInterval(sayacRef.current);
    };
  }, []);

  const handleDogrula = async () => {
    if (mesgul || kod.length !== KOD_HANE) return;
    setMesgul(true);
    try {
      await epostaDogrula(kod);
      // Başarılıysa App.tsx GİB giriş ekranına geçer.
    } catch (hata) {
      Alert.alert(
        'Doğrulanamadı',
        hata instanceof Error ? hata.message : 'Beklenmeyen bir hata oluştu.',
      );
    } finally {
      setMesgul(false);
    }
  };

  const handleYenidenGonder = async () => {
    if (mesgul || bekleme > 0) return;
    setMesgul(true);
    try {
      const yeniKod = await kodGonder();
      setGelistirmeKodu(yeniKod);
      setBekleme(YENIDEN_GONDER_SN);
      setKod('');
      Alert.alert('Kod gönderildi', 'Yeni doğrulama kodu e-posta adresinize gönderildi.');
    } catch (hata) {
      Alert.alert(
        'Kod gönderilemedi',
        hata instanceof Error ? hata.message : 'Beklenmeyen bir hata oluştu.',
      );
    } finally {
      setMesgul(false);
    }
  };

  const handleCik = () => {
    Alert.alert('Hesaptan çık', 'Oturumu kapatmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çık', style: 'destructive', onPress: () => void hesaptanCik() },
    ]);
  };

  return (
    <AppScreen>
      <KeyboardAvoidingView style={styles.kapsayici} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView persistentScrollbar indicatorStyle="white" contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <View style={styles.govde}>
            <View style={styles.baslikGrubu}>
              <View style={styles.karo}>
                <Icon name="email-check-outline" size={36} color={colors.primary} />
              </View>
              <Text style={styles.baslik} accessibilityRole="header">
                E-postanızı doğrulayın
              </Text>
              <Text style={styles.aciklama}>
                {kullanici?.eposta ?? 'E-posta adresinize'} adresine 6 haneli bir kod
                gönderdik. Kod 15 dakika geçerlidir.
              </Text>
            </View>

            <AppInput
              label="Doğrulama kodu"
              value={kod}
              onChangeText={(deger) => setKod(deger.replace(/[^0-9]/g, '').slice(0, KOD_HANE))}
              keyboardType="number-pad"
              maxLength={KOD_HANE}
              autoComplete="one-time-code"
              textAlign="center"
              style={styles.alan}
              onSubmitEditing={handleDogrula}
            />

            <View style={styles.butonlar}>
              <PrimaryButton
                onPress={handleDogrula}
                loading={mesgul}
                disabled={mesgul || kod.length !== KOD_HANE}
                fullWidth
              >
                Doğrula
              </PrimaryButton>

              <TextButton onPress={handleYenidenGonder} disabled={mesgul || bekleme > 0} fullWidth>
                {bekleme > 0 ? `Kodu yeniden gönder (${bekleme})` : 'Kodu yeniden gönder'}
              </TextButton>
            </View>

            {gelistirmeKodu !== undefined && (
              <InfoBox tone="info" icon="code-tags">
                {`Yerel geliştirme: kod ${gelistirmeKodu}`}
              </InfoBox>
            )}

            <InfoBox tone="neutral" icon="email-search-outline">
              E-posta gelmediyse gereksiz (spam) klasörünü kontrol edin. Sorun
              sürerse hesaptan çıkıp farklı bir adresle kayıt olabilirsiniz.
            </InfoBox>

            <DangerSoftButton icon="logout" onPress={handleCik} disabled={mesgul} compact style={styles.cikis}>
              Hesaptan çık
            </DangerSoftButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  icerik: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.xxl,
  },
  // Geniş ekranda (tablet) içerik ortada, okunabilir genişlikte kalır.
  govde: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: spacing.lg },
  baslikGrubu: { alignItems: 'center', gap: spacing.sm },
  karo: {
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
  baslik: { ...typography.screenTitle, fontSize: 24, lineHeight: 30, textAlign: 'center' },
  aciklama: { ...typography.bodySecondary, textAlign: 'center' },
  // Kod haneleri ayrık görünsün.
  alan: { letterSpacing: 6 },
  butonlar: { gap: spacing.xxs },
  cikis: { alignSelf: 'center' },
});
