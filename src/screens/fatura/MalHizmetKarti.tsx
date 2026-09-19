import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Dialog, Divider, IconButton, List, Portal, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import SecimAlani from '../../components/SecimAlani';
import { BIRIMLER, KDV_ORANLARI, TEVKIFAT_KODLARI, VERGI_TURLERI } from '../../constants/faturaConstants';
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
    <Card mode="elevated" style={styles.card}>
      <Card.Title title="Mal/Hizmet Bilgileri" />
      <Card.Content style={styles.icerik}>
        {kalemler.map((kalem, index) => {
          const hesap = kalemHesapla(kalem);
          const vergiEklendi = Boolean(kalem.ekVergi);
          const vergiHatasi = kalemVergiHatasi(kalem, faturaTipi);

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
                <Button
                  mode="text"
                  compact
                  icon="format-list-bulleted"
                  onPress={() => kayitliSecimiAc(kalem.id)}
                  style={styles.kayitliSecButonu}
                >
                  Kayıtlı Mal/Hizmet Seç
                </Button>

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
                  <Text variant="bodyMedium">{tutarEtiketi(hesap.netTutar, paraBirimi)}</Text>
                </View>
                <View style={styles.ozetSatir}>
                  <Text variant="bodySmall" style={styles.mutedText}>
                    KDV Tutarı
                  </Text>
                  <Text variant="bodyMedium">{tutarEtiketi(hesap.kdvTutari, paraBirimi)}</Text>
                </View>

                <Divider />

                {!vergiEklendi ? (
                  <View style={styles.satir}>
                    <View style={styles.flexEsit}>
                      <SecimAlani
                        label="Vergi Seçiniz"
                        value={kalem.ekVergi?.tur ?? ''}
                        secenekler={VERGI_SECENEKLERI}
                        onSelect={(v) => onKalemGuncelle(kalem.id, { ekVergi: { tur: v } })}
                      />
                      <Text variant="bodySmall" style={[styles.mutedText, styles.vergiNotu]}>
                        Şimdilik yalnızca KDV Tevkifat hesaplanıp GİB'e gönderilebiliyor.
                      </Text>
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
                              <Text variant="bodyMedium">{tutarEtiketi(hesap.tevkifatTutari, paraBirimi)}</Text>
                            </View>
                          </>
                        )}
                      </>
                    )}

                    {vergiHatasi && (
                      <Text variant="bodySmall" style={styles.uyariMetni}>
                        {vergiHatasi}
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

      <Portal>
        <Dialog visible={secimKalemId !== null} onDismiss={() => setSecimKalemId(null)} style={styles.dialog}>
          <Dialog.Title>Kayıtlı Mal/Hizmetler</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            {kayitliAdlar.length === 0 ? (
              <Text variant="bodyMedium" style={[styles.mutedText, styles.bosListe]}>
                Henüz kayıtlı mal/hizmet yok. Bir fatura başarıyla oluşturulunca kalemlerdeki adlar
                otomatik kaydedilir.
              </Text>
            ) : (
              <ScrollView>
                {kayitliAdlar.map((ad) => (
                  <List.Item
                    key={ad}
                    title={ad}
                    titleNumberOfLines={2}
                    onPress={() => kayitliAdSec(ad)}
                    right={() => (
                      <IconButton icon="delete-outline" accessibilityLabel={`${ad} sil`} onPress={() => kayitliAdSil(ad)} />
                    )}
                  />
                ))}
              </ScrollView>
            )}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setSecimKalemId(null)}>Kapat</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  vergiNotu: { marginTop: 4 },
  ozetSatir: { flexDirection: 'row', justifyContent: 'space-between' },
  satirEkleButonu: { alignSelf: 'flex-start' },
  kayitliSecButonu: { alignSelf: 'flex-start', marginTop: -8 },
  dialog: { maxHeight: '80%' },
  dialogScroll: { paddingHorizontal: 0 },
  bosListe: { padding: 16 },
});
