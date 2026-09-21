import React from 'react';

import AppDialog, { DialogText } from './AppDialog';
import { DangerButton, PrimaryButton, TextButton } from './Buttons';
import type { IconName } from './Icon';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  /** Mesajın altına ek içerik (uyarı kutusu, onay kutusu, metin alanı…). */
  children?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** 'danger': silme/iptal gibi yıkıcı eylem — kırmızı düğme. */
  tone?: 'primary' | 'danger';
  icon?: IconName;
  onConfirm: () => void;
  onCancel: () => void;
  /** Onay düğmesi pasif (ör. "Uyarıyı Okudum" işaretlenmeden). */
  confirmDisabled?: boolean;
  loading?: boolean;
}

/** Silme / çıkış / iptal gibi onay isteyen işlemler için dialog. */
export default function ConfirmDialog({
  visible,
  title,
  message,
  children,
  confirmLabel,
  cancelLabel = 'Vazgeç',
  tone = 'primary',
  icon,
  onConfirm,
  onCancel,
  confirmDisabled,
  loading,
}: Props) {
  const Onay = tone === 'danger' ? DangerButton : PrimaryButton;
  return (
    <AppDialog
      visible={visible}
      onDismiss={loading ? undefined : onCancel}
      title={title}
      icon={icon ?? (tone === 'danger' ? 'alert-outline' : undefined)}
      tone={tone === 'danger' ? 'danger' : 'default'}
      actions={
        <>
          <TextButton onPress={onCancel} disabled={loading} compact>
            {cancelLabel}
          </TextButton>
          <Onay onPress={onConfirm} disabled={confirmDisabled} loading={loading} compact>
            {confirmLabel}
          </Onay>
        </>
      }
    >
      {message ? <DialogText>{message}</DialogText> : null}
      {children}
    </AppDialog>
  );
}
