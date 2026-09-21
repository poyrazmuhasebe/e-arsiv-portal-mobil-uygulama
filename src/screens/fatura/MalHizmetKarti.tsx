import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import SecimAlani from '../../components/SecimAlani';
import {
  Alert,
  AppCard,
  AppDialog,
  AppIconButton,
  AppInput,
  DetailRow,
  DialogText,
  FormRow,
  Icon,
  InfoBox,
  SecondaryButton,
  SectionCard,
  SegmentedChoice,
  TextButton,
} from '../../components/ui';
import { BIRIMLER, KDV_ORANLARI, TEVKIFAT_KODLARI, VERGI_TURLERI } from '../../constants/faturaConstants';
import { TOUCH_MIN, colors, radius, spacing, typography } from '../../theme';
import { kalemHesapla } from '../../utils/faturaHesap';
import { tutarEtiketi } from '../../utils/paraBirimi';
import { VERGI_SECENEKLERI, kalemVergiHatasi, tevkifatFaturaTipiyleUyumluMu } from '../../utils/vergiDestegi';
import { malHizmetListesiGetir, malHizmetSil } from '../../utils/malHizmetDefteri';
import type { KalemFormu } from '../../types/faturaForm';
import type { KdvOrani } from '../../types/gib';

interface Props {
  kalemler: KalemFormu[];
  faturaTipi: string;
  /** Tutar etiketlerinde gösterilecek para birimi kodu (yalnızca gösterim). */
  paraBirimi: string;
  onKalemGuncelle: (id: string, patch: Partial<KalemFormu>) => void;
  onKalemEkle: () => void;
  onKalemSil: (id: string) => void;
}

