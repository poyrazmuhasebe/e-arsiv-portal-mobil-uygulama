import React, { useState } from 'react';
import { Platform } from 'react-native';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';

import { AppInput, DateField, SectionCard } from '../../components/ui';

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
  const [pickerAcik, setPickerAcik] = useState(false);

  const handleTarihSecildi = (_event: DateTimePickerChangeEvent, secilen: Date) => {
    setPickerAcik(false);
    onIrsaliyeTarihiChange(secilen);
  };

  return (
    <SectionCard title="İrsaliye Bilgisi" icon="truck-outline" optional>
      <AppInput label="İrsaliye Numarası" value={irsaliyeNo} onChangeText={onIrsaliyeNoChange} />

      {/* Tarih seçilmemişse alan boş görünür (placeholder). */}
      <DateField
        label="İrsaliye Tarihi"
        value={irsaliyeTarihi ? tarihFormatla(irsaliyeTarihi) : undefined}
        placeholder="__ / __ / ____"
        onPress={() => setPickerAcik(true)}
      />

      {pickerAcik && (
        <DateTimePicker
          value={irsaliyeTarihi ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onValueChange={handleTarihSecildi}
          onDismiss={() => setPickerAcik(false)}
        />
      )}
    </SectionCard>
  );
}
