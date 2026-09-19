import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useHesapStore } from '../store/useHesapStore';
import {
  EPOSTA_EN_FAZLA,
  GIB_KODU_CAKISMA_MESAJI,
  KULLANICI_ADI_EN_FAZLA,
  SIFRE_EN_FAZLA,
  epostaHatasi,
  epostaNormalize,
  gibKoduylaCakisiyorMu,
  kullaniciAdiHatasi,
  kullaniciAdiNormalize,
  sifreHatasi,
} from '../utils/hesapDogrulama';
import { getSecureItem } from '../utils/secureStorage';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'HesapKayit'>;

// LoginScreen'in giriş formunu doldurmak için kullandığı anahtarla AYNI.
// Burada yalnızca CİHAZDA karşılaştırma yapmak için okunur; değeri hiçbir
// koşulda sunucuya gönderilmez.
const HATIRLANAN_GIB_KODU_KEY = 'gib_hatirlanan_kullanici_kodu';

export default function HesapKayitScreen({ navigation }: Props) {
  const theme = useTheme();
  const kayitOl = useHesapStore((s) => s.kayitOl);
  const yukleniyor = useHesapStore((s) => s.yukleniyor);

  const [eposta, setEposta] = useState('');
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreGorunur, setSifreGorunur] = useState(false);
  const [hatirlananGibKodu, setHatirlananGibKodu] = useState<string | null>(null);
  const [dokunuldu, setDokunuldu] = useState(false);

  useEffect(() => {
    (async () => setHatirlananGibKodu(await getSecureItem(HATIRLANAN_GIB_KODU_KEY)))();
  }, []);

  const epostaN = epostaNormalize(eposta);
  const kullaniciAdiN = kullaniciAdiNormalize(kullaniciAdi);

  const epostaHata = epostaHatasi(epostaN);
  const kullaniciAdiHata = gibKoduylaCakisiyorMu(kullaniciAdi, hatirlananGibKodu)
    ? GIB_KODU_CAKISMA_MESAJI
    : kullaniciAdiHatasi(kullaniciAdiN);
  const sifreHata = sifreHatasi(sifre, epostaN, kullaniciAdiN);

  const gecerli = epostaHata === null && kullaniciAdiHata === null && sifreHata === null;

  const handleKayit = async () => {
    setDokunuldu(true);
    if (!gecerli || yukleniyor) return;

    try {
      // Kullanıcı adı GİB koduyla eşleşiyorsa buraya HİÇ gelinmez: yukarıdaki
      // kontrol yalnızca cihazda yapılır ve istek atılmaz.
      await kayitOl(epostaN, kullaniciAdiN, sifre);
      // Başarılıysa App.tsx e-posta doğrulama ekranına geçer.
    } catch (hata) {
      Alert.alert(
        'Kayıt yapılamadı',
        hata instanceof Error ? hata.message : 'Beklenmeyen bir hata oluştu.',
      );
    }
  };

  const hataGoster = (hata: string | null, deger: string): boolean =>
    hata !== null && (dokunuldu || deger.length > 0);

  return (
    <SafeAreaView style={styles.kapsayici} edges={['top', 'left', 'right']}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Kayıt Ol" />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.kapsayici}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <TextInput
            label="E-posta"
            value={eposta}
            onChangeText={setEposta}
            mode="outlined"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            maxLength={EPOSTA_EN_FAZLA}
            error={hataGoster(epostaHata, eposta)}
          />
          <HelperText type="error" visible={hataGoster(epostaHata, eposta)}>
            {epostaHata ?? ''}
          </HelperText>

          <TextInput
            label="Uygulama Kullanıcı Adı"
            value={kullaniciAdi}
            onChangeText={setKullaniciAdi}
            mode="outlined"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={KULLANICI_ADI_EN_FAZLA}
            error={hataGoster(kullaniciAdiHata, kullaniciAdi)}
          />
          <HelperText
            type={hataGoster(kullaniciAdiHata, kullaniciAdi) ? 'error' : 'info'}
            visible
          >
            {hataGoster(kullaniciAdiHata, kullaniciAdi)
              ? (kullaniciAdiHata ?? '')
              : 'GİB kullanıcı kodunuz değildir. 3–20 karakter, en az bir harf.'}
          </HelperText>

          <TextInput
            label="Şifre"
            value={sifre}
            onChangeText={setSifre}
            mode="outlined"
            secureTextEntry={!sifreGorunur}
            autoCapitalize="none"
            autoComplete="new-password"
            maxLength={SIFRE_EN_FAZLA}
            error={hataGoster(sifreHata, sifre)}
            right={
              <TextInput.Icon
                icon={sifreGorunur ? 'eye-off' : 'eye'}
                onPress={() => setSifreGorunur((o) => !o)}
                accessibilityLabel={sifreGorunur ? 'Şifreyi gizle' : 'Şifreyi göster'}
              />
            }
          />
          <HelperText type={hataGoster(sifreHata, sifre) ? 'error' : 'info'} visible>
            {hataGoster(sifreHata, sifre)
              ? (sifreHata ?? '')
              : 'En az 8 karakter. GİB şifrenizden farklı olmalı.'}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleKayit}
            loading={yukleniyor}
            disabled={yukleniyor}
            style={styles.buton}
            contentStyle={styles.butonIc}
          >
            Kayıt Ol
          </Button>

          {/* Aydınlatma metni ve gizlilik politikası kayıt düğmesinin
              YAKININDA. Açık rıza kutucuğu BİLEREK YOK: sözleşmenin kurulması
              için gerekli veriler açık rızaya bağlanmaz (KVKK 2026/347). */}
          <Text variant="bodySmall" style={styles.hukukMetni}>
            Kayıt olarak{' '}
            <Text
              style={[styles.baglanti, { color: theme.colors.primary }]}
              onPress={() => navigation.navigate('HukukiMetin', { metin: 'sartlar' })}
            >
              Hizmet Şartları
            </Text>
            'nı kabul etmiş olursunuz. Kişisel verilerinizin nasıl işlendiği
            için{' '}
            <Text
              style={[styles.baglanti, { color: theme.colors.primary }]}
              onPress={() => navigation.navigate('HukukiMetin', { metin: 'aydinlatma' })}
            >
              Aydınlatma Metni
            </Text>{' '}
            ve{' '}
            <Text
              style={[styles.baglanti, { color: theme.colors.primary }]}
              onPress={() => navigation.navigate('HukukiMetin', { metin: 'gizlilik' })}
            >
              Gizlilik Politikası
            </Text>
            'nı inceleyin.
          </Text>

          <View style={[styles.bilgi, { borderColor: theme.colors.outlineVariant }]}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Bu bilgiler hesap sunucumuza (Cloudflare, Avrupa Birliği) gönderilir.
              Şifreniz orada geri döndürülemez biçimde özetlenir, açık hâli
              hiçbir yerde saklanmaz. GİB kullanıcı kodunuz, GİB şifreniz ve
              fatura verileriniz buraya hiçbir koşulda gönderilmez.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  icerik: { padding: 20, paddingBottom: 48 },
  buton: { marginTop: 8 },
  butonIc: { paddingVertical: 6 },
  hukukMetni: { marginTop: 16, opacity: 0.8, lineHeight: 18 },
  baglanti: { textDecorationLine: 'underline' },
  bilgi: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 20 },
});
