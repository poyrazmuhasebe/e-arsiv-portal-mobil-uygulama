/**
 * Taslak Düzenle: GİB'in EARSIV_PORTAL_FATURA_GETIR yanıtını fatura kesim
 * formunun durumuna çevirir (bkz. gibApi.ts → faturaGetir/faturaGuncelle).
 *
 * Yanıtın alan adları 2026-09-23'te GİB'in kendi Düzenle ekranından canlı
 * yakalandı. Uygulamanın formu GİB'in formunun bir alt kümesini destekliyor;
 * taslakta formda karşılığı olmayan DOLU bir alan varsa (tevkifat ya da başka
 * vergi, masraflar, özel matrah, arttırım…) düzenleme REDDEDİLİR. Aksi hâlde
 * kaydetme o alanları sessizce silip GİB'deki taslağı değiştirirdi.
 */

import {
  BIRIMLER,
  FATURA_TIPLERI,
  KDV_ORANLARI,
  PARA_BIRIMLERI,
  ULKELER,
} from '../constants/faturaConstants';
import type { FaturaFormState, KalemFormu } from '../types/faturaForm';
import type { KdvOrani } from '../types/gib';

/** Formda alanı olmayan ama güncellemede korunması gereken alıcı bilgileri. */
export interface EkAliciBilgisi {
  il?: string;
  ilce?: string;
  telefon?: string;
  eposta?: string;
}

export interface DuzenlemeVerisi {
  form: FaturaFormState;
  ekAlici: EkAliciBilgisi;
}

export class DuzenlemeHatasi extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuzenlemeHatasi';
  }
}

const DESTEKLENMIYOR = 'Bu taslak uygulamada düzenlenemiyor';

/** Fatura genelindeki masraf/stopaj/özel matrah alanları (formda yok). */
const UST_EK_ALAN = /^(komisyon|navlun|hammaliye|nakliye|gelirVergisi|bagkurTevkifati|halRusumu|ticaretBorsasi|milliSavunmaFonu|diger|ozelMatrah)/;

/** Kalemdeki formda karşılığı olmayan alanlar. */
const KALEM_EK_ALAN = /^(V\d{4}|ozelMatrah|tevkifatIade|yatirimTesvik|hesaplananotvtevkifatakatkisi)/;

function metin(d: unknown): string {
  return typeof d === 'string' ? d : '';
}

