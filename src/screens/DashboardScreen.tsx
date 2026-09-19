import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Appbar, Card, Switch, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuthStore } from '../store/useAuthStore';
import { useHesapStore } from '../store/useHesapStore';
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
  icon: string;
  baslik: string;
  altBaslik: string;
  onPress: () => void;
}

export default function DashboardScreen({ navigation }: Props) {
  const theme = useTheme();
  const kullaniciBilgisi = useAuthStore((s) => s.kullaniciBilgisi);
  const kullaniciKodu = useAuthStore((s) => s.kullaniciKodu);
  const logout = useAuthStore((s) => s.logout);
  const isLoggingOut = useAuthStore((s) => s.isLoggingOut);
  const hesaptanCik = useHesapStore((s) => s.hesaptanCik);

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
   * Hiçbiri cihazdaki `gib_hatirlanan_kullanici_kodu`'nu ya da alıcı /
   * mal-hizmet defterlerini SİLMEZ: defterlerin hiçbir yedeği yok (D1'e
   * gitmiyorlar), yanlışlıkla çıkan kullanıcı veri kaybetmesin.
   */
  const handleCikis = () => {
    Alert.alert(
      'Çıkış',
      'Hangi oturumu kapatmak istiyorsunuz? Kayıtlı alıcı ve mal/hizmet defterleriniz iki durumda da telefonunuzda kalır.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'GİB oturumunu kapat',
          onPress: async () => {
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
          },
        },
        {
          text: 'Hesaptan çık',
          style: 'destructive',
          onPress: async () => {
            setLocalBusy(true);
            try {
              await logout();
              await hesaptanCik();
            } finally {
              setLocalBusy(false);
            }
          },
        },
      ],
    );
  };

  const cikisYapiliyor = isLoggingOut || localBusy;

  // GİB'in kendi "Belge İşlemleri" ana menüsündeki 4 alt sekmeyle birebir
  // eşleşiyor (bkz. gerçek menü ağacı yakalaması): e-Arşiv Fatura Oluştur,
  // Taslak Faturalar, İptal/İtiraz Talepleri, Adıma Düzenlenen Belgeler.
  // Sonuncusu henüz uygulanmadı — cmd'i canlı bir yakalamayla doğrulanana
  // kadar yer tutucu bir uyarı gösteriyor.
  const belgeIslemleri: MenuOgesi[] = [
    {
      icon: '🧾',
      baslik: 'e-Arşiv Fatura (İnteraktif) Oluştur',
      altBaslik: 'Alıcı bilgilerini girip e-Arşiv faturası oluşturun',
      onPress: () => navigation.navigate('FaturaKesim'),
    },
    {
      icon: '📄',
      baslik: 'Taslak / Kesilen Faturalar',
      altBaslik: 'Daha önce oluşturduğunuz faturaları görüntüleyin',
      onPress: () => navigation.navigate('Taslaklar'),
    },
    {
      icon: '↩️',
      baslik: 'İptal / İtiraz Talepleri',
      altBaslik: 'Gelen iptal/itiraz taleplerini kabul edin veya reddedin',
      onPress: () => navigation.navigate('IptalItirazTalepleri'),
    },
    {
      icon: '📥',
      baslik: 'Adıma Düzenlenen Belgeler',
      altBaslik: 'Bu özellik henüz eklenmedi',
      onPress: () => Alert.alert('Yakında', 'Bu özellik henüz eklenmedi.'),
    },
  ];

  // GİB'in kendi ana menüsündeki ikinci bölüm: "Kullanıcı İşlemleri" (bkz.
  // gerçek menü ağacı yakalaması). "Alıcı Defteri" GİB'de yok; uygulamanın
  // cihazda tuttuğu, bu hesaba özel kayıtları yönetir.
  const kullaniciIslemleri: MenuOgesi[] = [
    {
      icon: '👤',
      baslik: 'Kullanıcı Bilgileri',
      altBaslik: 'Firma/mükellef bilgilerinizi görüntüleyin ve güncelleyin',
      onPress: () => navigation.navigate('KullaniciBilgileri'),
    },
    {
      icon: '📇',
      baslik: 'Alıcı Defteri',
      altBaslik: 'Bu hesaba kayıtlı alıcıları düzenleyin, silin veya ekleyin',
      onPress: () => navigation.navigate('AliciDefteri'),
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <Appbar.Header elevated>
        {/* Appbar.Content'in "subtitle" prop'u MD3 temasında (Paper v5
            varsayılanı) render edilmiyor, bu yüzden tek satır title kullanıyoruz.
            Şirket unvanları çok uzun olabildiğinden (ör. "...LİMİTED ŞİRKETİ")
            title'ı numberOfLines/ellipsizeMode kontrollü kendi Text'imizle
            veriyoruz — Appbar.Content'in "title" string'i bunu garanti etmez. */}
        <Appbar.Content
          title={
            <Text variant="titleLarge" numberOfLines={1} ellipsizeMode="tail">
              {unvan}
            </Text>
          }
        />
        {cikisYapiliyor ? (
          <View style={styles.logoutSpinner}>
            <ActivityIndicator size="small" />
          </View>
        ) : (
          <Appbar.Action icon="logout" accessibilityLabel="Çıkış" onPress={handleCikis} />
        )}
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="labelLarge" style={styles.bolumBasligi}>
          BELGE İŞLEMLERİ
        </Text>
        {belgeIslemleri.map((oge) => (
          <Card key={oge.baslik} mode="elevated" style={styles.card} onPress={oge.onPress}>
            <Card.Content style={styles.cardContent}>
              <Text variant="displaySmall">{oge.icon}</Text>
              <View style={styles.cardTextGroup}>
                <Text variant="titleMedium">{oge.baslik}</Text>
                <Text variant="bodySmall" style={styles.cardSubtitle}>
                  {oge.altBaslik}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}

        <Text variant="labelLarge" style={[styles.bolumBasligi, styles.ikinciBolumBasligi]}>
          KULLANICI İŞLEMLERİ
        </Text>
        {kullaniciIslemleri.map((oge) => (
          <Card key={oge.baslik} mode="elevated" style={styles.card} onPress={oge.onPress}>
            <Card.Content style={styles.cardContent}>
              <Text variant="displaySmall">{oge.icon}</Text>
              <View style={styles.cardTextGroup}>
                <Text variant="titleMedium">{oge.baslik}</Text>
                <Text variant="bodySmall" style={styles.cardSubtitle}>
                  {oge.altBaslik}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}

        <Card mode="elevated" style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="displaySmall">🔒</Text>
            <View style={styles.cardTextGroup}>
              <Text variant="titleMedium">Uygulama Kilidi</Text>
              <Text variant="bodySmall" style={styles.cardSubtitle}>
                {!cihazKilidiVar
                  ? 'Cihazınızda ekran kilidi (PIN/desen/parmak izi) tanımlı değil; kilit kullanılamıyor.'
                  : kilitAcik
                    ? 'Açılışta ve uzun süre arka planda kaldıktan sonra cihaz kilidiyle doğrulama istenir.'
                    : 'Kapalı: uygulama doğrulama istemeden açılır.'}
              </Text>
            </View>
            <Switch
              value={kilitAcik && cihazKilidiVar}
              onValueChange={handleKilitDegistir}
              disabled={!cihazKilidiVar}
              accessibilityLabel="Uygulama kilidi"
            />
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  logoutSpinner: { paddingHorizontal: 16 },
  content: {
    padding: 20,
    gap: 12,
  },
  bolumBasligi: { opacity: 0.6, marginBottom: 4, letterSpacing: 0.5 },
  ikinciBolumBasligi: { marginTop: 8 },
  card: { borderRadius: 16 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  cardTextGroup: { flex: 1, gap: 4 },
  cardSubtitle: { opacity: 0.6 },
});
