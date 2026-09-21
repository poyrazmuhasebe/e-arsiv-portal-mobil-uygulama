import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../../theme';

interface Props {
  children: React.ReactNode;
  /** Varsayılan: dört kenar. Alt kenarı liste kendisi yönetiyorsa çıkarılabilir. */
  edges?: Edge[];
  /** Üstteki çok hafif mor ışıma (dekoratif). */
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TUM_KENARLAR: Edge[] = ['top', 'bottom', 'left', 'right'];

/**
 * Her ekranın kökü: güvenli alan (çentik, Android sistem çubukları) +
 * koyu zemin + üstte hafif dekoratif ışıma. İçerik sistem gezinme çubuğuyla
 * çakışmaz.
 */
export default function AppScreen({ children, edges = TUM_KENARLAR, glow = true, style }: Props) {
  return (
    <View style={styles.kok}>
      {glow && (
        <LinearGradient
          pointerEvents="none"
          colors={[colors.glow, colors.transparent]}
          style={styles.isima}
        />
      )}
      <SafeAreaView style={[styles.guvenli, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1, backgroundColor: colors.background },
  guvenli: { flex: 1 },
  isima: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
});
