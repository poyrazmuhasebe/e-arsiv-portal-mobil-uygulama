import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Modal, Portal } from 'react-native-paper';

import { colors, radius, shadows, spacing, typography } from '../../theme';
import Icon, { type IconName } from './Icon';

type Ton = 'default' | 'danger' | 'warning' | 'success';

interface Props {
  visible: boolean;
  /** Dışarı dokunma / Android geri tuşu. Verilmezse dialog yalnızca düğmelerle kapanır. */
  onDismiss?: () => void;
  title: string;
  icon?: IconName;
  tone?: Ton;
  children?: React.ReactNode;
  /** Alttaki düğmeler (PrimaryButton, TextButton…). */
  actions?: React.ReactNode;
  /** Düğmeler alt alta, tam genişlikte (üç ve daha çok seçenek için). */
  stackedActions?: boolean;
}

const TON_RENGI: Record<Ton, { renk: string; zemin: string }> = {
  default: { renk: colors.primary, zemin: colors.primarySoft },
  danger: { renk: colors.danger, zemin: colors.dangerBackground },
  warning: { renk: colors.warning, zemin: colors.warningBackground },
  success: { renk: colors.success, zemin: colors.successBackground },
};

/**
 * Temalı dialog. Paper `Dialog` yerine `Modal` üstüne kurulu: Paper Dialog
 * ilk çocuğuna `style` ekliyor (Fragment'ta uyarı veriyordu) ve klavye
 * açılınca form alanlarını örtüyordu. Uzun içerik kaydırılır; klavye açılınca
 * dialog yukarı kayar.
 */
export default function AppDialog({
  visible,
  onDismiss,
  title,
  icon,
  tone = 'default',
  children,
  actions,
  stackedActions,
}: Props) {
  const t = TON_RENGI[tone];
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss ?? (() => undefined)}
        dismissable={onDismiss !== undefined}
        dismissableBackButton={onDismiss !== undefined}
        style={styles.modal}
        contentContainerStyle={styles.kapsayici}
        theme={{ colors: { backdrop: colors.backdrop } }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.klavye}>
          <View style={styles.kutu} accessibilityViewIsModal>
            <View style={styles.baslikSatiri}>
              {icon ? (
                <View style={[styles.karo, { backgroundColor: t.zemin }]}>
                  <Icon name={icon} size={22} color={t.renk} />
                </View>
              ) : null}
              <Text style={[typography.sectionTitle, styles.baslik]} accessibilityRole="header">
                {title}
              </Text>
            </View>
            {children ? (
              <ScrollView
                style={styles.govde}
                contentContainerStyle={styles.govdeIcerik}
                keyboardShouldPersistTaps="handled"
              >
                {/* Başıboş metin/sayı çocuklar <Text>'e sarılır (RN aksi hâlde çöker). */}
                {React.Children.map(children, (c) =>
                  typeof c === 'string' || typeof c === 'number' ? <Text style={styles.metin}>{c}</Text> : c,
                )}
              </ScrollView>
            ) : null}
            {actions ? <View style={stackedActions ? styles.eylemlerAlt : styles.eylemler}>{actions}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

/** Dialog içindeki düz paragraf metni. */
export function DialogText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.metin}>{children}</Text>;
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'center' },
  kapsayici: { marginHorizontal: spacing.md, alignSelf: 'center', width: '100%', maxWidth: 520 },
  klavye: { width: '100%' },
  kutu: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xlarge,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    maxHeight: '100%',
    ...shadows.modal,
  },
  baslikSatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  karo: { width: 40, height: 40, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center' },
  baslik: { flex: 1 },
  govde: { flexGrow: 0 },
  govdeIcerik: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs, gap: spacing.sm },
  metin: { ...typography.body, color: colors.textSecondary },
  eylemler: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  eylemlerAlt: { gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
});
