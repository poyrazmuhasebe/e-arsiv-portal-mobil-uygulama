import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import Icon, { type IconName } from './Icon';

export type Durum =
  | 'approved'
  | 'deleted'
  | 'cancelled'
  | 'cancelAccepted'
  | 'rejected'
  | 'pending'
  | 'draft'
  | 'info';

const GORUNUM: Record<Durum, { zemin: string; renk: string; kenar: string; ikon: IconName; etiket: string }> = {
  approved: { zemin: colors.successBackground, renk: colors.success, kenar: colors.successBorder, ikon: 'check-circle', etiket: 'Onaylı' },
  deleted: { zemin: colors.dangerBackground, renk: colors.danger, kenar: colors.dangerBorder, ikon: 'delete', etiket: 'Silinmiş' },
  cancelled: { zemin: colors.dangerBackground, renk: colors.danger, kenar: colors.dangerBorder, ikon: 'cancel', etiket: 'İptal' },
  cancelAccepted: { zemin: colors.dangerStrongBackground, renk: colors.danger, kenar: colors.dangerBorder, ikon: 'cancel', etiket: 'İptal Kabul Edildi' },
  rejected: { zemin: colors.warningBackground, renk: colors.warning, kenar: colors.warningBorder, ikon: 'close-circle-outline', etiket: 'Reddedildi' },
  pending: { zemin: colors.warningBackground, renk: colors.warning, kenar: colors.warningBorder, ikon: 'clock-outline', etiket: 'Beklemede' },
  draft: { zemin: colors.primarySoft, renk: colors.primary, kenar: colors.primaryBorder, ikon: 'file-document-edit-outline', etiket: 'Taslak' },
  info: { zemin: colors.infoBackground, renk: colors.info, kenar: colors.infoBorder, ikon: 'information-outline', etiket: 'Bilgi' },
};

interface Props {
  status: Durum;
  /** Varsayılan etiket yerine gösterilecek metin. */
  label?: string;
  icon?: IconName;
}

/** Renkli durum etiketi. Renk tek başına anlam taşımaz: ikon + yazı da var. */
export default function StatusBadge({ status, label, icon }: Props) {
  const g = GORUNUM[status];
  const metin = label ?? g.etiket;
  return (
    <View
      style={[styles.rozet, { backgroundColor: g.zemin, borderColor: g.kenar }]}
      accessible
      accessibilityLabel={`Durum: ${metin}`}
    >
      <Icon name={icon ?? g.ikon} size={14} color={g.renk} />
      <Text style={[styles.yazi, { color: g.renk }]} numberOfLines={1}>
        {metin}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: '100%',
  },
  yazi: { fontSize: 12.5, fontWeight: '600', flexShrink: 1 },
});
