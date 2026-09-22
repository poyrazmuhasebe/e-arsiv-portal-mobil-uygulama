/**
 * e-Arşiv Faturalarım (Dijital VD) → PDF: faturaları parça parça toplar,
 * PDF'i UYGULAMA İÇİNDE üretir (utils/dvdRapor.ts + expo-print) ve klasöre
 * yazar. Dijital VD'nin kendi "PDF'e Aktar" servisi (report/download)
 * KULLANILMAZ (kullanıcı isteği, 2026-09-22).
 *
 * Hem e-Arşiv Faturalarım ekranındaki "PDF'e Aktar" (tek aralık) hem Toplu
 * PDF'e Aktar sayfası (son 1 / 2 ay, haftalık parçalar) bunu kullanır.
 */

import type { Directory, File } from 'expo-file-system';

import {
  DvdApiError,
  dvdKullaniciBilgisiGetir,
  dvdTumFaturalariGetir,
  type DvdKullanici,
  type DvdSorguParcasi,
  type DvdToplamaIlerlemesi,
} from './dvdApi';
import { IOS_RAPOR_KLASOR_ADI, klasorGorunenAdi, pdfDosyasiYaz } from './yedekDeposu';
import { dvdRaporDosyaAdi, dvdRaporHtml } from '../utils/dvdRapor';
import { htmlPdfBase64 } from '../utils/pdf';

export type DvdPdfSonucu =
  | { durduruldu: true }
  | { durduruldu: false; dosya: File; adet: number; klasorAdi: string };

function hataMetni(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Hatayı hangi adımda oluştuğunu söyleyen bir mesajla yeniden fırlatır ve
 * geliştirici konsoluna yazar (yalnızca adım + hata metni; token, şifre ya da
 * fatura içeriği yazılmaz). Oturum hatası olduğu gibi iletilir.
 */
function adimHatasi(adim: string, err: unknown): never {
  console.warn(`[PDF'e aktar] ${adim} başarısız:`, hataMetni(err));
  if (err instanceof DvdApiError && err.oturumHatasi) throw err;
  throw new Error(`${adim}: ${hataMetni(err)}`);
}

export async function dvdPdfAktar(b: {
  token: string;
  klasor: Directory;
  parcalar: DvdSorguParcasi[];
  baslangic: Date;
  bitis: Date;
  /** Alıcı bilgisi alınamazsa PDF başlığında ve dosya adında kullanılır. */
  kullaniciKodu?: string;
  durduruldu?: () => boolean;
  ilerleme?: (d: DvdToplamaIlerlemesi) => void;
  parcaTamam?: (parcaSirasi: number, parcadakiFatura: number) => void;
  /** Faturalar toplandı, PDF oluşturuluyor. */
  pdfAsamasi?: () => void;
}): Promise<DvdPdfSonucu> {
  // Yalnızca PDF başlığındaki alıcı adı/VKN için. HİÇBİR hatası aktarmayı
  // durdurmaz (oturum gerçekten düştüyse fatura sorgusu bunu zaten bildirir).
  let alici: DvdKullanici | undefined;
  try {
    alici = await dvdKullaniciBilgisiGetir(b.token);
  } catch (err) {
    console.warn("[PDF'e aktar] Kullanıcı bilgisi alınamadı (PDF yine oluşturulur):", hataMetni(err));
    alici = undefined;
  }

  let sonuc: Awaited<ReturnType<typeof dvdTumFaturalariGetir>>;
  try {
    sonuc = await dvdTumFaturalariGetir(b.token, b.parcalar, {
      durduruldu: b.durduruldu,
      ilerleme: b.ilerleme,
      parcaTamam: b.parcaTamam,
    });
  } catch (err) {
    adimHatasi('Faturalar alınamadı', err);
  }
  if (sonuc.durduruldu) return { durduruldu: true };

  b.pdfAsamasi?.();
  const olusturma = new Date();
  let base64: string;
  try {
    const html = dvdRaporHtml({
      faturalar: sonuc.faturalar,
      alici,
      kullaniciKodu: b.kullaniciKodu,
      baslangic: b.baslangic,
      bitis: b.bitis,
      olusturma,
    });
    base64 = await htmlPdfBase64(html, { yatay: true });
  } catch (err) {
    adimHatasi('PDF oluşturulamadı', err);
  }

  const ad = dvdRaporDosyaAdi({
    kimlik: alici?.vkn || alici?.tckn || b.kullaniciKodu || 'mukellef',
    baslangic: b.baslangic,
    bitis: b.bitis,
    olusturma,
  });
  let dosya: File;
  try {
    dosya = pdfDosyasiYaz(b.klasor, ad, base64);
  } catch (err) {
    adimHatasi('PDF klasöre kaydedilemedi (klasörü yeniden seçmeyi deneyin)', err);
  }
  return {
    durduruldu: false,
    dosya,
    adet: sonuc.faturalar.length,
    klasorAdi: klasorGorunenAdi(b.klasor, IOS_RAPOR_KLASOR_ADI),
  };
}