export default function MalHizmetKarti({
  kalemler,
  faturaTipi,
  paraBirimi,
  onKalemGuncelle,
  onKalemEkle,
  onKalemSil,
}: Props) {
  const tevkifatDesteklenir = tevkifatFaturaTipiyleUyumluMu(faturaTipi);

  // "Kayıtlı Mal/Hizmet Seç" diyaloğu: hangi kalem için açıldığı ve defter içeriği.
  const [secimKalemId, setSecimKalemId] = useState<string | null>(null);
  const [kayitliAdlar, setKayitliAdlar] = useState<string[]>([]);

  const kayitliSecimiAc = async (kalemId: string) => {
    setKayitliAdlar(await malHizmetListesiGetir());
    setSecimKalemId(kalemId);
  };

  const kayitliAdSec = (ad: string) => {
    if (secimKalemId) onKalemGuncelle(secimKalemId, { malHizmet: ad });
    setSecimKalemId(null);
  };

  const kayitliAdSil = (ad: string) => {
    Alert.alert('Kaydı Sil', `"${ad}" kayıtlı mal/hizmetlerden silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const basarili = await malHizmetSil(ad);
          if (!basarili) Alert.alert('Silinemedi', 'Kayıt silinemedi. Lütfen tekrar deneyin.');
          setKayitliAdlar(await malHizmetListesiGetir());
        },
      },
    ]);
  };

  return (
    <SectionCard title="Mal/Hizmet Bilgileri" icon="package-variant-closed">
      {kalemler.map((kalem, index) => {
        const hesap = kalemHesapla(kalem);
        const vergiEklendi = Boolean(kalem.ekVergi);
        const vergiHatasi = kalemVergiHatasi(kalem, faturaTipi);

        return (
          // Her satır kendi iç kartında: başlık + (birden çok satır varsa) sil düğmesi.
          <AppCard key={kalem.id} elevated style={styles.kalemKart}>
            <View style={styles.kalemBaslik}>
              <Text style={typography.cardTitle}>Satır {index + 1}</Text>
              {kalemler.length > 1 && (
                <AppIconButton
                  icon="delete-outline"
                  variant="danger"
                  onPress={() => onKalemSil(kalem.id)}
                  accessibilityLabel={`Satır ${index + 1} sil`}
                />
              )}
            </View>

            <View>
              <AppInput
                label="Mal/Hizmet Adı *"
                value={kalem.malHizmet}
                onChangeText={(v) => onKalemGuncelle(kalem.id, { malHizmet: v })}
              />
              <TextButton
                icon="format-list-bulleted"
                onPress={() => kayitliSecimiAc(kalem.id)}
                compact
                style={styles.kayitliSecButonu}
              >
                Kayıtlı Mal/Hizmet Seç
              </TextButton>
            </View>

            <FormRow>
              <AppInput
                label="Miktar"
                value={kalem.miktar}
                onChangeText={(v) => onKalemGuncelle(kalem.id, { miktar: v })}
                keyboardType="decimal-pad"
              />
              <SecimAlani
                label="Birim *"
                value={kalem.birim}
                secenekler={BIRIMLER}
                onSelect={(v) => onKalemGuncelle(kalem.id, { birim: v })}
              />
            </FormRow>

            <FormRow>
              <AppInput
                label="Birim Fiyat"
                value={kalem.birimFiyat}
                onChangeText={(v) => onKalemGuncelle(kalem.id, { birimFiyat: v })}
                keyboardType="decimal-pad"
              />
              <AppInput
                label="İskonto Oranı %"
                value={kalem.iskontoOrani}
                onChangeText={(v) => onKalemGuncelle(kalem.id, { iskontoOrani: v })}
                keyboardType="decimal-pad"
              />
            </FormRow>

            <View style={styles.kdvAlani}>
              <Text style={typography.label}>KDV Oranı</Text>
              <SegmentedChoice
                accessibilityLabel="KDV Oranı"
                value={String(kalem.kdvOrani)}
                onChange={(v) => onKalemGuncelle(kalem.id, { kdvOrani: Number(v) as KdvOrani })}
                options={KDV_ORANLARI.map((oran) => ({ value: String(oran), label: `%${oran}` }))}
              />
            </View>

            {/* Satırın hesaplanan tutarları (yalnızca gösterim). */}
            <View style={styles.tutarlar}>
              <DetailRow label="Mal/Hizmet Tutarı" value={tutarEtiketi(hesap.netTutar, paraBirimi)} numeric />
              <DetailRow label="KDV Tutarı" value={tutarEtiketi(hesap.kdvTutari, paraBirimi)} numeric />
            </View>

            {!vergiEklendi ? (
              <View style={[styles.bolum, styles.ayrac]}>
                <SecimAlani
                  label="Vergi Seçiniz"
                  value={kalem.ekVergi?.tur ?? ''}
                  secenekler={VERGI_SECENEKLERI}
                  onSelect={(v) => onKalemGuncelle(kalem.id, { ekVergi: { tur: v } })}
                />
                <Text style={styles.vergiNotu}>
                  Şimdilik yalnızca KDV Tevkifat hesaplanıp GİB'e gönderilebiliyor.
                </Text>
              </View>
            ) : (
              <View style={[styles.bolum, styles.ayrac]}>
                <View style={styles.kalemBaslik}>
                  <Text style={[typography.label, styles.ekVergiBaslik]}>
                    Ek Vergi: {VERGI_TURLERI.find((v) => v.value === kalem.ekVergi?.tur)?.label}
                  </Text>
                  <AppIconButton
                    icon="close"
                    size={20}
                    accessibilityLabel="Vergiyi kaldır"
                    onPress={() => onKalemGuncelle(kalem.id, { ekVergi: undefined })}
                  />
                </View>

                {kalem.ekVergi?.tur === 'V9015' && tevkifatDesteklenir && (
                  <View style={styles.bolum}>
                    <SecimAlani
                      label="Tevkifat Kodu"
                      value={kalem.ekVergi?.tevkifatKodu ?? ''}
                      secenekler={TEVKIFAT_KODLARI}
                      onSelect={(v) =>
                        onKalemGuncelle(kalem.id, {
                          ekVergi: { ...kalem.ekVergi, tur: 'V9015', tevkifatKodu: v },
                        })
                      }
                    />
                    {hesap.tevkifatOrani !== undefined && (
                      <View style={styles.bolum}>
                        <DetailRow label="KDV Tevkifat Oranı" value={`${hesap.tevkifatOrani}/10`} numeric />
                        <DetailRow
                          label="Hesaplanan KDV Tevkifat Tutarı"
                          value={tutarEtiketi(hesap.tevkifatTutari, paraBirimi)}
                          numeric
                        />
                      </View>
                    )}
                  </View>
                )}

                {vergiHatasi && <InfoBox tone="danger">{vergiHatasi}</InfoBox>}
              </View>
            )}
          </AppCard>
        );
      })}

      <SecondaryButton icon="plus" onPress={onKalemEkle} fullWidth>
        Satır Ekle
      </SecondaryButton>

      <AppDialog
        visible={secimKalemId !== null}
        onDismiss={() => setSecimKalemId(null)}
        title="Kayıtlı Mal/Hizmetler"
        icon="format-list-bulleted"
        actions={
          <TextButton onPress={() => setSecimKalemId(null)} compact>
            Kapat
          </TextButton>
        }
      >
        {kayitliAdlar.length === 0 ? (
          <DialogText>
            Henüz kayıtlı mal/hizmet yok. Bir fatura başarıyla oluşturulunca kalemlerdeki adlar otomatik kaydedilir.
          </DialogText>
        ) : (
          <View style={styles.liste}>
            {kayitliAdlar.map((ad) => (
              <View key={ad} style={styles.listeOgesi}>
                <Pressable
                  onPress={() => kayitliAdSec(ad)}
                  accessibilityRole="button"
                  accessibilityLabel={ad}
                  android_ripple={{ color: colors.primarySoft }}
                  style={({ pressed }) => [styles.listeSecim, pressed && styles.basili]}
                >
                  <Icon name="package-variant-closed" size={20} color={colors.primary} />
                  <Text style={[typography.body, styles.listeMetni]} numberOfLines={2}>
                    {ad}
                  </Text>
                </Pressable>
                <AppIconButton
                  icon="delete-outline"
                  variant="danger"
                  accessibilityLabel={`${ad} sil`}
                  onPress={() => kayitliAdSil(ad)}
                />
              </View>
            ))}
          </View>
        )}
      </AppDialog>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  kalemKart: { gap: spacing.sm },
  kalemBaslik: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  kayitliSecButonu: { alignSelf: 'flex-start', marginTop: spacing.xxs },
  kdvAlani: { gap: spacing.xs },
  tutarlar: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bolum: { gap: spacing.sm },
  ayrac: { paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  vergiNotu: { ...typography.caption, paddingHorizontal: spacing.xxs },
  ekVergiBaslik: { flex: 1, color: colors.textPrimary },
  liste: { gap: 2, marginHorizontal: -spacing.xs },
  listeOgesi: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  listeSecim: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_MIN,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.small,
    overflow: 'hidden',
  },
  basili: { backgroundColor: colors.primarySoft },
  listeMetni: { flex: 1, minWidth: 0 },
});
