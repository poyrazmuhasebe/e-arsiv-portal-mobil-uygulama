import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import {
  Alert,
  AppHeader,
  AppInput,
  AppScreen,
  AppSelect,
  FormRow,
  PrimaryButton,
  SectionCard,
} from '../components/ui';
import { KULLANICI_ILLERI, KULLANICI_ULKELERI } from '../constants/faturaConstants';
import { kullaniciBilgileriDetayGetir, kullaniciBilgileriKaydet } from '../services/gibApi';
import { useAuthStore } from '../store/useAuthStore';
import { colors, spacing } from '../theme';
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
    <AppScreen>
      <AppHeader title="Kullanıcı Bilgileri" onBack={() => navigation.goBack()} />

      {yukleniyor ? (
        <View style={styles.merkezi}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView persistentScrollbar indicatorStyle="white" contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
            {/* VKN/TCKN GİB'de <span>: salt okunur. */}
            <SectionCard title="Kimlik Bilgileri" icon="card-account-details-outline">
              <AppInput label="VKN/TCKN" value={bilgi.vknTckn} editable={false} />
              {/* Etiketler uzun: telefonda alt alta, geniş ekranda yan yana. */}
              <FormRow minColumnWidth={220}>
                <AppInput
                  label="Ad (Gerçek Kişiler İçin)"
                  value={bilgi.ad}
                  onChangeText={(v) => guncelle({ ad: v })}
                />
                <AppInput
                  label="Soyad (Gerçek Kişiler İçin)"
                  value={bilgi.soyad}
                  onChangeText={(v) => guncelle({ soyad: v })}
                />
              </FormRow>
              <AppInput
                label="Unvan (Tüzel Kişiler için)"
                value={bilgi.unvan}
                onChangeText={(v) => guncelle({ unvan: v })}
              />
              <FormRow>
                <AppInput label="Sicil No" value={bilgi.sicilNo} onChangeText={(v) => guncelle({ sicilNo: v })} />
                <AppInput label="Mersis No" value={bilgi.mersisNo} onChangeText={(v) => guncelle({ mersisNo: v })} />
              </FormRow>
              <AppInput
                label="Vergi Dairesi"
                value={bilgi.vergiDairesi}
                onChangeText={(v) => guncelle({ vergiDairesi: v })}
              />
            </SectionCard>

            <SectionCard title="Adres Bilgileri" icon="map-marker-outline">
              <AppInput label="Cadde" value={bilgi.cadde} onChangeText={(v) => guncelle({ cadde: v })} />
              <AppInput
                label="Apartman Adı"
                value={bilgi.apartmanAdi}
                onChangeText={(v) => guncelle({ apartmanAdi: v })}
              />
              <FormRow>
                <AppInput
                  label="Apartman No"
                  value={bilgi.apartmanNo}
                  onChangeText={(v) => guncelle({ apartmanNo: v })}
                />
                <AppInput label="Kapı No" value={bilgi.kapiNo} onChangeText={(v) => guncelle({ kapiNo: v })} />
              </FormRow>
              <AppInput label="Mahalle" value={bilgi.kasaba} onChangeText={(v) => guncelle({ kasaba: v })} />
              <FormRow>
                <AppInput label="İlçe" value={bilgi.ilce} onChangeText={(v) => guncelle({ ilce: v })} />
                <AppSelect
                  label="İl"
                  value={bilgi.il}
                  secenekler={KULLANICI_ILLERI}
                  onSelect={(v) => guncelle({ il: v })}
                />
              </FormRow>
              <AppInput
                label="Posta Kodu"
                value={bilgi.postaKodu}
                onChangeText={(v) => guncelle({ postaKodu: v })}
                keyboardType="number-pad"
              />
              <AppSelect
                label="Ülke"
                value={bilgi.ulke}
                secenekler={KULLANICI_ULKELERI}
                onSelect={(v) => guncelle({ ulke: v })}
              />
            </SectionCard>

            <SectionCard title="İletişim Bilgileri" icon="phone-outline">
              <AppInput
                label="Tel No"
                value={bilgi.telNo}
                onChangeText={(v) => guncelle({ telNo: v })}
                keyboardType="phone-pad"
              />
              <AppInput
                label="Faks No"
                value={bilgi.faksNo}
                onChangeText={(v) => guncelle({ faksNo: v })}
                keyboardType="phone-pad"
              />
              <AppInput
                label="e-Posta Adresi"
                value={bilgi.ePostaAdresi}
                onChangeText={(v) => guncelle({ ePostaAdresi: v })}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <AppInput
                label="Web Sitesi Adresi"
                value={bilgi.webSitesiAdresi}
                onChangeText={(v) => guncelle({ webSitesiAdresi: v })}
                autoCapitalize="none"
              />
              <AppInput label="İş Merkezi" value={bilgi.isMerkezi} onChangeText={(v) => guncelle({ isMerkezi: v })} />
            </SectionCard>

            <PrimaryButton
              icon="content-save-outline"
              onPress={handleKaydet}
              loading={kaydediliyor}
              disabled={kaydediliyor}
              fullWidth
            >
              Kaydet
            </PrimaryButton>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  merkezi: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icerik: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    gap: spacing.card,
  },
});
