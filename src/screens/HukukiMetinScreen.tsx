import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppCard, AppHeader, AppScreen } from '../components/ui';
import { HUKUKI_METINLER } from '../constants/hukukiMetinler';
import { colors, spacing, typography } from '../theme';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'HukukiMetin'>;

/**
 * Aydınlatma metni, gizlilik politikası ve hizmet şartlarını uygulama içinde
 * gösterir. Herkese açık URL'ler yayına hazır olunca bunlar o adreslere
 * bağlanacak (Issue #36); o zamana kadar metin burada duruyor — Google Play
 * gizlilik politikasının uygulama içinde de bulunmasını istiyor.
 */
export default function HukukiMetinScreen({ route, navigation }: Props) {
  const metin = HUKUKI_METINLER[route.params.metin];

  return (
    <AppScreen edges={['top', 'left', 'right']}>
      <AppHeader title={metin.baslik} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.icerik}>
        <AppCard style={styles.kart}>
          {metin.bolumler.map((bolum) => (
            <View key={bolum.baslik} style={styles.bolum}>
              <Text style={typography.cardTitle} accessibilityRole="header">
                {bolum.baslik}
              </Text>
              <Text style={styles.govde} selectable>
                {bolum.govde}
              </Text>
            </View>
          ))}
        </AppCard>
        <Text style={styles.dipnot}>
          Bu metinlerin tam sürümleri projenin dokümantasyonunda (docs/hukuk/) bulunur ve hukuki inceleme
          beklemektedir.
        </Text>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  icerik: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  kart: { gap: spacing.lg, padding: spacing.lg },
  bolum: { gap: spacing.xs },
  // Uzun hukuki metin: satır aralığı biraz daha geniş, okunaklı.
  govde: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
  dipnot: { ...typography.caption, paddingHorizontal: spacing.xxs },
});
