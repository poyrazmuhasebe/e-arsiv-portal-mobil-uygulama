import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';

import { EN_FAZLA_GUN, aralikGecerliMi, araligiSinirla } from '../utils/tarihAraligi';

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
 * Başlangıç/Bitiş + Sorgula çubuğu. GİB 1 haftadan uzun aralıkta sorgulamaya
 * izin vermiyor (kullanıcı bildirimi, 2026-09-21): seçilen uca dokunulmaz,
 * DİĞER uç gerekirse kaydırılır (bkz. utils/tarihAraligi.ts). Sorgula da
 * geçersiz aralıkta istek atmaz.
 */
export default function TarihAraligiFiltresi({ baslangic, bitis, onDegisti, onSorgula, yukleniyor }: Props) {
  const theme = useTheme();
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
      <View style={styles.filtreBar}>
        <View style={styles.tarihRow}>
          <Pressable
            onPress={() => setAcikPicker('baslangic')}
            style={[styles.tarihButon, { borderColor: theme.colors.outline }]}
          >
            <Text variant="labelSmall" style={styles.mutedText}>
              Başlangıç
            </Text>
            <Text variant="bodyMedium">{tarihFormatla(baslangic)}</Text>
          </Pressable>
          <Pressable
            onPress={() => setAcikPicker('bitis')}
            style={[styles.tarihButon, { borderColor: theme.colors.outline }]}
          >
            <Text variant="labelSmall" style={styles.mutedText}>
              Bitiş
            </Text>
            <Text variant="bodyMedium">{tarihFormatla(bitis)}</Text>
          </Pressable>
        </View>
        <Text variant="labelSmall" style={styles.mutedText}>
          En fazla {EN_FAZLA_GUN} günlük aralık sorgulanabilir (GİB sınırı).
        </Text>
        <Button mode="contained" onPress={handleSorgula} loading={yukleniyor} disabled={yukleniyor}>
          Sorgula
        </Button>
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
  filtreBar: { padding: 16, gap: 12 },
  tarihRow: { flexDirection: 'row', gap: 12 },
  tarihButon: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  mutedText: { opacity: 0.7 },
});
