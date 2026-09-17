import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Dialog, Portal, RadioButton, Text, useTheme } from 'react-native-paper';
import type { SecenekOgesi } from '../constants/faturaConstants';

interface Props {
  label: string;
  value: string;
  secenekler: SecenekOgesi[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  zorunlu?: boolean;
}

/**
 * Modüler, yeniden kullanılabilir "dropdown" — Para Birimi, Fatura Tipi,
 * Ülke, Birim, Vergi Türü, Tevkifat Kodu gibi tüm sabit-liste seçimlerinde
 * kullanılır. React Native Paper'ın kendi bir "Select" bileşeni olmadığından
 * bu, bir Dialog + RadioButton listesiyle sağlanıyor.
 */
export default function SecimAlani({ label, value, secenekler, onSelect, disabled, zorunlu }: Props) {
  const theme = useTheme();
  const [acik, setAcik] = useState(false);
  const secili = secenekler.find((s) => s.value === value);

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setAcik(true)}
        style={[
          styles.alan,
          { borderColor: theme.colors.outline, opacity: disabled ? 0.5 : 1 },
        ]}
      >
        <Text variant="labelSmall" style={styles.etiket}>
          {label}
          {zorunlu ? ' *' : ''}
        </Text>
        <Text variant="bodyMedium">{secili?.label ?? 'Seçiniz'}</Text>
      </Pressable>

      <Portal>
        <Dialog visible={acik} onDismiss={() => setAcik(false)} style={styles.dialog}>
          <Dialog.Title>{label}</Dialog.Title>
          <Dialog.ScrollArea style={styles.scrollArea}>
            <ScrollView>
              <RadioButton.Group
                value={value}
                onValueChange={(v) => {
                  onSelect(v);
                  setAcik(false);
                }}
              >
                {secenekler.map((s) => (
                  <RadioButton.Item key={s.value} label={s.label} value={s.value} />
                ))}
              </RadioButton.Group>
            </ScrollView>
          </Dialog.ScrollArea>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  alan: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  etiket: { opacity: 0.7, marginBottom: 2 },
  dialog: { maxHeight: '80%' },
  scrollArea: { paddingHorizontal: 0 },
});
