import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { Card, Text, TextInput, useTheme } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

function tarihFormatla(d: Date): string {
  const gg = String(d.getDate()).padStart(2, '0');
  const aa = String(d.getMonth() + 1).padStart(2, '0');
  return `${gg}/${aa}/${d.getFullYear()}`;
}

interface Props {
  irsaliyeNo: string;
  irsaliyeTarihi: Date | null;
  onIrsaliyeNoChange: (v: string) => void;
  onIrsaliyeTarihiChange: (tarih: Date | null) => void;
}

export default function IrsaliyeBilgileriKarti({
  irsaliyeNo,
  irsaliyeTarihi,
  onIrsaliyeNoChange,
  onIrsaliyeTarihiChange,
}: Props) {
  const theme = useTheme();
  const [pickerAcik, setPickerAcik] = useState(false);

  const handleTarihSecildi = (event: DateTimePickerEvent, secilen?: Date) => {
    setPickerAcik(false);
    if (event.type === 'dismissed' || !secilen) return;
    onIrsaliyeTarihiChange(secilen);
  };

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title title="İrsaliye Bilgisi" />
      <Card.Content style={styles.icerik}>
        <TextInput
          mode="outlined"
          label="İrsaliye Numarası"
          value={irsaliyeNo}
          onChangeText={onIrsaliyeNoChange}
        />

        <Pressable onPress={() => setPickerAcik(true)} style={[styles.alan, { borderColor: theme.colors.outline }]}>
          <Text variant="labelSmall" style={styles.mutedText}>
            İrsaliye Tarihi
          </Text>
          <Text variant="bodyMedium">{irsaliyeTarihi ? tarihFormatla(irsaliyeTarihi) : '__ / __ / ____'}</Text>
        </Pressable>

        {pickerAcik && (
          <DateTimePicker
            value={irsaliyeTarihi ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleTarihSecildi}
          />
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16 },
  icerik: { gap: 12 },
  alan: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  mutedText: { opacity: 0.7 },
});
