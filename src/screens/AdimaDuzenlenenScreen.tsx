import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import TarihAraligiFiltresi, { tarihFormatla } from '../components/TarihAraligiFiltresi';
import {
  Alert,
  AppCard,
  AppDialog,
  AppHeader,
  AppScreen,
  DetailRow,
  DialogText,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  type StatusBadgeDurum,
} from '../components/ui';
import { adimaDuzenlenenBelgeleriGetir, gibHatasiniIsle } from '../services/gibApi';
import { useAuthStore } from '../store/useAuthStore';
import { colors, spacing, typography } from '../theme';
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
 * "Onaylı" sütununun rozet rengi. Yalnızca uygulamada doğrulanmış kesin GİB
 * değerleri eşlenir ("Onaylandı" | "Onaylanmadı" | "Silinmiş", bkz.
 * TaslaklarScreen); bilinmeyen değer nötr (bilgi) rozetle olduğu gibi
 * gösterilir. Rozetin yazısı her zaman GİB'in ham metnidir.
 */
function onayRozetDurumu(onay: string): StatusBadgeDurum {
  if (onay === 'Onaylandı') return 'approved';
  if (onay === 'Silinmiş') return 'deleted';
  if (onay === 'Onaylanmadı') return 'draft';
  return 'info';
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
      <AppCard style={styles.kart}>
        <View style={styles.kartBasi}>
          <View style={styles.kartBasiMetin}>
            <Text style={typography.cardTitle} selectable>
              {belgeNo}
            </Text>
            {belgeTuru ? <Text style={typography.caption}>{belgeTuru}</Text> : null}
          </View>
          {onay ? <StatusBadge status={onayRozetDurumu(onay)} label={onay} /> : null}
        </View>

        <View style={styles.detaylar}>
          <DetailRow label="Belge Tarihi" value={belgeTarihi} />
          <DetailRow label="Satıcı" value={satici ? `${satici}${saticiVkn ? ` (${saticiVkn})` : ''}` : undefined} />
          <DetailRow label="İptal/İtiraz Durumu" value={talepDurumu} />
        </View>

        <View style={styles.eylemler}>
          <SecondaryButton
            icon="plus-circle-outline"
            compact
            onPress={() => setBilgiGorunur('İtiraz')}
            style={styles.eylemDugmesi}
          >
            İtiraz Talebi Oluştur
          </SecondaryButton>
          <SecondaryButton
            icon="plus-circle-outline"
            compact
            onPress={() => setBilgiGorunur('İptal')}
            style={styles.eylemDugmesi}
          >
            İptal Talebi Oluştur
          </SecondaryButton>
        </View>
      </AppCard>
    );
  };

  return (
    <AppScreen>
      <AppHeader title="Adıma Düzenlenen Belgeler" onBack={() => navigation.goBack()} />

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
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={belgeler}
          keyExtractor={(item, index) => asString(item.ettn) ?? asString(item.belgeNumarasi) ?? String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.liste}
          refreshing={yenileniyor}
          onRefresh={handlePullYenile}
          ListEmptyComponent={
            <EmptyState
              icon="file-document-outline"
              title="Seçili tarih aralığında adınıza düzenlenen belge bulunmuyor."
            />
          }
        />
      )}

      <AppDialog
        visible={bilgiGorunur !== null}
        onDismiss={() => setBilgiGorunur(null)}
        title="Bilgi"
        icon="information-outline"
        actions={
          <PrimaryButton onPress={() => setBilgiGorunur(null)} compact>
            Kapat
          </PrimaryButton>
        }
      >
        <DialogText>Bu bölümden sonrası test edilemediği için geliştirilememiştir.</DialogText>
        <Text style={typography.bodySecondary}>
          {bilgiGorunur} talebiniz GİB'e gönderilmedi. Talebi GİB e-Arşiv Portalı üzerinden oluşturabilirsiniz.
        </Text>
      </AppDialog>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  merkezi: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  liste: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.card, flexGrow: 1 },
  kart: { gap: spacing.sm },
  kartBasi: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.xs },
  kartBasiMetin: { flex: 1, minWidth: 160, gap: 2 },
  detaylar: { gap: spacing.xxs },
  eylemler: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingTop: spacing.xxs },
  eylemDugmesi: { flexGrow: 1, minWidth: 160 },
});
