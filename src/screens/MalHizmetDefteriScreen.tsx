import React, { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Appbar, Button, Card, Searchbar, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
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
  const theme = useTheme();

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

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Mal/Hizmet Defteri" />
        <Appbar.Action
          icon="plus"
          accessibilityLabel="Mal/hizmet ekle"
          onPress={() => {
            setDuzenlenen(null);
            setYeniAd('');
          }}
        />
      </Appbar.Header>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <Text variant="bodySmall" style={styles.aciklama}>
            Bu defter yalnızca bu hesaba özeldir ve cihazda şifreli saklanır. Fatura başarıyla oluşturulunca kalem
            adları otomatik eklenir; fatura formunda "Kayıtlı Mal/Hizmet Seç" ile kullanılır. Yalnızca adlar
            saklanır. {liste.length}/{MAX_MAL_HIZMET_KAYDI} kayıt.
          </Text>

          {yeniAd !== null && (
            <Card mode="elevated" style={styles.kart}>
              <Card.Title title="Yeni mal/hizmet" />
              <Card.Content style={styles.kartIcerik}>
                <TextInput
                  mode="outlined"
                  label="Mal/Hizmet adı *"
                  value={yeniAd}
                  onChangeText={setYeniAd}
                  maxLength={MAL_HIZMET_AD_EN_UZUN}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={ekle}
                />
              </Card.Content>
              <Card.Actions>
                {[
                  <Button key="vazgec" mode="text" onPress={() => setYeniAd(null)} disabled={mesgul}>
                    Vazgeç
                  </Button>,
                  <Button
                    key="kaydet"
                    mode="contained"
                    onPress={ekle}
                    disabled={mesgul || yeniAd.trim().length === 0}
                    loading={mesgul}
                  >
                    Deftere Kaydet
                  </Button>,
                ]}
              </Card.Actions>
            </Card>
          )}

          {liste.length > 0 && <Searchbar placeholder="Mal/hizmet adı ara" value={arama} onChangeText={setArama} />}

          {yukleniyor ? (
            <ActivityIndicator style={styles.yukleniyor} />
          ) : liste.length === 0 ? (
            <Text variant="bodyMedium" style={styles.aciklama}>
              Henüz kayıtlı mal/hizmet yok. Sağ üstteki + düğmesiyle ekleyebilirsiniz.
            </Text>
          ) : gorunenler.length === 0 ? (
            <Text variant="bodyMedium" style={styles.aciklama}>
              Aramayla eşleşen kayıt yok.
            </Text>
          ) : (
            gorunenler.map((ad) => {
              const duzenleniyor = duzenlenen === ad;
              return (
                <Card key={ad} mode="elevated" style={styles.kart}>
                  <Card.Content style={styles.kartIcerik}>
                    {duzenleniyor ? (
                      <TextInput
                        mode="outlined"
                        label="Mal/Hizmet adı *"
                        value={taslakAd}
                        onChangeText={setTaslakAd}
                        maxLength={MAL_HIZMET_AD_EN_UZUN}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={duzenlemeyiKaydet}
                      />
                    ) : (
                      <Text variant="titleMedium">{ad}</Text>
                    )}
                  </Card.Content>
                  {/* Card.Actions çocuklarına style ekliyor: Fragment değil, anahtarlı dizi. */}
                  <Card.Actions>
                    {duzenleniyor
                      ? [
                          <Button key="vazgec" mode="text" onPress={() => setDuzenlenen(null)} disabled={mesgul}>
                            Vazgeç
                          </Button>,
                          <Button
                            key="kaydet"
                            mode="contained"
                            onPress={duzenlemeyiKaydet}
                            disabled={mesgul || taslakAd.trim().length === 0}
                            loading={mesgul}
                          >
                            Kaydet
                          </Button>,
                        ]
                      : [
                          <Button
                            key="sil"
                            mode="text"
                            icon="delete-outline"
                            textColor={theme.colors.error}
                            onPress={() => silmeyiOnayla(ad)}
                          >
                            Sil
                          </Button>,
                          <Button key="duzenle" mode="text" icon="pencil-outline" onPress={() => duzenlemeyiBaslat(ad)}>
                            Düzenle
                          </Button>,
                        ]}
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
});
