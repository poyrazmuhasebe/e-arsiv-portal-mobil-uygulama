import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Appbar, Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import SecimAlani from '../components/SecimAlani';
import { KULLANICI_ILLERI, KULLANICI_ULKELERI } from '../constants/faturaConstants';
import { kullaniciBilgileriDetayGetir, kullaniciBilgileriKaydet } from '../services/gibApi';
import { useAuthStore } from '../store/useAuthStore';
import type { KullaniciDetayBilgisi } from '../types/gib';

type Props = NativeStackScreenProps<RootStackParamList, 'KullaniciBilgileri'>;

const BOS_BILGI: KullaniciDetayBilgisi = {
  vknTckn: '',
  unvan: '',
  ad: '',
  soyad: '',
  sicilNo: '',
  mersisNo: '',
  vergiDairesi: '',
  cadde: '',
  apartmanAdi: '',
  apartmanNo: '',
  kapiNo: '',
  kasaba: '',
  ilce: '',
  il: '',
  postaKodu: '',
  ulke: '',
  telNo: '',
  faksNo: '',
  ePostaAdresi: '',
  webSitesiAdresi: '',
  isMerkezi: '',
};

/**
 * "Kullanıcı İşlemleri > Kullanıcı Bilgileri" (RG_KULLANICI) — GİB'e kayıtlı
 * mükellef/firma bilgilerini görüntüleme ve düzenleme ekranı. GİB'in kendi
 * ekranında VKN/TCKN bir <span> (salt okunur), diğer tüm alanlar <input>/
 * <select> (düzenlenebilir) — bu ayrım burada da birebir korunuyor.
 */
