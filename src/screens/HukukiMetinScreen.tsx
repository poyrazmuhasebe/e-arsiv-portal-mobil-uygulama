import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { HUKUKI_METINLER } from '../constants/hukukiMetinler';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'HukukiMetin'>;

/**
 * Aydınlatma metni, gizlilik politikası ve hizmet şartlarını uygulama içinde
 * gösterir. Herkese açık URL'ler yayına hazır olunca bunlar o adreslere
 * bağlanacak (Issue #36); o zamana kadar metin burada duruyor — Google Play
 * gizlilik politikasının uygulama içinde de bulunmasını istiyor.
 */
export default function HukukiMetinScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const metin = HUKUKI_METINLER[route.params.metin];

  return (
    <SafeAreaView style={styles.kapsayici} edges={['top', 'left', 'right']}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={metin.baslik} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.icerik}>
        {metin.bolumler.map((bolum) => (
          <View key={bolum.baslik} style={styles.bolum}>
            <Text variant="titleMedium" style={styles.bolumBasligi}>
              {bolum.baslik}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {bolum.govde}
            </Text>
          </View>
        ))}
        <Text variant="bodySmall" style={styles.dipnot}>
          Bu metinlerin tam sürümleri projenin dokümantasyonunda (docs/hukuk/)
          bulunur ve hukuki inceleme beklemektedir.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  kapsayici: { flex: 1 },
  icerik: { padding: 20, paddingBottom: 48, gap: 20 },
  bolum: { gap: 6 },
  bolumBasligi: { fontWeight: '700' },
  dipnot: { opacity: 0.6, marginTop: 8 },
});
