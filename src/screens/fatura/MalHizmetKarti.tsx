import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Divider, IconButton, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import SecimAlani from '../../components/SecimAlani';
import { BIRIMLER, KDV_ORANLARI, TEVKIFAT_KODLARI, VERGI_TURLERI } from '../../constants/faturaConstants';
import { kalemHesapla, paraFormatla } from '../../utils/faturaHesap';
import type { KalemFormu } from '../../types/faturaForm';
import type { KdvOrani } from '../../types/gib';

interface Props {
  kalemler: KalemFormu[];
  faturaTipi: string;
  onKalemGuncelle: (id: string, patch: Partial<KalemFormu>) => void;
  onKalemEkle: () => void;
  onKalemSil: (id: string) => void;
}

// Tevkifat yalnızca fatura tipi bunu destekliyorsa anlamlıdır.
const TEVKIFAT_DESTEKLEYEN_FATURA_TIPLERI = new Set([
  'TEVKIFAT',
  'TEVKIFATIADE',
  'YTBTEVKIFAT',
  'YTBTEVKIFATIADE',
]);

export default function MalHizmetKarti({
  kalemler,
  faturaTipi,
  onKalemGuncelle,
  onKalemEkle,
  onKalemSil,
}: Props) {
  const tevkifatDesteklenir = TEVKIFAT_DESTEKLEYEN_FATURA_TIPLERI.has(faturaTipi);

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title title="Mal/Hizmet Bilgileri" />
      <Card.Content style={styles.icerik}>
        {kalemler.map((kalem, index) => {
          const hesap = kalemHesapla(kalem);
          const vergiEklendi = Boolean(kalem.ekVergi);

          return (
            <Card key={kalem.id} mode="outlined" style={styles.kalemKart}>
              <Card.Content style={styles.icerik}>
                <View style={styles.kalemBaslik}>
                  <Text variant="labelLarge">Kalem {index + 1}</Text>
                  {kalemler.length > 1 && (
                    <IconButton
                      icon="delete-outline"
                      size={20}
                      onPress={() => onKalemSil(kalem.id)}
                      accessibilityLabel={`Kalem ${index + 1} sil`}
                    />
                  )}
                </View>

                <TextInput
                  mode="outlined"
                  label="Mal/Hizmet Adı *"
                  value={kalem.malHizmet}
                  onChangeText={(v) => onKalemGuncelle(kalem.id, { malHizmet: v })}
                />

                <View style={styles.satir}>
                  <TextInput
                    mode="outlined"
                    label="Miktar"
                    value={kalem.miktar}
                    onChangeText={(v) => onKalemGuncelle(kalem.id, { miktar: v })}
                    keyboardType="decimal-pad"
                    style={styles.flexEsit}
                  />
                  <TextInput
                    mode="outlined"
                    label="Birim Fiyat"
                    value={kalem.birimFiyat}
                    onChangeText={(v) => onKalemGuncelle(kalem.id, { birimFiyat: v })}
                    keyboardType="decimal-pad"
                    style={styles.flexEsit}
                  />
                </View>

                <SecimAlani
                  label="Birim *"
                  value={kalem.birim}
                  secenekler={BIRIMLER}
                  onSelect={(v) => onKalemGuncelle(kalem.id, { birim: v })}
                />

                <TextInput
                  mode="outlined"
                  label="İskonto Oranı %"
                  value={kalem.iskontoOrani}
                  onChangeText={(v) => onKalemGuncelle(kalem.id, { iskontoOrani: v })}
                  keyboardType="decimal-pad"
                />

                <Text variant="bodySmall" style={styles.mutedText}>
                  KDV Oranı
                </Text>
                <SegmentedButtons
                  value={String(kalem.kdvOrani)}
                  onValueChange={(v) => onKalemGuncelle(kalem.id, { kdvOrani: Number(v) as KdvOrani })}
                  buttons={KDV_ORANLARI.map((oran) => ({ value: String(oran), label: `%${oran}` }))}
                />

                <Divider />

                <View style={styles.ozetSatir}>
                  <Text variant="bodySmall" style={styles.mutedText}>
                    Mal/Hizmet Tutarı
                  </Text>
                  <Text variant="bodyMedium">{paraFormatla(hesap.netTutar)} ₺</Text>
                </View>
                <View style={styles.ozetSatir}>
                  <Text variant="bodySmall" style={styles.mutedText}>
                    KDV Tutarı
                  </Text>
                  <Text variant="bodyMedium">{paraFormatla(hesap.kdvTutari)} ₺</Text>
                </View>

                <Divider />

                {!vergiEklendi ? (
                  <View style={styles.satir}>
                    <View style={styles.flexEsit}>
                      <SecimAlani
                        label="Vergi Seçiniz"
                        value={kalem.ekVergi?.tur ?? ''}
                        secenekler={VERGI_TURLERI}
                        onSelect={(v) => onKalemGuncelle(kalem.id, { ekVergi: { tur: v } })}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.icerik}>
                    <View style={styles.kalemBaslik}>
                      <Text variant="labelMedium">
                        Ek Vergi: {VERGI_TURLERI.find((v) => v.value === kalem.ekVergi?.tur)?.label}
                      </Text>
                      <IconButton
                        icon="close"
                        size={18}
                        accessibilityLabel="Vergiyi kaldır"
                        onPress={() => onKalemGuncelle(kalem.id, { ekVergi: undefined })}
                      />
                    </View>

                    {kalem.ekVergi?.tur === 'V9015' && tevkifatDesteklenir && (
                      <>
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
                          <>
                            <View style={styles.ozetSatir}>
                              <Text variant="bodySmall" style={styles.mutedText}>
                                KDV Tevkifat Oranı
                              </Text>
                              <Text variant="bodyMedium">{hesap.tevkifatOrani}/10</Text>
                            </View>
                            <View style={styles.ozetSatir}>
                              <Text variant="bodySmall" style={styles.mutedText}>
                                Hesaplanan KDV Tevkifat Tutarı
                              </Text>
                              <Text variant="bodyMedium">{paraFormatla(hesap.tevkifatTutari)} ₺</Text>
                            </View>
                          </>
                        )}
                      </>
                    )}

                    {kalem.ekVergi?.tur === 'V9015' && !tevkifatDesteklenir && (
                      <Text variant="bodySmall" style={styles.uyariMetni}>
                        KDV Tevkifat, yalnızca Fatura Tipi "TEVKİFAT" (veya ilgili yatırım teşvik
                        varyantı) olduğunda hesaba katılır. Şu an Fatura Bilgileri kartından tipi
                        değiştirin.
                      </Text>
                    )}
                  </View>
                )}
              </Card.Content>
            </Card>
          );
        })}

        <Button mode="outlined" icon="plus" onPress={onKalemEkle} style={styles.satirEkleButonu}>
          Satır Ekle
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16 },
  icerik: { gap: 12 },
  kalemKart: { borderRadius: 12 },
  kalemBaslik: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  satir: { flexDirection: 'row', gap: 12 },
  flexEsit: { flex: 1 },
  mutedText: { opacity: 0.7 },
  uyariMetni: { color: '#f2b8b5' },
  ozetSatir: { flexDirection: 'row', justifyContent: 'space-between' },
  satirEkleButonu: { alignSelf: 'flex-start' },
});
