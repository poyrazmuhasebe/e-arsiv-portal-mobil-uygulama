import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Appbar,
  Button,
  Card,
  Divider,
  IconButton,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import { faturaKaydet, mukellefBilgisiGetir } from '../services/gibApi';
import { useAuthStore } from '../store/useAuthStore';
import type { FaturaTaslagi, KdvOrani } from '../types/gib';

type Props = NativeStackScreenProps<RootStackParamList, 'FaturaKesim'>;

const KDV_ORANLARI: KdvOrani[] = [0, 1, 10, 20];

interface KalemFormu {
  id: string;
  malHizmet: string;
  miktar: string;
  birimFiyat: string;
  kdvOrani: KdvOrani;
}

function bosKalem(): KalemFormu {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    malHizmet: '',
    miktar: '1',
    birimFiyat: '',
    kdvOrani: 20,
  };
}

// Girdi "12,5" veya "12.5" olarak yazılabilir; ikisini de kabul ediyoruz.
function parseNumara(deger: string): number {
  const normalized = deger.trim().replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function paraFormatla(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function bugununTarihi(): string {
  const d = new Date();
  const gg = String(d.getDate()).padStart(2, '0');
  const aa = String(d.getMonth() + 1).padStart(2, '0');
  return `${gg}/${aa}/${d.getFullYear()}`;
}

export default function FaturaKesimScreen({ navigation }: Props) {
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);

  const [vknTckn, setVknTckn] = useState('');
  const [unvan, setUnvan] = useState('');
  const [vergiDairesi, setVergiDairesi] = useState('');
  const [adres, setAdres] = useState('');
  const [mukellefSorgulaniyor, setMukellefSorgulaniyor] = useState(false);

  const [kalemler, setKalemler] = useState<KalemFormu[]>([bosKalem()]);

  // VKN (10 hane) veya TCKN (11 hane) tamamlandığında GİB'den mükellef
  // bilgisini sorgulayıp Unvan/Vergi Dairesi'ni otomatik dolduruyoruz.
  // Kullanıcı hâlâ yazıyorken gereksiz istek atmamak için kısa bir debounce
  // uyguluyoruz.
  useEffect(() => {
    const temiz = vknTckn.trim();
    if (!token || (temiz.length !== 10 && temiz.length !== 11) || !/^\d+$/.test(temiz)) {
      return;
    }

    let iptalEdildi = false;
    const zamanlayici = setTimeout(async () => {
      setMukellefSorgulaniyor(true);
      try {
        const bilgi = await mukellefBilgisiGetir(token, temiz);
        if (!iptalEdildi) {
          if (bilgi && typeof bilgi.unvan === 'string' && bilgi.unvan.length > 0) {
            setUnvan(bilgi.unvan);
            if (bilgi.vergiDairesi) setVergiDairesi(bilgi.vergiDairesi);
          } else {
            // GİB'den beklenmeyen bir şekil (ör. yanlış cmd/alan adı) geldiğinde
            // sessizce yanlış/boş veri basmak yerine burada durup logluyoruz.
            console.warn('MÜKELLEF SORGU: beklenmeyen yanıt şekli:', JSON.stringify(bilgi));
          }
        }
      } catch (err) {
        // Otomatik doldurma en iyi çaba (best-effort); başarısız olursa
        // kullanıcı alanları elle doldurmaya devam edebilir, akışı Alert
        // ile kesmiyoruz — ama terminalde teşhis edilebilsin diye logluyoruz.
        console.warn('MÜKELLEF SORGU BAŞARISIZ:', err instanceof Error ? err.message : err);
      } finally {
        if (!iptalEdildi) setMukellefSorgulaniyor(false);
      }
    }, 400);

    return () => {
      iptalEdildi = true;
      clearTimeout(zamanlayici);
    };
  }, [vknTckn, token]);

  const kalemGuncelle = (id: string, patch: Partial<KalemFormu>) => {
    setKalemler((prev) => prev.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  };

  const kalemEkle = () => {
    setKalemler((prev) => [...prev, bosKalem()]);
  };

  const kalemSil = (id: string) => {
    setKalemler((prev) => (prev.length > 1 ? prev.filter((k) => k.id !== id) : prev));
  };

  const ozet = useMemo(() => {
    let altToplam = 0;
    let kdvToplam = 0;
    for (const k of kalemler) {
      const miktar = parseNumara(k.miktar);
      const birimFiyat = parseNumara(k.birimFiyat);
      if (!Number.isFinite(miktar) || !Number.isFinite(birimFiyat)) continue;
      const satirTutari = miktar * birimFiyat;
      altToplam += satirTutari;
      kdvToplam += satirTutari * (k.kdvOrani / 100);
    }
    return { altToplam, kdvToplam, genelToplam: altToplam + kdvToplam };
  }, [kalemler]);

  const aliciGecerli =
    vknTckn.trim().length >= 10 && vknTckn.trim().length <= 11 && unvan.trim().length > 0 && adres.trim().length > 0;

  const kalemlerGecerli =
    kalemler.length > 0 &&
    kalemler.every((k) => {
      const miktar = parseNumara(k.miktar);
      const birimFiyat = parseNumara(k.birimFiyat);
      return k.malHizmet.trim().length > 0 && miktar > 0 && birimFiyat > 0;
    });

  const formGecerli = aliciGecerli && kalemlerGecerli;

  const [kaydediliyor, setKaydediliyor] = useState(false);

  const handleTaslakOlarakKaydet = async () => {
    if (!formGecerli || !token || kaydediliyor) return;

    const taslak: FaturaTaslagi = {
      alici: {
        vknTckn: vknTckn.trim(),
        unvan: unvan.trim(),
        vergiDairesi: vergiDairesi.trim() || undefined,
        adres: adres.trim(),
      },
      satirlar: kalemler.map((k) => ({
        malHizmet: k.malHizmet.trim(),
        miktar: parseNumara(k.miktar),
        // Form birim seçimi istemiyor; GİB'in beklediği zorunlu alan için
        // sabit "Adet" kullanıyoruz.
        birim: 'Adet',
        birimFiyat: parseNumara(k.birimFiyat),
        kdvOrani: k.kdvOrani,
      })),
      faturaTarihi: bugununTarihi(),
    };

    setKaydediliyor(true);
    try {
      const sonuc = await faturaKaydet(token, taslak);
      Alert.alert('Taslak Kaydedildi', `Belge No: ${sonuc.ettn}`, [
        { text: 'Tamam', onPress: () => navigation.navigate('Taslaklar') },
      ]);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Taslak kaydedilemedi.';
      Alert.alert('Kaydetme Başarısız', message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Yeni Fatura Kes" />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Alıcı Bilgileri
          </Text>
          <View style={styles.form}>
            <TextInput
              mode="outlined"
              label="VKN / TCKN"
              value={vknTckn}
              onChangeText={setVknTckn}
              keyboardType="number-pad"
              maxLength={11}
              right={mukellefSorgulaniyor ? <TextInput.Icon icon="loading" /> : undefined}
              style={styles.input}
            />
            <TextInput mode="outlined" label="Unvan" value={unvan} onChangeText={setUnvan} style={styles.input} />
            <TextInput
              mode="outlined"
              label="Vergi Dairesi"
              value={vergiDairesi}
              onChangeText={setVergiDairesi}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Adres"
              value={adres}
              onChangeText={setAdres}
              multiline
              numberOfLines={2}
              style={styles.input}
            />
          </View>

          <Divider style={styles.divider} />

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Fatura Kalemleri
          </Text>
          <View style={styles.form}>
            {kalemler.map((kalem, index) => (
              <Card key={kalem.id} mode="outlined" style={styles.kalemCard}>
                <Card.Content style={styles.form}>
                  <View style={styles.kalemHeader}>
                    <Text variant="labelLarge">Kalem {index + 1}</Text>
                    {kalemler.length > 1 && (
                      <IconButton
                        icon="delete-outline"
                        size={20}
                        onPress={() => kalemSil(kalem.id)}
                        accessibilityLabel={`Kalem ${index + 1} sil`}
                      />
                    )}
                  </View>

                  <TextInput
                    mode="outlined"
                    label="Mal/Hizmet Adı"
                    value={kalem.malHizmet}
                    onChangeText={(v) => kalemGuncelle(kalem.id, { malHizmet: v })}
                    style={styles.input}
                  />

                  <View style={styles.row}>
                    <TextInput
                      mode="outlined"
                      label="Miktar"
                      value={kalem.miktar}
                      onChangeText={(v) => kalemGuncelle(kalem.id, { miktar: v })}
                      keyboardType="decimal-pad"
                      style={[styles.input, styles.rowItem]}
                    />
                    <TextInput
                      mode="outlined"
                      label="Birim Fiyat"
                      value={kalem.birimFiyat}
                      onChangeText={(v) => kalemGuncelle(kalem.id, { birimFiyat: v })}
                      keyboardType="decimal-pad"
                      style={[styles.input, styles.rowItem]}
                    />
                  </View>

                  <Text variant="bodySmall" style={styles.kdvLabel}>
                    KDV Oranı
                  </Text>
                  <SegmentedButtons
                    value={String(kalem.kdvOrani)}
                    onValueChange={(v) => kalemGuncelle(kalem.id, { kdvOrani: Number(v) as KdvOrani })}
                    buttons={KDV_ORANLARI.map((oran) => ({ value: String(oran), label: `%${oran}` }))}
                  />
                </Card.Content>
              </Card>
            ))}

            <Button mode="outlined" icon="plus" onPress={kalemEkle} style={styles.kalemEkleButton}>
              Kalem Ekle
            </Button>
          </View>

          <Card mode="elevated" style={styles.ozetCard}>
            <Card.Content style={styles.form}>
              <View style={styles.ozetSatir}>
                <Text variant="bodyMedium">Ara Toplam</Text>
                <Text variant="bodyMedium">{paraFormatla(ozet.altToplam)} ₺</Text>
              </View>
              <View style={styles.ozetSatir}>
                <Text variant="bodyMedium">KDV Toplamı</Text>
                <Text variant="bodyMedium">{paraFormatla(ozet.kdvToplam)} ₺</Text>
              </View>
              <Divider />
              <View style={styles.ozetSatir}>
                <Text variant="titleMedium">Genel Toplam</Text>
                <Text variant="titleMedium">{paraFormatla(ozet.genelToplam)} ₺</Text>
              </View>
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={handleTaslakOlarakKaydet}
            disabled={!formGecerli || kaydediliyor}
            loading={kaydediliyor}
            style={styles.kaydetButton}
            contentStyle={styles.kaydetButtonContent}
          >
            Taslak Olarak Kaydet
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { padding: 20, gap: 16 },
  sectionTitle: { marginBottom: 4 },
  form: { gap: 12 },
  input: { width: '100%' },
  divider: { marginVertical: 8 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  kalemCard: { borderRadius: 12 },
  kalemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kdvLabel: { opacity: 0.6, marginTop: 4 },
  kalemEkleButton: { alignSelf: 'flex-start' },
  ozetCard: { borderRadius: 16 },
  ozetSatir: { flexDirection: 'row', justifyContent: 'space-between' },
  kaydetButton: { borderRadius: 8, marginTop: 4 },
  kaydetButtonContent: { paddingVertical: 6 },
});
