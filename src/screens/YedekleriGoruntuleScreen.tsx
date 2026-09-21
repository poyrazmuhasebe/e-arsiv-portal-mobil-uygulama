import React, { useCallback, useEffect, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

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
  PrimaryButton,
  SearchBar,
  StatusBadge,
  ToggleRow,
} from '../components/ui';
import {
  KLASOR_SECILEBILIR,
  aktifMukellef,
  klasorGorunenAdi,
  yedegiAc,
  yedegiPaylas,
  yedekKlasoru,
  yedekleriListele,
  type MukellefYedegi,
  type YedekDosyasi,
} from '../services/yedekDeposu';
import { useAuthStore } from '../store/useAuthStore';
import { TOUCH_MIN, colors, radius, spacing, typography } from '../theme';
import { mukellefKlasoruMu, type Mukellef } from '../utils/yedekleme';

type Props = NativeStackScreenProps<RootStackParamList, 'YedekleriGoruntule'>;

function boyutMetni(bayt: number | null): string {
  if (bayt === null || !Number.isFinite(bayt)) return '';
  if (bayt < 1024) return `${bayt} B`;
  if (bayt < 1024 * 1024) return `${Math.round(bayt / 1024)} KB`;
  return `${(bayt / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * "2026-09-15_GIB2026000000012_ONAYSIZ.pdf" → tarih, belge no ve (varsa)
 * durum. Durum ayrı döner ki satırda rozet olarak gösterilebilsin.
 */
function dosyaAdiniCoz(ad: string): { baslik: string; tarih: string; durum: 'ONAYSIZ' | 'SILINMIS' | null } {
  const m = /^(\d{4})-(\d{2})-(\d{2})_(.+?)(_ONAYSIZ|_SILINMIS)?\.pdf$/i.exec(ad);
  if (!m) return { baslik: ad, tarih: '', durum: null };
  const durum = m[5] === '_ONAYSIZ' ? 'ONAYSIZ' : m[5] === '_SILINMIS' ? 'SILINMIS' : null;
  return { baslik: m[4], tarih: `${m[3]}.${m[2]}.${m[1]}`, durum };
}

/**
 * "Faturaları Cihazımda Yedekle > Yedeklenen Faturaları Görüntüle".
 * Yedek klasöründeki PDF'leri, mükellef klasörlerine göre gruplayıp listeler;
 * her fatura telefonun PDF görüntüleyicisiyle açılabilir ya da paylaşılabilir
 * (e-posta, WhatsApp, Drive, "Dosyalara Kaydet" vb.). GİB'e istek atılmaz.
 */
export default function YedekleriGoruntuleScreen({ navigation }: Props) {
  const [yukleniyor, setYukleniyor] = useState(true);
  const [klasorAdi, setKlasorAdi] = useState<string | null>(null);
  const [gruplar, setGruplar] = useState<MukellefYedegi[]>([]);
  const [arama, setArama] = useState('');
  const [mesgul, setMesgul] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);
  const kullaniciBilgisi = useAuthStore((s) => s.kullaniciBilgisi);
  // Açık GİB oturumunun mükellefi. Bir kullanıcı birden fazla GİB koduyla
  // çalışabildiği için varsayılan olarak YALNIZCA onun yedekleri gösterilir;
  // diğer mükelleflerinkiler anahtarla açılır. Belirlenemezse (ör. çevrimdışı)
  // hepsi gösterilir ve bu belirtilir.
  const [mukellef, setMukellef] = useState<Mukellef | null>(null);
  const [digerleriniGoster, setDigerleriniGoster] = useState(false);

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
      if (token) {
        try {
          setMukellef(await aktifMukellef(token, kullaniciBilgisi));
        } catch {
          setMukellef(null);
        }
      }
    } catch (err) {
      Alert.alert('Yedekler okunamadı', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setYukleniyor(false);
    }
  }, [token, kullaniciBilgisi]);

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
  const buMukellefinMi = (g: MukellefYedegi) => mukellef !== null && mukellefKlasoruMu(g.ad, mukellef.vkn);
  const digerSayisi = mukellef === null ? 0 : gruplar.filter((g) => !buMukellefinMi(g)).length;
  const gosterilenler = mukellef === null || digerleriniGoster ? gruplar : gruplar.filter(buMukellefinMi);

  const bolumler = gosterilenler
    .map((g) => ({
      title: g.ad,
      toplam: g.dosyalar.length,
      data: aranan ? g.dosyalar.filter((d) => d.ad.toLocaleLowerCase('tr').includes(aranan)) : g.dosyalar,
    }))
    .filter((b) => b.data.length > 0);

  return (
    <AppScreen>
      <AppHeader
        title="Yedeklenen Faturalar"
        onBack={() => navigation.goBack()}
        right={<AppIconButton icon="refresh" accessibilityLabel="Yenile" onPress={yukle} />}
      />

      {yukleniyor ? (
        <View style={styles.merkezi}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : klasorAdi === null ? (
        <View style={styles.merkezi}>
          <EmptyState
            icon="folder-alert-outline"
            title="Henüz bir yedek klasörü seçilmedi."
            action={
              <PrimaryButton icon="folder-download-outline" onPress={() => navigation.replace('Yedekle')} fullWidth>
                Faturaları Şimdi Yedekle
              </PrimaryButton>
            }
          />
        </View>
      ) : (
        <SectionList
          sections={bolumler}
          keyExtractor={(item) => item.dosya.uri}
          contentContainerStyle={styles.liste}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={styles.ustKisim}>
              <View style={styles.klasorSatiri}>
                <Icon name="folder-outline" size={18} color={colors.textMuted} />
                <Text style={[typography.caption, styles.klasorMetni]}>
                  Klasör: {klasorAdi}
                  {KLASOR_SECILEBILIR ? '' : ' (yalnızca bu uygulamadan erişilir)'}
                </Text>
              </View>
              {mukellef === null ? (
                <InfoBox tone="neutral">
                  Açık hesabın mükellefi belirlenemedi; cihazdaki tüm mükelleflerin yedekleri gösteriliyor.
                </InfoBox>
              ) : (
                digerSayisi > 0 && (
                  <AppCard>
                    <ToggleRow
                      title={`Diğer mükelleflerin yedeklerini de göster (${digerSayisi})`}
                      value={digerleriniGoster}
                      onValueChange={setDigerleriniGoster}
                    />
                  </AppCard>
                )
              )}
              <SearchBar placeholder="Belge numarası ya da tarih ara" value={arama} onChangeText={setArama} />
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.bolumBasligi} accessibilityRole="header">
              <Text style={[typography.cardTitle, styles.bolumAdi]}>{section.title}</Text>
              <Text style={typography.caption}>{section.toplam} fatura</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const { baslik, tarih, durum } = dosyaAdiniCoz(item.ad);
            const buMesgul = mesgul === item.dosya.uri;
            const boyut = boyutMetni(item.boyut);
            return (
              <AppCard
                onPress={() => islem(item, 'ac')}
                disabled={mesgul !== null}
                accessibilityLabel={`${baslik} faturasını aç`}
                style={styles.satir}
              >
                <View style={styles.pdfKarosu}>
                  <Icon name="file-pdf-box" size={26} color={colors.danger} />
                </View>
                <View style={styles.satirMetinleri}>
                  <Text style={typography.cardTitle} numberOfLines={1}>
                    {baslik}
                  </Text>
                  <View style={styles.satirAlt}>
                    {tarih ? <Text style={typography.bodySecondary}>{tarih}</Text> : null}
                    {durum === 'SILINMIS' ? (
                      <StatusBadge status="deleted" label="Silinmiş" />
                    ) : durum === 'ONAYSIZ' ? (
                      <StatusBadge status="draft" label="Onaylanmamış" />
                    ) : null}
                    {boyut ? <Text style={typography.caption}>{boyut}</Text> : null}
                  </View>
                </View>
                {buMesgul ? (
                  <View style={styles.satirSpinner}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : (
                  <AppIconButton
                    icon="share-variant"
                    accessibilityLabel="Paylaş / Kaydet"
                    onPress={() => islem(item, 'paylas')}
                    disabled={mesgul !== null}
                  />
                )}
              </AppCard>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={aranan ? 'file-search-outline' : 'folder-open-outline'}
              title={
                aranan
                  ? 'Aramaya uyan yedek yok.'
                  : mukellef !== null && !digerleriniGoster
                    ? 'Bu mükellefin henüz yedeklenmiş faturası yok.'
                    : 'Bu klasörde henüz yedeklenmiş fatura yok.'
              }
              action={
                !aranan ? (
                  <PrimaryButton
                    icon="folder-download-outline"
                    onPress={() => navigation.replace('Yedekle')}
                    fullWidth
                  >
                    Faturaları Şimdi Yedekle
                  </PrimaryButton>
                ) : undefined
              }
            />
          }
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  merkezi: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  liste: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.xs, flexGrow: 1 },
  ustKisim: { paddingTop: spacing.xs, paddingBottom: spacing.xs, gap: spacing.sm },
  klasorSatiri: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  klasorMetni: { flex: 1, minWidth: 0 },
  bolumBasligi: { paddingTop: spacing.md, paddingBottom: spacing.xxs, gap: 2 },
  bolumAdi: { flexShrink: 1 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.xxs,
    minHeight: 64,
  },
  pdfKarosu: {
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    borderRadius: radius.medium,
    backgroundColor: colors.dangerBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  satirMetinleri: { flex: 1, minWidth: 0, gap: 2 },
  satirAlt: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.xs, rowGap: 2 },
  satirSpinner: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },
});
