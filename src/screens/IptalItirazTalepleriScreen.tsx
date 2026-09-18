import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Checkbox,
  Dialog,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';

import type { RootStackParamList } from '../../App';
import { iptalItirazTalepDurumGuncelle, iptalItirazTalepleriGetir } from '../services/gibApi';
import { useAuthStore } from '../store/useAuthStore';
import type { IptalItirazTalebi } from '../types/gib';

type Props = NativeStackScreenProps<RootStackParamList, 'IptalItirazTalepleri'>;

function tarihFormatla(d: Date): string {
  const gg = String(d.getDate()).padStart(2, '0');
  const aa = String(d.getMonth() + 1).padStart(2, '0');
  return `${gg}/${aa}/${d.getFullYear()}`;
}

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
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);

  const [talepler, setTalepler] = useState<IptalItirazTalebi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const [baslangicTarih, setBaslangicTarih] = useState<Date>(() => new Date());
  const [bitisTarih, setBitisTarih] = useState<Date>(() => new Date());
  const [acikPicker, setAcikPicker] = useState<'baslangic' | 'bitis' | null>(null);

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

  const handleTarihSecildi = (_event: DateTimePickerChangeEvent, secilen: Date) => {
    const hedef = acikPicker;
    setAcikPicker(null);
    if (hedef === 'baslangic') setBaslangicTarih(secilen);
    else if (hedef === 'bitis') setBitisTarih(secilen);
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
      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">{belgeNo}</Text>
          {(belgeTuru || talepTarihi) && (
            <Text variant="bodySmall" style={styles.mutedText}>
              {belgeTuru}
              {talepTarihi ? ` · ${talepTarihi}` : ''}
            </Text>
          )}
          {satici && (
            <Text variant="bodySmall" style={styles.mutedText}>
              Satıcı: {satici}
              {saticiVkn ? ` (${saticiVkn})` : ''}
            </Text>
          )}
          {alici && (
            <Text variant="bodySmall" style={styles.mutedText}>
              Alıcı: {alici}
              {aliciVkn ? ` (${aliciVkn})` : ''}
            </Text>
          )}
          {itirazYontemi && (
            <Text variant="bodySmall" style={styles.mutedText}>
              İtiraz Yöntemi: {itirazYontemi}
            </Text>
          )}
          {(referansNo || referansTarihi) && (
            <Text variant="bodySmall" style={styles.mutedText}>
              İtiraz Belgesi: {referansNo ?? '-'}
              {referansTarihi ? ` · ${referansTarihi}` : ''}
            </Text>
          )}
          {durum && (
            <Text variant="bodySmall" style={styles.durumMetni}>
              Durum: {durum}
            </Text>
          )}
        </Card.Content>
        <Card.Actions>
          <Button compact mode="text" icon="check" onPress={() => handleKabulBaslat(item)}>
            Talep Kabul Et
          </Button>
          <Button compact mode="text" icon="close" onPress={() => handleReddetBaslat(item)}>
            Talep Reddet
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
        <Appbar.Content title="İptal / İtiraz Talepleri" />
      </Appbar.Header>

      <View style={styles.filtreBar}>
        <View style={styles.tarihRow}>
          <Pressable
            onPress={() => setAcikPicker('baslangic')}
            style={[styles.tarihButon, { borderColor: theme.colors.outline }]}
          >
            <Text variant="labelSmall" style={styles.mutedText}>
              Başlangıç
            </Text>
            <Text variant="bodyMedium">{tarihFormatla(baslangicTarih)}</Text>
          </Pressable>
          <Pressable
            onPress={() => setAcikPicker('bitis')}
            style={[styles.tarihButon, { borderColor: theme.colors.outline }]}
          >
            <Text variant="labelSmall" style={styles.mutedText}>
              Bitiş
            </Text>
            <Text variant="bodyMedium">{tarihFormatla(bitisTarih)}</Text>
          </Pressable>
        </View>
        <Button mode="contained" onPress={handleSorgula} loading={yukleniyor} disabled={yukleniyor}>
          Sorgula
        </Button>
      </View>

      {acikPicker && (
        <DateTimePicker
          value={acikPicker === 'baslangic' ? baslangicTarih : bitisTarih}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onValueChange={handleTarihSecildi}
          onDismiss={() => setAcikPicker(null)}
        />
      )}

      {yukleniyor ? (
        <View style={styles.merkezi}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={talepler}
          keyExtractor={(item, index) => item.iptalItirazOid || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={yenileniyor}
          onRefresh={handlePullYenile}
          ListEmptyComponent={
            <View style={styles.merkezi}>
              <Text variant="bodyMedium" style={styles.mutedText}>
                Seçili tarih aralığında talep bulunmuyor.
              </Text>
            </View>
          }
        />
      )}

      <Portal>
        <Dialog visible={kabulHedefi !== null} onDismiss={handleKabulVazgec}>
          <Dialog.Title>İptal Talebi Kabul</Dialog.Title>
          <Dialog.Content>
            <Text variant="labelSmall" style={styles.mutedText}>
              UYARI
            </Text>
            <Text variant="bodyMedium" style={styles.dialogText}>
              {asString(kabulHedefi?.belgeNumarasi) ?? 'Seçili'} numaralı belge için iptal
              talebini onaylamak istiyorsunuz. Onayladığınız takdirde onayınız geri
              çekilemeyecektir.
            </Text>
            <Checkbox.Item
              label="Uyarıyı Okudum"
              status={kabulUyariOkundu ? 'checked' : 'unchecked'}
              onPress={() => setKabulUyariOkundu((v) => !v)}
              style={styles.checkboxStili}
              labelStyle={styles.checkboxEtiket}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleKabulVazgec} disabled={kabulSurecinde}>
              Vazgeç
            </Button>
            <Button
              onPress={handleKabulOnayla}
              loading={kabulSurecinde}
              disabled={kabulSurecinde || !kabulUyariOkundu}
            >
              Talebi Kabul Et
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={reddetHedefi !== null} onDismiss={handleReddetVazgec}>
          <Dialog.Title>İptal Talebi Ret</Dialog.Title>
          <Dialog.Content>
            <Text variant="labelSmall" style={styles.mutedText}>
              Gerekçenizi Giriniz
            </Text>
            <TextInput
              mode="outlined"
              value={reddetGerekce}
              onChangeText={(v) => setReddetGerekce(v.slice(0, 255))}
              maxLength={255}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <Text variant="labelSmall" style={styles.karakterSayaci}>
              {reddetGerekce.length}/255
            </Text>
            <Text variant="labelSmall" style={[styles.mutedText, styles.dialogUyariBaslik]}>
              UYARI
            </Text>
            <Text variant="bodyMedium" style={styles.dialogText}>
              {asString(reddetHedefi?.belgeNumarasi) ?? 'Seçili'} numaralı belge için iptal
              talebini reddetmek istiyorsunuz. Reddettiğiniz takdirde ret işleminiz geri
              çekilemeyecektir.
            </Text>
            <Checkbox.Item
              label="Uyarıyı Okudum"
              status={reddetUyariOkundu ? 'checked' : 'unchecked'}
              onPress={() => setReddetUyariOkundu((v) => !v)}
              style={styles.checkboxStili}
              labelStyle={styles.checkboxEtiket}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleReddetVazgec} disabled={reddetSurecinde}>
              Vazgeç
            </Button>
            <Button
              onPress={handleReddetOnayla}
              loading={reddetSurecinde}
              disabled={reddetSurecinde || !reddetUyariOkundu || reddetGerekce.trim().length === 0}
            >
              Talebi Reddet
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  filtreBar: { padding: 16, gap: 12 },
  tarihRow: { flexDirection: 'row', gap: 12 },
  tarihButon: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  merkezi: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  listContent: { padding: 16, paddingTop: 0, gap: 12 },
  card: { borderRadius: 16, marginBottom: 12 },
  cardContent: { gap: 4 },
  mutedText: { opacity: 0.7 },
  durumMetni: { color: '#f2b8b5', marginTop: 2 },
  dialogText: { marginBottom: 8 },
  checkboxStili: { paddingHorizontal: 0 },
  checkboxEtiket: { fontSize: 14 },
  karakterSayaci: { alignSelf: 'flex-end', opacity: 0.6, marginTop: 2, marginBottom: 8 },
  dialogUyariBaslik: { fontWeight: '700', marginBottom: 4 },
});
