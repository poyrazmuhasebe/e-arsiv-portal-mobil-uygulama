import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator, ProgressBar, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { File } from 'expo-file-system';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import type { RootStackParamList } from '../../App';
import TarihAraligiFiltresi, { tarihFormatla } from '../components/TarihAraligiFiltresi';
import { EN_FAZLA_GUN, aralikGecerliMi, varsayilanBaslangic } from '../utils/tarihAraligi';
import {
  Alert,
  AppCard,
  AppDialog,
  AppHeader,
  AppIconButton,
  AppInput,
  AppScreen,
  DangerSoftButton,
  DetailRow,
  DialogText,
  EmptyState,
  InfoBox,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  StatusBadge,
  TextButton,
} from '../components/ui';
import {
  DvdApiError,
  dvdEarsivFaturalariGetir,
  dvdFaturalariSirala,
  dvdGuvenlikKoduGetir,
  dvdTarihiGoster,
  type DvdToplamaIlerlemesi,
  type DvdEarsivFatura,
  type DvdGuvenlikKodu,
} from '../services/dvdApi';
import { useAuthStore } from '../store/useAuthStore';
import { dvdSifreGerekli, useDvdStore } from '../store/useDvdStore';
import { colors, radius, spacing, typography } from '../theme';
import { tutarEtiketi } from '../utils/paraBirimi';
import { raporKlasoru, raporKlasoruSec, yedegiAc, yedegiPaylas } from '../services/yedekDeposu';
import { dvdPdfAktar } from '../services/dvdPdfAktar';

const KEEP_AWAKE_ETIKETI = 'dvd-pdf-aktar';

type AktarmaDurumu =
  | { tur: 'bosta' }
  | { tur: 'suruyor'; ilerleme: DvdToplamaIlerlemesi | null; asama: 'topluyor' | 'pdf' }
  | { tur: 'bitti'; dosya: File; adet: number; klasorAdi: string }
  | { tur: 'hata'; mesaj: string };

type Props = NativeStackScreenProps<RootStackParamList, 'EarsivFaturalarim'>;

