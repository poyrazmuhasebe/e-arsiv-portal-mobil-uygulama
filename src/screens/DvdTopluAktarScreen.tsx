import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Directory, File } from 'expo-file-system';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import type { RootStackParamList } from '../../App';
import { tarihFormatla } from '../components/TarihAraligiFiltresi';
import {
  Alert,
  AppDialog,
  AppHeader,
  AppIconButton,
  AppScreen,
  DangerSoftButton,
  DialogText,
  InfoBox,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  SegmentedChoice,
  TextButton,
} from '../components/ui';
import { DvdApiError, type DvdSorguParcasi } from '../services/dvdApi';
import { dvdPdfAktar } from '../services/dvdPdfAktar';
import {
  IOS_RAPOR_KLASOR_ADI,
  KLASOR_SECILEBILIR,
  klasorGorunenAdi,
  raporKlasoru,
  raporKlasoruSec,
  yedegiAc,
  yedegiPaylas,
} from '../services/yedekDeposu';
import { useDvdStore } from '../store/useDvdStore';
import { colors, radius, spacing, typography } from '../theme';
import { topluDonemBaslangici, type TopluSure } from '../utils/dvdRapor';
import { haftalikParcalar, noktaliTarih } from '../utils/yedekleme';

type Props = NativeStackScreenProps<RootStackParamList, 'DvdTopluAktar'>;

const KEEP_AWAKE_ETIKETI = 'dvd-toplu-pdf';

const TOPLU_SURELER: { value: TopluSure; label: string }[] = [
  { value: '1a', label: 'Son 1 ay' },
  { value: '2a', label: 'Son 2 ay' },
];

type Asama =
  | { tur: 'hazir' }
  | {
      tur: 'suruyor';
      /** Durdur'a basıldı; o anki istek bitince döngü kapanır. */
      durduruluyor: boolean;
      pdf: boolean;
      parca: DvdSorguParcasi | null;
      parcaSirasi: number;
      parcaSayisi: number;
      bulunan: number;
    }
  | { tur: 'bitti'; dosya: File; adet: number; klasorAdi: string }
  | { tur: 'hata'; mesaj: string };

function donem(sure: TopluSure): { baslangic: Date; bitis: Date } {
  const bitis = new Date();
  return { baslangic: topluDonemBaslangici(sure, bitis), bitis };
}

/**
 * e-Arşiv Faturalarım → Toplu PDF'e Aktar (son 1 / 2 ay).
 *
 * Dönem TEK SORGUDA İSTENMEZ: GİB en fazla 7 günlük ve aynı ay içindeki
 * aralığa izin verdiği için haftalık, ay sınırında bölünen parçalar sırayla
 * sorgulanır; sonuç tek PDF (uygulama içinde üretilir).
 *
 * İşlem süreci kapatılabilir bir kutuda gösterilir (fatura yedeklemedeki
 * gibi). ARKA PLANDA İŞ KALMAZ: kutu kapatılır, Durdur'a basılır ya da sayfadan
 * çıkılırsa döngü bir sonraki istekten önce durur; kutu, süren istek bitip
 * döngü gerçekten kapanana kadar "Durduruluyor…" gösterir.
 */
