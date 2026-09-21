import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import {
  Alert,
  AppCard,
  AppHeader,
  AppIconButton,
  AppInput,
  AppScreen,
  AppSelect,
  DangerSoftButton,
  DetailRow,
  EmptyState,
  InfoBox,
  PrimaryButton,
  SearchBar,
  SecondaryButton,
  TextButton,
} from '../components/ui';
import { ULKELER, VARSAYILAN_ULKE } from '../constants/faturaConstants';
import { useAuthStore } from '../store/useAuthStore';
import { colors, spacing, typography } from '../theme';
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
      <AppScreen>
        <AppHeader title="Alıcı Ekle" onBack={() => setYeniAlici(null)} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView persistentScrollbar indicatorStyle="white" contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
            <InfoBox tone="info">
              VKN/TCKN girin; Unvan/Ad/Soyad/Vergi Dairesi GİB'den otomatik gelir ve elle değiştirilemez. Adres
              zorunludur.
            </InfoBox>
            <AliciBilgileriKarti
              token={token}
              alici={yeniAlici}
              onAliciChange={(patch) => setYeniAlici((onceki) => (onceki ? { ...onceki, ...patch } : onceki))}
              kayitliSecimGoster={false}
            />
            <PrimaryButton
              icon="content-save-outline"
              onPress={yeniAliciyiKaydet}
              disabled={!yeniAliciGecerli || kaydediliyor}
              loading={kaydediliyor}
              fullWidth
            >
              Deftere Kaydet
            </PrimaryButton>
          </ScrollView>
        </KeyboardAvoidingView>
      </AppScreen>
    );
  }

  const aliciKartiCiz = ({ item: kayit }: { item: KayitliAlici }) => {
    const duzenleniyor = duzenlenen === kayit.vknTckn;
    return (
      <AppCard style={styles.kart}>
        <View style={styles.kartBaslik}>
          <Text style={typography.cardTitle} numberOfLines={2}>
            {aliciAdi(kayit)}
          </Text>
          <Text style={typography.caption} selectable>
            VKN/TCKN: {kayit.vknTckn}
          </Text>
        </View>
        <View style={styles.kartIcerik}>
          <DetailRow label="Vergi Dairesi" value={kayit.vergiDairesi} />
          {duzenleniyor ? (
            <View style={styles.duzenleAlanlari}>
              <AppSelect label="Ülke" value={taslakUlke} secenekler={ULKELER} onSelect={setTaslakUlke} zorunlu />
              <AppInput
                label="Adres *"
                value={taslakAdres}
                onChangeText={setTaslakAdres}
                multiline
                numberOfLines={2}
              />
            </View>
          ) : (
            <View style={styles.detaylar}>
              <DetailRow label="Ülke" value={kayit.ulke} />
              <DetailRow label="Adres" value={kayit.adres} stacked />
            </View>
          )}
        </View>
        <View style={styles.eylemler}>
          {duzenleniyor ? (
            <>
              <TextButton compact onPress={() => setDuzenlenen(null)}>
                Vazgeç
              </TextButton>
              <PrimaryButton compact icon="content-save-outline" onPress={duzenlemeyiKaydet}>
                Kaydet
              </PrimaryButton>
            </>
          ) : (
            <>
              <DangerSoftButton compact icon="delete-outline" onPress={() => silmeyiOnayla(kayit)}>
                Sil
              </DangerSoftButton>
              <SecondaryButton compact icon="pencil-outline" onPress={() => duzenlemeyiBaslat(kayit)}>
                Adresi Düzenle
              </SecondaryButton>
            </>
          )}
        </View>
      </AppCard>
    );
  };

  return (
    <AppScreen>
      <AppHeader
        title="Alıcı Defteri"
        onBack={() => navigation.goBack()}
        right={
          <AppIconButton
            icon="account-plus-outline"
            accessibilityLabel="Alıcı ekle"
            onPress={() => setYeniAlici(bosAlici())}
          />
        }
      />

      {/* Kart içindeki adres alanı klavyeyle düzenlenebildiği için liste
          KeyboardAvoidingView içinde; removeClippedSubviews={false} odaklı
          alanın ekran dışına kayınca sökülüp odağın kaybolmasını önler. */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList persistentScrollbar indicatorStyle="white"
          data={yukleniyor ? [] : gorunenler}
          keyExtractor={(kayit) => kayit.vknTckn}
          renderItem={aliciKartiCiz}
          extraData={[duzenlenen, taslakAdres, taslakUlke]}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
          contentContainerStyle={styles.icerik}
          ListHeaderComponent={
            <View style={styles.ust}>
              <InfoBox tone="primary" icon="shield-lock-outline">
                Bu defter yalnızca bu hesaba özeldir ve cihazda şifreli saklanır. Fatura başarıyla oluşturulunca
                alıcı otomatik eklenir.
              </InfoBox>
              <Text style={[typography.caption, styles.sayac]}>
                {liste.length}/{MAX_ALICI_KAYDI} kayıt
              </Text>
              {liste.length > 0 && (
                <SearchBar placeholder="Unvan, ad veya VKN/TCKN ara" value={arama} onChangeText={setArama} />
              )}
            </View>
          }
          ListEmptyComponent={
            yukleniyor ? (
              <ActivityIndicator style={styles.yukleniyor} color={colors.primary} />
            ) : liste.length === 0 ? (
              <EmptyState
                icon="account-multiple-outline"
                title="Henüz kayıtlı alıcı yok"
                description="Sağ üstteki düğmeyle elle ekleyebilirsiniz."
              />
            ) : (
              <EmptyState icon="magnify" title="Aramayla eşleşen alıcı yok." />
            )
          }
        />
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  icerik: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    gap: spacing.card,
  },
  ust: { gap: spacing.sm },
  sayac: { alignSelf: 'flex-end' },
  yukleniyor: { marginTop: spacing.xl },
  kart: { gap: spacing.sm },
  kartBaslik: { gap: 2 },
  kartIcerik: { gap: spacing.xs },
  detaylar: { gap: spacing.xs },
  duzenleAlanlari: { gap: spacing.sm },
  eylemler: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xxs,
  },
});
