import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Card, Text, TextInput, useTheme } from 'react-native-paper';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';

import SecimAlani from '../../components/SecimAlani';
import { PARA_BIRIMLERI, FATURA_TIPLERI } from '../../constants/faturaConstants';

const YEDI_GUN_MS = 7 * 24 * 60 * 60 * 1000;

function tarihFormatla(d: Date): string {
  const gg = String(d.getDate()).padStart(2, '0');
  const aa = String(d.getMonth() + 1).padStart(2, '0');
  return `${gg}/${aa}/${d.getFullYear()}`;
}

function saatFormatla(d: Date): string {
  const ss = String(d.getHours()).padStart(2, '0');
  const dd = String(d.getMinutes()).padStart(2, '0');
  const sn = String(d.getSeconds()).padStart(2, '0');
  return `${ss}:${dd}:${sn}`;
}

interface Props {
  faturaTarihi: Date;
  faturaSaati: Date;
  paraBirimi: string;
  dovizKuru: string;
  faturaTipi: string;
  onFaturaTarihiChange: (tarih: Date) => void;
  onFaturaSaatiChange: (saat: Date) => void;
  onParaBirimiChange: (v: string) => void;
  onDovizKuruChange: (v: string) => void;
  onFaturaTipiChange: (v: string) => void;
}

/**
 * GİB'in "7 gün kuralı"nı UYGULAMA TARAFINDA zorunlu kılar: GİB portalı
 * teknik olarak daha eskiye izin verse de, kullanıcı geriye dönük 7 günden
 * eskisini seçtiğinde onay ister; "Evet" derse tarihi tam olarak 7 gün
 * öncesine, "Hayır" derse bugüne eşitler.
 */
function yediGunKuraliUygula(secilen: Date, uygula: (tarih: Date) => void) {
  const simdi = new Date();

  if (secilen.getTime() > simdi.getTime()) {
    // İleri tarihli fatura kesilemez — sessizce bugüne çekiyoruz.
    uygula(simdi);
    return;
  }

  const fark = simdi.getTime() - secilen.getTime();
  if (fark > YEDI_GUN_MS) {
    Alert.alert(
      'Uyarı',
      '7 günden geriye dönük fatura oluşturmaya çalıştınız. İsterseniz 7 gün geriye dönük tarihi otomatik ayarlayabilirim, kabul ediyor musunuz?',
      [
        { text: 'Hayır', style: 'cancel', onPress: () => uygula(simdi) },
        { text: 'Evet', onPress: () => uygula(new Date(simdi.getTime() - YEDI_GUN_MS)) },
      ],
    );
    return;
  }

  uygula(secilen);
}

export default function FaturaBilgileriKarti({
  faturaTarihi,
  faturaSaati,
  paraBirimi,
  dovizKuru,
  faturaTipi,
  onFaturaTarihiChange,
  onFaturaSaatiChange,
  onParaBirimiChange,
  onDovizKuruChange,
  onFaturaTipiChange,
}: Props) {
  const theme = useTheme();
  const [acikPicker, setAcikPicker] = useState<'tarih' | 'saat' | null>(null);

  // `onChange` bu paket sürümünde deprecated: onValueChange/onDismiss ile
  // ayrıştırıldı (bkz. @react-native-community/datetimepicker BaseOptions).
  const handleTarihSecildi = (_event: DateTimePickerChangeEvent, secilen: Date) => {
    setAcikPicker(null);
    yediGunKuraliUygula(secilen, onFaturaTarihiChange);
  };

  const handleSaatSecildi = (_event: DateTimePickerChangeEvent, secilen: Date) => {
    setAcikPicker(null);
    onFaturaSaatiChange(secilen);
  };

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title title="Fatura Bilgileri" />
      <Card.Content style={styles.icerik}>
        <View style={styles.satir}>
          <Pressable
            onPress={() => setAcikPicker('tarih')}
            style={[styles.alan, styles.flexEsit, { borderColor: theme.colors.outline }]}
          >
            <Text variant="labelSmall" style={styles.mutedText}>
              Düzenlenme Tarihi
            </Text>
            <Text variant="bodyMedium">{tarihFormatla(faturaTarihi)}</Text>
          </Pressable>
          <Pressable
            onPress={() => setAcikPicker('saat')}
            style={[styles.alan, styles.flexEsit, { borderColor: theme.colors.outline }]}
          >
            <Text variant="labelSmall" style={styles.mutedText}>
              Düzenlenme Saati
            </Text>
            <Text variant="bodyMedium">{saatFormatla(faturaSaati)}</Text>
          </Pressable>
        </View>

        {acikPicker === 'tarih' && (
          <DateTimePicker
            value={faturaTarihi}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={new Date()}
            onValueChange={handleTarihSecildi}
            onDismiss={() => setAcikPicker(null)}
          />
        )}
        {acikPicker === 'saat' && (
          <DateTimePicker
            value={faturaSaati}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={handleSaatSecildi}
            onDismiss={() => setAcikPicker(null)}
          />
        )}

        <SecimAlani
          label="Doküman Para Birimi"
          value={paraBirimi}
          secenekler={PARA_BIRIMLERI}
          onSelect={onParaBirimiChange}
        />

        <TextInput
          mode="outlined"
          label="Döviz Kuru"
          value={dovizKuru}
          onChangeText={onDovizKuruChange}
          keyboardType="decimal-pad"
        />

        <SecimAlani
          label="Fatura Tipi"
          value={faturaTipi}
          secenekler={FATURA_TIPLERI}
          onSelect={onFaturaTipiChange}
        />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16 },
  icerik: { gap: 12 },
  satir: { flexDirection: 'row', gap: 12 },
  flexEsit: { flex: 1 },
  alan: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  mutedText: { opacity: 0.7 },
});
