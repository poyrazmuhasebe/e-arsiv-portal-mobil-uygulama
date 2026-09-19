import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';

import { useHesapStore } from '../store/useHesapStore';

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
  const theme = useTheme();
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
    <SafeAreaView style={styles.kapsayici} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
        <Text variant="displaySmall">✉️</Text>
        <Text variant="headlineSmall" style={styles.baslik}>
          E-postanızı doğrulayın
        </Text>
        <Text variant="bodyMedium" style={styles.aciklama}>
          {kullanici?.eposta ?? 'E-posta adresinize'} adresine 6 haneli bir kod
          gönderdik. Kod 15 dakika geçerlidir.
        </Text>

        <TextInput
          label="Doğrulama kodu"
          value={kod}
          onChangeText={(deger) => setKod(deger.replace(/[^0-9]/g, '').slice(0, KOD_HANE))}
          mode="outlined"
          keyboardType="number-pad"
          maxLength={KOD_HANE}
          autoComplete="one-time-code"
          textAlign="center"
          style={styles.alan}
          onSubmitEditing={handleDogrula}
        />

        <Button
          mode="contained"
          onPress={handleDogrula}
          loading={mesgul}
          disabled={mesgul || kod.length !== KOD_HANE}
          style={styles.buton}
          contentStyle={styles.butonIc}
        >
          Doğrula
        </Button>

        <Button mode="text" onPress={handleYenidenGonder} disabled={mesgul || bekleme > 0}>
          {bekleme > 0 ? `Kodu yeniden gönder (${bekleme})` : 'Kodu yeniden gönder'}
        </Button>

        {gelistirmeKodu !== undefined && (
          <View style={[styles.gelistirme, { borderColor: theme.colors.tertiary }]}>
            <Text variant="bodySmall" style={{ color: theme.colors.tertiary }}>
              Yerel geliştirme: kod {gelistirmeKodu}
            </Text>
          </View>
        )}

        <Text variant="bodySmall" style={styles.dipnot}>
          E-posta gelmediyse gereksiz (spam) klasörünü kontrol edin. Sorun
          sürerse hesaptan çıkıp farklı bir adresle kayıt olabilirsiniz.
        </Text>

        <Button mode="text" onPress={handleCik} disabled={mesgul} textColor={theme.colors.error}>
          Hesaptan çık
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  icerik: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8 },
  baslik: { fontWeight: '700', marginTop: 4 },
  aciklama: { textAlign: 'center', opacity: 0.75, marginBottom: 12 },
  alan: { alignSelf: 'stretch', letterSpacing: 6 },
  buton: { alignSelf: 'stretch', marginTop: 8 },
  butonIc: { paddingVertical: 6 },
  gelistirme: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  dipnot: { textAlign: 'center', opacity: 0.6, marginTop: 12 },
});
