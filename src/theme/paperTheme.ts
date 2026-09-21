import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { MD3DarkTheme, configureFonts, type MD3Theme } from 'react-native-paper';

import { colors } from './colors';

/**
 * react-native-paper teması token'lardan üretilir. Ekranlarda kalan Paper
 * bileşenleri (Button, TextInput, Dialog, Switch, Checkbox, RadioButton,
 * Chip, Searchbar, ProgressBar…) bu sayede ek stil yazmadan yeni paleti
 * kullanır. Yeni kod yine de src/components/ui altındaki bileşenleri tercih
 * etmeli.
 */
export const paperTheme: MD3Theme = {
  ...MD3DarkTheme,
  dark: true,
  roundness: 4, // Paper'da köşe = roundness × 3 → ~12
  fonts: configureFonts({ config: {}, isV3: true }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    primaryContainer: colors.primarySoft,
    onPrimaryContainer: colors.primary,
    secondary: colors.textSecondary,
    onSecondary: colors.background,
    secondaryContainer: colors.surfaceSoft,
    onSecondaryContainer: colors.textPrimary,
    tertiary: colors.info,
    onTertiary: colors.background,
    tertiaryContainer: colors.infoBackground,
    onTertiaryContainer: colors.info,
    background: colors.background,
    onBackground: colors.textPrimary,
    surface: colors.surface,
    onSurface: colors.textPrimary,
    surfaceVariant: colors.surfaceElevated,
    onSurfaceVariant: colors.textSecondary,
    surfaceDisabled: 'rgba(245, 242, 250, 0.10)',
    onSurfaceDisabled: 'rgba(245, 242, 250, 0.38)',
    outline: colors.borderStrong,
    outlineVariant: colors.border,
    error: colors.danger,
    onError: colors.background,
    errorContainer: colors.dangerBackground,
    onErrorContainer: colors.danger,
    inverseSurface: colors.textPrimary,
    inverseOnSurface: colors.background,
    inversePrimary: colors.primaryStrong,
    backdrop: colors.backdrop,
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: colors.surfaceElevated,
      level3: colors.surfaceElevated,
      level4: colors.surfaceSoft,
      level5: colors.surfaceSoft,
    },
  },
};

/** React Navigation: ekran geçişlerinde beyaz parlama olmasın. */
export const navigationTheme: NavigationTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.danger,
  },
};
