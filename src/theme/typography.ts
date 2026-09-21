import type { TextStyle } from 'react-native';

import { colors } from './colors';

/**
 * Yazı ölçekleri. Sistem fontu kullanılır. Doğrudan `<Text style={typography.body}>`
 * ile ya da Paper `Text` varyantlarıyla (paperTheme.ts aynı ölçeğe ayarlı).
 */
export const typography = {
  screenTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: colors.textPrimary },
  headerTitle: { fontSize: 20, lineHeight: 26, fontWeight: '600', color: colors.textPrimary },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600', color: colors.textPrimary },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: colors.textPrimary },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400', color: colors.textPrimary },
  bodySecondary: { fontSize: 14, lineHeight: 20, fontWeight: '400', color: colors.textSecondary },
  caption: { fontSize: 12.5, lineHeight: 18, fontWeight: '400', color: colors.textMuted },
  /** Ana sayfa bölüm başlıkları gibi kontrollü büyük harf etiketleri. */
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500', color: colors.textSecondary },
  button: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  /** Tutarlar: rakamlar hizalı dursun. */
  amount: { fontSize: 16, lineHeight: 22, fontWeight: '600', fontVariant: ['tabular-nums'], color: colors.textPrimary },
  amountLarge: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.textPrimary,
  },
} satisfies Record<string, TextStyle>;
