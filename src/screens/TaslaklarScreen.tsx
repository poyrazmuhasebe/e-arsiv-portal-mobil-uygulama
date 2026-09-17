import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, FlatList, StyleSheet, View } from 'react-native';
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
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { WebView } from 'react-native-webview';

import type { RootStackParamList } from '../../App';
import { faturaHTMLGetir, smsSifreGonder, smsSifreOnayla, taslakGetir } from '../services/gibApi';
import { useAuthStore } from '../store/useAuthStore';
import { pdfIndir, pdfPaylas } from '../utils/pdf';
import type { TaslakFatura } from '../types/gib';

type TaslakDurum = 'onaylandi' | 'onaylanmadi' | 'silinmis' | 'bilinmiyor';

// GİB'in canlı yanıtında doğrulanan kesin değerler: "Onaylandı" | "Onaylanmadı" | "Silinmiş".
function taslakDurumu(item: TaslakFatura, onaylananlar: Set<string>): TaslakDurum {
  if (onaylananlar.has(item.ettn)) return 'onaylandi';
  const ham = item.onayDurumu ?? item.durum;
  if (ham === 'Onaylandı') return 'onaylandi';
  if (ham === 'Silinmiş') return 'silinmis';
  if (ham === 'Onaylanmadı') return 'onaylanmadi';
  return 'bilinmiyor';
}

type Props = NativeStackScreenProps<RootStackParamList, 'Taslaklar'>;

