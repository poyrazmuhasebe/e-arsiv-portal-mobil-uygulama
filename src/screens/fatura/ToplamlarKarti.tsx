import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppInput, DetailRow, SectionCard } from '../../components/ui';
import { colors, spacing } from '../../theme';
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
  return <DetailRow label={etiket} value={tutarEtiketi(tutar, paraBirimi)} numeric emphasize={vurgulu} />;
}

/**
 * Toplamlar ve Not iki ayrı bölüm kartı olarak çizilir (ekrandaki sırayla:
 * önce Toplamlar, hemen altında isteğe bağlı Not).
 */
export default function ToplamlarKarti({ ozet, paraBirimi, not, onNotChange }: Props) {
  const pb = paraBirimi;
  return (
    <>
      <SectionCard title="Toplamlar" icon="calculator-variant-outline">
        <View style={styles.grup}>
          <OzetSatiri etiket="Mal/Hizmet Toplam Tutarı" tutar={ozet.malHizmetToplam} paraBirimi={pb} />
          <OzetSatiri etiket="Toplam İskonto" tutar={ozet.toplamIskonto} paraBirimi={pb} />
          <OzetSatiri etiket="Hesaplanan KDV" tutar={ozet.hesaplananKdv} paraBirimi={pb} />
        </View>

        {ozet.tevkifatVarMi && (
          <View style={[styles.grup, styles.ayrac]}>
            <OzetSatiri etiket="Tevkifata Tabi İşlem Tutarı" tutar={ozet.tevkifataTabiTutar} paraBirimi={pb} />
            <OzetSatiri
              etiket="Tevkifata Tabi İşlem Üzerinden Hes. KDV"
              tutar={ozet.tevkifataTabiUzerindenKdv}
              paraBirimi={pb}
            />
            <OzetSatiri etiket="Hesaplanan KDV Tevkifat" tutar={ozet.hesaplananKdvTevkifat} paraBirimi={pb} />
          </View>
        )}

        <View style={[styles.grup, styles.ayrac]}>
          <OzetSatiri etiket="Vergiler Dahil Toplam Tutar" tutar={ozet.vergilerDahilToplam} paraBirimi={pb} />
        </View>

        {/* Ödenecek Tutar: ekranın en belirgin rakamı. */}
        <View style={styles.odenecek}>
          <OzetSatiri etiket="Ödenecek Tutar" tutar={ozet.odenecekTutar} paraBirimi={pb} vurgulu />
        </View>
      </SectionCard>

      <SectionCard title="Not" icon="note-text-outline" optional>
        <AppInput label="Not" value={not} onChangeText={onNotChange} multiline numberOfLines={3} />
      </SectionCard>
    </>
  );
}

const styles = StyleSheet.create({
  grup: { gap: spacing.xs },
  ayrac: { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  odenecek: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxs,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
  },
});
