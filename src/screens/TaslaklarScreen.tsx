import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Chip,
  Dialog,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import { smsSifreGonder, smsSifreOnayla, taslakGetir } from '../services/gibApi';
import { useAuthStore } from '../store/useAuthStore';
import type { TaslakFatura } from '../types/gib';

type Props = NativeStackScreenProps<RootStackParamList, 'Taslaklar'>;

function paraFormatla(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TaslaklarScreen({ navigation }: Props) {
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);

  const [taslaklar, setTaslaklar] = useState<TaslakFatura[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  // GİB'in gerçek onay durumunu tekrar sorgulamak yerine, SMS ile başarıyla
  // onaylanan belgeleri burada yerel olarak işaretliyoruz.
  const [onaylananlar, setOnaylananlar] = useState<Set<string>>(new Set());

  const [smsGonderilenEttn, setSmsGonderilenEttn] = useState<string | null>(null);
  const [smsModalEttn, setSmsModalEttn] = useState<string | null>(null);
  const [smsKodu, setSmsKodu] = useState('');
  const [smsOnaylaniyor, setSmsOnaylaniyor] = useState(false);

  const listeyiYukle = useCallback(async () => {
    if (!token) return;
    try {
      const sonuc = await taslakGetir(token);
      setTaslaklar(sonuc);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Faturalar yüklenemedi.';
      Alert.alert('Hata', message);
    }
  }, [token]);

  useEffect(() => {
    setYukleniyor(true);
    listeyiYukle().finally(() => setYukleniyor(false));
  }, [listeyiYukle]);

  const handleYenile = async () => {
    setYenileniyor(true);
    await listeyiYukle();
    setYenileniyor(false);
  };

  const handleSmsGonder = async (ettn: string) => {
    if (!token) return;
    setSmsGonderilenEttn(ettn);
    try {
      await smsSifreGonder(token, ettn);
      setSmsKodu('');
      setSmsModalEttn(ettn);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'SMS gönderilemedi.';
      Alert.alert('SMS Gönderilemedi', message);
    } finally {
      setSmsGonderilenEttn(null);
    }
  };

  const handleSmsOnayla = async () => {
    if (!token || !smsModalEttn || smsKodu.trim().length === 0) return;
    setSmsOnaylaniyor(true);
    try {
      await smsSifreOnayla(token, smsModalEttn, smsKodu.trim());
      setOnaylananlar((prev) => new Set(prev).add(smsModalEttn));
      setSmsModalEttn(null);
      Alert.alert('Onaylandı', 'Fatura başarıyla imzalandı.');
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'SMS kodu onaylanamadı.';
      Alert.alert('Onay Başarısız', message);
    } finally {
      setSmsOnaylaniyor(false);
    }
  };

  const renderItem = ({ item }: { item: TaslakFatura }) => {
    const onaylandi = onaylananlar.has(item.ettn) || item.durum === 'Onaylandı';
    const smsGonderiliyor = smsGonderilenEttn === item.ettn;

    return (
      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text variant="titleMedium" style={styles.flexShrink}>
              {item.aliciUnvan ?? 'Bilinmeyen Alıcı'}
            </Text>
            <Chip
              compact
              icon={onaylandi ? 'check-circle' : 'clock-outline'}
              style={onaylandi ? styles.chipOnayli : styles.chipTaslak}
            >
              {onaylandi ? 'Onaylandı' : 'Taslak'}
            </Chip>
          </View>

          <Text variant="bodySmall" style={styles.mutedText}>
            {item.faturaTarihi ?? '-'} · Belge No: {item.ettn}
          </Text>

          <Text variant="titleMedium" style={styles.tutar}>
            {paraFormatla(item.genelToplam ?? 0)} ₺
          </Text>

          {!onaylandi && (
            <Button
              mode="outlined"
              icon="message-text-outline"
              loading={smsGonderiliyor}
              disabled={smsGonderiliyor}
              onPress={() => handleSmsGonder(item.ettn)}
              style={styles.smsButton}
            >
              SMS ile Onayla
            </Button>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Taslak / Kesilen Faturalar" />
        <Appbar.Action icon="refresh" onPress={handleYenile} disabled={yenileniyor || yukleniyor} />
      </Appbar.Header>

      {yukleniyor ? (
        <View style={styles.merkezi}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={taslaklar}
          keyExtractor={(item) => item.ettn}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={yenileniyor}
          onRefresh={handleYenile}
          ListEmptyComponent={
            <View style={styles.merkezi}>
              <Text variant="bodyMedium" style={styles.mutedText}>
                Henüz fatura bulunmuyor.
              </Text>
            </View>
          }
        />
      )}

      <Portal>
        <Dialog visible={smsModalEttn !== null} onDismiss={() => setSmsModalEttn(null)}>
          <Dialog.Title>SMS Onay Kodu</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Telefonunuza gelen GİB SMS onay kodunu girin.
            </Text>
            <TextInput
              mode="outlined"
              label="SMS Kodu"
              value={smsKodu}
              onChangeText={setSmsKodu}
              keyboardType="number-pad"
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSmsModalEttn(null)} disabled={smsOnaylaniyor}>
              Vazgeç
            </Button>
            <Button
              onPress={handleSmsOnayla}
              loading={smsOnaylaniyor}
              disabled={smsOnaylaniyor || smsKodu.trim().length === 0}
            >
              Onayla
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  merkezi: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  listContent: { padding: 16, gap: 12 },
  card: { borderRadius: 16, marginBottom: 12 },
  cardContent: { gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  flexShrink: { flexShrink: 1 },
  chipOnayli: { backgroundColor: '#1b4332' },
  chipTaslak: { backgroundColor: '#4a3b00' },
  mutedText: { opacity: 0.7 },
  tutar: { marginTop: 2 },
  smsButton: { marginTop: 4, alignSelf: 'flex-start' },
  dialogText: { marginBottom: 12 },
});