function paraFormatla(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tarihFormatla(d: Date): string {
  const gg = String(d.getDate()).padStart(2, '0');
  const aa = String(d.getMonth() + 1).padStart(2, '0');
  return `${gg}/${aa}/${d.getFullYear()}`;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function yediGunOncesi(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

export default function TaslaklarScreen({ navigation }: Props) {
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);

  const [taslaklar, setTaslaklar] = useState<TaslakFatura[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const [baslangicTarih, setBaslangicTarih] = useState<Date>(yediGunOncesi);
  const [bitisTarih, setBitisTarih] = useState<Date>(() => new Date());
  const [acikPicker, setAcikPicker] = useState<'baslangic' | 'bitis' | null>(null);

  // GİB'in gerçek onay durumunu tekrar sorgulamak yerine, SMS ile başarıyla
  // onaylanan belgeleri burada yerel olarak işaretliyoruz.
  const [onaylananlar, setOnaylananlar] = useState<Set<string>>(new Set());

  const [smsGonderilenEttn, setSmsGonderilenEttn] = useState<string | null>(null);
  const [smsModalEttn, setSmsModalEttn] = useState<string | null>(null);
  const [smsKodu, setSmsKodu] = useState('');
  const [smsOnaylaniyor, setSmsOnaylaniyor] = useState(false);

  const [htmlModalGorunur, setHtmlModalGorunur] = useState(false);
  const [htmlYukleniyor, setHtmlYukleniyor] = useState(false);
  const [htmlIcerik, setHtmlIcerik] = useState<string | null>(null);
  const [pdfIsleniyor, setPdfIsleniyor] = useState(false);

  // Listedeki "İndir" butonu için — hangi kartın HTML'i arka planda
  // çekilip PDF'e çevriliyor.
  const [indirilenEttn, setIndirilenEttn] = useState<string | null>(null);

  const veriYukle = useCallback(
    async (baslangic: Date, bitis: Date) => {
      if (!token) return;
      try {
        const sonuc = await taslakGetir(token, {
          baslangicTarihi: tarihFormatla(baslangic),
          bitisTarihi: tarihFormatla(bitis),
        });
        setTaslaklar(sonuc);
      } catch (err) {
        const message = err instanceof Error && err.message ? err.message : 'Faturalar yüklenemedi.';
        Alert.alert('Hata', message);
      }
    },
    [token],
  );

  useEffect(() => {
    // Yalnızca ilk açılışta varsayılan (son 7 gün) aralıkla sorgulanır;
    // kullanıcı tarihleri değiştirdiğinde yalnızca "Sorgula" butonuna
    // basınca yeni sorgu gönderilir.
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
    setAcikPicker(null); // Android'de picker modal olarak açılır, seçim sonrası kapanır
    if (hedef === 'baslangic') setBaslangicTarih(secilen);
    else if (hedef === 'bitis') setBitisTarih(secilen);
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

  // Düzenle/Sil/İndir/İtiraz/İptal: gerçek GİB komutları henüz
  // doğrulanmadığından şimdilik yalnızca konsola yazan yer tutucular.
  const handleAksiyon = (aksiyonAdi: string, item: TaslakFatura) => {
    console.log(`${aksiyonAdi} tıklandı:`, item.ettn);
  };

  const handleGoruntule = async (item: TaslakFatura) => {
    if (!token) return;
    setHtmlModalGorunur(true);
    setHtmlYukleniyor(true);
    setHtmlIcerik(null);
    try {
      const html = await faturaHTMLGetir(token, item.ettn, item.onayDurumu);
      setHtmlIcerik(html);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Fatura görüntülenemedi.';
      Alert.alert('Hata', message);
      setHtmlModalGorunur(false);
    } finally {
      setHtmlYukleniyor(false);
    }
  };

  const handlePdfIndir = async () => {
    if (!htmlIcerik) return;
    setPdfIsleniyor(true);
    try {
      await pdfIndir(htmlIcerik);
      // Artık paylaşım penceresi açılmıyor (doğrudan indiriliyor), bu yüzden
      // başarı geri bildirimi yalnızca bu Alert.
      Alert.alert('İndirildi', 'Fatura PDF olarak cihazınıza kaydedildi.');
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'PDF oluşturulamadı.';
      Alert.alert('Hata', message);
    } finally {
      setPdfIsleniyor(false);
    }
  };

  const handlePdfPaylas = async () => {
    if (!htmlIcerik) return;
    setPdfIsleniyor(true);
    try {
      await pdfPaylas(htmlIcerik);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'PDF paylaşılamadı.';
      Alert.alert('Hata', message);
    } finally {
      setPdfIsleniyor(false);
    }
  };

  // Kart üzerindeki "İndir": modalı açmadan doğrudan HTML'i çekip PDF olarak indirir.
  const handleListedenIndir = async (item: TaslakFatura) => {
    if (!token) return;
    setIndirilenEttn(item.ettn);
    try {
      const html = await faturaHTMLGetir(token, item.ettn, item.onayDurumu);
      await pdfIndir(html);
      Alert.alert('İndirildi', 'Fatura PDF olarak cihazınıza kaydedildi.');
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Fatura indirilemedi.';
      Alert.alert('Hata', message);
    } finally {
      setIndirilenEttn(null);
    }
  };

  const renderItem = ({ item }: { item: TaslakFatura }) => {
    const durum = taslakDurumu(item, onaylananlar);
    const smsGonderiliyor = smsGonderilenEttn === item.ettn;
    // GİB İmza/Düzenle/Sil yalnızca "Onaylanmadı" (henüz taslak) durumunda
    // anlamlı — onaylanmış veya silinmiş bir belgede gösterilmiyor.
    const duzenlenebilir = durum === 'onaylanmadi';

    const baslik = asString(item.aliciUnvanAdSoyad) ?? asString(item.aliciUnvan) ?? 'Bilinmeyen Alıcı';
    const tarih = asString(item.belgeTarihi) ?? asString(item.faturaTarihi) ?? '-';
    const vknTckn = asString(item.aliciVknTckn);
    const belgeNo = asString(item.belgeNumarasi) ?? item.ettn;
    const belgeTuru = asString(item.belgeTuru);
    const itirazIptalMetni = asString(item.itirazDurumu) ?? asString(item.iptalDurumu);

    const durumGorseli =
      durum === 'onaylandi'
        ? { icon: 'check-circle', stil: styles.chipOnayli, etiket: 'Onaylı' }
        : durum === 'silinmis'
          ? { icon: 'close-circle', stil: styles.chipSilinmis, etiket: 'Silinmiş' }
          : durum === 'onaylanmadi'
            ? { icon: 'clock-outline', stil: styles.chipTaslak, etiket: 'Taslak' }
            : { icon: 'help-circle-outline', stil: styles.chipBilinmiyor, etiket: 'Bilinmiyor' };

    return (
      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text variant="titleMedium" style={styles.flexShrink} numberOfLines={2}>
              {baslik}
            </Text>
            <Chip compact icon={durumGorseli.icon} style={durumGorseli.stil}>
              {durumGorseli.etiket}
            </Chip>
          </View>

          <Text variant="bodySmall" style={styles.mutedText}>
            {tarih}
            {vknTckn ? ` · ${vknTckn}` : ''}
          </Text>

          <Text variant="bodySmall" style={styles.mutedText}>
            Belge No: {belgeNo}
            {belgeTuru ? ` · ${belgeTuru}` : ''}
          </Text>

          {item.genelToplam !== undefined && (
            <Text variant="titleMedium" style={styles.tutar}>
              {paraFormatla(item.genelToplam)} ₺
            </Text>
          )}

          {itirazIptalMetni && (
            <Text variant="bodySmall" style={styles.uyariMetni}>
              İtiraz/İptal Durumu: {itirazIptalMetni}
            </Text>
          )}
        </Card.Content>

        <Card.Actions>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.aksiyonlarScroll}
          >
            <Button compact mode="text" icon="eye-outline" onPress={() => handleGoruntule(item)}>
              Görüntüle
            </Button>
            {duzenlenebilir && (
              <Button compact mode="text" icon="pencil-outline" onPress={() => handleAksiyon('Düzenle', item)}>
                Düzenle
              </Button>
            )}
            {duzenlenebilir && (
              <Button compact mode="text" icon="delete-outline" onPress={() => handleAksiyon('Sil', item)}>
                Sil
              </Button>
            )}
            {duzenlenebilir && (
              <Button
                compact
                mode="text"
                icon="message-text-outline"
                loading={smsGonderiliyor}
                disabled={smsGonderiliyor}
                onPress={() => handleSmsGonder(item.ettn)}
              >
                GİB İmza
              </Button>
            )}
            <Button
              compact
              mode="text"
              icon="tray-arrow-down"
              loading={indirilenEttn === item.ettn}
              disabled={indirilenEttn === item.ettn}
              onPress={() => handleListedenIndir(item)}
            >
              İndir
            </Button>
            <Button
              compact
              mode="text"
              icon="alert-circle-outline"
              onPress={() => handleAksiyon('İtiraz Talebi Oluştur', item)}
            >
              İtiraz
            </Button>
            <Button
              compact
              mode="text"
              icon="close-circle-outline"
              onPress={() => handleAksiyon('İptal Talebi Oluştur', item)}
            >
              İptal
            </Button>
          </ScrollView>
        </Card.Actions>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Taslak / Kesilen Faturalar" />
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
          maximumDate={new Date()}
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
          data={taslaklar}
          keyExtractor={(item) => item.ettn}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={yenileniyor}
          onRefresh={handlePullYenile}
          ListEmptyComponent={
            <View style={styles.merkezi}>
              <Text variant="bodyMedium" style={styles.mutedText}>
                Seçili tarih aralığında fatura bulunmuyor.
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

      <Modal
        visible={htmlModalGorunur}
        animationType="slide"
        onRequestClose={() => setHtmlModalGorunur(false)}
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
          <Appbar.Header elevated>
            <Appbar.Content title="Fatura Görüntüle" />
            <Appbar.Action
              icon="download"
              accessibilityLabel="PDF İndir"
              disabled={!htmlIcerik || pdfIsleniyor}
              onPress={handlePdfIndir}
            />
            <Appbar.Action
              icon="share-variant"
              accessibilityLabel="Paylaş"
              disabled={!htmlIcerik || pdfIsleniyor}
              onPress={handlePdfPaylas}
            />
          </Appbar.Header>

          <View style={styles.kapatBar}>
            <Button mode="contained-tonal" icon="close" onPress={() => setHtmlModalGorunur(false)}>
              Kapat
            </Button>
            {pdfIsleniyor && <ActivityIndicator size="small" style={styles.pdfSpinner} />}
          </View>

          {htmlYukleniyor ? (
            <View style={styles.merkezi}>
              <ActivityIndicator size="large" />
            </View>
          ) : htmlIcerik ? (
            <WebView originWhitelist={['*']} source={{ html: htmlIcerik }} style={styles.flex} />
          ) : (
            <View style={styles.merkezi}>
              <Text variant="bodyMedium" style={styles.mutedText}>
                İçerik yüklenemedi.
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  kapatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pdfSpinner: { marginLeft: 4 },
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
  cardContent: { gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  flexShrink: { flex: 1 },
  chipOnayli: { backgroundColor: '#1b4332' },
  chipTaslak: { backgroundColor: '#4a3b00' },
  chipSilinmis: { backgroundColor: '#5c1a1a' },
  chipBilinmiyor: { backgroundColor: '#3a3a3a' },
  mutedText: { opacity: 0.7 },
  uyariMetni: { color: '#f2b8b5' },
  tutar: { marginTop: 2 },
  aksiyonlarScroll: { gap: 4, paddingHorizontal: 8 },
  dialogText: { marginBottom: 12 },
});
