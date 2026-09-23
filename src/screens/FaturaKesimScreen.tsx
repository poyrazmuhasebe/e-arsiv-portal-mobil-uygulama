import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import { Alert, AppHeader, AppScreen, InfoBox, PrimaryButton } from '../components/ui';
import { faturaGetir, faturaGuncelle, faturaKaydet, gibHatasiniIsle } from '../services/gibApi';
import { DuzenlemeHatasi, gibFaturasiniFormaCevir, type EkAliciBilgisi } from '../utils/faturaDuzenleme';
import { useAuthStore } from '../store/useAuthStore';
import { aliciKaydet } from '../utils/aliciDefteri';
import { malHizmetKaydet } from '../utils/malHizmetDefteri';
import { faturaOzetiHesapla, kalemHesapla, kalemlerAralikHatasi, parseNumara } from '../utils/faturaHesap';
import { vknTcknGecerliMi } from '../utils/kimlikDogrula';
import { vergiUyumsuzlukHatasi } from '../utils/vergiDestegi';
import { colors, spacing } from '../theme';
import {
  VARSAYILAN_BIRIM,
  VARSAYILAN_FATURA_TIPI,
  VARSAYILAN_PARA_BIRIMI,
  VARSAYILAN_ULKE,
} from '../constants/faturaConstants';
import FaturaBilgileriKarti from './fatura/FaturaBilgileriKarti';
import AliciBilgileriKarti from './fatura/AliciBilgileriKarti';
import IrsaliyeBilgileriKarti from './fatura/IrsaliyeBilgileriKarti';
import MalHizmetKarti from './fatura/MalHizmetKarti';
import ToplamlarKarti from './fatura/ToplamlarKarti';
import type { AliciFormu, FaturaFormState, KalemFormu } from '../types/faturaForm';
import type { FaturaTaslagi } from '../types/gib';

type Props = NativeStackScreenProps<RootStackParamList, 'FaturaKesim'>;

function bosKalem(): KalemFormu {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    malHizmet: '',
    miktar: '1',
    birim: VARSAYILAN_BIRIM,
    birimFiyat: '',
    iskontoOrani: '0',
    kdvOrani: 20,
  };
}

function bosAlici(): AliciFormu {
  return { vknTckn: '', unvan: '', ad: '', soyad: '', vergiDairesi: '', ulke: VARSAYILAN_ULKE, adres: '' };
}

function ggAaYyyy(d: Date): string {
  const gg = String(d.getDate()).padStart(2, '0');
  const aa = String(d.getMonth() + 1).padStart(2, '0');
  return `${gg}/${aa}/${d.getFullYear()}`;
}

function saatFormatla(d: Date): string {
  const ss = String(d.getHours()).padStart(2, '0');
  const dd = String(d.getMinutes()).padStart(2, '0');
  const sn = String(d.getSeconds()).padStart(2, '0');
  return `${ss}:${dd}:${sn}`;
}

