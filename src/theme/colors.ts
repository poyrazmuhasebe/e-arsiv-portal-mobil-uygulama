/**
 * Uygulamanın TEK renk kaynağı. Ekranlarda sabit renk kodu yazılmaz;
 * `colors.xxx` kullanılır. Paper teması da bu değerlerden üretilir
 * (bkz. paperTheme.ts), böylece Paper bileşenleri de aynı paleti kullanır.
 *
 * Yön: koyu grafit + lacivert zemin, kontrollü lavanta vurgu. Neon yok.
 */
export const colors = {
  background: '#0B0D17',
  backgroundSecondary: '#101321',
  surface: '#171A2B',
  surfaceElevated: '#1C2033',
  surfaceSoft: '#202338',

  primary: '#B99AFF',
  primaryStrong: '#9B72F5',
  primarySoft: 'rgba(185, 154, 255, 0.14)',
  primaryBorder: 'rgba(185, 154, 255, 0.30)',
  /** Lavanta zemin üstündeki yazı (birincil düğme). */
  onPrimary: '#1A1033',

  textPrimary: '#F5F2FA',
  textSecondary: '#B7B1C4',
  textMuted: '#817B8D',

  border: 'rgba(190, 180, 210, 0.14)',
  borderStrong: 'rgba(190, 180, 210, 0.28)',

  success: '#50D69A',
  successBackground: 'rgba(32, 174, 110, 0.18)',
  danger: '#FF7E98',
  dangerBackground: 'rgba(210, 48, 74, 0.18)',
  dangerBorder: 'rgba(255, 126, 152, 0.35)',
  /** İptali kabul edilmiş belge: 'İptal'den bir ton koyu. */
  dangerStrongBackground: 'rgba(210, 48, 74, 0.32)',
  warning: '#F7C36A',
  warningBackground: 'rgba(202, 137, 37, 0.18)',
  warningBorder: 'rgba(247, 195, 106, 0.35)',
  successBorder: 'rgba(80, 214, 154, 0.35)',
  infoBorder: 'rgba(130, 175, 255, 0.32)',
  info: '#82AFFF',
  /** Ek vurgu (defterler, belge listeleri): turkuaz. */
  teal: '#5ED3C6',
  tealBackground: 'rgba(94, 211, 198, 0.14)',
  tealBorder: 'rgba(94, 211, 198, 0.32)',
  infoBackground: 'rgba(130, 175, 255, 0.14)',

  /** Modal arkasındaki karartma. */
  backdrop: 'rgba(5, 6, 12, 0.72)',
  /** Üstteki çok hafif dekoratif mor ışıma (AppScreen). */
  glow: 'rgba(155, 114, 245, 0.10)',
  transparent: 'transparent',
} as const;

export type RenkAdi = keyof typeof colors;
