import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';

import SecimAlani from '../../components/SecimAlani';
import {
  AppDialog,
  AppInput,
  DialogText,
  FormRow,
  Icon,
  SecondaryButton,
  SectionCard,
  TextButton,
} from '../../components/ui';
import { ULKELER } from '../../constants/faturaConstants';
import { mukellefBilgisiGetir } from '../../services/gibApi';
import { TOUCH_MIN, colors, radius, spacing, typography } from '../../theme';
import { aliciListesiGetir } from '../../utils/aliciDefteri';
import { vknTcknGecerliMi, vknTcknHatasi } from '../../utils/kimlikDogrula';
import type { AliciFormu, KayitliAlici } from '../../types/faturaForm';

interface Props {
  token: string | null;
  alici: AliciFormu;
  onAliciChange: (patch: Partial<AliciFormu>) => void;
  /** "Kayıtlı Alıcılardan Seç" düğmesi gösterilsin mi (varsayılan: evet). */
  kayitliSecimGoster?: boolean;
}

/**
 * VKN (10 hane) => Unvan dolar, Ad/Soyad boş.
 * TCKN (11 hane) => Ad/Soyad dolar, Unvan boş.
 * Unvan/Ad/Soyad/Vergi Dairesi HER ZAMAN salt okunur — yalnızca
 * mukellefBilgisiGetir() sonucuyla doldurulur, kullanıcı elle giremez.
 */
export default function AliciBilgileriKarti({ token, alici, onAliciChange, kayitliSecimGoster = true }: Props) {
  const [sorgulaniyor, setSorgulaniyor] = useState(false);
  const [sorguHatali, setSorguHatali] = useState(false);

  const [kayitliListe, setKayitliListe] = useState<KayitliAlici[]>([]);
  const [kayitliModalAcik, setKayitliModalAcik] = useState(false);

  useEffect(() => {
    // VKN/TCKN her değiştiğinde önceki sorgudan kalan unvan/ad/vergi dairesi
    // HEMEN temizlenir: aksi halde yeni numaranın sorgusu dönene kadar (debounce
    // + ağ) eski alıcının unvanı yeni numaranın yanında görünür ve form o arada
    // geçerli sayılabilirdi. Bu alanlar yalnızca bu numaranın GİB sorgusuyla dolar.
    onAliciChange({ unvan: '', ad: '', soyad: '', vergiDairesi: '' });
    setSorguHatali(false);

    const temiz = alici.vknTckn.trim();
    // Eksik ya da kontrol basamağı hatalı numara için GİB'e boşuna sorgu atma.
    if (!token || !vknTcknGecerliMi(temiz)) {
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
    <SectionCard title="Alıcı Bilgileri" icon="account-outline">
      {kayitliSecimGoster && (
        <SecondaryButton icon="account-search-outline" onPress={kayitliAcAction} fullWidth>
          Kayıtlı Alıcılardan Seç
        </SecondaryButton>
      )}

      <View>
        <AppInput
          label="VKN / TCKN *"
          value={alici.vknTckn}
          onChangeText={(v) => onAliciChange({ vknTckn: v })}
          keyboardType="number-pad"
          maxLength={11}
          error={!!kimlikHatasi || sorguHatali}
          right={sorgulaniyor ? <TextInput.Icon icon="loading" /> : undefined}
        />

        {kimlikHatasi && <Text style={styles.hataMetni}>{kimlikHatasi}</Text>}

        {sorguHatali && <Text style={styles.hataMetni}>GİB sisteminden çekilemedi. Lütfen tekrar deneyin.</Text>}
      </View>

      {/* Unvan/Ad/Soyad/Vergi Dairesi salt okunur: yalnızca GİB sorgusuyla dolar. */}
      <AppInput label="Unvan" value={alici.unvan} editable={false} />
      <FormRow>
        <AppInput label="Adı" value={alici.ad} editable={false} />
        <AppInput label="Soyadı" value={alici.soyad} editable={false} />
      </FormRow>
      <AppInput label="Vergi Dairesi" value={alici.vergiDairesi} editable={false} />

      <SecimAlani
        label="Ülke"
        value={alici.ulke}
        secenekler={ULKELER}
        onSelect={(v) => onAliciChange({ ulke: v })}
        zorunlu
      />

      <AppInput
        label="Adres"
        value={alici.adres}
        onChangeText={(v) => onAliciChange({ adres: v })}
        multiline
        numberOfLines={2}
      />

      <AppDialog
        visible={kayitliModalAcik}
        onDismiss={() => setKayitliModalAcik(false)}
        title="Kayıtlı Alıcılar"
        icon="account-search-outline"
        actions={
          <TextButton onPress={() => setKayitliModalAcik(false)} compact>
            Kapat
          </TextButton>
        }
      >
        {kayitliListe.length === 0 ? (
          <DialogText>Henüz kayıtlı alıcı yok. Bir fatura oluşturduğunuzda alıcı otomatik kaydedilir.</DialogText>
        ) : (
          <View style={styles.liste}>
            {kayitliListe.map((kayit) => {
              const ad = kayit.unvan || `${kayit.ad} ${kayit.soyad}`.trim();
              return (
                <Pressable
                  key={kayit.vknTckn}
                  onPress={() => kayitliSec(kayit)}
                  accessibilityRole="button"
                  accessibilityLabel={`${ad}, ${kayit.vknTckn}`}
                  android_ripple={{ color: colors.primarySoft }}
                  style={({ pressed }) => [styles.listeOgesi, pressed && styles.basili]}
                >
                  <Icon name="account-outline" size={22} color={colors.primary} />
                  <View style={styles.listeMetinleri}>
                    <Text style={typography.body} numberOfLines={2}>
                      {ad}
                    </Text>
                    <Text style={typography.caption}>{kayit.vknTckn}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </AppDialog>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  hataMetni: { ...typography.caption, color: colors.danger, paddingHorizontal: spacing.xxs, paddingTop: spacing.xxs },
  liste: { gap: 2, marginHorizontal: -spacing.xs },
  listeOgesi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_MIN + spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.small,
    overflow: 'hidden',
  },
  basili: { backgroundColor: colors.primarySoft },
  listeMetinleri: { flex: 1, minWidth: 0 },
});
