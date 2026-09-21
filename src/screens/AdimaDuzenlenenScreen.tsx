import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Appbar, Button, Card, Dialog, Portal, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import TarihAraligiFiltresi, { tarihFormatla } from '../components/TarihAraligiFiltresi';
import { adimaDuzenlenenBelgeleriGetir, gibHatasiniIsle } from '../services/gibApi';
import { useAuthStore } from '../store/useAuthStore';
import type { AdimaDuzenlenenBelge } from '../types/gib';

type Props = NativeStackScreenProps<RootStackParamList, 'AdimaDuzenlenen'>;

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function yediGunOncesi(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

/**
 * "Belge İşlemleri" menüsünün 4. sekmesi: başkalarının kullanıcı adına
 * düzenlediği belgeler. Liste isteği canlı yakalamayla doğrulandı
 * (bkz. gibApi.adimaDuzenlenenBelgeleriGetir).
 *
 * GİB ekranındaki "İtiraz Talebi Oluştur" / "İptal Talebi Oluştur"
 * düğmelerinin gönderdiği istekler HENÜZ YAKALANMADI; bu yüzden gönderim
 * yapılmıyor, kapatılabilir bir bilgi kutusu gösteriliyor (Taslaklar
 * ekranındaki itiraz kilidiyle aynı yaklaşım).
 */
export default function AdimaDuzenlenenScreen({ navigation }: Props) {
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);

  const [belgeler, setBelgeler] = useState<AdimaDuzenlenenBelge[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [baslangicTarih, setBaslangicTarih] = useState<Date>(yediGunOncesi);
  const [bitisTarih, setBitisTarih] = useState<Date>(() => new Date());
  const [bilgiGorunur, setBilgiGorunur] = useState<string | null>(null);

  const veriYukle = useCallback(
    async (baslangic: Date, bitis: Date) => {
      if (!token) return;
      try {
        const sonuc = await adimaDuzenlenenBelgeleriGetir(token, {
          baslangicTarihi: tarihFormatla(baslangic),
          bitisTarihi: tarihFormatla(bitis),
        });
        setBelgeler(sonuc);
      } catch (err) {
        // Oturum hatasında gibHatasiniIsle GİB oturumunu kendisi kapatır.
        const { mesaj } = await gibHatasiniIsle(err);
        Alert.alert('Hata', mesaj);
      }
    },
    [token],
  );

  useEffect(() => {
    setYukleniyor(true);
    veriYukle(baslangicTarih, bitisTarih).finally(() => setYukleniyor(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veriYukle]);

  const handleSorgula = async () => {
    setYukleniyor(true);
    await veriYukle(baslangicTarih, bitisTarih);
    setYukleniyor(false);
  };

  const handlePullYenile = async () => {
    setYenileniyor(true);
    await veriYukle(baslangicTarih, bitisTarih);
    setYenileniyor(false);
  };

  const renderItem = ({ item, index }: { item: AdimaDuzenlenenBelge; index: number }) => {
    const belgeNo = asString(item.belgeNumarasi) ?? `#${index + 1}`;
    const satici = asString(item.saticiUnvanAdSoyad);
    const saticiVkn = asString(item.saticiVknTckn);
    const belgeTarihi = asString(item.belgeTarihi);
    const belgeTuru = asString(item.belgeTuru);
    const onay = asString(item.onayli) ?? asString(item.onayDurumu);
    const talepDurumu = asString(item.talepDurumColumn);

    return (
      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">{belgeNo}</Text>
          {(belgeTuru || belgeTarihi) && (
            <Text variant="bodySmall" style={styles.mutedText}>
              {belgeTuru}
              {belgeTarihi ? ` · ${belgeTarihi}` : ''}
            </Text>
          )}
          {satici && (
            <Text variant="bodySmall" style={styles.mutedText}>
              Satıcı: {satici}
              {saticiVkn ? ` (${saticiVkn})` : ''}
            </Text>
          )}
          {onay && (
            <Text variant="bodySmall" style={styles.mutedText}>
              Onaylı: {onay}
            </Text>
          )}
          {talepDurumu && (
            <Text variant="bodySmall" style={styles.durumMetni}>
              İptal/İtiraz Durumu: {talepDurumu}
            </Text>
          )}
        </Card.Content>
        <Card.Actions>
          <Button compact mode="text" icon="plus-circle" onPress={() => setBilgiGorunur('İtiraz')}>
            İtiraz Talebi Oluştur
          </Button>
          <Button compact mode="text" icon="plus-circle" onPress={() => setBilgiGorunur('İptal')}>
            İptal Talebi Oluştur
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Adıma Düzenlenen Belgeler" />
      </Appbar.Header>

      <TarihAraligiFiltresi
        baslangic={baslangicTarih}
        bitis={bitisTarih}
        onDegisti={(b, e) => {
          setBaslangicTarih(b);
          setBitisTarih(e);
        }}
        onSorgula={handleSorgula}
        yukleniyor={yukleniyor}
      />

      {yukleniyor ? (
        <View style={styles.merkezi}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={belgeler}
          keyExtractor={(item, index) => asString(item.ettn) ?? asString(item.belgeNumarasi) ?? String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={yenileniyor}
          onRefresh={handlePullYenile}
          ListEmptyComponent={
            <View style={styles.merkezi}>
              <Text variant="bodyMedium" style={styles.mutedText}>
                Seçili tarih aralığında adınıza düzenlenen belge bulunmuyor.
              </Text>
            </View>
          }
        />
      )}

      <Portal>
        <Dialog visible={bilgiGorunur !== null} onDismiss={() => setBilgiGorunur(null)}>
          <Dialog.Title>Bilgi</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Bu bölümden sonrası test edilemediği için geliştirilememiştir.
            </Text>
            <Text variant="bodySmall" style={styles.mutedText}>
              {bilgiGorunur} talebiniz GİB'e gönderilmedi. Talebi GİB e-Arşiv Portalı üzerinden oluşturabilirsiniz.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setBilgiGorunur(null)}>Kapat</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  merkezi: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  listContent: { padding: 16, paddingTop: 0, gap: 12 },
  card: { borderRadius: 16, marginBottom: 12 },
  cardContent: { gap: 4 },
  mutedText: { opacity: 0.7 },
  durumMetni: { color: '#f2b8b5', marginTop: 2 },
  dialogText: { marginBottom: 8 },
});