export default function DvdTopluAktarScreen({ navigation }: Props) {
  const token = useDvdStore((s) => s.token);
  const dvdKodu = useDvdStore((s) => s.kullaniciKodu);
  const oturumuUnut = useDvdStore((s) => s.oturumuUnut);

  const [sure, setSure] = useState<TopluSure>('1a');
  const secilenDonem = useMemo(() => donem(sure), [sure]);
  const [asama, setAsama] = useState<Asama>({ tur: 'hazir' });
  const [klasor, setKlasor] = useState<Directory | null>(null);
  const durdurIstendi = useRef(false);
  const suruyor = asama.tur === 'suruyor';

  useEffect(() => {
    raporKlasoru()
      .then(setKlasor)
      .catch(() => setKlasor(null));
    return () => {
      // Sayfadan çıkılırsa süren aktarma durur (arka planda sorgu kalmaz).
      durdurIstendi.current = true;
      deactivateKeepAwake(KEEP_AWAKE_ETIKETI).catch(() => undefined);
    };
  }, []);

  const klasorSec = async () => {
    const secilen = await raporKlasoruSec();
    if (secilen) setKlasor(secilen);
    return secilen;
  };

  const baslat = async () => {
    if (!token || suruyor) return;
    let hedef = klasor ?? (await raporKlasoru());
    if (!hedef) {
      hedef = await klasorSec();
      if (!hedef) {
        Alert.alert('Klasör seçilmedi', "PDF'in kaydedileceği klasörü seçmeden aktarma yapılamaz.");
        return;
      }
    }
    // Dönem başlatma anına göre yeniden hesaplanır (sayfa uzun süre açık kalmış olabilir).
    const { baslangic, bitis } = donem(sure);
    const parcalar = haftalikParcalar(baslangic, bitis).map((p) => ({
      baslangic: tarihFormatla(p.baslangic),
      bitis: tarihFormatla(p.bitis),
    }));
    durdurIstendi.current = false;
    setAsama({
      tur: 'suruyor',
      durduruluyor: false,
      pdf: false,
      parca: null,
      parcaSirasi: 0,
      parcaSayisi: parcalar.length,
      bulunan: 0,
    });
    await activateKeepAwakeAsync(KEEP_AWAKE_ETIKETI).catch(() => undefined);
    try {
      // Dosyalar VKN/TCKN klasörlerine ayrılır (aynı üyelikte başka kullanıcı
      // kodlarıyla da giriş yapılabilir); mükellef belirlenemezse kaydedilmez.
      const mukellef = await useDvdStore.getState().mukellefiBelirle();
      if (!mukellef) throw new Error("VKN/TCKN belirlenemedi. Dosyalar mükellefe göre ayrı klasörlere kaydedildiği için PDF kaydedilmedi; Dijital Vergi Dairesi'nden çıkıp yeniden giriş yapmayı deneyin.");
      const sonuc = await dvdPdfAktar({
        token,
        klasor: hedef,
        mukellef,
        parcalar,
        baslangic,
        bitis,
        kullaniciKodu: dvdKodu ?? undefined,
        durduruldu: () => durdurIstendi.current,
        ilerleme: (d) =>
          setAsama((a) =>
            a.tur === 'suruyor'
              ? { ...a, parca: d.parca, parcaSirasi: d.parcaSirasi, parcaSayisi: d.parcaSayisi, bulunan: d.bulunan }
              : a,
          ),
        pdfAsamasi: () => setAsama((a) => (a.tur === 'suruyor' ? { ...a, pdf: true } : a)),
      });
      // Durdurulduysa kutu kapanır; PDF oluşturulmaz.
      setAsama(
        sonuc.durduruldu
          ? { tur: 'hazir' }
          : { tur: 'bitti', dosya: sonuc.dosya, adet: sonuc.adet, klasorAdi: sonuc.klasorAdi },
      );
    } catch (err) {
      const mesaj = err instanceof Error ? err.message : "PDF'e aktarılamadı.";
      if (err instanceof DvdApiError && err.oturumHatasi) {
        oturumuUnut();
        setAsama({ tur: 'hata', mesaj: `${mesaj} Dijital Vergi Dairesi'ne yeniden giriş yapın.` });
        return;
      }
      // Kullanıcı kutuyu kapattıktan sonra gelen hata gösterilmez.
      setAsama(durdurIstendi.current ? { tur: 'hazir' } : { tur: 'hata', mesaj });
    } finally {
      deactivateKeepAwake(KEEP_AWAKE_ETIKETI).catch(() => undefined);
    }
  };

  /** Durdur / kutuyu kapat: süren aktarma durdurulur, başka iş kalmaz. */
  const kutuyuKapat = () => {
    if (asama.tur === 'suruyor') {
      if (asama.pdf) return; // PDF birkaç saniyede biter; yarıda kesilmez.
      durdurIstendi.current = true;
      setAsama({ ...asama, durduruluyor: true });
      return;
    }
    setAsama({ tur: 'hazir' });
  };

  const pdfIslemi = async (dosya: File, tur: 'ac' | 'paylas') => {
    try {
      if (tur === 'ac') await yedegiAc(dosya);
      else await yedegiPaylas(dosya);
    } catch (err) {
      Alert.alert(tur === 'ac' ? 'PDF açılamadı' : 'PDF paylaşılamadı', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  };

  const kaydedilenlereGit = () => {
    setAsama({ tur: 'hazir' });
    navigation.navigate('DvdRaporlar');
  };

  const kutuBasligi =
    asama.tur === 'suruyor'
      ? asama.durduruluyor
        ? 'Durduruluyor'
        : "PDF'e aktarılıyor"
      : asama.tur === 'bitti'
        ? 'PDF kaydedildi'
        : "PDF'e aktarılamadı";

  return (
    <AppScreen>
      <AppHeader
        title="Toplu PDF'e Aktar"
        subtitle="e-Arşiv Faturalarım"
        onBack={() => navigation.goBack()}
        backDisabled={suruyor}
        right={
          <AppIconButton
            icon="folder-file-outline"
            accessibilityLabel="Kaydedilen PDF'ler"
            onPress={() => navigation.navigate('DvdRaporlar')}
            disabled={suruyor}
          />
        }
      />
      <ScrollView persistentScrollbar indicatorStyle="white" contentContainerStyle={styles.icerik}>
        {!token ? (
          <InfoBox tone="warning" icon="account-lock-outline" title="Dijital Vergi Dairesi oturumu kapalı">
            Aktarmak için e-Arşiv Faturalarım ekranından güvenlik koduyla yeniden giriş yapın. Kaydedilen PDF'lere
            oturum olmadan da bakabilirsiniz.
          </InfoBox>
        ) : null}

        <SectionCard title="Dönem" icon="calendar-range">
          <SegmentedChoice
            options={TOPLU_SURELER}
            value={sure}
            onChange={(v) => setSure(v as TopluSure)}
            accessibilityLabel="Dönem"
            disabled={suruyor}
          />
          <Text style={typography.body}>
            {noktaliTarih(secilenDonem.baslangic)} – {noktaliTarih(secilenDonem.bitis)}
          </Text>
        </SectionCard>

        <SectionCard title="Kayıt klasörü" icon="folder-outline" iconColor={colors.warning}>
          <Text style={typography.body} numberOfLines={2}>
            {klasor ? klasorGorunenAdi(klasor, IOS_RAPOR_KLASOR_ADI) : 'Henüz klasör seçilmedi.'}
          </Text>
          {KLASOR_SECILEBILIR ? (
            <SecondaryButton icon="folder-edit-outline" onPress={klasorSec} disabled={suruyor} compact>
              {klasor ? 'Klasörü Değiştir' : 'Klasör Seç'}
            </SecondaryButton>
          ) : null}
        </SectionCard>

        <PrimaryButton icon="file-pdf-box" onPress={baslat} disabled={!token || suruyor} fullWidth>
          PDF'e Aktar
        </PrimaryButton>

        <InfoBox tone="primary" icon="lock-outline">
          PDF telefonunuzda, uygulama içinde oluşturulur; GİB'in PDF servisi kullanılmaz ve veriler uygulama
          sunucusuna gönderilmez.
        </InfoBox>
      </ScrollView>

      <AppDialog
        visible={asama.tur !== 'hazir'}
        onDismiss={kutuyuKapat}
        title={kutuBasligi}
        icon={
          asama.tur === 'bitti'
            ? 'check-circle-outline'
            : asama.tur === 'hata'
              ? 'alert-circle-outline'
              : 'file-pdf-box'
        }
        tone={asama.tur === 'bitti' ? 'success' : asama.tur === 'hata' ? 'danger' : 'default'}
        stackedActions={asama.tur === 'bitti'}
        actions={
          asama.tur === 'suruyor' ? (
            <DangerSoftButton
              icon="stop"
              onPress={kutuyuKapat}
              disabled={asama.durduruluyor || asama.pdf}
              loading={asama.durduruluyor}
              compact
            >
              Durdur ve Kapat
            </DangerSoftButton>
          ) : asama.tur === 'bitti' ? (
            <>
              <PrimaryButton icon="file-eye-outline" onPress={() => pdfIslemi(asama.dosya, 'ac')} fullWidth>
                PDF'i Aç
              </PrimaryButton>
              <SecondaryButton icon="share-variant-outline" onPress={() => pdfIslemi(asama.dosya, 'paylas')} fullWidth>
                PDF'i Paylaş
              </SecondaryButton>
              <SecondaryButton icon="folder-file-outline" onPress={kaydedilenlereGit} fullWidth>
                Kaydedilen PDF'ler
              </SecondaryButton>
              <TextButton onPress={kutuyuKapat}>Kapat</TextButton>
            </>
          ) : (
            <PrimaryButton onPress={kutuyuKapat} compact>
              Kapat
            </PrimaryButton>
          )
        }
      >
        {asama.tur === 'suruyor' &&
          (asama.durduruluyor ? (
            <DialogText>Süren sorgu bitince aktarma durdurulacak; PDF oluşturulmayacak.</DialogText>
          ) : asama.pdf ? (
            <DialogText>PDF oluşturuluyor…</DialogText>
          ) : asama.parca ? (
            <>
              <DialogText>
                {asama.parca.baslangic} – {asama.parca.bitis} arası sorgulanıyor
              </DialogText>
              <Text style={typography.caption}>
                Sorgu {asama.parcaSirasi} / {asama.parcaSayisi} · Bulunan fatura: {asama.bulunan}
              </Text>
              <ProgressBar
                progress={(asama.parcaSirasi - 1) / Math.max(asama.parcaSayisi, 1)}
                color={colors.primary}
                style={styles.ilerlemeCubugu}
              />
              <Text style={typography.caption}>
                GİB tek seferde en fazla 7 günlük aralığa izin verdiği için dönem haftalık sorgularla alınıyor.
                Kutuyu kapatırsanız aktarma durur.
              </Text>
            </>
          ) : (
            <DialogText>Hazırlanıyor…</DialogText>
          ))}
        {asama.tur === 'bitti' && (
          <>
            <DialogText>{asama.adet} fatura listelendi.</DialogText>
            <Text style={typography.caption} selectable>
              {asama.klasorAdi} / {asama.dosya.name}
            </Text>
          </>
        )}
        {asama.tur === 'hata' && <DialogText>{asama.mesaj}</DialogText>}
      </AppDialog>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: spacing.screen, gap: spacing.card, paddingBottom: spacing.xxl },
  ilerlemeCubugu: { marginVertical: spacing.xxs, borderRadius: radius.pill },
});
