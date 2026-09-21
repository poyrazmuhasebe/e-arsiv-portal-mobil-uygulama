import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '../../theme';

/**
 * Uygulamanın TEK ikon seti: MaterialCommunityIcons (react-native-paper da
 * bunu kullanıyor; ikinci bir ikon kütüphanesi eklenmedi). Emoji ikon yok.
 * Ad listesi: https://pictogrammers.com/library/mdi/
 */
export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  /** Yalnızca anlam taşıyan (süs olmayan) ikonlarda verin. */
  accessibilityLabel?: string;
}

export default function Icon({ name, size = 22, color = colors.textSecondary, accessibilityLabel }: Props) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    />
  );
}
