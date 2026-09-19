import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, useTheme } from 'react-native-paper';

import { useAuthStore } from '../store/useAuthStore';
import { useHesapStore } from '../store/useHesapStore';
import { kilidiAcmayiDene, kilitHataMesaji, kilitUygulanamazMi } from '../utils/uygulamaKilidi';

interface Props {
  /** Doğrulama başarılı olunca (ya da cihazda artık kilit yöntemi kalmadıysa) çağrılır. */
  onAc: () => void;
}

/**
 * Oturum açıkken uygulamanın üstüne binen, opak tam ekran kilit. Altındaki
 * ekranlar (yarım kalmış bir fatura formu dahil) SİLİNMEZ, yalnızca örtülür;
 * bu yüzden arka plandan dönüşte kilit açılınca kullanıcı kaldığı yerden devam eder.
 */
export default function KilitScreen({ onAc }: Props) {
  const theme = useTheme();
  const gibLogout = useAuthStore((s) => s.logout);
  const hesaptanCik = useHesapStore((s) => s.hesaptanCik);

  /**
   * Kilit ekranındaki tek çıkış yolu HER İKİ oturumu da kapatır: telefonu
   * bulan biri için ara bir durum bırakmanın anlamı yok. Önce GİB, sonra
   * hesap (sunucuda yenileme token'ı da iptal edilir).
   */
  const tumOturumlariKapat = useCallback(async () => {
    await gibLogout();
    await hesaptanCik();
  }, [gibLogout, hesaptanCik]);

  const [deneniyor, setDeneniyor] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const denemeSuruyor = useRef(false);

  const dene = useCallback(async () => {
    // Aynı anda iki doğrulama penceresi açılmasın.
    if (denemeSuruyor.current) return;
    denemeSuruyor.current = true;
    setDeneniyor(true);
    setMesaj(null);
    try {
      const sonuc = await kilidiAcmayiDene();
      if (sonuc.basarili || kilitUygulanamazMi(sonuc.hata)) {
        onAc();
        return;
      }
      setMesaj(kilitHataMesaji(sonuc.hata));
    } finally {
      denemeSuruyor.current = false;
      setDeneniyor(false);
    }
  }, [onAc]);

  // Kilit ekranı görünür görünmez doğrulama penceresini kendiliğinden aç.
  useEffect(() => {
    dene();
  }, [dene]);

  return (
    <SafeAreaView style={[styles.kapsayici, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.icerik}>
        <Text variant="displayMedium">🔒</Text>
        <Text variant="headlineSmall" style={styles.baslik}>
          Uygulama kilitli
        </Text>
        <Text variant="bodyMedium" style={styles.aciklama}>
          Devam etmek için cihazınızın kilit yöntemiyle (parmak izi, yüz, PIN, desen) kimliğinizi doğrulayın.
        </Text>
        {mesaj && (
          <Text variant="bodySmall" style={{ color: theme.colors.error, textAlign: 'center' }}>
            {mesaj}
          </Text>
        )}
        <Button mode="contained" icon="lock-open-variant" onPress={dene} loading={deneniyor} disabled={deneniyor} style={styles.buton}>
          Kilidi Aç
        </Button>
        <Button mode="text" onPress={() => void tumOturumlariKapat()} disabled={deneniyor}>
          Hesaptan Çık
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Altındaki ekranı tamamen örtmek için tüm alanı kaplar ve opaktır.
  kapsayici: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, elevation: 1000 },
  icerik: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  baslik: { fontWeight: '700', marginTop: 8 },
  aciklama: { textAlign: 'center', opacity: 0.7 },
  buton: { marginTop: 16, alignSelf: 'stretch' },
});
