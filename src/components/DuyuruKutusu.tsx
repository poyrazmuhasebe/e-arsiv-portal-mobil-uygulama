import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import { Alert } from './ui/AppAlert';
import AppIconButton from './ui/AppIconButton';
import Icon from './ui/Icon';

import { GIB_DUYURULARI, type Duyuru } from '../constants/duyurular';
import { duyuruyuKapat, gosterilecekDuyuru, kapatilanDuyurulariGetir } from '../utils/duyuru';

/**
 * Giriş ekranının üstünde, süresi dolmamış ve kullanıcının kapatmadığı ilk GİB
 * duyurusunu (ör. planlı bakım) gösterir. Kapatılan duyuru bir daha gösterilmez;
 * süresi dolan duyuru kendiliğinden gizlenir. Gösterilecek duyuru yoksa hiçbir
 * şey çizmez.
 */
export default function DuyuruKutusu() {
  const [duyuru, setDuyuru] = useState<Duyuru | null>(null);

  useEffect(() => {
    (async () => {
      const kapatilanlar = await kapatilanDuyurulariGetir();
      setDuyuru(gosterilecekDuyuru(GIB_DUYURULARI, new Date(), kapatilanlar));
    })();
  }, []);

  if (!duyuru) return null;

  const kapat = () => {
    setDuyuru(null);
    duyuruyuKapat(
      duyuru.id,
      GIB_DUYURULARI.map((d) => d.id),
    );
  };

  const baglantiyiAc = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Açılamadı', `Bağlantı açılamadı:\n${url}`));
  };

  const renk = colors.warning;

  return (
    <View style={styles.kart} accessibilityRole="alert">
      <View style={styles.ustSatir}>
        <Icon name="bullhorn-outline" size={20} color={renk} />
        <Text style={[typography.cardTitle, styles.baslik, { color: renk }]}>{duyuru.baslik}</Text>
        <AppIconButton icon="close" size={20} onPress={kapat} accessibilityLabel="Duyuruyu kapat" style={styles.kapat} />
      </View>
      <Text style={styles.tarih}>{duyuru.tarih}</Text>
      {duyuru.paragraflar.map((p, i) => (
        <Text key={i} style={[styles.metin, p.startsWith('- ') && styles.madde]}>
          {p.startsWith('- ') ? `• ${p.slice(2)}` : p}
        </Text>
      ))}
      {duyuru.baglanti ? (
        <Text
          style={[styles.metin, styles.baglanti]}
          onPress={() => baglantiyiAc(duyuru.baglanti!)}
          accessibilityRole="link"
        >
          {duyuru.baglanti}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kart: {
    marginBottom: spacing.xl,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningBackground,
    padding: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  ustSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  baslik: { flex: 1 },
  kapat: { marginRight: -spacing.xs },
  tarih: { ...typography.caption, color: colors.warning },
  metin: { ...typography.bodySecondary, color: colors.textPrimary },
  madde: { paddingLeft: spacing.xs },
  baglanti: { textDecorationLine: 'underline', color: colors.primary },
});
