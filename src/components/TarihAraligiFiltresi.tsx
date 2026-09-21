import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';

import { EN_FAZLA_GUN, aralikGecerliMi, araligiSinirla } from '../utils/tarihAraligi';
import { spacing } from '../theme';
import { Alert } from './ui/AppAlert';
import { PrimaryButton } from './ui/Buttons';
import DateField from './ui/DateField';
import FormRow from './ui/FormRow';
import InfoBox from './ui/InfoBox';

export function tarihFormatla(d: Date): string {
  const gg = String(d.getDate()).padStart(2, '0');
  const aa = String(d.getMonth() + 1).padStart(2, '0');
  return `${gg}/${aa}/${d.getFullYear()}`;
}

interface Props {
  baslangic: Date;
  bitis: Date;
  onDegisti: (baslangic: Date, bitis: Date) => void;
  onSorgula: () => void;
  yukleniyor: boolean;
}

/**
 * Ortak tarih filtresi (DateFilter): Başlangıç / Bitiş + GİB sınırı notu +
 * Sorgula. GİB 1 haftadan uzun aralıkta sorgulamaya izin vermiyor
 * (kullanıcı bildirimi, 2026-09-21): seçilen uca dokunulmaz, DİĞER uç
 * gerekirse kaydırılır (bkz. utils/tarihAraligi.ts). Sorgula da geçersiz
 * aralıkta istek atmaz.
 */
export default function TarihAraligiFiltresi({ baslangic, bitis, onDegisti, onSorgula, yukleniyor }: Props) {
  const [acikPicker, setAcikPicker] = useState<'baslangic' | 'bitis' | null>(null);

  const handleTarihSecildi = (_event: DateTimePickerChangeEvent, secilen: Date) => {
    const hedef = acikPicker;
    setAcikPicker(null); // Android'de picker modal olarak açılır, seçim sonrası kapanır
    if (hedef !== 'baslangic' && hedef !== 'bitis') return;
    const sonuc = araligiSinirla(
      hedef === 'baslangic' ? secilen : baslangic,
      hedef === 'bitis' ? secilen : bitis,
      hedef,
    );
    onDegisti(sonuc.baslangic, sonuc.bitis);
    if (sonuc.duzeltildi) {
      Alert.alert(
        'Tarih aralığı ayarlandı',
        `GİB en fazla ${EN_FAZLA_GUN} günlük aralıkta sorgulamaya izin veriyor; ` +
          (hedef === 'baslangic' ? 'bitiş' : 'başlangıç') +
          ' tarihi buna göre değiştirildi.',
      );
    }
  };

  const handleSorgula = () => {
    if (!aralikGecerliMi(baslangic, bitis)) {
      Alert.alert('Tarih aralığı çok uzun', `GİB en fazla ${EN_FAZLA_GUN} günlük aralıkta sorgulamaya izin veriyor.`);
      return;
    }
    onSorgula();
  };

  return (
    <>
      <View style={styles.filtre}>
        <FormRow minColumnWidth={130}>
          <DateField label="Başlangıç" value={tarihFormatla(baslangic)} onPress={() => setAcikPicker('baslangic')} />
          <DateField label="Bitiş" value={tarihFormatla(bitis)} onPress={() => setAcikPicker('bitis')} />
        </FormRow>
        <InfoBox tone="neutral" icon="calendar-range">
          {`En fazla ${EN_FAZLA_GUN} günlük aralık sorgulanabilir (GİB sınırı).`}
        </InfoBox>
        <PrimaryButton icon="magnify" onPress={handleSorgula} loading={yukleniyor} disabled={yukleniyor} fullWidth>
          Sorgula
        </PrimaryButton>
      </View>

      {acikPicker && (
        <DateTimePicker
          value={acikPicker === 'baslangic' ? baslangic : bitis}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          onValueChange={handleTarihSecildi}
          onDismiss={() => setAcikPicker(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  filtre: { paddingHorizontal: spacing.screen, paddingTop: spacing.xs, paddingBottom: spacing.md, gap: spacing.sm },
});
