/**
 * Tasarım token'ları — tek giriş noktası.
 *
 *   import { colors, spacing, radius, typography, shadows } from '../theme';
 *
 * Ekranlar sabit sayı/renk yerine bunları kullanır. Ayrıntı:
 * docs/tasarim-sistemi.md
 */
export { colors } from './colors';

/** 4'ün katları. Ekran yatay boşluğu `spacing.screen`. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  /** Ekranın sağ/sol iç boşluğu. */
  screen: 16,
  /** Kartlar arası. */
  card: 12,
  /** Bölümler arası. */
  section: 24,
} as const;

export const radius = {
  small: 10,
  medium: 14,
  large: 18,
  xlarge: 24,
  pill: 999,
} as const;

/** En küçük dokunma alanı (dp). */
export const TOUCH_MIN = 44;

export { typography } from './typography';
export { shadows } from './shadows';
export { paperTheme, navigationTheme } from './paperTheme';
