import React from 'react';
import { StyleSheet } from 'react-native';
import { Searchbar } from 'react-native-paper';

import { colors, radius, typography } from '../../theme';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}

/** Defterler ve yedek listesi için arama kutusu. */
export default function SearchBar({ value, onChangeText, placeholder }: Props) {
  return (
    <Searchbar
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      accessibilityLabel={placeholder}
      mode="bar"
      elevation={0}
      iconColor={colors.textMuted}
      placeholderTextColor={colors.textMuted}
      style={styles.kutu}
      inputStyle={styles.girdi}
      autoCorrect={false}
    />
  );
}

const styles = StyleSheet.create({
  kutu: {
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    height: 50,
  },
  girdi: { ...typography.body, minHeight: 0, alignSelf: 'center' },
});
