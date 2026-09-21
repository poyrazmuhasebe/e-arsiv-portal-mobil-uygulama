import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen, Icon, PrimaryButton, TextButton } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';
import { useHesapStore } from '../store/useHesapStore';
import { colors, radius, spacing, typography } from '../theme';
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
    <View style={styles.kapsayici}>
      <AppScreen>
        <View style={styles.icerik}>
          <View style={styles.karo}>
            <Icon name="lock-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.baslik} accessibilityRole="header">
            Uygulama kilitli
          </Text>
          <Text style={styles.aciklama}>
            Devam etmek için cihazınızın kilit yöntemiyle (parmak izi, yüz, PIN, desen) kimliğinizi doğrulayın.
          </Text>
          {mesaj && (
            <Text style={styles.hata} accessibilityLiveRegion="polite">
              {mesaj}
            </Text>
          )}
          <View style={styles.butonlar}>
            <PrimaryButton icon="lock-open-variant" onPress={dene} loading={deneniyor} disabled={deneniyor} fullWidth>
              Kilidi Aç
            </PrimaryButton>
            <TextButton onPress={() => void tumOturumlariKapat()} disabled={deneniyor} fullWidth>
              Hesaptan Çık
            </TextButton>
          </View>
        </View>
      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  // Altındaki ekranı tamamen örtmek için tüm alanı kaplar ve opaktır.
  kapsayici: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: colors.background,
  },
  icerik: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
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
  baslik: { ...typography.headerTitle, textAlign: 'center' },
  aciklama: { ...typography.bodySecondary, textAlign: 'center' },
  hata: { ...typography.bodySecondary, color: colors.danger, textAlign: 'center' },
  butonlar: { alignSelf: 'stretch', gap: spacing.xs, marginTop: spacing.md },
});
