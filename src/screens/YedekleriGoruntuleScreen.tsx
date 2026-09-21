import React, { useCallback, useEffect, useState } from 'react';
import { Alert, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Appbar, Button, IconButton, List, Searchbar, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import {
  KLASOR_SECILEBILIR,
  klasorGorunenAdi,
  yedegiAc,
  yedegiPaylas,
  yedekKlasoru,
  yedekleriListele,
  type MukellefYedegi,
  type YedekDosyasi,
} from '../services/yedekDeposu';

type Props = NativeStackScreenProps<RootStackParamList, 'YedekleriGoruntule'>;

function boyutMetni(bayt: number | null): string {
  if (bayt === null || !Number.isFinite(bayt)) return '';
  if (bayt < 1024) return `${bayt} B`;
  if (bayt < 1024 * 1024) return `${Math.round(bayt / 1024)} KB`;
  return `${(bayt / (1024 * 1024)).toFixed(1)} MB`;
}

/** "2026-09-15_GIB2026000000012_ONAYSIZ.pdf" → tarih ve belge no. */
function dosyaAdiniCoz(ad: string): { baslik: string; alt: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})_(.+?)(_ONAYSIZ|_SILINMIS)?\.pdf$/i.exec(ad);
  if (!m) return { baslik: ad, alt: '' };
  const durum = m[5] === '_ONAYSIZ' ? ' · Onaylanmamış' : m[5] === '_SILINMIS' ? ' · Silinmiş' : '';
  return { baslik: m[4], alt: `${m[3]}.${m[2]}.${m[1]}${durum}` };
}

/**
 * "Faturaları Cihazımda Yedekle > Yedeklenen Faturaları Görüntüle".
 * Yedek klasöründeki PDF'leri, mükellef klasörlerine göre gruplayıp listeler;
 * her fatura telefonun PDF görüntüleyicisiyle açılabilir ya da paylaşılabilir
 * (e-posta, WhatsApp, Drive, "Dosyalara Kaydet" vb.). GİB'e istek atılmaz.
 */
export default function YedekleriGoruntuleScreen({ navigation }: Props) {
  const theme = useTheme();
  const [yukleniyor, setYukleniyor] = useState(true);
  const [klasorAdi, setKlasorAdi] = useState<string | null>(null);
  const [gruplar, setGruplar] = useState<MukellefYedegi[]>([]);
  const [arama, setArama] = useState('');
  const [mesgul, setMesgul] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const kok = await yedekKlasoru();
      if (!kok) {
        setKlasorAdi(null);
        setGruplar([]);
        return;
      }
      setKlasorAdi(klasorGorunenAdi(kok));
      setGruplar(yedekleriListele(kok));
    } catch (err) {
      Alert.alert('Yedekler okunamadı', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const islem = async (dosya: YedekDosyasi, tur: 'ac' | 'paylas') => {
    setMesgul(dosya.dosya.uri);
    try {
      if (tur === 'ac') await yedegiAc(dosya.dosya);
      else await yedegiPaylas(dosya.dosya);
    } catch (err) {
      Alert.alert('İşlem yapılamadı', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setMesgul(null);
    }
  };

  const aranan = arama.trim().toLocaleLowerCase('tr');
  const bolumler = gruplar
    .map((g) => ({
      title: g.ad,
      toplam: g.dosyalar.length,
      data: aranan ? g.dosyalar.filter((d) => d.ad.toLocaleLowerCase('tr').includes(aranan)) : g.dosyalar,
    }))
    .filter((b) => b.data.length > 0);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Yedeklenen Faturalar" />
        <Appbar.Action icon="refresh" accessibilityLabel="Yenile" onPress={yukle} />
      </Appbar.Header>

      {yukleniyor ? (
        <View style={styles.merkezi}>
          <ActivityIndicator size="large" />
        </View>
      ) : klasorAdi === null ? (
        <View style={styles.merkezi}>
          <Text variant="bodyMedium" style={styles.ortaMetin}>
            Henüz bir yedek klasörü seçilmedi.
          </Text>
          <Button mode="contained" onPress={() => navigation.replace('Yedekle')}>
            Faturaları Şimdi Yedekle
          </Button>
        </View>
      ) : (
        <SectionList
          sections={bolumler}
          keyExtractor={(item) => item.dosya.uri}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={styles.baslik}>
              <Text variant="bodySmall" style={styles.mutedText}>
                Klasör: {klasorAdi}
                {KLASOR_SECILEBILIR ? '' : ' (yalnızca bu uygulamadan erişilir)'}
              </Text>
              <Searchbar placeholder="Belge numarası ya da tarih ara" value={arama} onChangeText={setArama} />
            </View>
          }
          renderSectionHeader={({ section }) => (
            <List.Subheader>
              {section.title} ({section.toplam} fatura)
            </List.Subheader>
          )}
          renderItem={({ item }) => {
            const { baslik, alt } = dosyaAdiniCoz(item.ad);
            const buMesgul = mesgul === item.dosya.uri;
            return (
              <List.Item
                title={baslik}
                description={[alt, boyutMetni(item.boyut)].filter(Boolean).join(' · ')}
                left={(p) => <List.Icon {...p} icon="file-pdf-box" />}
                onPress={() => islem(item, 'ac')}
                disabled={mesgul !== null}
                right={() =>
                  buMesgul ? (
                    <ActivityIndicator style={styles.satirSpinner} />
                  ) : (
                    <IconButton
                      icon="share-variant"
                      accessibilityLabel="Paylaş / Kaydet"
                      onPress={() => islem(item, 'paylas')}
                      disabled={mesgul !== null}
                    />
                  )
                }
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.merkezi}>
              <Text variant="bodyMedium" style={[styles.mutedText, styles.ortaMetin]}>
                {aranan ? 'Aramaya uyan yedek yok.' : 'Bu klasörde henüz yedeklenmiş fatura yok.'}
              </Text>
              {!aranan && (
                <Button mode="contained" onPress={() => navigation.replace('Yedekle')}>
                  Faturaları Şimdi Yedekle
                </Button>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  merkezi: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  ortaMetin: { textAlign: 'center' },
  listContent: { paddingBottom: 24 },
  baslik: { padding: 16, gap: 12 },
  mutedText: { opacity: 0.7 },
  satirSpinner: { marginHorizontal: 16 },
});
