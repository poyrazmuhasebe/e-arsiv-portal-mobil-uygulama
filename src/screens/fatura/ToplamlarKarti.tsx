import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Divider, Text, TextInput } from 'react-native-paper';

import type { FaturaOzeti } from '../../utils/faturaHesap';
import { tutarEtiketi } from '../../utils/paraBirimi';

interface Props {
  ozet: FaturaOzeti;
  /** Tutar etiketlerinde gösterilecek para birimi kodu (yalnızca gösterim). */
  paraBirimi: string;
  not: string;
  onNotChange: (v: string) => void;
}

function OzetSatiri({
  etiket,
  tutar,
  paraBirimi,
  vurgulu,
}: {
  etiket: string;
  tutar: number;
  paraBirimi: string;
  vurgulu?: boolean;
}) {
  return (
    <View style={styles.satir}>
      <Text variant={vurgulu ? 'titleMedium' : 'bodyMedium'}>{etiket}</Text>
      <Text variant={vurgulu ? 'titleMedium' : 'bodyMedium'}>{tutarEtiketi(tutar, paraBirimi)}</Text>
    </View>
  );
}

export default function ToplamlarKarti({ ozet, paraBirimi, not, onNotChange }: Props) {
  const pb = paraBirimi;
  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title title="Toplamlar" />
      <Card.Content style={styles.icerik}>
        <OzetSatiri etiket="Mal/Hizmet Toplam Tutarı" tutar={ozet.malHizmetToplam} paraBirimi={pb} />
        <OzetSatiri etiket="Toplam İskonto" tutar={ozet.toplamIskonto} paraBirimi={pb} />
        <OzetSatiri etiket="Hesaplanan KDV" tutar={ozet.hesaplananKdv} paraBirimi={pb} />

        {ozet.tevkifatVarMi && (
          <>
            <Divider />
            <OzetSatiri etiket="Tevkifata Tabi İşlem Tutarı" tutar={ozet.tevkifataTabiTutar} paraBirimi={pb} />
            <OzetSatiri
              etiket="Tevkifata Tabi İşlem Üzerinden Hes. KDV"
              tutar={ozet.tevkifataTabiUzerindenKdv}
              paraBirimi={pb}
            />
            <OzetSatiri etiket="Hesaplanan KDV Tevkifat" tutar={ozet.hesaplananKdvTevkifat} paraBirimi={pb} />
          </>
        )}

        <Divider />
        <OzetSatiri etiket="Vergiler Dahil Toplam Tutar" tutar={ozet.vergilerDahilToplam} paraBirimi={pb} />
        <OzetSatiri etiket="Ödenecek Tutar" tutar={ozet.odenecekTutar} paraBirimi={pb} vurgulu />

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
