import React from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput, type TextInputProps } from 'react-native-paper';

import { colors, radius } from '../../theme';

type Props = Omit<TextInputProps, 'mode' | 'error'> & {
  /** Alanın altında gri açıklama. */
  helperText?: string;
  /** Doluysa alan hata durumuna geçer ve metin kırmızı gösterilir. */
  errorText?: string | null;
  /** errorText olmadan yalnızca kırmızı kenarlık. */
  error?: boolean;
};

/**
 * Formlarda TEK TİP giriş alanı: Paper outlined TextInput + tema renkleri.
 * Durumlar: normal, odaklı (lavanta kenar), hata (kırmızı kenar + metin),
 * pasif. Etiket (label) yer tutucudan bağımsızdır ve odakta yukarı kayar.
 * Tüm Paper TextInput özellikleri (value, onChangeText, right, multiline,
 * keyboardType, maxLength…) aynen geçer.
 */
export default function AppInput({ helperText, errorText, error, style, ...rest }: Props) {
  const hatali = !!errorText || !!error;
  return (
    <View>
      <TextInput
        mode="outlined"
        error={hatali}
        outlineColor={colors.borderStrong}
        activeOutlineColor={hatali ? colors.danger : colors.primary}
        outlineStyle={styles.cerceve}
        textColor={colors.textPrimary}
        placeholderTextColor={colors.textMuted}
        style={[styles.alan, style]}
        {...rest}
      />
      {errorText ? (
        <HelperText type="error" visible style={styles.yardim}>
          {errorText}
        </HelperText>
      ) : helperText ? (
        <HelperText type="info" visible style={[styles.yardim, styles.bilgi]}>
          {helperText}
        </HelperText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cerceve: { borderRadius: radius.small },
  alan: { backgroundColor: colors.backgroundSecondary },
  yardim: { paddingHorizontal: 4 },
  bilgi: { color: colors.textMuted },
});
