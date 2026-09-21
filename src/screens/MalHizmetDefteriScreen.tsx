import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import {
  Alert,
  AppCard,
  AppHeader,
  AppIconButton,
  AppInput,
  AppScreen,
  DangerSoftButton,
  EmptyState,
  InfoBox,
  PrimaryButton,
  SearchBar,
  SecondaryButton,
  SectionCard,
  TextButton,
} from '../components/ui';
import { colors, spacing, typography } from '../theme';
import {
  MAL_HIZMET_AD_EN_UZUN,
  MAX_MAL_HIZMET_KAYDI,
  malHizmetAdiniDegistir,
  malHizmetEkle,
  malHizmetListesiGetir,
  malHizmetSil,
  type DefterIslemSonucu,
} from '../utils/malHizmetDefteri';

type Props = NativeStackScreenProps<RootStackParamList, 'MalHizmetDefteri'>;

const YAZMA_HATASI =
  'Cihaz depolaması kaydı kabul etmedi. Kullanmadığınız kayıtları silip tekrar deneyin.';

/** Defter işleminin sonucu başarısızsa kullanıcıya gösterilecek mesaj. */
function sonucMesaji(sonuc: DefterIslemSonucu): { baslik: string; mesaj: string } | null {
  switch (sonuc) {
    case 'tamam':
      return null;
    case 'bos':
      return { baslik: 'Ad gerekli', mesaj: 'Mal/hizmet adı boş bırakılamaz.' };
    case 'uzun':
      return { baslik: 'Ad çok uzun', mesaj: `Mal/hizmet adı en fazla ${MAL_HIZMET_AD_EN_UZUN} karakter olabilir.` };
    case 'var':
      return { baslik: 'Zaten kayıtlı', mesaj: 'Bu ad defterde zaten var.' };
    case 'yok':
      return { baslik: 'Kayıt bulunamadı', mesaj: 'Kayıt defterde artık yok; liste yenilendi.' };
    case 'hata':
      return { baslik: 'Kaydedilemedi', mesaj: YAZMA_HATASI };
  }
}

/**
 * "Kullanıcı İşlemleri > Mal/Hizmet Defteri" — giriş yapılan hesaba (GİB
 * kullanıcı koduna) özel kayıtlı mal/hizmet adları: elle ekleme, adını
 * değiştirme, silme. Fatura başarıyla oluşturulunca kalem adları zaten
 * otomatik eklenir; fatura formundaki "Kayıtlı Mal/Hizmet Seç" bu defteri
 * kullanır. Yalnızca adlar saklanır (tutar/miktar değil), cihazda kalır.
 */
