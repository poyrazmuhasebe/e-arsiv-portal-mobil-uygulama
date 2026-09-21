import type { ViewStyle } from 'react-native';

/**
 * Koyu temada ağır gölge yok: kartlar yüzey rengi + ince kenarlık + boşlukla
 * ayrılır. Gölge yalnızca modal/dialog gibi gerçekten "üstte" duran
 * yüzeylerde, çok hafif.
 */
export const shadows = {
  none: {} as ViewStyle,
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  } as ViewStyle,
  modal: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  } as ViewStyle,
};
