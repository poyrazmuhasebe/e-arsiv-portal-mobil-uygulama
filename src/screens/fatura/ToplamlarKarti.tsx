import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Divider, Text, TextInput } from 'react-native-paper';

import type { FaturaOzeti } from '../../utils/faturaHesap';
import { paraFormatla } from '../../utils/faturaHesap';

interface Props {
  ozet: FaturaOzeti;
  not: string;
  onNotChange: (v: string) => void;
}

function OzetSatiri({ etiket, tutar, vurgulu }: { etiket: string; tutar: number; vurgulu?: boolean }) {
  return (
    <View style={styles.satir}>
      <Text variant={vurgulu ? 'titleMedium' : 'bodyMedium'}>{etiket}</Text>
      <Text variant={vurgulu ? 'titleMedium' : 'bodyMedium'}>{paraFormatla(tutar)} ₺</Text>
    </View>
  );
}

export default function ToplamlarKarti({ ozet, not, onNotChange }: Props) {
  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title title="Toplamlar" />
      <Card.Content style={styles.icerik}>
        <OzetSatiri etiket="Mal/Hizmet Toplam Tutarı" tutar={ozet.malHizmetToplam} />
        <OzetSatiri etiket="Toplam İskonto" tutar={ozet.toplamIskonto} />
        <OzetSatiri etiket="Hesaplanan KDV" tutar={ozet.hesaplananKdv} />

        {ozet.tevkifatVarMi && (
          <>
            <Divider />
            <OzetSatiri etiket="Tevkifata Tabi İşlem Tutarı" tutar={ozet.tevkifataTabiTutar} />
            <OzetSatiri etiket="Tevkifata Tabi İşlem Üzerinden Hes. KDV" tutar={ozet.tevkifataTabiUzerindenKdv} />
            <OzetSatiri etiket="Hesaplanan KDV Tevkifat" tutar={ozet.hesaplananKdvTevkifat} />
          </>
        )}

        <Divider />
        <OzetSatiri etiket="Vergiler Dahil Toplam Tutar" tutar={ozet.vergilerDahilToplam} />
        <OzetSatiri etiket="Ödenecek Tutar" tutar={ozet.odenecekTutar} vurgulu />

        <TextInput
          mode="outlined"
          label="Not"
          value={not}
          onChangeText={onNotChange}
          multiline
          numberOfLines={3}
          style={styles.notAlani}
        />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16 },
  icerik: { gap: 8 },
  satir: { flexDirection: 'row', justifyContent: 'space-between' },
  notAlani: { marginTop: 8 },
});
