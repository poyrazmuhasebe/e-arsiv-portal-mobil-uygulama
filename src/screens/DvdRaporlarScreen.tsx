import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Directory } from 'expo-file-system';

import type { RootStackParamList } from '../../App';
import {
  Alert,
  AppCard,
  AppHeader,
  AppIconButton,
  AppScreen,
  EmptyState,
  Icon,
  InfoBox,
  SecondaryButton,
} from '../components/ui';
import {
  IOS_RAPOR_KLASOR_ADI,
  KLASOR_SECILEBILIR,
  dosyaSil,
  klasorGorunenAdi,
  pdfleriListele,
  raporKlasoru,
  raporKlasoruSec,
  yedegiAc,
  yedegiPaylas,
  type KayitliPdf,
} from '../services/yedekDeposu';
import { colors, spacing, typography } from '../theme';
import { DVD_RAPOR_ON_EKI, dvdRaporDosyaAdiniCoz } from '../utils/dvdRapor';

type Props = NativeStackScreenProps<RootStackParamList, 'DvdRaporlar'>;

function boyutMetni(bayt: number | null): string {
  if (bayt === null || !Number.isFinite(bayt)) return '';
  if (bayt < 1024) return `${bayt} B`;
  if (bayt < 1024 * 1024) return `${Math.round(bayt / 1024)} KB`;
  return `${(bayt / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * "e-Arşiv Faturalarım" ekranından PDF'e aktarılan listeler: seçilen
 * klasördeki `e-Arsiv-Faturalarim_…pdf` dosyaları (yeniden eskiye). Aç,
 * paylaş, sil. Dijital VD oturumu gerekmez (dosyalar telefonda).
 */
export default function DvdRaporlarScreen({ navigation }: Props) {
  const [klasor, setKlasor] = useState<Directory | null>(null);
  const [dosyalar, setDosyalar] = useState<KayitliPdf[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [mesgul, setMesgul] = useState<string | null>(null);

  const yukle = useCallback(async (hedef?: Directory | null) => {
    setYukleniyor(true);
    try {
      const k = hedef === undefined ? await raporKlasoru() : hedef;
      setKlasor(k);
      setDosyalar(k ? pdfleriListele(k, DVD_RAPOR_ON_EKI) : []);
    } catch (err) {
      setDosyalar([]);
      Alert.alert('PDF\'ler okunamadı', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const klasorDegistir = async () => {
    const secilen = await raporKlasoruSec();
    if (secilen) await yukle(secilen);
  };

  const islem = async (p: KayitliPdf, tur: 'ac' | 'paylas') => {
    setMesgul(p.dosya.uri);
    try {
      if (tur === 'ac') await yedegiAc(p.dosya);
      else await yedegiPaylas(p.dosya);
    } catch (err) {
      Alert.alert('İşlem yapılamadı', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setMesgul(null);
    }
  };

  const sil = (p: KayitliPdf) => {
    Alert.alert('PDF\'i sil', `${p.ad} telefondan kalıcı olarak silinecek. Gerekirse yeniden aktarabilirsiniz.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const tamam = dosyaSil(p.dosya);
          await yukle(klasor);
          if (!tamam) Alert.alert('Silinemedi', p.ad);
        },
      },
    ]);
  };

  return (
    <AppScreen>
      <AppHeader
        title="Kaydedilen PDF'ler"
        subtitle="e-Arşiv Faturalarım"
        onBack={() => navigation.goBack()}
        right={<AppIconButton icon="refresh" accessibilityLabel="Yenile" onPress={() => yukle(klasor)} />}
      />

      <View style={styles.klasorKutusu}>
        <View style={styles.klasorSatiri}>
          <Icon name="folder-outline" size={20} color={colors.warning} />
          <Text style={[typography.body, styles.klasorAdi]} numberOfLines={2}>
            {klasor ? klasorGorunenAdi(klasor, IOS_RAPOR_KLASOR_ADI) : 'Henüz klasör seçilmedi.'}
          </Text>
        </View>
        {KLASOR_SECILEBILIR ? (
          <SecondaryButton icon="folder-edit-outline" onPress={klasorDegistir} compact>
            {klasor ? 'Klasörü Değiştir' : 'Klasör Seç'}
          </SecondaryButton>
        ) : null}
      </View>

      {yukleniyor ? (
        <View style={styles.merkezi}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          persistentScrollbar
          indicatorStyle="white"
          data={dosyalar}
          keyExtractor={(p) => p.dosya.uri}
          contentContainerStyle={styles.liste}
          ListHeaderComponent={
            dosyalar.length > 0 ? <Text style={typography.caption}>{dosyalar.length} PDF</Text> : null
          }
          renderItem={({ item }) => {
            const bilgi = dvdRaporDosyaAdiniCoz(item.ad);
            const calisiyor = mesgul === item.dosya.uri;
            return (
              <AppCard style={styles.kart}>
                <View style={styles.kartBasi}>
                  <Icon name="file-pdf-box" size={28} color={colors.danger} />
                  <View style={styles.kartMetin}>
                    <Text style={typography.cardTitle}>{bilgi ? bilgi.donem : item.ad}</Text>
                    <Text style={typography.caption} numberOfLines={2}>
                      {[bilgi ? `Oluşturulma: ${bilgi.olusturma}` : undefined, bilgi?.kimlik, boyutMetni(item.boyut)]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  {calisiyor ? <ActivityIndicator color={colors.primary} /> : null}
                </View>
                <View style={styles.eylemler}>
                  <AppIconButton
                    icon="file-eye-outline"
                    iconColor={colors.primary}
                    accessibilityLabel="Aç"
                    onPress={() => islem(item, 'ac')}
                    disabled={mesgul !== null}
                  />
                  <AppIconButton
                    icon="share-variant-outline"
                    iconColor={colors.info}
                    accessibilityLabel="Paylaş"
                    onPress={() => islem(item, 'paylas')}
                    disabled={mesgul !== null}
                  />
                  <AppIconButton
                    icon="delete-outline"
                    iconColor={colors.danger}
                    accessibilityLabel="Sil"
                    onPress={() => sil(item)}
                    disabled={mesgul !== null}
                  />
                </View>
              </AppCard>
            );
          }}
          ListEmptyComponent={
            klasor ? (
              <EmptyState
                icon="file-pdf-box"
                title="Bu klasörde aktarılmış PDF yok."
                description="e-Arşiv Faturalarım ekranındaki PDF'e Aktar ya da Toplu PDF'e Aktar ile oluşturabilirsiniz."
              />
            ) : (
              <InfoBox tone="info" icon="folder-question-outline">
                PDF'ler ilk aktarmada seçtiğiniz klasöre kaydedilir. Klasörü şimdi de seçebilirsiniz.
              </InfoBox>
            )
          }
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  klasorKutusu: { paddingHorizontal: spacing.screen, paddingBottom: spacing.md, gap: spacing.sm },
  klasorSatiri: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  klasorAdi: { flex: 1 },
  merkezi: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  liste: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.card },
  kart: { gap: spacing.sm },
  kartBasi: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  kartMetin: { flex: 1, minWidth: 0, gap: 2 },
  eylemler: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs },
});
