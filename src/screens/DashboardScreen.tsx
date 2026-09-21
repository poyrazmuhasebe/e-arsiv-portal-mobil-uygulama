import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Switch } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Alert,
  AppDialog,
  AppHeader,
  AppIconButton,
  AppScreen,
  DangerSoftButton,
  DialogText,
  MenuCard,
  SecondaryButton,
  SectionHeader,
  TextButton,
  type IconName,
} from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';
import { useHesapStore } from '../store/useHesapStore';
import { colors, spacing } from '../theme';
import {
  cihazKilidiVarMi,
  kilidiAcmayiDene,
  kilitAyariAcikMi,
  kilitAyariniKaydet,
  kilitHataMesaji,
} from '../utils/uygulamaKilidi';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

interface MenuOgesi {
  icon: IconName;
  baslik: string;
  altBaslik: string;
  onPress: () => void;
  accent?: 'primary' | 'danger';
}

export default function DashboardScreen({ navigation }: Props) {
  const kullaniciBilgisi = useAuthStore((s) => s.kullaniciBilgisi);
  const kullaniciKodu = useAuthStore((s) => s.kullaniciKodu);
  const logout = useAuthStore((s) => s.logout);
  const isLoggingOut = useAuthStore((s) => s.isLoggingOut);
  const hesaptanCik = useHesapStore((s) => s.hesaptanCik);
  // DEMO "Şimdilik atla" modunda uygulama hesabı yoktur.
  const hesapVar = useHesapStore((s) => s.kullanici !== null);

  // Çıkış seçenekleri dialog'u (Android'in beyaz sistem dialog'u yerine).
  const [cikisAcik, setCikisAcik] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);

  // Uygulama kilidi ayarı (bkz. src/utils/uygulamaKilidi.ts).
  const [kilitAcik, setKilitAcik] = useState(true);
  const [cihazKilidiVar, setCihazKilidiVar] = useState(true);

  useEffect(() => {
    (async () => {
      setKilitAcik(await kilitAyariAcikMi());
      setCihazKilidiVar(await cihazKilidiVarMi());
    })();
  }, []);

  const handleKilitDegistir = async (yeniDeger: boolean) => {
    if (yeniDeger) {
      await kilitAyariniKaydet(true);
      setKilitAcik(true);
      return;
    }
    // Kilidi KAPATMAK için önce kimlik doğrulanır; aksi halde kilidi açık bir
    // telefonu eline geçiren biri korumayı kendisi kapatabilirdi.
    if (cihazKilidiVar) {
      const sonuc = await kilidiAcmayiDene('Uygulama kilidini kapatmak için doğrulayın');
      if (!sonuc.basarili) {
        const mesaj = kilitHataMesaji(sonuc.hata);
        if (mesaj) Alert.alert('Kilit kapatılamadı', mesaj);
        return;
      }
    }
    await kilitAyariniKaydet(false);
    setKilitAcik(false);
  };

  const unvan = (kullaniciBilgisi?.unvan as string | undefined) ?? kullaniciKodu ?? 'Mükellef';

  /**
   * İKİ AYRI ÇIKIŞ (karar 2026-09-20, docs/hesap-sistemi.md):
   *
   * - "GİB oturumunu kapat": yalnızca GİB oturumu kapanır, uygulama hesabı
   *   açık kalır ve GİB giriş ekranına dönülür. Başka bir mükellef hesabına
   *   geçmenin yolu budur — mali müşavirin günlük işi.
   * - "Hesaptan çık": önce GİB, sonra uygulama hesabı kapanır; sunucuda
   *   yenileme token'ı da iptal edilir.
   *
   * Hiçbiri hesabın hatırlanan GİB kodlarını (utils/hatirlananKodlar.ts) ya da alıcı /
   * mal-hizmet defterlerini SİLMEZ: defterlerin hiçbir yedeği yok (D1'e
   * gitmiyorlar), yanlışlıkla çıkan kullanıcı veri kaybetmesin.
   */
  const gibOturumunuKapat = async () => {
    setCikisAcik(false);
    setLocalBusy(true);
    try {
      // logout() önce GİB'e EARSIV_PORTAL_LOGOUT isteği atar, o istek
      // hata verse bile yerel token'ı (SecureStore + state) temizler.
      // Uygulama hesabı oturumuna DOKUNMAZ.
      // Bkz. src/store/useAuthStore.ts
      await logout();
    } finally {
      setLocalBusy(false);
    }
  };

  // Hesap atlandıysa (DEMO) kapatılacak hesap yok; bu seçenek her iki
  // oturumu kapatıp Karşılama ekranına döner.
  const hesaptanCikis = async () => {
    setCikisAcik(false);
    setLocalBusy(true);
    try {
      await logout();
      await hesaptanCik();
    } finally {
      setLocalBusy(false);
    }
  };

  const cikisYapiliyor = isLoggingOut || localBusy;

  // GİB'in kendi "Belge İşlemleri" ana menüsündeki 4 alt sekmeyle birebir
  // eşleşiyor (bkz. gerçek menü ağacı yakalaması): e-Arşiv Fatura Oluştur,
  // Taslak Faturalar, İptal/İtiraz Talepleri, Adıma Düzenlenen Belgeler.
  const belgeIslemleri: MenuOgesi[] = [
    {
      icon: 'file-document-plus-outline',
      baslik: 'e-Arşiv Fatura (İnteraktif) Oluştur',
      altBaslik: 'Alıcı bilgilerini girip e-Arşiv faturası oluşturun',
      onPress: () => navigation.navigate('FaturaKesim'),
    },
    {
      icon: 'file-document-multiple-outline',
      baslik: 'Taslak / Kesilen Faturalar',
      altBaslik: 'Daha önce oluşturduğunuz faturaları görüntüleyin',
      onPress: () => navigation.navigate('Taslaklar'),
    },
    {
      icon: 'file-undo-outline',
      baslik: 'İptal / İtiraz Talepleri',
      altBaslik: 'Gelen iptal/itiraz taleplerini kabul edin veya reddedin',
      onPress: () => navigation.navigate('IptalItirazTalepleri'),
    },
    {
      icon: 'inbox-arrow-down-outline',
      baslik: 'Adıma Düzenlenen Belgeler',
      altBaslik: 'Başkalarının adınıza düzenlediği faturaları görüntüleyin',
      onPress: () => navigation.navigate('AdimaDuzenlenen'),
    },
  ];

  // GİB'de yok: faturaların PDF'lerini telefondaki bir klasöre yedekler.
  // GİB verisi yalnızca GİB ile telefon arasında kalır.
  const yedeklemeIslemleri: MenuOgesi[] = [
    {
      icon: 'folder-download-outline',
      baslik: 'Faturaları Şimdi Yedekle',
      altBaslik: 'Son 1 hafta – 1 yıl arasındaki faturaları PDF olarak telefona indirin',
      onPress: () => navigation.navigate('Yedekle'),
    },
    {
      icon: 'folder-open-outline',
      baslik: 'Yedeklenen Faturaları Görüntüle',
      altBaslik: 'Telefondaki yedekleri açın veya paylaşın',
      onPress: () => navigation.navigate('YedekleriGoruntule'),
    },
  ];

  // GİB'in kendi ana menüsündeki ikinci bölüm: "Kullanıcı İşlemleri" (bkz.
  // gerçek menü ağacı yakalaması). "Alıcı Defteri" ve "Mal/Hizmet Defteri"
  // GİB'de yok; uygulamanın cihazda tuttuğu, bu hesaba özel kayıtları yönetir.
  const kullaniciIslemleri: MenuOgesi[] = [
    {
      icon: 'account-outline',
      baslik: 'Kullanıcı Bilgileri',
      altBaslik: 'Firma/mükellef bilgilerinizi görüntüleyin ve güncelleyin',
      onPress: () => navigation.navigate('KullaniciBilgileri'),
    },
    {
      icon: 'card-account-details-outline',
      baslik: 'Alıcı Defteri',
      altBaslik: 'Bu hesaba kayıtlı alıcıları düzenleyin, silin veya ekleyin',
      onPress: () => navigation.navigate('AliciDefteri'),
    },
    {
      icon: 'package-variant-closed',
      baslik: 'Mal/Hizmet Defteri',
      altBaslik: 'Bu hesaba kayıtlı mal/hizmet adlarını düzenleyin, silin veya ekleyin',
      onPress: () => navigation.navigate('MalHizmetDefteri'),
    },
    // Hesap atlandıysa (DEMO) silinecek bir uygulama hesabı yok.
    ...(hesapVar
      ? [
          {
            icon: 'account-remove-outline' as IconName,
            accent: 'danger' as const,
            baslik: 'Hesabımı Sil',
            altBaslik: 'Uygulama hesabınızı kalıcı olarak silin (GİB hesabınız etkilenmez)',
            onPress: () => navigation.navigate('HesapSil'),
          },
        ]
      : []),
  ];

  const kilitAciklamasi = !cihazKilidiVar
    ? 'Cihazınızda ekran kilidi (PIN/desen/parmak izi) tanımlı değil; kilit kullanılamıyor.'
    : kilitAcik
      ? 'Açılışta ve uzun süre arka planda kaldıktan sonra cihaz kilidiyle doğrulama istenir.'
      : 'Kapalı: uygulama doğrulama istemeden açılır.';

  const menuyuCiz = (ogeler: MenuOgesi[]) =>
    ogeler.map((oge) => (
      <MenuCard
        key={oge.baslik}
        icon={oge.icon}
        title={oge.baslik}
        description={oge.altBaslik}
        onPress={oge.onPress}
        accent={oge.accent}
      />
    ));

  return (
    <AppScreen>
      {/* Şirket unvanları çok uzun olabilir (ör. "...LİMİTED ŞİRKETİ");
          büyük başlık en fazla iki satır gösterip kısaltır. */}
      <AppHeader
        large
        eyebrow="Hoş geldiniz"
        title={unvan}
        right={
          <AppIconButton
            icon="logout"
            variant="filled"
            onPress={() => setCikisAcik(true)}
            loading={cikisYapiliyor}
            accessibilityLabel="Oturum ve çıkış"
          />
        }
      />

      <ScrollView contentContainerStyle={styles.icerik}>
        <View style={styles.bolum}>
          <SectionHeader variant="overline" title="Belge İşlemleri" />
          {menuyuCiz(belgeIslemleri)}
        </View>

        <View style={styles.bolum}>
          <SectionHeader variant="overline" title="Faturaları Cihazımda Yedekleme" />
          {menuyuCiz(yedeklemeIslemleri)}
        </View>

        <View style={styles.bolum}>
          <SectionHeader variant="overline" title="Kullanıcı İşlemleri" />
          {menuyuCiz(kullaniciIslemleri)}
          <MenuCard
            icon="lock-outline"
            title="Uygulama Kilidi"
            description={kilitAciklamasi}
            accent={cihazKilidiVar ? 'primary' : 'warning'}
            rightElement={
              <Switch
                value={kilitAcik && cihazKilidiVar}
                onValueChange={handleKilitDegistir}
                disabled={!cihazKilidiVar}
                color={colors.primary}
                accessibilityLabel="Uygulama kilidi"
              />
            }
          />
        </View>
      </ScrollView>

      {/* İKİ AYRI ÇIKIŞ — davranışlar yukarıdaki açıklamadaki gibi. */}
      <AppDialog
        visible={cikisAcik}
        onDismiss={() => setCikisAcik(false)}
        title="Çıkış"
        icon="logout"
        stackedActions
        actions={
          <>
            <SecondaryButton icon="logout-variant" onPress={gibOturumunuKapat} fullWidth compact>
              GİB Oturumunu Kapat
            </SecondaryButton>
            <DangerSoftButton icon="account-arrow-right-outline" onPress={hesaptanCikis} fullWidth compact>
              {hesapVar ? 'Hesaptan Çık' : 'Tamamen Çık'}
            </DangerSoftButton>
            <TextButton onPress={() => setCikisAcik(false)} fullWidth compact>
              İptal
            </TextButton>
          </>
        }
      >
        <DialogText>
          Hangi oturumu kapatmak istiyorsunuz? Kayıtlı alıcı ve mal/hizmet defterleriniz iki durumda da telefonunuzda
          kalır.
        </DialogText>
        <DialogText>
          GİB oturumunu kapatınca uygulama hesabınız açık kalır; başka bir GİB kullanıcı koduyla giriş yapabilirsiniz.
        </DialogText>
      </AppDialog>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  icerik: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl, gap: spacing.section },
  bolum: { gap: spacing.card },
});