export default function MalHizmetDefteriScreen({ navigation }: Props) {
  const [liste, setListe] = useState<string[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [arama, setArama] = useState('');

  // Düzenlenen kaydın adı ve taslak yeni adı.
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const [taslakAd, setTaslakAd] = useState('');

  // Elle ekleme formu (null ise kapalı).
  const [yeniAd, setYeniAd] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  const yenile = useCallback(async () => {
    setListe(await malHizmetListesiGetir());
    setYukleniyor(false);
  }, []);

  useEffect(() => {
    yenile();
  }, [yenile]);

  const duzenlemeyiBaslat = (ad: string) => {
    setYeniAd(null);
    setDuzenlenen(ad);
    setTaslakAd(ad);
  };

  const duzenlemeyiKaydet = async () => {
    if (duzenlenen === null || mesgul) return;
    setMesgul(true);
    try {
      const sonuc = await malHizmetAdiniDegistir(duzenlenen, taslakAd);
      const hata = sonucMesaji(sonuc);
      if (hata) {
        Alert.alert(hata.baslik, hata.mesaj);
        if (sonuc !== 'yok') return;
      }
      setDuzenlenen(null);
      await yenile();
    } finally {
      setMesgul(false);
    }
  };

  const ekle = async () => {
    if (yeniAd === null || mesgul) return;
    const kaydet = async () => {
      setMesgul(true);
      try {
        const hata = sonucMesaji(await malHizmetEkle(yeniAd));
        if (hata) {
          Alert.alert(hata.baslik, hata.mesaj);
          return;
        }
        setYeniAd(null);
        await yenile();
      } finally {
        setMesgul(false);
      }
    };
    if (liste.length >= MAX_MAL_HIZMET_KAYDI) {
      Alert.alert(
        'Defter dolu',
        `En fazla ${MAX_MAL_HIZMET_KAYDI} ad saklanır. Kaydederseniz en alttaki kayıt silinecek. Devam edilsin mi?`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Kaydet', onPress: kaydet },
        ],
      );
      return;
    }
    await kaydet();
  };

  const silmeyiOnayla = (ad: string) => {
    Alert.alert('Kaydı Sil', `"${ad}" defterden silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const basarili = await malHizmetSil(ad);
          if (!basarili) Alert.alert('Silinemedi', YAZMA_HATASI);
          if (duzenlenen === ad) setDuzenlenen(null);
          await yenile();
        },
      },
    ]);
  };

  const aramaKucuk = arama.trim().toLocaleLowerCase('tr-TR');
  const gorunenler = aramaKucuk ? liste.filter((ad) => ad.toLocaleLowerCase('tr-TR').includes(aramaKucuk)) : liste;

  const kalemKartiCiz = ({ item: ad }: { item: string }) => {
    const duzenleniyor = duzenlenen === ad;
    return (
      <AppCard style={styles.kart}>
        {duzenleniyor ? (
          <AppInput
            label="Mal/Hizmet adı *"
            value={taslakAd}
            onChangeText={setTaslakAd}
            maxLength={MAL_HIZMET_AD_EN_UZUN}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={duzenlemeyiKaydet}
          />
        ) : (
          <Text style={typography.cardTitle}>{ad}</Text>
        )}
        <View style={styles.eylemler}>
          {duzenleniyor ? (
            <>
              <TextButton compact onPress={() => setDuzenlenen(null)} disabled={mesgul}>
                Vazgeç
              </TextButton>
              <PrimaryButton
                compact
                icon="content-save-outline"
                onPress={duzenlemeyiKaydet}
                disabled={mesgul || taslakAd.trim().length === 0}
                loading={mesgul}
              >
                Kaydet
              </PrimaryButton>
            </>
          ) : (
            <>
              <DangerSoftButton compact icon="delete-outline" onPress={() => silmeyiOnayla(ad)}>
                Sil
              </DangerSoftButton>
              <SecondaryButton compact icon="pencil-outline" onPress={() => duzenlemeyiBaslat(ad)}>
                Düzenle
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
        title="Mal/Hizmet Defteri"
        onBack={() => navigation.goBack()}
        right={
          <AppIconButton
            icon="plus"
            accessibilityLabel="Mal/hizmet ekle"
            onPress={() => {
              setDuzenlenen(null);
              setYeniAd('');
            }}
          />
        }
      />

      {/* Kart içinde ad düzenlenebildiği için liste KeyboardAvoidingView
          içinde; removeClippedSubviews={false} odaklı alanın sökülüp odağın
          kaybolmasını önler. */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList persistentScrollbar indicatorStyle="white"
          data={yukleniyor ? [] : gorunenler}
          keyExtractor={(ad) => ad}
          renderItem={kalemKartiCiz}
          extraData={[duzenlenen, taslakAd, mesgul]}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
          contentContainerStyle={styles.icerik}
          ListHeaderComponent={
            <View style={styles.ust}>
              <InfoBox tone="primary" icon="shield-lock-outline">
                Bu defter yalnızca bu hesaba özeldir ve cihazda şifreli saklanır. Fatura başarıyla oluşturulunca
                kalem adları otomatik eklenir; fatura formunda "Kayıtlı Mal/Hizmet Seç" ile kullanılır. Yalnızca
                adlar saklanır.
              </InfoBox>
              <Text style={[typography.caption, styles.sayac]}>
                {liste.length}/{MAX_MAL_HIZMET_KAYDI} kayıt
              </Text>

              {yeniAd !== null && (
                <SectionCard title="Yeni mal/hizmet" icon="plus-circle-outline">
                  <AppInput
                    label="Mal/Hizmet adı *"
                    value={yeniAd}
                    onChangeText={setYeniAd}
                    maxLength={MAL_HIZMET_AD_EN_UZUN}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={ekle}
                  />
                  <View style={styles.eylemler}>
                    <TextButton compact onPress={() => setYeniAd(null)} disabled={mesgul}>
                      Vazgeç
                    </TextButton>
                    <PrimaryButton
                      compact
                      icon="content-save-outline"
                      onPress={ekle}
                      disabled={mesgul || yeniAd.trim().length === 0}
                      loading={mesgul}
                    >
                      Deftere Kaydet
                    </PrimaryButton>
                  </View>
                </SectionCard>
              )}

              {liste.length > 0 && (
                <SearchBar placeholder="Mal/hizmet adı ara" value={arama} onChangeText={setArama} />
              )}
            </View>
          }
          ListEmptyComponent={
            yukleniyor ? (
              <ActivityIndicator style={styles.yukleniyor} color={colors.primary} />
            ) : liste.length === 0 ? (
              <EmptyState
                icon="package-variant-closed"
                title="Henüz kayıtlı mal/hizmet yok"
                description="Sağ üstteki + düğmesiyle ekleyebilirsiniz."
              />
            ) : (
              <EmptyState icon="magnify" title="Aramayla eşleşen kayıt yok." />
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
  eylemler: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
