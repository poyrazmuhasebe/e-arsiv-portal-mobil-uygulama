import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../theme';

interface Props {
  children: React.ReactNode;
  /** Bir sütunun en az genişliği; sığmazsa alt satıra (tek sütuna) iner. */
  minColumnWidth?: number;
}

/**
 * İki (ya da daha çok) alanı yan yana dizer; ekran darsa kendiliğinden tek
 * sütuna düşer (flexWrap + flexBasis). Sabit genişlik/Dimensions yok.
 */
export default function FormRow({ children, minColumnWidth = 140 }: Props) {
  return (
    <View style={styles.satir}>
      {React.Children.toArray(children)
        .filter(Boolean)
        .map((cocuk, i) => (
          <View key={i} style={[styles.sutun, { flexBasis: minColumnWidth }]}>
            {cocuk}
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  satir: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sutun: { flexGrow: 1, minWidth: 0 },
});
