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
  AppInput,
  AppScreen,
  CheckRow,
  DangerButton,
  DangerSoftButton,
  DetailRow,
  EmptyState,
  InfoBox,
  PrimaryButton,
  StatusBadge,
  SuccessSoftButton,
  TextButton,
} from '../components/ui';
import { iptalItirazTalepDurumGuncelle, iptalItirazTalepleriGetir } from '../services/gibApi';
import { useAuthStore } from '../store/useAuthStore';
import { colors, spacing, typography } from '../theme';
import type { IptalItirazTalebi } from '../types/gib';

type Props = NativeStackScreenProps<RootStackParamList, 'IptalItirazTalepleri'>;

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/**
 * "Belge İşlemleri" menüsünün 3. sekmesi. GİB'in kendi ekranı bunu geniş bir
 * masaüstü tablosu (satır başına onay kutusu + üstte paylaşılan "Talep Kabul
 * Et"/"Talep Reddet" butonları) olarak sunuyor; mobil ekranda bu, uygulamanın
 * geri kalanındaki kart deseniyle tutarlı olması için her satıra kendi
 * Kabul/Reddet butonlarının eklendiği bir kart listesine uyarlandı.
 */
export default function IptalItirazTalepleriScreen({ navigation }: Props) {
  const token = useAuthStore((s) => s.token);

  const [talepler, setTalepler] = useState<IptalItirazTalebi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const [baslangicTarih, setBaslangicTarih] = useState<Date>(() => new Date());
  const [bitisTarih, setBitisTarih] = useState<Date>(() => new Date());

  // Kabul VE Reddet — GİB'in kendi arayüzündeki gerçek akışlar (uyarı +
  // "Uyarıyı Okudum" + Reddet'te ayrıca 255 karakterlik gerekçe metni)
  // canlı doğrulandı.
  const [kabulHedefi, setKabulHedefi] = useState<IptalItirazTalebi | null>(null);
  const [kabulUyariOkundu, setKabulUyariOkundu] = useState(false);
  const [kabulSurecinde, setKabulSurecinde] = useState(false);

  const [reddetHedefi, setReddetHedefi] = useState<IptalItirazTalebi | null>(null);
  const [reddetGerekce, setReddetGerekce] = useState('');
  const [reddetUyariOkundu, setReddetUyariOkundu] = useState(false);
  const [reddetSurecinde, setReddetSurecinde] = useState(false);

  const veriYukle = useCallback(
    async (baslangic: Date, bitis: Date) => {
      if (!token) return;
      try {
        const sonuc = await iptalItirazTalepleriGetir(token, {
          baslangicTarihi: tarihFormatla(baslangic),
          bitisTarihi: tarihFormatla(bitis),
        });
        setTalepler(sonuc);
      } catch (err) {
        const message = err instanceof Error && err.message ? err.message : 'Talepler yüklenemedi.';
        Alert.alert('Hata', message);
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

  const handleKabulBaslat = (item: IptalItirazTalebi) => {
    setKabulHedefi(item);
    setKabulUyariOkundu(false);
  };

  const handleKabulVazgec = () => {
    setKabulHedefi(null);
    setKabulUyariOkundu(false);
  };

  const handleKabulOnayla = async () => {
    if (!token || !kabulHedefi) return;
    setKabulSurecinde(true);
    try {
      await iptalItirazTalepDurumGuncelle(token, kabulHedefi, true);
      handleKabulVazgec();
      await veriYukle(baslangicTarih, bitisTarih);
      Alert.alert('Kabul Edildi', 'Talep başarıyla kabul edildi.');
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Talep kabul edilemedi.';
      Alert.alert('İşlem Başarısız', message);
    } finally {
      setKabulSurecinde(false);
    }
  };

  const handleReddetBaslat = (item: IptalItirazTalebi) => {
    setReddetHedefi(item);
    setReddetGerekce('');
    setReddetUyariOkundu(false);
  };

  const handleReddetVazgec = () => {
    setReddetHedefi(null);
    setReddetGerekce('');
    setReddetUyariOkundu(false);
  };

  const handleReddetOnayla = async () => {
    if (!token || !reddetHedefi || !reddetUyariOkundu || reddetGerekce.trim().length === 0) return;
    setReddetSurecinde(true);
    try {
      await iptalItirazTalepDurumGuncelle(token, reddetHedefi, false, reddetGerekce.trim());
      handleReddetVazgec();
      await veriYukle(baslangicTarih, bitisTarih);
      Alert.alert('Reddedildi', 'Talep reddedildi.');
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Talep reddedilemedi.';
      Alert.alert('İşlem Başarısız', message);
    } finally {
      setReddetSurecinde(false);
    }
  };

  const renderItem = ({ item, index }: { item: IptalItirazTalebi; index: number }) => {
    const belgeNo = asString(item.belgeNumarasi) ?? `#${index + 1}`;
    const satici = asString(item.saticiUnvanAdSoyad);
    const saticiVkn = asString(item.saticiVknTckn);
    const alici = asString(item.aliciUnvanAdSoyad);
    const aliciVkn = asString(item.aliciVknTckn);
    const talepTarihi = asString(item.iptalItirazTalepTarihi);
    const belgeTuru = asString(item.belgeTuru);
    const itirazYontemi = asString(item.itirazYontemi);
    const referansNo = asString(item.referansBelgeId);
    const referansTarihi = asString(item.referansBelgeTarihi);
    const durum = asString(item.iptalItirazDurumuColumn);

    return (
      <AppCard style={styles.kart}>
        {/* Talep tipi (iptal/itiraz) yanıtta ayrı bir alan olarak gelmiyor;
            rozet uydurma bir tip yerine GİB'in döndürdüğü durum metnini gösterir. */}
        <View style={styles.kartBasi}>
          <View style={styles.kartBasiMetin}>
            <Text style={typography.cardTitle} selectable>
              {belgeNo}
            </Text>
            {belgeTuru ? <Text style={typography.caption}>{belgeTuru}</Text> : null}
          </View>
          {durum ? <StatusBadge status="info" label={durum} /> : null}
        </View>

        <View style={styles.detaylar}>
          <DetailRow label="Talep Tarihi" value={talepTarihi} />
          <DetailRow label="Satıcı" value={satici ? `${satici}${saticiVkn ? ` (${saticiVkn})` : ''}` : undefined} />
          <DetailRow label="Alıcı" value={alici ? `${alici}${aliciVkn ? ` (${aliciVkn})` : ''}` : undefined} />
          <DetailRow label="İtiraz Yöntemi" value={itirazYontemi} />
          <DetailRow
            label="İtiraz Belgesi"
            value={
              referansNo || referansTarihi
                ? `${referansNo ?? '-'}${referansTarihi ? ` · ${referansTarihi}` : ''}`
                : undefined
            }
          />
        </View>

        <View style={styles.eylemler}>
          <SuccessSoftButton icon="check" compact onPress={() => handleKabulBaslat(item)} style={styles.eylemDugmesi}>
            Talep Kabul Et
          </SuccessSoftButton>
          <DangerSoftButton icon="close" compact onPress={() => handleReddetBaslat(item)} style={styles.eylemDugmesi}>
            Talep Reddet
          </DangerSoftButton>
        </View>
      </AppCard>
    );
  };

  return (
    <AppScreen>
      <AppHeader title="İptal / İtiraz Talepleri" onBack={() => navigation.goBack()} />

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
        <FlatList persistentScrollbar indicatorStyle="white"
          data={talepler}
          keyExtractor={(item, index) => item.iptalItirazOid || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.liste}
          refreshing={yenileniyor}
          onRefresh={handlePullYenile}
          ListEmptyComponent={<EmptyState icon="file-undo-outline" title="Seçili tarih aralığında talep bulunmuyor." />}
        />
      )}

      <AppDialog
        visible={kabulHedefi !== null}
        onDismiss={handleKabulVazgec}
        title="İptal Talebi Kabul"
        icon="check-circle-outline"
        tone="success"
        actions={
          <>
            <TextButton onPress={handleKabulVazgec} disabled={kabulSurecinde} compact>
              Vazgeç
            </TextButton>
            <PrimaryButton
              onPress={handleKabulOnayla}
              loading={kabulSurecinde}
              disabled={kabulSurecinde || !kabulUyariOkundu}
              compact
            >
              Talebi Kabul Et
            </PrimaryButton>
          </>
        }
      >
        <InfoBox tone="warning" title="UYARI">
          {`${asString(kabulHedefi?.belgeNumarasi) ?? 'Seçili'} numaralı belge için iptal talebini onaylamak istiyorsunuz. Onayladığınız takdirde onayınız geri çekilemeyecektir.`}
        </InfoBox>
        <CheckRow label="Uyarıyı Okudum" checked={kabulUyariOkundu} onChange={() => setKabulUyariOkundu((v) => !v)} />
      </AppDialog>

      <AppDialog
        visible={reddetHedefi !== null}
        onDismiss={handleReddetVazgec}
        title="İptal Talebi Ret"
        icon="close-circle-outline"
        tone="danger"
        actions={
          <>
            <TextButton onPress={handleReddetVazgec} disabled={reddetSurecinde} compact>
              Vazgeç
            </TextButton>
            <DangerButton
              onPress={handleReddetOnayla}
              loading={reddetSurecinde}
              disabled={reddetSurecinde || !reddetUyariOkundu || reddetGerekce.trim().length === 0}
              compact
            >
              Talebi Reddet
            </DangerButton>
          </>
        }
      >
        <AppInput
          label="Gerekçenizi Giriniz"
          value={reddetGerekce}
          onChangeText={(v) => setReddetGerekce(v.slice(0, 255))}
          maxLength={255}
          multiline
          numberOfLines={3}
          autoFocus
          helperText={`${reddetGerekce.length}/255`}
        />
        <InfoBox tone="warning" title="UYARI">
          {`${asString(reddetHedefi?.belgeNumarasi) ?? 'Seçili'} numaralı belge için iptal talebini reddetmek istiyorsunuz. Reddettiğiniz takdirde ret işleminiz geri çekilemeyecektir.`}
        </InfoBox>
        <CheckRow
          label="Uyarıyı Okudum"
          checked={reddetUyariOkundu}
          onChange={() => setReddetUyariOkundu((v) => !v)}
        />
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
  eylemDugmesi: { flexGrow: 1, minWidth: 140 },
});