function sayi(d: unknown): number {
  if (typeof d === 'number') return d;
  if (typeof d === 'string' && d.trim() !== '') {
    const n = Number(d.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }
  return 0;
}

/** Formun sayı alanları için: 1250.5 → "1250,5". */
function sayiMetni(n: number): string {
  return String(n).replace('.', ',');
}

function listedeMi(liste: { value: string }[], deger: string): boolean {
  return liste.some((o) => o.value === deger);
}

/** "GG/AA/YYYY" (+ isteğe bağlı "SS:DD:SS") → Date. Geçersizse null. */
function tarihCoz(tarih: string, saat = ''): Date | null {
  const t = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(tarih.trim());
  if (!t) return null;
  const s = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(saat.trim());
  const d = new Date(
    Number(t[3]),
    Number(t[2]) - 1,
    Number(t[1]),
    s ? Number(s[1]) : 0,
    s ? Number(s[2]) : 0,
    s && s[3] ? Number(s[3]) : 0,
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

function doluMu(d: unknown): boolean {
  const n = sayi(d);
  return Number.isNaN(n) || n !== 0;
}

let sayac = 0;
function kalemId(): string {
  sayac += 1;
  return `duzenle-${Date.now()}-${sayac}`;
}

function kalemCevir(ham: unknown, sira: number): KalemFormu {
  if (!ham || typeof ham !== 'object') {
    throw new DuzenlemeHatasi(`${DESTEKLENMIYOR}: ${sira}. kalem okunamadı.`);
  }
  const k = ham as Record<string, unknown>;

  for (const [alan, deger] of Object.entries(k)) {
    if (KALEM_EK_ALAN.test(alan) && doluMu(deger)) {
      throw new DuzenlemeHatasi(
        `${DESTEKLENMIYOR}: ${sira}. kalemde tevkifat, ek vergi ya da özel matrah var. GİB portalından düzenleyin.`,
      );
    }
  }

  const iskontoOrani = sayi(k.iskontoOrani);
  if (iskontoOrani !== 0 && metin(k.iskontoArttm) !== 'İskonto') {
    throw new DuzenlemeHatasi(`${DESTEKLENMIYOR}: ${sira}. kalemde arttırım var. GİB portalından düzenleyin.`);
  }

  const kdvOrani = sayi(k.kdvOrani);
  if (!KDV_ORANLARI.includes(kdvOrani)) {
    throw new DuzenlemeHatasi(`${DESTEKLENMIYOR}: ${sira}. kalemin KDV oranı (%${kdvOrani}) desteklenmiyor.`);
  }

  const birim = metin(k.birim);
  if (!listedeMi(BIRIMLER, birim)) {
    throw new DuzenlemeHatasi(`${DESTEKLENMIYOR}: ${sira}. kalemin birimi (${birim || 'boş'}) tanınmıyor.`);
  }

  const miktar = sayi(k.miktar);
  const birimFiyat = sayi(k.birimFiyat);
  if (!(miktar > 0) || !(birimFiyat > 0) || Number.isNaN(iskontoOrani)) {
    throw new DuzenlemeHatasi(`${DESTEKLENMIYOR}: ${sira}. kalemin miktarı ya da fiyatı okunamadı.`);
  }

  return {
    id: kalemId(),
    malHizmet: metin(k.malHizmet),
    miktar: sayiMetni(miktar),
    birim,
    birimFiyat: sayiMetni(birimFiyat),
    iskontoOrani: sayiMetni(iskontoOrani),
    kdvOrani: kdvOrani as KdvOrani,
  };
}

/** FATURA_GETIR yanıtı → form durumu. Desteklenmeyen taslakta DuzenlemeHatasi fırlatır. */
export function gibFaturasiniFormaCevir(veri: Record<string, unknown>): DuzenlemeVerisi {
  for (const [alan, deger] of Object.entries(veri)) {
    if (UST_EK_ALAN.test(alan) && doluMu(deger)) {
      throw new DuzenlemeHatasi(
        `${DESTEKLENMIYOR}: faturada masraf, stopaj ya da özel matrah var. GİB portalından düzenleyin.`,
      );
    }
  }

  const faturaTipi = metin(veri.faturaTipi);
  if (!listedeMi(FATURA_TIPLERI, faturaTipi)) {
    throw new DuzenlemeHatasi(`${DESTEKLENMIYOR}: fatura tipi (${faturaTipi || 'boş'}) tanınmıyor.`);
  }
  const paraBirimi = metin(veri.paraBirimi);
  if (!listedeMi(PARA_BIRIMLERI, paraBirimi)) {
    throw new DuzenlemeHatasi(`${DESTEKLENMIYOR}: para birimi (${paraBirimi || 'boş'}) tanınmıyor.`);
  }
  const ulke = metin(veri.ulke);
  if (!listedeMi(ULKELER, ulke)) {
    throw new DuzenlemeHatasi(`${DESTEKLENMIYOR}: alıcının ülkesi (${ulke || 'boş'}) tanınmıyor.`);
  }

  const saat = metin(veri.saat);
  const faturaTarihi = tarihCoz(metin(veri.faturaTarihi), saat);
  if (!faturaTarihi) {
    throw new DuzenlemeHatasi(`${DESTEKLENMIYOR}: fatura tarihi okunamadı.`);
  }

  const hamKalemler = Array.isArray(veri.malHizmetTable) ? veri.malHizmetTable : [];
  if (hamKalemler.length === 0) {
    throw new DuzenlemeHatasi(`${DESTEKLENMIYOR}: taslakta mal/hizmet kalemi yok.`);
  }

  const dovizKuru = sayi(veri.dovzTLkur);

  const form: FaturaFormState = {
    faturaTarihi,
    faturaSaati: faturaTarihi,
    paraBirimi,
    dovizKuru: sayiMetni(Number.isNaN(dovizKuru) ? 0 : dovizKuru),
    faturaTipi,
    // Unvan/ad/soyad/vergi dairesi formda salt okunur: AliciBilgileriKarti
    // VKN/TCKN'ye göre GİB'den (mükellef sorgusu) yeniden doldurur.
    alici: {
      vknTckn: metin(veri.vknTckn),
      unvan: metin(veri.aliciUnvan),
      ad: metin(veri.aliciAdi),
      soyad: metin(veri.aliciSoyadi),
      vergiDairesi: metin(veri.vergiDairesi),
      ulke,
      adres: metin(veri.bulvarcaddesokak),
    },
    // Canlı yakalanan yanıtta irsaliye ve not alanları yoktu; varsa kullanılır.
    irsaliyeNo: metin(veri.irsaliyeNumarasi),
    irsaliyeTarihi: tarihCoz(metin(veri.irsaliyeTarihi)),
    kalemler: hamKalemler.map((k, i) => kalemCevir(k, i + 1)),
    not: metin(veri.not),
  };

  const ekAlici: EkAliciBilgisi = {
    il: metin(veri.sehir).trim() || undefined,
    ilce: metin(veri.mahalleSemtIlce).trim() || undefined,
    telefon: metin(veri.tel).trim() || undefined,
    eposta: metin(veri.eposta).trim() || undefined,
  };

  return { form, ekAlici };
}
