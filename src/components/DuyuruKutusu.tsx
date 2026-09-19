import React, { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { Card, IconButton, Text, useTheme } from 'react-native-paper';

import { GIB_DUYURULARI, type Duyuru } from '../constants/duyurular';
import { duyuruyuKapat, gosterilecekDuyuru, kapatilanDuyurulariGetir } from '../utils/duyuru';

/**
 * Giriş ekranının üstünde, süresi dolmamış ve kullanıcının kapatmadığı ilk GİB
 * duyurusunu (ör. planlı bakım) gösterir. Kapatılan duyuru bir daha gösterilmez;
 * süresi dolan duyuru kendiliğinden gizlenir. Gösterilecek duyuru yoksa hiçbir
 * şey çizmez.
 */
export default function DuyuruKutusu() {
  const theme = useTheme();
  const [duyuru, setDuyuru] = useState<Duyuru | null>(null);

  useEffect(() => {
    (async () => {
      const kapatilanlar = await kapatilanDuyurulariGetir();
      setDuyuru(gosterilecekDuyuru(GIB_DUYURULARI, new Date(), kapatilanlar));
    })();
  }, []);

  if (!duyuru) return null;

  const kapat = () => {
    setDuyuru(null);
    duyuruyuKapat(
      duyuru.id,
      GIB_DUYURULARI.map((d) => d.id),
    );
  };

  const baglantiyiAc = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Açılamadı', `Bağlantı açılamadı:\n${url}`));
  };

  const renk = theme.colors.onErrorContainer;

  return (
    <Card mode="contained" style={[styles.kart, { backgroundColor: theme.colors.errorContainer }]}>
      <Card.Content style={styles.icerik}>
        <View style={styles.ustSatir}>
          <Text variant="titleSmall" style={[styles.baslik, { color: renk }]}>
            {duyuru.baslik}
          </Text>
          <IconButton
            icon="close"
            size={20}
            iconColor={renk}
            onPress={kapat}
            accessibilityLabel="Duyuruyu kapat"
            style={styles.kapat}
          />
        </View>
        <Text variant="labelMedium" style={{ color: renk }}>
          {duyuru.tarih}
        </Text>
        {duyuru.paragraflar.map((p, i) => (
          <Text key={i} variant="bodySmall" style={[{ color: renk }, p.startsWith('- ') && styles.madde]}>
            {p.startsWith('- ') ? `• ${p.slice(2)}` : p}
          </Text>
        ))}
        {duyuru.baglanti ? (
          <Text
            variant="bodySmall"
            style={[styles.baglanti, { color: renk }]}
            onPress={() => baglantiyiAc(duyuru.baglanti!)}
            accessibilityRole="link"
          >
            {duyuru.baglanti}
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  kart: { marginBottom: 24, borderRadius: 12 },
  icerik: { gap: 6 },
  ustSatir: { flexDirection: 'row', alignItems: 'flex-start' },
  baslik: { flex: 1, fontWeight: '700', paddingTop: 8 },
  kapat: { margin: 0, marginRight: -8 },
  madde: { paddingLeft: 8 },
  baglanti: { textDecorationLine: 'underline' },
});
