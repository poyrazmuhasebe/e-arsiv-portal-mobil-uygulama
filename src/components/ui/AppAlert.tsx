import React, { useEffect } from 'react';
import { create } from 'zustand';

import AppDialog, { DialogText } from './AppDialog';
import { DangerSoftButton, PrimaryButton, SecondaryButton, TextButton } from './Buttons';

/**
 * React Native `Alert.alert` ile AYNI imzaya sahip, temalı sürüm.
 *
 * Android'in varsayılan (beyaz) sistem dialog'u yerine uygulamanın koyu
 * dialog'unu gösterir. Çağrı yerleri değişmez; yalnızca import değişir:
 *
 *   import { Alert } from '../components/ui/AppAlert';
 *   Alert.alert('Başlık', 'Mesaj', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress }]);
 *
 * Davranış (react-native Alert ile aynı tutuldu):
 *  - Düğme verilmezse tek "Tamam".
 *  - Düğmeye basınca dialog kapanır, sonra düğmenin onPress'i çağrılır
 *    (onPress içinden yeni bir Alert açılabilir; sıraya alınır).
 *  - Dışarı dokunma / geri tuşu: yalnızca 'cancel' stilli bir düğme varsa
 *    kapatır ve O düğmenin onPress'ini çağırır; yoksa kullanıcı bir düğmeye
 *    basmak zorundadır (sistem Alert'inde de Android'de dışarı dokunmak
 *    varsayılan olarak kapatmaz).
 *
 * Görünüm: 'destructive' → kırmızı, 'cancel' → metin düğmesi, diğerleri →
 * lavanta. Üç ve daha çok seçenekte düğmeler alt alta dizilir.
 */

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface Kayit {
  id: number;
  baslik: string;
  mesaj?: string;
  dugmeler: AlertButton[];
}

interface Depo {
  sira: Kayit[];
  /** Açık yerel (Modal içi) AlertHost sayısı; > 0 iken kökteki çizmez. */
  yerelHost: number;
  ekle: (k: Omit<Kayit, 'id'>) => void;
  cikar: (id: number) => void;
  yerelDegisti: (fark: 1 | -1) => void;
}

let sayac = 0;

const useAlertDeposu = create<Depo>((set) => ({
  sira: [],
  yerelHost: 0,
  yerelDegisti: (fark) => set((d) => ({ yerelHost: Math.max(0, d.yerelHost + fark) })),
  ekle: (k) => set((d) => ({ sira: [...d.sira, { ...k, id: ++sayac }] })),
  cikar: (id) => set((d) => ({ sira: d.sira.filter((k) => k.id !== id) })),
}));

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]): void {
    const dugmeler = buttons && buttons.length > 0 ? buttons : [{ text: 'Tamam' }];
    useAlertDeposu.getState().ekle({ baslik: title, mesaj: message, dugmeler });
  },
};

/**
 * App.tsx'te PaperProvider içinde BİR KEZ yerleştirilir.
 *
 * React Native `Modal` ayrı bir yerel pencere açar; kökteki dialog onun
 * ARKASINDA kalır ve görünmez (ör. Taslaklar'daki fatura görüntüleyicide
 * "Gelişmiş görünüm" onayı hiç görünmüyordu). Böyle bir Modal'ın içine
 * `<Portal.Host>` ile birlikte `<AlertHost yerel />` konur: yerel kopya
 * açıkken uyarılar orada çizilir, kökteki kopya boşta bekler.
 */
export function AlertHost({ yerel = false }: { yerel?: boolean }) {
  const aktif = useAlertDeposu((d) => d.sira[0]);
  const cikar = useAlertDeposu((d) => d.cikar);
  const yerelHostVar = useAlertDeposu((d) => d.yerelHost > 0);
  const yerelDegisti = useAlertDeposu((d) => d.yerelDegisti);

  useEffect(() => {
    if (!yerel) return;
    yerelDegisti(1);
    return () => yerelDegisti(-1);
  }, [yerel, yerelDegisti]);

  if (!aktif || (!yerel && yerelHostVar)) return null;

  const bas = (d: AlertButton) => {
    cikar(aktif.id);
    d.onPress?.();
  };
  const iptal = aktif.dugmeler.find((d) => d.style === 'cancel');
  const alt = aktif.dugmeler.length > 2;
  const tehlikeli = aktif.dugmeler.some((d) => d.style === 'destructive');

  return (
    <AppDialog
      visible
      title={aktif.baslik}
      tone={tehlikeli ? 'danger' : 'default'}
      icon={tehlikeli ? 'alert-outline' : undefined}
      onDismiss={iptal ? () => bas(iptal) : undefined}
      stackedActions={alt}
      actions={aktif.dugmeler.map((d, i) => {
        const etiket = d.text ?? 'Tamam';
        const anahtar = `${aktif.id}-${i}`;
        const ortak = { onPress: () => bas(d), compact: true, fullWidth: alt };
        if (d.style === 'destructive') {
          return (
            <DangerSoftButton key={anahtar} {...ortak}>
              {etiket}
            </DangerSoftButton>
          );
        }
        if (d.style === 'cancel') {
          return alt ? (
            <SecondaryButton key={anahtar} {...ortak}>
              {etiket}
            </SecondaryButton>
          ) : (
            <TextButton key={anahtar} {...ortak}>
              {etiket}
            </TextButton>
          );
        }
        return (
          <PrimaryButton key={anahtar} {...ortak}>
            {etiket}
          </PrimaryButton>
        );
      })}
    >
      {aktif.mesaj ? <DialogText>{aktif.mesaj}</DialogText> : null}
    </AppDialog>
  );
}
