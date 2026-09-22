import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import TarihAraligiFiltresi, { tarihFormatla } from '../components/TarihAraligiFiltresi';
import {
  AppCard,
  AppHeader,
  AppIconButton,
  AppInput,
  AppScreen,
  DetailRow,
  EmptyState,
  InfoBox,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  StatusBadge,
} from '../components/ui';
import {
  DvdApiError,
  dvdEarsivFaturalariGetir,
  dvdFaturalariSirala,
  dvdGuvenlikKoduGetir,
  dvdTarihiGoster,
  type DvdEarsivFatura,
  type DvdGuvenlikKodu,
} from '../services/dvdApi';
import { useAuthStore } from '../store/useAuthStore';
import { dvdSifreGerekli, useDvdStore } from '../store/useDvdStore';
import { colors, radius, spacing, typography } from '../theme';
import { tutarEtiketi } from '../utils/paraBirimi';

type Props = NativeStackScreenProps<RootStackParamList, 'EarsivFaturalarim'>;

function yediGunOncesi(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

function tutar(n: number | undefined, paraBirimi: string | undefined): string | undefined {
  return n === undefined ? undefined : tutarEtiketi(n, paraBirimi ?? 'TRY');
}

function gonderimEtiketi(s: string | undefined): string | undefined {
  if (!s) return undefined;
  if (s === 'KAGIT') return 'Kâğıt';
  if (s === 'ELEKTRONIK') return 'Elektronik';
  return s;
}

/**
 * "Belge İşlemleri > e-Arşiv Faturalarım" — Dijital Vergi Dairesi'nde
 * mükellefin ALICI olduğu e-Arşiv faturaları (elektrik, doğalgaz, telefon…).
 * GİB'in kendi sayfası gibi yalnızca liste; faturayı açmaya yarayan bir kimlik
 * yanıtta yok (bkz. services/dvdApi.ts).
 *
 * Giriş: kullanıcı kodu ve şifre e-Arşiv girişinden (şifre yalnızca
 * bellekte); kullanıcı yalnızca GİB'in güvenlik kodunu (captcha) yazar. Kod
 * OTOMATİK OKUNMAZ — GİB'in insan doğrulaması aşılmaz.
 */
export default function EarsivFaturalarimScreen({ navigation, route }: Props) {
  const kullaniciKodu = useAuthStore((s) => s.kullaniciKodu);
  // e-Arşiv girişi yapılmadan (GİB giriş ekranından) açıldı: kullanıcı kodu ve
  // şifre bu ekranda istenir; formdaki kod taşınır, şifre taşınmaz.
  const bagimsiz = kullaniciKodu === null;
  const [girilenKod, setGirilenKod] = useState(route.params?.kullaniciKodu ?? '');
  const token = useDvdStore((s) => s.token);
  const girisYapiliyor = useDvdStore((s) => s.girisYapiliyor);
  const girisYap = useDvdStore((s) => s.girisYap);
  const cikisYap = useDvdStore((s) => s.cikisYap);
  const oturumuUnut = useDvdStore((s) => s.oturumuUnut);

  // --- Giriş (güvenlik kodu) ------------------------------------------
  const [kod, setKod] = useState<DvdGuvenlikKodu | null>(null);
  const [kodYukleniyor, setKodYukleniyor] = useState(false);
  const [guvenlikKodu, setGuvenlikKodu] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreGorunur, setSifreGorunur] = useState(false);
  const [girisHatasi, setGirisHatasi] = useState<string | null>(null);
  const sifreGerekli = dvdSifreGerekli();

  const yeniKodAl = useCallback(async () => {
    setKodYukleniyor(true);
    setGuvenlikKodu('');
    try {
      setKod(await dvdGuvenlikKoduGetir());
    } catch (err) {
      setKod(null);
      setGirisHatasi(err instanceof Error ? err.message : 'Güvenlik kodu alınamadı.');
    } finally {
      setKodYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    if (!token) yeniKodAl();
  }, [token, yeniKodAl]);

  const handleGiris = async () => {
    if (!kod || !guvenlikKodu.trim() || girisYapiliyor) return;
    setGirisHatasi(null);
    try {
      await girisYap({
        guvenlikKodu,
        cid: kod.cid,
        sifre: sifreGerekli ? sifre : undefined,
        kullaniciKodu: bagimsiz ? girilenKod : undefined,
      });
      setSifre('');
    } catch (err) {
      setGirisHatasi(err instanceof Error ? err.message : 'Giriş yapılamadı.');
      // Kullanılmış kodun tekrar geçip geçmediği bilinmiyor: her hatada yeni kod.
      await yeniKodAl();
    }
  };

  // --- Liste ------------------------------------------------------------
  const [baslangicTarih, setBaslangicTarih] = useState<Date>(yediGunOncesi);
  const [bitisTarih, setBitisTarih] = useState<Date>(() => new Date());
  const [faturalar, setFaturalar] = useState<DvdEarsivFatura[]>([]);
  const [sayfa, setSayfa] = useState(0);
  const [toplamSayfa, setToplamSayfa] = useState(0);
  const [toplam, setToplam] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [dahaYukleniyor, setDahaYukleniyor] = useState(false);
  const [listeHatasi, setListeHatasi] = useState<string | null>(null);
  const [sorgulandi, setSorgulandi] = useState(false);

  const sayfaGetir = useCallback(
    async (hedefSayfa: number, bas: Date, bit: Date) => {
      if (!token) return;
      setListeHatasi(null);
      try {
        const s = await dvdEarsivFaturalariGetir(token, {
          baslangic: tarihFormatla(bas),
          bitis: tarihFormatla(bit),
          sayfa: hedefSayfa,
        });
        setFaturalar((onceki) => dvdFaturalariSirala(hedefSayfa === 1 ? s.faturalar : [...onceki, ...s.faturalar]));
        setSayfa(s.sayfa);
        setToplamSayfa(s.toplamSayfa);
        setToplam(s.toplam);
        setSorgulandi(true);
      } catch (err) {
        if (err instanceof DvdApiError && err.oturumHatasi) {
          oturumuUnut();
          setGirisHatasi(err.message);
          return;
        }
        setListeHatasi(err instanceof Error ? err.message : 'Faturalar alınamadı.');
      }
    },
    [token, oturumuUnut],
  );

  const handleSorgula = async () => {
    setYukleniyor(true);
    await sayfaGetir(1, baslangicTarih, bitisTarih);
    setYukleniyor(false);
  };

  // Girişten hemen sonra varsayılan aralık (son 7 gün) sorgulanır.
  useEffect(() => {
    if (!token) {
      setFaturalar([]);
      setSorgulandi(false);
      return;
    }
    setYukleniyor(true);
    sayfaGetir(1, baslangicTarih, bitisTarih).finally(() => setYukleniyor(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const dahaFazla = async () => {
    if (dahaYukleniyor || sayfa >= toplamSayfa) return;
    setDahaYukleniyor(true);
    await sayfaGetir(sayfa + 1, baslangicTarih, bitisTarih);
    setDahaYukleniyor(false);
  };

  // --- Görünüm ----------------------------------------------------------

  const baslik = (
    <AppHeader
      title="e-Arşiv Faturalarım"
      subtitle="Dijital Vergi Dairesi"
      onBack={() => navigation.goBack()}
      right={
        token ? (
          <AppIconButton icon="logout-variant" accessibilityLabel="Dijital VD oturumunu kapat" onPress={cikisYap} />
        ) : undefined
      }
    />
  );

  if (!token) {
    return (
      <AppScreen>
        {baslik}
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            persistentScrollbar
            indicatorStyle="white"
            contentContainerStyle={styles.icerik}
            keyboardShouldPersistTaps="handled"
          >
            <InfoBox tone="info" icon="shield-account-outline" title="Dijital Vergi Dairesi girişi">
              {bagimsiz
                ? "Adınıza düzenlenen e-Arşiv faturaları Dijital Vergi Dairesi'nden alınır; e-Arşiv Portal'a giriş gerekmez. GİB kullanıcı kodunuz ve şifrenizle (e-Arşiv girişindekilerle aynı) ve aşağıdaki güvenlik koduyla giriş yapın."
                : `Adınıza düzenlenen e-Arşiv faturaları Dijital Vergi Dairesi'nden alınır. Giriş, e-Arşiv girişindeki kullanıcı kodunuzla (${kullaniciKodu}) yapılır; yalnızca aşağıdaki güvenlik kodunu yazın.`}
            </InfoBox>

            <SectionCard title={bagimsiz ? 'Giriş bilgileri' : 'Güvenlik kodu'} icon="form-textbox-password">
              {bagimsiz ? (
                <AppInput
                  label="GİB Kullanıcı Kodu"
                  value={girilenKod}
                  onChangeText={setGirilenKod}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  disabled={girisYapiliyor}
                />
              ) : null}
              <View style={styles.kodSatiri}>
                <View style={styles.kodResmi}>
                  {kodYukleniyor ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : kod ? (
                    <Image
                      source={{ uri: `data:image/png;base64,${kod.resimBase64}` }}
                      style={styles.resim}
                      resizeMode="contain"
                      accessibilityLabel="Güvenlik kodu resmi"
                    />
                  ) : (
                    <Text style={typography.caption}>Kod alınamadı</Text>
                  )}
                </View>
                <AppIconButton
                  icon="refresh"
                  variant="filled"
                  accessibilityLabel="Yeni güvenlik kodu"
                  onPress={yeniKodAl}
                  disabled={kodYukleniyor || girisYapiliyor}
                />
              </View>
              <AppInput
                label="Resimdeki kod"
                value={guvenlikKodu}
                onChangeText={setGuvenlikKodu}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                maxLength={12}
                returnKeyType="done"
                onSubmitEditing={handleGiris}
                disabled={girisYapiliyor}
              />
              {sifreGerekli ? (
                <AppInput
                  label="GİB şifresi"
                  value={sifre}
                  onChangeText={setSifre}
                  secureTextEntry={!sifreGorunur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  helperText={
                    bagimsiz
                      ? "Şifreniz yalnızca GİB'e gönderilir; cihaza kaydedilmez, bellekte de tutulmaz."
                      : 'Uygulama yeniden açıldığı için şifreniz bir kez daha isteniyor. Cihaza kaydedilmez; yalnızca bu oturum boyunca bellekte tutulur.'
                  }
                  right={
                    <TextInput.Icon
                      icon={sifreGorunur ? 'eye-off' : 'eye'}
                      onPress={() => setSifreGorunur((v) => !v)}
                      forceTextInputFocus={false}
                      accessibilityLabel={sifreGorunur ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    />
                  }
                  disabled={girisYapiliyor}
                />
              ) : null}
              {girisHatasi ? <InfoBox tone="danger">{girisHatasi}</InfoBox> : null}
              <PrimaryButton
                icon="login"
                onPress={handleGiris}
                loading={girisYapiliyor}
                disabled={
                  !kod ||
                  !guvenlikKodu.trim() ||
                  (sifreGerekli && !sifre) ||
                  (bagimsiz && !girilenKod.trim()) ||
                  girisYapiliyor
                }
                fullWidth
              >
                Giriş Yap
              </PrimaryButton>
            </SectionCard>

            <InfoBox tone="primary" icon="lock-outline">
              Bilgileriniz yalnızca telefonunuz ile GİB arasında gider; uygulama sunucusuna gönderilmez. Dijital Vergi
              Dairesi oturumu uygulama kapanınca ya da GİB oturumundan çıkınca sona erer.
            </InfoBox>
          </ScrollView>
        </KeyboardAvoidingView>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      {baslik}
      <TarihAraligiFiltresi
        baslangic={baslangicTarih}
        bitis={bitisTarih}
        onDegisti={(b, e) => {
          setBaslangicTarih(b);
          setBitisTarih(e);
        }}
        onSorgula={handleSorgula}
        yukleniyor={yukleniyor}
      />

      {yukleniyor ? (
        <View style={styles.merkezi}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          persistentScrollbar
          indicatorStyle="white"
          data={faturalar}
          keyExtractor={(f, i) => `${f.faturaNo}-${f.saticiVknTckn ?? ''}-${i}`}
          contentContainerStyle={styles.liste}
          ListHeaderComponent={
            <View style={styles.listeBasi}>
              {listeHatasi ? <InfoBox tone="danger">{listeHatasi}</InfoBox> : null}
              {sorgulandi && faturalar.length > 0 ? (
                <Text style={typography.caption}>
                  {toplam} faturadan {faturalar.length} tanesi gösteriliyor
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => {
            const para = item.paraBirimi;
            return (
              <AppCard style={styles.kart}>
                <View style={styles.kartBasi}>
                  <View style={styles.kartBasiMetin}>
                    <Text style={typography.cardTitle} numberOfLines={3}>
                      {item.saticiUnvan ?? 'Satıcı bilinmiyor'}
                    </Text>
                    <Text style={typography.caption} selectable>
                      {item.faturaNo}
                    </Text>
                  </View>
                  {item.gonderimSekli ? (
                    <StatusBadge
                      status="info"
                      icon={item.gonderimSekli === 'KAGIT' ? 'file-document-outline' : 'email-outline'}
                      label={gonderimEtiketi(item.gonderimSekli)}
                    />
                  ) : null}
                </View>
                <View style={styles.detaylar}>
                  <DetailRow label="Düzenlenme Tarihi" value={dvdTarihiGoster(item.duzenlenmeTarihi)} />
                  <DetailRow label="Satıcı VKN/TCKN" value={item.saticiVknTckn} />
                  <DetailRow label="Tesisat No" value={item.tesisatNumarasi} />
                  <DetailRow label="Toplam Tutar" value={tutar(item.toplamTutar, para)} numeric />
                  <DetailRow label="Vergiler" value={tutar(item.vergilerTutari, para)} numeric />
                  <View style={styles.ayrac} />
                  <DetailRow label="Ödenecek Tutar" value={tutar(item.odenecekTutar, para)} numeric emphasize />
                  {item.iptalItirazDurum ? (
                    <DetailRow
                      label="İptal/İtiraz"
                      value={`${item.iptalItirazDurum}${item.iptalItirazTarihi ? ` · ${item.iptalItirazTarihi}` : ''}`}
                    />
                  ) : null}
                </View>
              </AppCard>
            );
          }}
          ListEmptyComponent={
            sorgulandi && !listeHatasi ? (
              <EmptyState
                icon="file-document-outline"
                title="Seçili tarih aralığında adınıza düzenlenmiş e-Arşiv faturası bulunmuyor."
              />
            ) : null
          }
          ListFooterComponent={
            sayfa < toplamSayfa ? (
              <SecondaryButton icon="chevron-down" onPress={dahaFazla} loading={dahaYukleniyor} fullWidth>
                {`Daha fazla göster (${faturalar.length} / ${toplam})`}
              </SecondaryButton>
            ) : null
          }
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  icerik: { padding: spacing.screen, gap: spacing.card, paddingBottom: spacing.xxl },
  kodSatiri: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  kodResmi: {
    flex: 1,
    maxWidth: 300,
    aspectRatio: 3,
    borderRadius: radius.small,
    // Captcha resmi beyaz zeminli; koyu temada okunur kalsın diye açık zemin.
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  resim: { width: '100%', height: '100%' },
  merkezi: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  liste: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.card },
  listeBasi: { gap: spacing.xs },
  kart: { gap: spacing.sm },
  kartBasi: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  kartBasiMetin: { flex: 1, minWidth: 0, gap: 2 },
  detaylar: { gap: spacing.xxs },
  ayrac: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xxs },
});