export default function FaturaKesimScreen({ navigation, route }: Props) {
  const token = useAuthStore((s) => s.token);
  // Taslaklar → "Düzenle": mevcut taslak GİB'den yüklenir, "Kaydet" onu yerinde günceller.
  const duzenle = route.params?.duzenle;
  const [duzenlemeYukleniyor, setDuzenlemeYukleniyor] = useState(!!duzenle);
  // Formda alanı olmayan alıcı bilgileri (il, ilçe, telefon, e-posta) güncellemede korunur.
  const [ekAlici, setEkAlici] = useState<EkAliciBilgisi>({});

  const [form, setForm] = useState<FaturaFormState>(() => ({
    faturaTarihi: new Date(),
    faturaSaati: new Date(),
    paraBirimi: VARSAYILAN_PARA_BIRIMI,
    dovizKuru: '0',
    faturaTipi: VARSAYILAN_FATURA_TIPI,
    alici: bosAlici(),
    irsaliyeNo: '',
    irsaliyeTarihi: null,
    kalemler: [bosKalem()],
    not: '',
  }));

  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    if (!duzenle || !token) return;
    let iptal = false;
    (async () => {
      try {
        const veri = await faturaGetir(token, duzenle.ettn);
        const { form: yuklenen, ekAlici: ek } = gibFaturasiniFormaCevir(veri);
        if (iptal) return;
        setForm(yuklenen);
        setEkAlici(ek);
        setDuzenlemeYukleniyor(false);
      } catch (err) {
        if (iptal) return;
        const baslik = err instanceof DuzenlemeHatasi ? 'Düzenlenemiyor' : 'Taslak Yüklenemedi';
        const mesaj = err instanceof DuzenlemeHatasi ? err.message : (await gibHatasiniIsle(err)).mesaj;
        Alert.alert(baslik, mesaj, [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
      }
    })();
    return () => {
      iptal = true;
    };
    // Yalnızca ekran açılırken bir kez yüklenir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aliciGuncelle = (patch: Partial<AliciFormu>) => {
    setForm((prev) => ({ ...prev, alici: { ...prev.alici, ...patch } }));
  };

  const kalemGuncelle = (id: string, patch: Partial<KalemFormu>) => {
    setForm((prev) => ({
      ...prev,
      kalemler: prev.kalemler.map((k) => (k.id === id ? { ...k, ...patch } : k)),
    }));
  };

  const kalemEkle = () => {
    setForm((prev) => ({ ...prev, kalemler: [...prev.kalemler, bosKalem()] }));
  };

  const kalemSil = (id: string) => {
    setForm((prev) => ({
      ...prev,
      kalemler: prev.kalemler.length > 1 ? prev.kalemler.filter((k) => k.id !== id) : prev.kalemler,
    }));
  };

  const ozet = faturaOzetiHesapla(form.kalemler);

  const aliciGecerli =
    vknTcknGecerliMi(form.alici.vknTckn) &&
    (form.alici.unvan.trim().length > 0 ||
      (form.alici.ad.trim().length > 0 && form.alici.soyad.trim().length > 0)) &&
    form.alici.adres.trim().length > 0;

  const kalemlerGecerli =
    form.kalemler.length > 0 &&
    form.kalemler.every((k) => {
      const miktar = parseNumara(k.miktar);
      const birimFiyat = parseNumara(k.birimFiyat);
      return k.malHizmet.trim().length > 0 && miktar > 0 && birimFiyat > 0;
    });

  const kalemAralikHatasi = kalemlerAralikHatasi(form.kalemler);

  // Desteklenmeyen vergi türü, tevkifat kodu seçilmemiş ya da fatura tipiyle
  // uyumsuz KDV tevkifatı: GİB'e ekranda görünenden farklı fatura gitmesin diye.
  const vergiHatasi = vergiUyumsuzlukHatasi(form.kalemler, form.faturaTipi);

  const formHatasi = kalemAralikHatasi ?? vergiHatasi;

  const formGecerli = aliciGecerli && kalemlerGecerli && !formHatasi;

  const handleOlustur = async () => {
    if (!formGecerli || !token || kaydediliyor) return;

    const taslak: FaturaTaslagi = {
      alici: {
        vknTckn: form.alici.vknTckn.trim(),
        unvan: form.alici.unvan,
        ad: form.alici.ad,
        soyad: form.alici.soyad,
        vergiDairesi: form.alici.vergiDairesi || undefined,
        adres: form.alici.adres.trim(),
        ulke: form.alici.ulke,
        ...ekAlici,
      },
      satirlar: form.kalemler.map((k) => {
        const hesap = kalemHesapla(k);
        return {
          malHizmet: k.malHizmet.trim(),
          miktar: parseNumara(k.miktar),
          birim: k.birim,
          birimFiyat: parseNumara(k.birimFiyat),
          iskontoOrani: parseNumara(k.iskontoOrani),
          kdvOrani: k.kdvOrani,
          kdvTevkifatKodu: k.ekVergi?.tevkifatKodu,
          kdvTevkifatOrani: hesap.tevkifatOrani,
        };
      }),
      faturaTarihi: ggAaYyyy(form.faturaTarihi),
      saat: saatFormatla(form.faturaSaati),
      paraBirimi: form.paraBirimi,
      dovizKuru: parseNumara(form.dovizKuru),
      faturaTipi: form.faturaTipi,
      irsaliyeNo: form.irsaliyeNo || undefined,
      irsaliyeTarihi: form.irsaliyeTarihi ? ggAaYyyy(form.irsaliyeTarihi) : undefined,
      not: form.not || undefined,
    };

    setKaydediliyor(true);
    try {
      const sonuc = duzenle ? null : await faturaKaydet(token, taslak);
      if (duzenle) await faturaGuncelle(token, duzenle, taslak);
      // Fatura başarıyla kaydedildiğinde alıcıyı adres defterine yaz —
      // bir sonraki faturada "Kayıtlı Alıcılardan Seç" ile tekrar
      // kullanılabilsin.
      const aliciDeftereYazildi = await aliciKaydet(form.alici);
      // Kalemlerdeki mal/hizmet adları da "Kayıtlı Mal/Hizmet Seç" için kaydedilir.
      const malHizmetDeftereYazildi = await malHizmetKaydet(form.kalemler.map((k) => k.malHizmet));
      const kaydedilemeyenler = [
        aliciDeftereYazildi ? null : 'alıcı defterine',
        malHizmetDeftereYazildi ? null : 'mal/hizmet defterine',
      ].filter(Boolean);
      const defterNotu = kaydedilemeyenler.length
        ? `\n\n(Cihazdaki ${kaydedilemeyenler.join(' ve ')} kaydedilemedi.)`
        : '';
      if (duzenle) {
        Alert.alert('Taslak Güncellendi', `Belge No: ${duzenle.belgeNumarasi}${defterNotu}`, [
          { text: 'Tamam', onPress: () => navigation.navigate('Taslaklar', { yenile: Date.now() }) },
        ]);
      } else {
        Alert.alert('Taslak Kaydedildi', `Belge No: ${sonuc?.ettn}${defterNotu}`, [
          { text: 'Tamam', onPress: () => navigation.navigate('Taslaklar') },
        ]);
      }
    } catch (err) {
      const { mesaj, oturumKapandi } = await gibHatasiniIsle(err);
      Alert.alert(oturumKapandi ? 'Oturum Sonlandı' : 'Kaydetme Başarısız', mesaj);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader title={duzenle ? 'Taslağı Düzenle' : 'Yeni Fatura Kes'} onBack={() => navigation.goBack()} />

      {duzenlemeYukleniyor ? (
        <View style={styles.yukleniyor}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView persistentScrollbar indicatorStyle="white"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <FaturaBilgileriKarti
            faturaTarihi={form.faturaTarihi}
            faturaSaati={form.faturaSaati}
            paraBirimi={form.paraBirimi}
            dovizKuru={form.dovizKuru}
            faturaTipi={form.faturaTipi}
            onFaturaTarihiChange={(v) => setForm((p) => ({ ...p, faturaTarihi: v }))}
            onFaturaSaatiChange={(v) => setForm((p) => ({ ...p, faturaSaati: v }))}
            onParaBirimiChange={(v) => setForm((p) => ({ ...p, paraBirimi: v }))}
            onDovizKuruChange={(v) => setForm((p) => ({ ...p, dovizKuru: v }))}
            onFaturaTipiChange={(v) => setForm((p) => ({ ...p, faturaTipi: v }))}
          />

          <AliciBilgileriKarti token={token} alici={form.alici} onAliciChange={aliciGuncelle} />

          <IrsaliyeBilgileriKarti
            irsaliyeNo={form.irsaliyeNo}
            irsaliyeTarihi={form.irsaliyeTarihi}
            onIrsaliyeNoChange={(v) => setForm((p) => ({ ...p, irsaliyeNo: v }))}
            onIrsaliyeTarihiChange={(v) => setForm((p) => ({ ...p, irsaliyeTarihi: v }))}
          />

          <MalHizmetKarti
            kalemler={form.kalemler}
            faturaTipi={form.faturaTipi}
            paraBirimi={form.paraBirimi}
            onKalemGuncelle={kalemGuncelle}
            onKalemEkle={kalemEkle}
            onKalemSil={kalemSil}
          />

          {/* Toplamlar + Not (iki ayrı bölüm kartı). */}
          <ToplamlarKarti ozet={ozet} paraBirimi={form.paraBirimi} not={form.not} onNotChange={(v) => setForm((p) => ({ ...p, not: v }))} />

          {formHatasi && <InfoBox tone="danger">{formHatasi}</InfoBox>}

          <PrimaryButton
            icon="file-document-check-outline"
            onPress={handleOlustur}
            disabled={!formGecerli || kaydediliyor}
            loading={kaydediliyor}
            fullWidth
          >
            {duzenle ? 'Kaydet' : 'Oluştur'}
          </PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  yukleniyor: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    gap: spacing.card,
  },
});
