import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

interface Props {
  label: string;
  value?: React.ReactNode;
  /** Tutar gibi rakamlar sağa hizalı ve eşit genişlikli. */
  numeric?: boolean;
  /** Ödenecek Tutar gibi öne çıkan satır. */
  emphasize?: boolean;
  /** Etiket ve değer alt alta (uzun değerler için). */
  stacked?: boolean;
}

/** Etiket–değer satırı (fatura kartları, toplamlar, bilgi listeleri). */
export default function DetailRow({ label, value, numeric, emphasize, stacked }: Props) {
  if (value === undefined || value === null || value === '') return null;
  const degerStili = [
    numeric ? (emphasize ? typography.amountLarge : typography.amount) : typography.body,
    !stacked && styles.degerSag,
    emphasize && !numeric && styles.vurgulu,
  ];
  return (
    <View style={[styles.satir, stacked && styles.alt]}>
      <Text style={[typography.label, emphasize && styles.etiketVurgu, !stacked && styles.etiket]}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={degerStili} selectable>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  satir: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  alt: { flexDirection: 'column', alignItems: 'flex-start', gap: 2 },
  etiket: { flexShrink: 1 },
  degerSag: { textAlign: 'right', flexShrink: 1 },
  etiketVurgu: { color: colors.textPrimary, fontWeight: '600' },
  vurgulu: { fontWeight: '700' },
});
