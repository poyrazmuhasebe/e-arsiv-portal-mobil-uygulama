import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Dialog, List, Portal, Text, TextInput } from 'react-native-paper';

import SecimAlani from '../../components/SecimAlani';
import { ULKELER } from '../../constants/faturaConstants';
import { mukellefBilgisiGetir } from '../../services/gibApi';
import { aliciListesiGetir } from '../../utils/aliciDefteri';
import { vknTcknGecerliMi, vknTcknHatasi } from '../../utils/kimlikDogrula';
import type { AliciFormu, KayitliAlici } from '../../types/faturaForm';

interface Props {
  token: string | null;
  alici: AliciFormu;
  onAliciChange: (patch: Partial<AliciFormu>) => void;
}

/**
 * VKN (10 hane) => Unvan dolar, Ad/Soyad boş.
 * TCKN (11 hane) => Ad/Soyad dolar, Unvan boş.
 * Unvan/Ad/Soyad/Vergi Dairesi HER ZAMAN salt okunur — yalnızca
 * mukellefBilgisiGetir() sonucuyla doldurulur, kullanıcı elle giremez.
 */
export default function AliciBilgileriKarti({ token, alici, onAliciChange }: Props) {
  const [sorgulaniyor, setSorgulaniyor] = useState(false);
  const [sorguHatali, setSorguHatali] = useState(false);

  const [kayitliListe, setKayitliListe] = useState<KayitliAlici[]>([]);
  const [kayitliModalAcik, setKayitliModalAcik] = useState(false);

  useEffect(() => {
    const temiz = alici.vknTckn.trim();
    if (!token || (temiz.length !== 10 && temiz.length !== 11) || !/^\d+$/.test(temiz)) {
      return;
    }
    // Kontrol basamağı hatalı numara için GİB'e boşuna sorgu atma; önceki
    // (geçerli) bir sorgudan kalan unvan/ad bilgisini de temizle ki yanlış
    // numaranın yanında eski alıcının bilgisi görünmesin.
    if (!vknTcknGecerliMi(temiz)) {
      onAliciChange({ unvan: '', ad: '', soyad: '', vergiDairesi: '' });
      setSorguHatali(false);
      return;
    }

    let iptal = false;
    const zamanlayici = setTimeout(async () => {
      setSorgulaniyor(true);
      setSorguHatali(false);
      try {
        const bilgi = await mukellefBilgisiGetir(token, temiz);
        if (iptal) return;
        if (bilgi) {
          if (temiz.length === 10) {
            // VKN — Şirket
            onAliciChange({ unvan: bilgi.unvan, ad: '', soyad: '', vergiDairesi: bilgi.vergiDairesi ?? '' });
          } else {
            // TCKN — Şahıs
            onAliciChange({
              unvan: '',
              ad: bilgi.ad ?? '',
              soyad: bilgi.soyad ?? '',
              vergiDairesi: bilgi.vergiDairesi ?? '',
            });
          }
        } else {
          setSorguHatali(true);
          onAliciChange({ unvan: '', ad: '', soyad: '', vergiDairesi: '' });
        }
      } catch {
        if (!iptal) {
          setSorguHatali(true);
          onAliciChange({ unvan: '', ad: '', soyad: '', vergiDairesi: '' });
        }
      } finally {
        if (!iptal) setSorgulaniyor(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 400);

    return () => {
      iptal = true;
      clearTimeout(zamanlayici);
    };
    // onAliciChange her render'da yeni referans olabileceğinden bağımlılık
    // dizisine alınmadı — yalnızca vknTckn/token değişince tetiklenmeli.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alici.vknTckn, token]);

  const kimlikHatasi = vknTcknHatasi(alici.vknTckn);

  const kayitliAcAction = async () => {
    const liste = await aliciListesiGetir();
    setKayitliListe(liste);
    setKayitliModalAcik(true);
  };

  const kayitliSec = (kayit: KayitliAlici) => {
    onAliciChange({
      vknTckn: kayit.vknTckn,
      unvan: kayit.unvan,
      ad: kayit.ad,
      soyad: kayit.soyad,
      vergiDairesi: kayit.vergiDairesi,
      ulke: kayit.ulke,
      adres: kayit.adres,
    });
    setKayitliModalAcik(false);
  };

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title title="Alıcı Bilgileri" />
      <Card.Content style={styles.icerik}>
        <Button mode="outlined" icon="account-search-outline" onPress={kayitliAcAction}>
          Kayıtlı Alıcılardan Seç
        </Button>

        <TextInput
          mode="outlined"
          label="VKN / TCKN *"
          value={alici.vknTckn}
          onChangeText={(v) => onAliciChange({ vknTckn: v })}
          keyboardType="number-pad"
          maxLength={11}
          right={sorgulaniyor ? <TextInput.Icon icon="loading" /> : undefined}
        />

        {kimlikHatasi && (
          <Text variant="bodySmall" style={styles.hataMetni}>
            {kimlikHatasi}
          </Text>
        )}

        {sorguHatali && (
          <Text variant="bodySmall" style={styles.hataMetni}>
            GİB sisteminden çekilemedi. Lütfen tekrar deneyin.
          </Text>
        )}

        <TextInput mode="outlined" label="Unvan" value={alici.unvan} editable={false} />
        <TextInput mode="outlined" label="Adı" value={alici.ad} editable={false} />
        <TextInput mode="outlined" label="Soyadı" value={alici.soyad} editable={false} />
        <TextInput mode="outlined" label="Vergi Dairesi" value={alici.vergiDairesi} editable={false} />

        <SecimAlani
          label="Ülke"
          value={alici.ulke}
          secenekler={ULKELER}
          onSelect={(v) => onAliciChange({ ulke: v })}
          zorunlu
        />

        <TextInput
          mode="outlined"
          label="Adres"
          value={alici.adres}
          onChangeText={(v) => onAliciChange({ adres: v })}
          multiline
          numberOfLines={2}
        />
      </Card.Content>

      <Portal>
        <Dialog visible={kayitliModalAcik} onDismiss={() => setKayitliModalAcik(false)} style={styles.dialog}>
          <Dialog.Title>Kayıtlı Alıcılar</Dialog.Title>
          <Dialog.ScrollArea>
            {kayitliListe.length === 0 ? (
              <View style={styles.bosListe}>
                <Text variant="bodyMedium" style={styles.hataMetni}>
                  Henüz kayıtlı alıcı yok. Bir fatura oluşturduğunuzda alıcı otomatik kaydedilir.
                </Text>
              </View>
            ) : (
              <List.Section>
                {kayitliListe.map((kayit) => (
                  <List.Item
                    key={kayit.vknTckn}
                    title={kayit.unvan || `${kayit.ad} ${kayit.soyad}`.trim()}
                    description={kayit.vknTckn}
                    onPress={() => kayitliSec(kayit)}
                  />
                ))}
              </List.Section>
            )}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setKayitliModalAcik(false)}>Kapat</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16 },
  icerik: { gap: 12 },
  hataMetni: { opacity: 0.8, color: '#f2b8b5' },
  dialog: { maxHeight: '80%' },
  bosListe: { padding: 16 },
});
