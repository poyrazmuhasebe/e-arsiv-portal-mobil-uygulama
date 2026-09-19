import React, { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Appbar, Button, Card, Searchbar, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import SecimAlani from '../components/SecimAlani';
import { ULKELER, VARSAYILAN_ULKE } from '../constants/faturaConstants';
import { useAuthStore } from '../store/useAuthStore';
import {
  MAX_ALICI_KAYDI,
  aliciAdresGuncelle,
  aliciKaydedilebilirMi,
  aliciKaydet,
  aliciListesiGetir,
  aliciSil,
} from '../utils/aliciDefteri';
import AliciBilgileriKarti from './fatura/AliciBilgileriKarti';
import type { AliciFormu, KayitliAlici } from '../types/faturaForm';

type Props = NativeStackScreenProps<RootStackParamList, 'AliciDefteri'>;

const YAZMA_HATASI =
  'Cihaz depolaması kaydı kabul etmedi. Defter çok büyümüş olabilir; kullanmadığınız alıcıları silip tekrar deneyin.';

function bosAlici(): AliciFormu {
  return { vknTckn: '', unvan: '', ad: '', soyad: '', vergiDairesi: '', ulke: VARSAYILAN_ULKE, adres: '' };
}

function aliciAdi(a: AliciFormu): string {
  return a.unvan || `${a.ad} ${a.soyad}`.trim();
}

/**
 * "Kullanıcı İşlemleri > Alıcı Defteri" — giriş yapılan hesaba özel kayıtlı
 * alıcıları listeler; adres/ülke düzenleme, onaylı silme ve elle ekleme.
 *
 * Elle eklemede fatura formundaki AliciBilgileriKarti birebir kullanılır:
 * VKN/TCKN kontrol basamağı yerelde doğrulanır, Unvan/Ad/Soyad/Vergi Dairesi
 * salt okunurdur ve yalnızca GİB sorgusuyla (mukellefBilgisiGetir) dolar.
 * Mevcut bir kayıtta da yalnızca adres ve ülke düzenlenebilir.
 */
export default function AliciDefteriScreen({ navigation }: Props) {
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);

  const [liste, setListe] = useState<KayitliAlici[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [arama, setArama] = useState('');

  // Düzenlenen kaydın VKN'si ve taslak adres/ülke değerleri.
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const [taslakAdres, setTaslakAdres] = useState('');
  const [taslakUlke, setTaslakUlke] = useState(VARSAYILAN_ULKE);

  // Elle ekleme formu (null ise liste görünümü).
  const [yeniAlici, setYeniAlici] = useState<AliciFormu | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const yenile = useCallback(async () => {
    setListe(await aliciListesiGetir());
    setYukleniyor(false);
  }, []);

  useEffect(() => {
    yenile();
  }, [yenile]);

  // Ekleme formu açıkken geri (Android geri tuşu/iOS kaydırma) önce formu kapatsın,
  // ekrandan çıkmasın.
  useEffect(() => {
    return navigation.addListener('beforeRemove', (e) => {
      if (!yeniAlici) return;
      e.preventDefault();
      setYeniAlici(null);
    });
  }, [navigation, yeniAlici]);

  const duzenlemeyiBaslat = (kayit: KayitliAlici) => {
    setDuzenlenen(kayit.vknTckn);
    setTaslakAdres(kayit.adres);
    setTaslakUlke(kayit.ulke || VARSAYILAN_ULKE);
  };

  const duzenlemeyiKaydet = async () => {
    if (!duzenlenen) return;
    if (!taslakAdres.trim()) {
      Alert.alert('Adres gerekli', 'Adres alanı boş bırakılamaz.');
      return;
    }
    const basarili = await aliciAdresGuncelle(duzenlenen, { adres: taslakAdres.trim(), ulke: taslakUlke });
    if (!basarili) {
      Alert.alert('Kaydedilemedi', YAZMA_HATASI);
      return;
    }
    setDuzenlenen(null);
    await yenile();
  };

  const silmeyiOnayla = (kayit: KayitliAlici) => {
    Alert.alert('Alıcıyı Sil', `${aliciAdi(kayit)} (${kayit.vknTckn}) defterden silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const basarili = await aliciSil(kayit.vknTckn);
          if (!basarili) Alert.alert('Silinemedi', YAZMA_HATASI);
          if (duzenlenen === kayit.vknTckn) setDuzenlenen(null);
          await yenile();
        },
      },
    ]);
  };

  const yeniAliciGecerli = yeniAlici !== null && aliciKaydedilebilirMi(yeniAlici) && yeniAlici.adres.trim().length > 0;

  const yeniAliciyiKaydet = async () => {
    if (!yeniAlici || !yeniAliciGecerli || kaydediliyor) return;
    const vkn = yeniAlici.vknTckn.trim();
    const kaydet = async () => {
      setKaydediliyor(true);
      try {
        const basarili = await aliciKaydet({ ...yeniAlici, adres: yeniAlici.adres.trim() });
        if (!basarili) {
          Alert.alert('Kaydedilemedi', YAZMA_HATASI);
          return;
        }
        setYeniAlici(null);
        await yenile();
      } finally {
        setKaydediliyor(false);
      }
    };
    if (liste.some((a) => a.vknTckn === vkn)) {
      Alert.alert('Zaten kayıtlı', `${vkn} defterde zaten var. Bilgileri güncellensin mi?`, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Güncelle', onPress: kaydet },
      ]);
      return;
    }
    if (liste.length >= MAX_ALICI_KAYDI) {
      Alert.alert(
        'Defter dolu',
        `En fazla ${MAX_ALICI_KAYDI} alıcı saklanır. Kaydederseniz en eski kayıt silinecek. Devam edilsin mi?`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Kaydet', onPress: kaydet },
        ],
      );
      return;
    }
    await kaydet();
  };

  const aramaKucuk = arama.trim().toLocaleLowerCase('tr-TR');
  const gorunenler = aramaKucuk
    ? liste.filter(
        (a) => aliciAdi(a).toLocaleLowerCase('tr-TR').includes(aramaKucuk) || a.vknTckn.includes(aramaKucuk),
      )
    : liste;

  if (yeniAlici) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        <Appbar.Header elevated>
          <Appbar.BackAction onPress={() => setYeniAlici(null)} />
          <Appbar.Content title="Alıcı Ekle" />
        </Appbar.Header>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
            <Text variant="bodySmall" style={styles.aciklama}>
              VKN/TCKN girin; Unvan/Ad/Soyad/Vergi Dairesi GİB'den otomatik gelir ve elle
              değiştirilemez. Adres zorunludur.
            </Text>
            <AliciBilgileriKarti
              token={token}
              alici={yeniAlici}
              onAliciChange={(patch) => setYeniAlici((onceki) => (onceki ? { ...onceki, ...patch } : onceki))}
              kayitliSecimGoster={false}
            />
            <Button
              mode="contained"
              onPress={yeniAliciyiKaydet}
              disabled={!yeniAliciGecerli || kaydediliyor}
              loading={kaydediliyor}
            >
              Deftere Kaydet
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Alıcı Defteri" />
        <Appbar.Action icon="account-plus" accessibilityLabel="Alıcı ekle" onPress={() => setYeniAlici(bosAlici())} />
      </Appbar.Header>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <Text variant="bodySmall" style={styles.aciklama}>
            Bu defter yalnızca bu hesaba özeldir ve cihazda şifreli saklanır. Fatura başarıyla
            oluşturulunca alıcı otomatik eklenir. {liste.length}/{MAX_ALICI_KAYDI} kayıt.
          </Text>

          {liste.length > 0 && (
            <Searchbar placeholder="Unvan, ad veya VKN/TCKN ara" value={arama} onChangeText={setArama} />
          )}

          {yukleniyor ? (
            <ActivityIndicator style={styles.yukleniyor} />
          ) : liste.length === 0 ? (
            <Text variant="bodyMedium" style={styles.aciklama}>
              Henüz kayıtlı alıcı yok. Sağ üstteki düğmeyle elle ekleyebilirsiniz.
            </Text>
          ) : gorunenler.length === 0 ? (
            <Text variant="bodyMedium" style={styles.aciklama}>
              Aramayla eşleşen alıcı yok.
            </Text>
          ) : (
            gorunenler.map((kayit) => {
              const duzenleniyor = duzenlenen === kayit.vknTckn;
              return (
                <Card key={kayit.vknTckn} mode="elevated" style={styles.kart}>
                  <Card.Title title={aliciAdi(kayit)} subtitle={kayit.vknTckn} titleNumberOfLines={2} />
                  <Card.Content style={styles.kartIcerik}>
                    {kayit.vergiDairesi ? (
                      <Text variant="bodySmall" style={styles.soluk}>
                        Vergi Dairesi: {kayit.vergiDairesi}
                      </Text>
                    ) : null}
                    {duzenleniyor ? (
                      <>
                        <SecimAlani label="Ülke" value={taslakUlke} secenekler={ULKELER} onSelect={setTaslakUlke} zorunlu />
                        <TextInput
                          mode="outlined"
                          label="Adres *"
                          value={taslakAdres}
                          onChangeText={setTaslakAdres}
                          multiline
                          numberOfLines={2}
                        />
                      </>
                    ) : (
                      <>
                        <Text variant="bodySmall" style={styles.soluk}>
                          Ülke: {kayit.ulke}
                        </Text>
                        <Text variant="bodyMedium">{kayit.adres}</Text>
                      </>
                    )}
                  </Card.Content>
                  <Card.Actions>
                    {duzenleniyor ? (
                      <>
                        <Button onPress={() => setDuzenlenen(null)}>Vazgeç</Button>
                        <Button mode="contained" onPress={duzenlemeyiKaydet}>
                          Kaydet
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button icon="delete-outline" textColor={theme.colors.error} onPress={() => silmeyiOnayla(kayit)}>
                          Sil
                        </Button>
                        <Button icon="pencil-outline" onPress={() => duzenlemeyiBaslat(kayit)}>
                          Adresi Düzenle
                        </Button>
                      </>
                    )}
                  </Card.Actions>
                </Card>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  icerik: { padding: 16, gap: 12 },
  aciklama: { opacity: 0.7 },
  yukleniyor: { marginTop: 24 },
  kart: { borderRadius: 16 },
  kartIcerik: { gap: 8 },
  soluk: { opacity: 0.7 },
});
