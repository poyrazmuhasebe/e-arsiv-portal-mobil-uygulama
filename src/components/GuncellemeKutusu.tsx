import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

import { colors, radius, spacing, typography } from '../theme';
import { PrimaryButton, SecondaryButton } from './ui';
import Icon from './ui/Icon';
import { KONTROL_ARALIGI_MS, surumuDenetle, type SurumDurumu } from '../utils/surumKontrolu';

/** Bu APK'nın sürüm kodu ve adı (derlemede app.json'dan gömülür). */
const YUKLU_KOD = Constants.expoConfig?.android?.versionCode ?? null;
const YUKLU_AD = Constants.expoConfig?.version ?? '?';

function gelistirmeMi(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/**
 * Yüklü sürüm eskiyse uygulamanın ÜSTÜNE binen, KAPATILAMAYAN güncelleme
 * kutusu: kapatma düğmesi yok, Android geri tuşu yutulur (onRequestClose
 * boş), alttaki ekranlara dokunulamaz. Karar mantığı: utils/surumKontrolu.ts.
 */
export default function GuncellemeKutusu() {
  const [durum, setDurum] = useState<SurumDurumu>({ tur: 'bilinmiyor' });
  const [kontrolEdiliyor, setKontrolEdiliyor] = useState(false);
  const sonKontrol = useRef(0);
  const suruyor = useRef(false);

  const denetle = useCallback(async () => {
    if (suruyor.current) return;
    suruyor.current = true;
    setKontrolEdiliyor(true);
    try {
      sonKontrol.current = Date.now();
      const yeni = await surumuDenetle(Platform.OS, YUKLU_KOD, gelistirmeMi());
      // Ağ hatası ("bilinmiyor") açık bir kutuyu KAPATMAZ.
      setDurum((onceki) => (yeni.tur === 'bilinmiyor' && onceki.tur === 'guncelleme_gerekli' ? onceki : yeni));
    } finally {
      suruyor.current = false;
      setKontrolEdiliyor(false);
    }
  }, []);

  // Açılışta ve arka plandan her dönüşte (en fazla dakikada bir) kontrol.
  useEffect(() => {
    void denetle();
    const abonelik = AppState.addEventListener('change', (s) => {
      if (s === 'active' && Date.now() - sonKontrol.current >= KONTROL_ARALIGI_MS) void denetle();
    });
    return () => abonelik.remove();
  }, [denetle]);

  if (durum.tur !== 'guncelleme_gerekli') return null;
  const { son } = durum;
  const indirmeAdresi = son.indirmeAdresi;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.zemin} accessibilityViewIsModal>
        <View style={styles.kutu} accessibilityRole="alert">
          <View style={styles.karo}>
            <Icon name="update" size={32} color={colors.warning} />
          </View>
          <Text style={styles.baslik} accessibilityRole="header">
            Güncelleme gerekli
          </Text>
          <Text style={styles.metin}>
            Uygulamanın yeni bir sürümü yayınlandı. Lütfen uygulamayı güncelleyiniz; bu sürüm güncellenene kadar
            kullanılamaz.
          </Text>
          <Text style={styles.surum}>
            {`Yüklü sürüm: ${YUKLU_AD} (${durum.yukluKod})\nSon sürüm: ${son.ad} (${son.kod})`}
          </Text>
          <View style={styles.butonlar}>
            {indirmeAdresi !== null && (
              <PrimaryButton icon="download" onPress={() => void Linking.openURL(indirmeAdresi).catch(() => {})} fullWidth>
                Güncellemeyi İndir
              </PrimaryButton>
            )}
            <SecondaryButton
              icon="refresh"
              onPress={() => void denetle()}
              loading={kontrolEdiliyor}
              disabled={kontrolEdiliyor}
              fullWidth
            >
              Tekrar Kontrol Et
            </SecondaryButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  zemin: {
    flex: 1,
    backgroundColor: colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
  },
  kutu: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xlarge,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  karo: {
    width: 64,
    height: 64,
    borderRadius: radius.xlarge,
    backgroundColor: colors.warningBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  baslik: { ...typography.screenTitle, textAlign: 'center' },
  metin: { ...typography.bodySecondary, textAlign: 'center' },
  surum: { ...typography.caption, textAlign: 'center' },
  butonlar: { width: '100%', gap: spacing.sm, marginTop: spacing.sm },
});