/** Bugün dahil son 7 gün (bkz. utils/tarihAraligi.ts → varsayilanBaslangic). */
function yediGunOncesi(): Date {
  return varsayilanBaslangic();
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

  // --- PDF'e aktar ------------------------------------------------------
  // PDF UYGULAMA İÇİNDE üretilir (utils/dvdRapor.ts + expo-print); Dijital
  // VD'nin kendi "PDF'e Aktar" servisi (report/download) KULLANILMAZ.

  const dvdKodu = useDvdStore((s) => s.kullaniciKodu);
  const [aktarma, setAktarma] = useState<AktarmaDurumu>({ tur: 'bosta' });
  const durdurIstendi = useRef(false);

  useEffect(
    () => () => {
      durdurIstendi.current = true;
      deactivateKeepAwake(KEEP_AWAKE_ETIKETI).catch(() => undefined);
    },
    [],
  );

  /**
   * Ekrandaki tarih aralığının TÜM faturaları (tüm sayfalar) tek PDF'e. Uzun
   * dönemler (son 1 / 2 ay) Toplu PDF'e Aktar sayfasında, parça parça.
   */
  const aralikPdfeAktar = async () => {
    if (!aralikGecerliMi(baslangicTarih, bitisTarih)) {
      Alert.alert(
        'Tarih aralığı geçersiz',
        `GİB en fazla ${EN_FAZLA_GUN} günlük ve aynı ay içindeki aralıkta sorgulamaya izin veriyor.`,
      );
      return;
    }
    if (!token || aktarma.tur === 'suruyor') return;
    let klasor = await raporKlasoru();
    if (!klasor) {
      // Android: ilk kullanımda PDF'lerin kaydedileceği klasör seçilir.
      klasor = await raporKlasoruSec();
      if (!klasor) {
        Alert.alert('Klasör seçilmedi', "PDF'in kaydedileceği klasörü seçmeden aktarma yapılamaz.");
        return;
      }
    }
    durdurIstendi.current = false;
    setAktarma({ tur: 'suruyor', ilerleme: null, asama: 'topluyor' });
    await activateKeepAwakeAsync(KEEP_AWAKE_ETIKETI).catch(() => undefined);
    try {
      // Dosyalar VKN/TCKN klasörlerine ayrılır (aynı üyelikte başka kullanıcı
      // kodlarıyla da giriş yapılabilir); mükellef belirlenemezse kaydedilmez.
      const mukellef = await useDvdStore.getState().mukellefiBelirle();
      if (!mukellef) throw new Error("VKN/TCKN belirlenemedi. Dosyalar mükellefe göre ayrı klasörlere kaydedildiği için PDF kaydedilmedi; Dijital Vergi Dairesi'nden çıkıp yeniden giriş yapmayı deneyin.");
      const sonuc = await dvdPdfAktar({
        token,
        klasor,
        mukellef,
        parcalar: [{ baslangic: tarihFormatla(baslangicTarih), bitis: tarihFormatla(bitisTarih) }],
        baslangic: baslangicTarih,
        bitis: bitisTarih,
        kullaniciKodu: dvdKodu ?? undefined,
        durduruldu: () => durdurIstendi.current,
        ilerleme: (d) => setAktarma({ tur: 'suruyor', ilerleme: d, asama: 'topluyor' }),
        pdfAsamasi: () => setAktarma((d) => (d.tur === 'suruyor' ? { ...d, asama: 'pdf' } : d)),
      });
      if (sonuc.durduruldu) {
        setAktarma({ tur: 'bosta' });
        Alert.alert('Durduruldu', 'Aktarma durduruldu; PDF oluşturulmadı.');
        return;
      }
      setAktarma({ tur: 'bitti', dosya: sonuc.dosya, adet: sonuc.adet, klasorAdi: sonuc.klasorAdi });
    } catch (err) {
      if (err instanceof DvdApiError && err.oturumHatasi) {
        setAktarma({ tur: 'bosta' });
        oturumuUnut();
        setGirisHatasi(err.message);
        return;
      }
      setAktarma({ tur: 'hata', mesaj: err instanceof Error ? err.message : "PDF'e aktarılamadı." });
    } finally {
      deactivateKeepAwake(KEEP_AWAKE_ETIKETI).catch(() => undefined);
    }
  };


  const kaydedilenlereGit = () => {
    setAktarma({ tur: 'bosta' });
    navigation.navigate('DvdRaporlar');
  };

  const pdfIslemi = async (dosya: File, tur: 'ac' | 'paylas') => {
    try {
      if (tur === 'ac') await yedegiAc(dosya);
      else await yedegiPaylas(dosya);
    } catch (err) {
      Alert.alert(tur === 'ac' ? 'PDF açılamadı' : 'PDF paylaşılamadı', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  };

  // --- Görünüm ----------------------------------------------------------

  const baslik = (
    <AppHeader
      title="e-Arşiv Faturalarım"
      subtitle="Dijital Vergi Dairesi"
      onBack={() => navigation.goBack()}
      right={
        <>
          <AppIconButton
            icon="folder-file-outline"
            accessibilityLabel="Kaydedilen PDF'ler"
            onPress={() => navigation.navigate('DvdRaporlar')}
          />
          {token ? (
            <AppIconButton icon="logout-variant" accessibilityLabel="Dijital VD oturumunu kapat" onPress={cikisYap} />
          ) : null}
        </>
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
      <View style={styles.aktarSatiri}>
        <View style={styles.flex}>
          <SecondaryButton
            icon="file-pdf-box"
            onPress={aralikPdfeAktar}
            disabled={yukleniyor || aktarma.tur === 'suruyor'}
            fullWidth
          >
            PDF'e Aktar
          </SecondaryButton>
        </View>
        <View style={styles.flex}>
          <SecondaryButton
            icon="file-multiple-outline"
            onPress={() => navigation.navigate('DvdTopluAktar')}
            disabled={yukleniyor || aktarma.tur === 'suruyor'}
            fullWidth
          >
            Toplu PDF'e Aktar
          </SecondaryButton>
        </View>
      </View>

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

      <AppDialog
        visible={aktarma.tur !== 'bosta'}
        title={
          aktarma.tur === 'suruyor'
            ? "PDF'e aktarılıyor"
            : aktarma.tur === 'bitti'
              ? 'PDF kaydedildi'
              : "PDF'e aktarılamadı"
        }
        icon={
          aktarma.tur === 'bitti'
            ? 'check-circle-outline'
            : aktarma.tur === 'hata'
              ? 'alert-circle-outline'
              : 'file-pdf-box'
        }
        tone={aktarma.tur === 'bitti' ? 'success' : aktarma.tur === 'hata' ? 'danger' : 'default'}
        stackedActions={aktarma.tur === 'bitti'}
        actions={
          aktarma.tur === 'suruyor' ? (
            <DangerSoftButton icon="stop" onPress={() => (durdurIstendi.current = true)} compact>
              Durdur
            </DangerSoftButton>
          ) : aktarma.tur === 'bitti' ? (
            <>
              <PrimaryButton icon="file-eye-outline" onPress={() => pdfIslemi(aktarma.dosya, 'ac')} fullWidth>
                PDF'i Aç
              </PrimaryButton>
              <SecondaryButton icon="share-variant-outline" onPress={() => pdfIslemi(aktarma.dosya, 'paylas')} fullWidth>
                PDF'i Paylaş
              </SecondaryButton>
              <SecondaryButton icon="folder-file-outline" onPress={kaydedilenlereGit} fullWidth>
                Kaydedilen PDF'ler
              </SecondaryButton>
              <TextButton onPress={() => setAktarma({ tur: 'bosta' })}>Kapat</TextButton>
            </>
          ) : (
            <PrimaryButton onPress={() => setAktarma({ tur: 'bosta' })} compact>
              Kapat
            </PrimaryButton>
          )
        }
      >
        {aktarma.tur === 'suruyor' &&
          (aktarma.asama === 'pdf' ? (
            <DialogText>PDF oluşturuluyor…</DialogText>
          ) : aktarma.ilerleme ? (
            <>
              <DialogText>
                {aktarma.ilerleme.parca.baslangic} – {aktarma.ilerleme.parca.bitis} arası sorgulanıyor
              </DialogText>
              <Text style={typography.caption}>
                Sorgu {aktarma.ilerleme.parcaSirasi} / {aktarma.ilerleme.parcaSayisi} · Bulunan fatura:{' '}
                {aktarma.ilerleme.bulunan}
              </Text>
              <ProgressBar
                progress={(aktarma.ilerleme.parcaSirasi - 1) / aktarma.ilerleme.parcaSayisi}
                color={colors.primary}
                style={styles.ilerlemeCubugu}
              />
            </>
          ) : (
            <DialogText>Hazırlanıyor…</DialogText>
          ))}
        {aktarma.tur === 'bitti' && (
          <>
            <DialogText>{aktarma.adet} fatura listelendi.</DialogText>
            <Text style={typography.caption} selectable>
              {aktarma.klasorAdi} / {aktarma.dosya.name}
            </Text>
          </>
        )}
        {aktarma.tur === 'hata' && <DialogText>{aktarma.mesaj}</DialogText>}
      </AppDialog>
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
  aktarSatiri: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.screen, paddingBottom: spacing.md },
  ilerlemeCubugu: { marginVertical: spacing.xxs, borderRadius: radius.pill },
});