export default function KullaniciBilgileriScreen({ navigation }: Props) {
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);

  const [bilgi, setBilgi] = useState<KullaniciDetayBilgisi>(BOS_BILGI);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setYukleniyor(true);
      try {
        const veri = await kullaniciBilgileriDetayGetir(token);
        setBilgi(veri);
      } catch (err) {
        const message = err instanceof Error && err.message ? err.message : 'Bilgiler alınamadı.';
        Alert.alert('Hata', message);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, [token]);

  const guncelle = (patch: Partial<KullaniciDetayBilgisi>) => {
    setBilgi((prev) => ({ ...prev, ...patch }));
  };

  const handleKaydet = async () => {
    if (!token) return;
    setKaydediliyor(true);
    try {
      await kullaniciBilgileriKaydet(token, bilgi);
      Alert.alert('Kaydedildi', 'Kullanıcı bilgileriniz başarıyla güncellendi.');
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Bilgiler kaydedilemedi.';
      Alert.alert('Kaydetme Başarısız', message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Kullanıcı Bilgileri" />
      </Appbar.Header>

      {yukleniyor ? (
        <ActivityIndicator size="large" style={styles.merkezi} />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Card mode="elevated" style={styles.card}>
              <Card.Content style={styles.icerik}>
                <TextInput mode="outlined" label="VKN/TCKN" value={bilgi.vknTckn} editable={false} />
                <TextInput
                  mode="outlined"
                  label="Unvan (Tüzel Kişiler için)"
                  value={bilgi.unvan}
                  onChangeText={(v) => guncelle({ unvan: v })}
                />
                <TextInput
                  mode="outlined"
                  label="Ad (Gerçek Kişiler İçin)"
                  value={bilgi.ad}
                  onChangeText={(v) => guncelle({ ad: v })}
                />
                <TextInput
                  mode="outlined"
                  label="Soyad (Gerçek Kişiler İçin)"
                  value={bilgi.soyad}
                  onChangeText={(v) => guncelle({ soyad: v })}
                />
                <TextInput
                  mode="outlined"
                  label="Sicil No"
                  value={bilgi.sicilNo}
                  onChangeText={(v) => guncelle({ sicilNo: v })}
                />
                <TextInput
                  mode="outlined"
                  label="Mersis No"
                  value={bilgi.mersisNo}
                  onChangeText={(v) => guncelle({ mersisNo: v })}
                />
                <TextInput
                  mode="outlined"
                  label="Vergi Dairesi"
                  value={bilgi.vergiDairesi}
                  onChangeText={(v) => guncelle({ vergiDairesi: v })}
                />
              </Card.Content>
            </Card>

            <Card mode="elevated" style={styles.card}>
              <Card.Title title="Adres" />
              <Card.Content style={styles.icerik}>
                <TextInput
                  mode="outlined"
                  label="Cadde"
                  value={bilgi.cadde}
                  onChangeText={(v) => guncelle({ cadde: v })}
                />
                <TextInput
                  mode="outlined"
                  label="Apartman Adı"
                  value={bilgi.apartmanAdi}
                  onChangeText={(v) => guncelle({ apartmanAdi: v })}
                />
                <TextInput
                  mode="outlined"
                  label="Apartman No"
                  value={bilgi.apartmanNo}
                  onChangeText={(v) => guncelle({ apartmanNo: v })}
                />
                <TextInput
                  mode="outlined"
                  label="Kapı No"
                  value={bilgi.kapiNo}
                  onChangeText={(v) => guncelle({ kapiNo: v })}
                />
                <TextInput
                  mode="outlined"
                  label="Mahalle"
                  value={bilgi.kasaba}
                  onChangeText={(v) => guncelle({ kasaba: v })}
                />
                <TextInput
                  mode="outlined"
                  label="İlçe"
                  value={bilgi.ilce}
                  onChangeText={(v) => guncelle({ ilce: v })}
                />
                <SecimAlani
                  label="İl"
                  value={bilgi.il}
                  secenekler={KULLANICI_ILLERI}
                  onSelect={(v) => guncelle({ il: v })}
                />
                <TextInput
                  mode="outlined"
                  label="Posta Kodu"
                  value={bilgi.postaKodu}
                  onChangeText={(v) => guncelle({ postaKodu: v })}
                  keyboardType="number-pad"
                />
                <SecimAlani
                  label="Ülke"
                  value={bilgi.ulke}
                  secenekler={KULLANICI_ULKELERI}
                  onSelect={(v) => guncelle({ ulke: v })}
                />
              </Card.Content>
            </Card>

            <Card mode="elevated" style={styles.card}>
              <Card.Title title="İletişim" />
              <Card.Content style={styles.icerik}>
                <TextInput
                  mode="outlined"
                  label="Tel No"
                  value={bilgi.telNo}
                  onChangeText={(v) => guncelle({ telNo: v })}
                  keyboardType="phone-pad"
                />
                <TextInput
                  mode="outlined"
                  label="Faks No"
                  value={bilgi.faksNo}
                  onChangeText={(v) => guncelle({ faksNo: v })}
                  keyboardType="phone-pad"
                />
                <TextInput
                  mode="outlined"
                  label="e-Posta Adresi"
                  value={bilgi.ePostaAdresi}
                  onChangeText={(v) => guncelle({ ePostaAdresi: v })}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  mode="outlined"
                  label="Web Sitesi Adresi"
                  value={bilgi.webSitesiAdresi}
                  onChangeText={(v) => guncelle({ webSitesiAdresi: v })}
                  autoCapitalize="none"
                />
                <TextInput
                  mode="outlined"
                  label="İş Merkezi"
                  value={bilgi.isMerkezi}
                  onChangeText={(v) => guncelle({ isMerkezi: v })}
                />
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              icon="content-save"
              onPress={handleKaydet}
              loading={kaydediliyor}
              disabled={kaydediliyor}
              style={styles.kaydetButonu}
              contentStyle={styles.kaydetButonuIcerik}
            >
              Kaydet
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  merkezi: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  card: { borderRadius: 16 },
  icerik: { gap: 12 },
  kaydetButonu: { borderRadius: 8, marginTop: 4 },
  kaydetButonuIcerik: { paddingVertical: 6 },
});
