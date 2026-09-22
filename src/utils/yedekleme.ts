/**
 * Fatura yedekleme — tarih parçaları, dosya adları ve yedekleme döngüsü.
 *
 * GİB en fazla 7 günlük aralıkta sorgulamaya izin veriyor (uçlar dahil; bkz.
 * tarihAraligi.ts). "Son 1 ay" gibi uzun bir dönem bu yüzden en fazla
 * 1 haftalık parçalara bölünür ve BUGÜNDEN GERİYE doğru tek tek sorgulanır
 * (bugün 21.09.2026 iken: önce 15–21.09, sonra 08–14.09, …; 2026-09-22'den
 * önce parçalar 8 gündü, kullanıcı tarifiyle düzeltildi).
 *
 * Döngü (`yedekle`) dosya sistemine ve GİB'e doğrudan bağlı DEĞİL; hepsi
 * `YedekOrtami` ile verilir. Bu sayede testlidir ve ekran yalnızca gerçek
 * bağımlılıkları bağlar.
 *
 * SAF modül — React Native'e bağımlılığı yok.
 */

import type { TaslakFatura } from '../types/gib';
import { iptalItirazDurumMetni } from './faturaFiligran';
import { EN_FAZLA_FARK, EN_FAZLA_GUN, enErkenBaslangic } from './tarihAraligi';

export type YedekSuresi = '1h' | '1a' | '3a' | '6a' | '1y';

export const YEDEK_SURELERI: { anahtar: YedekSuresi; etiket: string }[] = [
  { anahtar: '1h', etiket: 'Son 1 hafta' },
  { anahtar: '1a', etiket: 'Son 1 ay' },
  { anahtar: '3a', etiket: 'Son 3 ay' },
  { anahtar: '6a', etiket: 'Son 6 ay' },
  { anahtar: '1y', etiket: 'Son 1 yıl' },
];

function gunBasi(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function gunEkle(d: Date, gun: number): Date {
  const yeni = gunBasi(d);
  yeni.setDate(yeni.getDate() + gun);
  return yeni;
}

/**
 * Seçilen sürenin ilk günü. "Son 1 hafta" = bugün dahil 7 gün (bugün − 6;
 * sorgu ekranlarının varsayılan aralığıyla aynı). Aylar takvim ayıdır: 21.09 → 21.08.
 * Ayın son günlerinde taşma olmasın diye (31.03 − 1 ay ≠ 03.03) gün,
 * hedef ayın son gününe kırpılır.
 */
export function yedekBaslangici(sure: YedekSuresi, bugun: Date = new Date()): Date {
  const son = gunBasi(bugun);
  if (sure === '1h') return gunEkle(son, -EN_FAZLA_FARK);
  const ay = sure === '1a' ? 1 : sure === '3a' ? 3 : sure === '6a' ? 6 : 12;
  const hedefAy = son.getMonth() - ay;
  const ilk = new Date(son.getFullYear(), hedefAy, 1);
  const ayinSonGunu = new Date(ilk.getFullYear(), ilk.getMonth() + 1, 0).getDate();
  return new Date(ilk.getFullYear(), ilk.getMonth(), Math.min(son.getDate(), ayinSonGunu));
}

export interface TarihParcasi {
  baslangic: Date;
  bitis: Date;
}

/**
 * [baslangic, bitis] aralığını uçlar dahil en fazla EN_FAZLA_GUN günlük ve
 * AY SINIRINI GEÇMEYEN parçalara böler (ör. 28.08–03.09 yerine 28.08–31.08 ve
 * 01.09–03.09), EN YENİDEN ESKİYE. Parçalar örtüşmez ve boşluk bırakmaz: bir sonraki
 * parçanın bitişi, öncekinin başlangıcından bir gün öncedir.
 */
export function haftalikParcalar(baslangic: Date, bitis: Date): TarihParcasi[] {
  const ilk = gunBasi(baslangic);
  let sonGun = gunBasi(bitis);
  const parcalar: TarihParcasi[] = [];
  while (sonGun >= ilk) {
    // Uçlar dahil en fazla 7 gün ve AY SINIRINI GEÇMEZ (bkz. tarihAraligi.ts).
    const aday = enErkenBaslangic(sonGun);
    const parcaBasi = aday < ilk ? ilk : aday;
    parcalar.push({ baslangic: parcaBasi, bitis: sonGun });
    sonGun = gunEkle(parcaBasi, -1);
  }
  return parcalar;
}

/** Ekranda gösterilen biçim: GG.AA.YYYY */
export function noktaliTarih(d: Date): string {
  const gg = String(d.getDate()).padStart(2, '0');
  const aa = String(d.getMonth() + 1).padStart(2, '0');
  return `${gg}.${aa}.${d.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Hangi faturalar, hangi adla
// ---------------------------------------------------------------------------

/** Dosya/klasör adında sorun çıkaracak karakterleri temizler. */
export function guvenliAd(metin: string, enFazla = 60): string {
  return metin
    .normalize('NFC')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, enFazla)
    .trim();
}

/**
 * GİB'in `belgeTarihi` alanı "GG-AA-YYYY" (tireli). Dosya adında sıralama
 * doğru çıksın diye "YYYY-AA-GG"ye çevrilir; tanınmazsa `undefined`.
 */
export function belgeTarihiSiralanabilir(belgeTarihi: unknown): string | undefined {
  if (typeof belgeTarihi !== 'string') return undefined;
  const m = /^(\d{2})[-/.](\d{2})[-/.](\d{4})$/.exec(belgeTarihi.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

/**
 * Yedeklenecek mi? `taslaklarDahil` kapalıyken yalnızca GİB'de onaylanmış
 * faturalar. Uygulama 2026-09-21'den beri HER ZAMAN true geçer (kullanıcı
 * isteği: onaylanmamış ve silinmiş dahil tüm faturalar yedeklenir).
 */
export function yedeklenecekMi(item: TaslakFatura, taslaklarDahil: boolean): boolean {
  if (item.onayDurumu === 'Onaylandı') return true;
  return taslaklarDahil;
}

/**
 * Yedek dosyasının adı: `YYYY-AA-GG_BelgeNo.pdf`. Onaylı olmayan belgelere
 * durum eki eklenir (`_ONAYSIZ`, `_SILINMIS`); böylece bir taslak sonradan
 * onaylanırsa onaylı hali AYRI bir dosya olarak yedeklenir, eski taslak
 * yedeği onaylı faturanın yerine geçmez.
 *
 * Aynı ada sahip dosya klasörde zaten varsa yeniden indirilmez; yarıda
 * kalan bir yedekleme tekrar başlatıldığında kaldığı yerden devam eder.
 */
export function yedekDosyaAdi(item: TaslakFatura): string {
  const tarih = belgeTarihiSiralanabilir(item.belgeTarihi) ?? 'tarihsiz';
  const no = guvenliAd(String(item.belgeNumarasi || item.ettn || 'belge'), 80);
  const ek =
    item.onayDurumu === 'Onaylandı' ? '' : item.onayDurumu === 'Silinmiş' ? '_SILINMIS' : '_ONAYSIZ';
  return `${tarih}_${no}${ek}.pdf`;
}

/**
 * Mükellef klasörünün adı: "VKN - Unvan". Bir mali müşavir aynı telefonda
 * birden çok mükellefin faturalarını yedekleyebilir; karışmasınlar diye her
 * GİB hesabı kendi alt klasörüne yazılır. Unvan değişse bile klasör VKN
 * önekiyle bulunur (bkz. mukellefKlasoruMu).
 */
export function mukellefKlasorAdi(vkn: string, unvan?: string): string {
  const temizVkn = guvenliAd(vkn, 20) || 'mukellef';
  const temizUnvan = unvan ? guvenliAd(unvan, 50) : '';
  return temizUnvan ? `${temizVkn} - ${temizUnvan}` : temizVkn;
}

export interface Mukellef {
  vkn: string;
  unvan?: string;
}

/** VKN 10, TCKN 11 hane. Kullanıcı kodu gibi başka bir değer kabul edilmez. */
export const VKN_BICIMI = /^\d{10,11}$/;

function doluMetin(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

/**
 * Oturumdaki kullaniciBilgisi'nden mükellef — yalnızca içinde GEÇERLİ bir
 * VKN/TCKN varsa (bu alan o yanıtta doğrulanmadı; yoksa null döner ve
 * doğrulanmış "Kullanıcı Bilgileri" yanıtına bakılır).
 */
export function oturumdakiMukellef(bilgi: { vknTckn?: unknown; unvan?: unknown } | null): Mukellef | null {
  const vkn = doluMetin(bilgi?.vknTckn);
  if (!vkn || !VKN_BICIMI.test(vkn)) return null;
  return { vkn, unvan: doluMetin(bilgi?.unvan) };
}

/**
 * "Kullanıcı Bilgileri" (RG_KULLANICI, vknTckn alanı canlı doğrulandı)
 * yanıtından mükellef. Şahıs hesaplarında unvan boş olabilir → ad soyad.
 */
export function detaydakiMukellef(
  detay: { vknTckn?: unknown; unvan?: unknown; ad?: unknown; soyad?: unknown },
  yedekUnvan?: unknown,
): Mukellef | null {
  const vkn = doluMetin(detay.vknTckn);
  if (!vkn || !VKN_BICIMI.test(vkn)) return null;
  const adSoyad = [doluMetin(detay.ad), doluMetin(detay.soyad)].filter(Boolean).join(' ');
  return { vkn, unvan: doluMetin(detay.unvan) ?? (adSoyad || doluMetin(yedekUnvan)) };
}

/**
 * Android SAF (Storage Access Framework) adresinden öğenin görünen adı:
 * "content://…/document/primary%3ADownload%2F123%20-%20X" → "123 - X".
 * Çözülemezse ''.
 */
export function safOgeAdi(uri: string): string {
  const son = uri.split('/').pop() ?? '';
  let yol: string;
  try {
    yol = decodeURIComponent(son);
  } catch {
    return '';
  }
  const bolu = yol.lastIndexOf('/');
  if (bolu >= 0) return yol.slice(bolu + 1);
  const ikiNokta = yol.indexOf(':');
  return ikiNokta >= 0 ? yol.slice(ikiNokta + 1) : yol;
}

export function mukellefKlasoruMu(klasorAdi: string, vkn: string): boolean {
  const temizVkn = guvenliAd(vkn, 20) || 'mukellef';
  return klasorAdi === temizVkn || klasorAdi.startsWith(`${temizVkn} - `);
}

// ---------------------------------------------------------------------------
// Yedek bilgileri: dosya adında olmayan alıcı unvanı / VKN / durum
// ---------------------------------------------------------------------------

/**
 * Her mükellef klasöründe PDF'lerin yanında tutulan küçük bilgi dosyası.
 * Dosya adında yalnızca tarih ve belge no var; "Yedeklenen Faturalar"
 * ekranında alıcı unvanı ve VKN/TCKN'yi göstermek ve bunlara göre sıralayıp
 * aramak için gerekir. Yalnızca GİB listesinden gelen, zaten PDF'in içinde
 * bulunan bilgiler yazılır; cihazdan çıkmaz.
 */
export const YEDEK_DIZIN_ADI = 'yedek-bilgileri.json';

export interface YedekBilgisi {
  belgeNo?: string;
  /** "YYYY-AA-GG" */
  belgeTarihi?: string;
  aliciUnvan?: string;
  aliciVknTckn?: string;
  onayDurumu?: string;
  /** İptal/itiraz talebi durumu, yedekleme anındaki (ör. "İptal Kabul Edildi"). */
  talepDurumu?: string;
}

/** Dosya adı → bilgi. */
export type YedekDizini = Record<string, YedekBilgisi>;

function metinAlan(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

export function yedekBilgisi(item: TaslakFatura): YedekBilgisi {
  return {
    belgeNo: metinAlan(item.belgeNumarasi) ?? metinAlan(item.ettn),
    belgeTarihi: belgeTarihiSiralanabilir(item.belgeTarihi),
    aliciUnvan: metinAlan(item.aliciUnvanAdSoyad) ?? metinAlan(item.aliciUnvan),
    aliciVknTckn: metinAlan(item.aliciVknTckn),
    onayDurumu: metinAlan(item.onayDurumu),
    talepDurumu: iptalItirazDurumMetni(item),
  };
}

/** Bilgi dosyasının içeriği; bozuk ya da tanınmayan içerik boş dizin sayılır. */
export function yedekDiziniCoz(ham: string | null | undefined): YedekDizini {
  if (!ham) return {};
  try {
    const veri = JSON.parse(ham) as { v?: unknown; dosyalar?: unknown };
    if (veri.v !== 1 || !veri.dosyalar || typeof veri.dosyalar !== 'object') return {};
    const sonuc: YedekDizini = {};
    for (const [ad, b] of Object.entries(veri.dosyalar as Record<string, unknown>)) {
      if (!b || typeof b !== 'object') continue;
      const kayit = b as Record<string, unknown>;
      sonuc[ad] = {
        belgeNo: metinAlan(kayit.belgeNo),
        belgeTarihi: metinAlan(kayit.belgeTarihi),
        aliciUnvan: metinAlan(kayit.aliciUnvan),
        aliciVknTckn: metinAlan(kayit.aliciVknTckn),
        onayDurumu: metinAlan(kayit.onayDurumu),
        talepDurumu: metinAlan(kayit.talepDurumu),
      };
    }
    return sonuc;
  } catch {
    return {};
  }
}

export function yedekDiziniYazilacak(dizin: YedekDizini): string {
  return JSON.stringify({ v: 1, dosyalar: dizin });
}

/**
 * "2026-09-15_GIB2026000000012_ONAYSIZ.pdf" → tarih ("YYYY-AA-GG"), belge no
 * ve durum eki. Tanınmayan adlarda yalnızca belge no = dosya adı.
 */
export function yedekDosyaAdiniCoz(ad: string): {
  tarih?: string;
  belgeNo: string;
  durum: 'ONAYSIZ' | 'SILINMIS' | null;
} {
  const m = /^(\d{4}-\d{2}-\d{2})_(.+?)(_ONAYSIZ|_SILINMIS)?\.pdf$/i.exec(ad);
  if (!m) return { belgeNo: ad, durum: null };
  const durum = m[3]?.toUpperCase() === '_ONAYSIZ' ? 'ONAYSIZ' : m[3]?.toUpperCase() === '_SILINMIS' ? 'SILINMIS' : null;
  return { tarih: m[1], belgeNo: m[2], durum };
}

/** "YYYY-AA-GG" → "GG.AA.YYYY" */
export function siralanabilirTarihiGoster(t: string | undefined): string | undefined {
  const m = t ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(t) : null;
  return m ? `${m[3]}.${m[2]}.${m[1]}` : undefined;
}

export type YedekSiralama = 'tarihYeni' | 'tarihEski' | 'belgeNo' | 'belgeNoEski' | 'unvan';

export const YEDEK_SIRALAMALARI: { value: YedekSiralama; label: string }[] = [
  { value: 'tarihYeni', label: 'Tarih (yeniden eskiye)' },
  { value: 'tarihEski', label: 'Tarih (eskiden yeniye)' },
  { value: 'belgeNo', label: 'Belge numarası (yeniden eskiye)' },
  { value: 'belgeNoEski', label: 'Belge numarası (eskiden yeniye)' },
  { value: 'unvan', label: 'Alıcı unvanı (A → Z)' },
];

interface Siralanabilir {
  ad: string;
  bilgi?: YedekBilgisi;
}

function tarihi(o: Siralanabilir): string {
  return o.bilgi?.belgeTarihi ?? yedekDosyaAdiniCoz(o.ad).tarih ?? '';
}

function belgeNosu(o: Siralanabilir): string {
  return o.bilgi?.belgeNo ?? yedekDosyaAdiniCoz(o.ad).belgeNo;
}

/**
 * GİB e-Arşiv belge numarası: "GIB" + 4 haneli yıl + 9 haneli sıra
 * (ör. GIB2026000000001; kullanıcının tarifi, 2026-09-21). Yıl ve sıra
 * sayı olarak döner; biçime uymuyorsa null.
 */
export function gibBelgeNoCoz(no: string): { yil: number; sira: number } | null {
  const m = /^GIB(\d{4})(\d{9})$/i.exec(no.trim());
  return m ? { yil: Number(m[1]), sira: Number(m[2]) } : null;
}

/**
 * Belge numarası karşılaştırması: önce yıl, sonra sıra numarası; `yon` 1
 * eskiden yeniye, -1 yeniden eskiye. GİB biçimine uymayan numaralar İKİ
 * YÖNDE DE sonda kalır ve kendi aralarında sayı duyarlı sıralanır.
 */
function belgeNoKarsilastir(a: string, b: string, yon: 1 | -1): number {
  const ca = gibBelgeNoCoz(a);
  const cb = gibBelgeNoCoz(b);
  if (ca && cb) return yon * (ca.yil - cb.yil || ca.sira - cb.sira);
  if (ca && !cb) return -1;
  if (!ca && cb) return 1;
  return yon * a.localeCompare(b, 'tr', { numeric: true });
}

/**
 * Yedekleri sıralar (yeni dizi döner). Unvanı bilinmeyenler unvan
 * sıralamasında sona gider. Eşitlikte tarih yeniden eskiye, sonra belge no.
 */
export function yedekleriSirala<T extends Siralanabilir>(liste: T[], olcut: YedekSiralama): T[] {
  const tarihYeniEski = (a: T, b: T) => tarihi(b).localeCompare(tarihi(a)) || belgeNosu(b).localeCompare(belgeNosu(a));
  return [...liste].sort((a, b) => {
    switch (olcut) {
      case 'tarihEski':
        return tarihi(a).localeCompare(tarihi(b)) || belgeNosu(a).localeCompare(belgeNosu(b));
      case 'belgeNo':
        return belgeNoKarsilastir(belgeNosu(a), belgeNosu(b), -1);
      case 'belgeNoEski':
        return belgeNoKarsilastir(belgeNosu(a), belgeNosu(b), 1);
      case 'unvan': {
        const ua = a.bilgi?.aliciUnvan;
        const ub = b.bilgi?.aliciUnvan;
        if (ua && !ub) return -1;
        if (!ua && ub) return 1;
        return (ua && ub ? ua.localeCompare(ub, 'tr', { sensitivity: 'base' }) : 0) || tarihYeniEski(a, b);
      }
      default:
        return tarihYeniEski(a, b);
    }
  });
}

/** "Yedeklenen Faturalar" filtresi. Boş alan = o ölçüte göre süzme yok. */
export interface YedekFiltresi {
  aliciUnvan?: string;
  aliciVknTckn?: string;
  /** "YYYY-AA-GG", dahil */
  baslangic?: string;
  /** "YYYY-AA-GG", dahil */
  bitis?: string;
}

export function yedekFiltresiBosMu(f: YedekFiltresi): boolean {
  return !f.aliciUnvan && !f.aliciVknTckn && !f.baslangic && !f.bitis;
}

/**
 * Filtre: unvan ve VKN/TCKN birebir (listeden seçilir), tarih aralığı dahil.
 * Unvanı/VKN'si bilinmeyen (bilgi dosyası dolmamış) yedekler, o ölçüt
 * seçiliyken gösterilmez; tarihi dosya adından okunur.
 */
export function yedekFiltreyeUyarMi(o: Siralanabilir, f: YedekFiltresi): boolean {
  if (f.aliciUnvan && o.bilgi?.aliciUnvan !== f.aliciUnvan) return false;
  if (f.aliciVknTckn && o.bilgi?.aliciVknTckn !== f.aliciVknTckn) return false;
  if (f.baslangic || f.bitis) {
    const t = tarihi(o);
    if (!t) return false;
    if (f.baslangic && t < f.baslangic) return false;
    if (f.bitis && t > f.bitis) return false;
  }
  return true;
}

/** Filtre seçenekleri: yedeklerdeki farklı unvanlar ve VKN/TCKN'ler (sıralı). */
export function yedekFiltreSecenekleri(liste: Siralanabilir[]): { unvanlar: string[]; vknler: string[] } {
  const unvanlar = new Set<string>();
  const vknler = new Set<string>();
  for (const o of liste) {
    if (o.bilgi?.aliciUnvan) unvanlar.add(o.bilgi.aliciUnvan);
    if (o.bilgi?.aliciVknTckn) vknler.add(o.bilgi.aliciVknTckn);
  }
  return {
    unvanlar: [...unvanlar].sort((a, b) => a.localeCompare(b, 'tr', { sensitivity: 'base' })),
    vknler: [...vknler].sort(),
  };
}

/** Arama: dosya adı (belge no, tarih), GG.AA.YYYY tarih, alıcı unvanı, VKN/TCKN. */
export function yedekAramayaUyarMi(o: Siralanabilir, aranan: string): boolean {
  // Türkçe küçük harf "GIB"i "gıb" yapar; kullanıcı "gib" yazınca da bulunsun
  // diye ı/i farkı yok sayılır.
  const katla = (x: string) => x.toLocaleLowerCase('tr').replace(/ı/g, 'i');
  const a = katla(aranan.trim());
  if (!a) return true;
  const alanlar = [
    o.ad,
    siralanabilirTarihiGoster(tarihi(o)),
    o.bilgi?.aliciUnvan,
    o.bilgi?.aliciVknTckn,
    o.bilgi?.belgeNo,
  ];
  return alanlar.some((x) => !!x && katla(x).includes(a));
}

// ---------------------------------------------------------------------------
// Yedekleme döngüsü
// ---------------------------------------------------------------------------

export interface YedekOrtami {
  /** GİB'den bir parçanın fatura listesi (EARSIV_PORTAL_TASLAKLARI_GETIR). */
  listele(parca: TarihParcasi): Promise<TaslakFatura[]>;
  /** Faturanın PDF'i, Base64. */
  pdfUret(item: TaslakFatura): Promise<string>;
  /** Bu adla bir yedek zaten var mı? */
  varMi(dosyaAdi: string): boolean;
  /** PDF'i yedek klasörüne yaz. */
  yaz(dosyaAdi: string, base64: string): void;
  /**
   * Faturanın bilgilerini (alıcı unvanı, VKN/TCKN…) yedek bilgi dosyasına
   * işle. Hem yeni yazılan hem ZATEN YEDEKLİ olan faturalar için çağrılır;
   * böylece bilgi dosyası olmayan eski yedekler de yeniden yedeklemede dolar.
   */
  bilgiKaydet?(dosyaAdi: string, item: TaslakFatura): void;
  /** Kullanıcı "Durdur"a bastı mı? */
  durduruldu(): boolean;
  /** İki GİB isteği arasında bekleme (portalı yormamak için). */
  bekle(ms: number): Promise<void>;
}

export interface YedekIlerleme {
  /** Şu an sorgulanan/indirilen parça (bitti ise son parça). */
  parca: TarihParcasi;
  parcaSirasi: number; // 1'den başlar
  parcaSayisi: number;
  kaydedilen: number;
  atlanan: number; // zaten yedekli
  hatali: number;
}

export interface YedekSonucu {
  kaydedilen: number;
  atlanan: number;
  hatali: number;
  /** Yedeklenmeyen belgeler ve nedenleri (en fazla birkaç tane gösterilir). */
  hatalar: { belge: string; mesaj: string }[];
  durduruldu: boolean;
}

/** Bir hata tüm yedeklemeyi durdurmalı mı? (ör. GİB oturumu kapandı) */
export type DurduranHataMi = (err: unknown) => boolean;

export const ISTEK_ARASI_BEKLEME_MS = 300;

/**
 * Art arda bu kadar fatura hata verirse yedekleme durur: sorun tek bir
 * faturada değil, büyük olasılıkla GİB'dedir (kesinti, hız sınırı) ya da
 * bağlantı kopmuştur. Yüzlerce faturayı boşuna denemektense durulur.
 */
export const ARDISIK_HATA_SINIRI = 3;

/**
 * Parçaları sırayla işler: listeyi çeker, yedeklenecek her faturanın PDF'ini
 * TEK TEK üretip yazar. Tek bir faturanın hatası yedeklemeyi durdurmaz
 * (hatalar listesine yazılır ve devam edilir). Liste sorgusunun hatası,
 * `durduranHataMi` true dönen bir hata (oturum kapandı) ya da art arda
 * ARDISIK_HATA_SINIRI hata ise yukarı fırlatılır; o ana kadar yazılan
 * dosyalar klasörde kalır, tekrar başlatınca kaldığı yerden devam edilir.
 */
export async function yedekle(
  parcalar: TarihParcasi[],
  ortam: YedekOrtami,
  secenek: { taslaklarDahil: boolean; durduranHataMi: DurduranHataMi },
  ilerleme: (d: YedekIlerleme) => void,
): Promise<YedekSonucu> {
  const sonuc: YedekSonucu = { kaydedilen: 0, atlanan: 0, hatali: 0, hatalar: [], durduruldu: false };
  // Aynı belge iki parçada gelirse (GİB sınır günlerini iki yana da
  // katarsa) ikinci kez işlenmesin.
  const islenenler = new Set<string>();
  let ardisikHata = 0;

  for (let i = 0; i < parcalar.length; i++) {
    const parca = parcalar[i];
    const bildir = () =>
      ilerleme({
        parca,
        parcaSirasi: i + 1,
        parcaSayisi: parcalar.length,
        kaydedilen: sonuc.kaydedilen,
        atlanan: sonuc.atlanan,
        hatali: sonuc.hatali,
      });

    if (ortam.durduruldu()) {
      sonuc.durduruldu = true;
      return sonuc;
    }
    bildir();

    if (i > 0) await ortam.bekle(ISTEK_ARASI_BEKLEME_MS);
    const liste = await ortam.listele(parca);

    for (const item of liste) {
      if (ortam.durduruldu()) {
        sonuc.durduruldu = true;
        return sonuc;
      }
      if (!yedeklenecekMi(item, secenek.taslaklarDahil)) continue;

      const ad = yedekDosyaAdi(item);
      if (islenenler.has(ad)) continue;
      islenenler.add(ad);

      if (ortam.varMi(ad)) {
        sonuc.atlanan += 1;
        // Eski yedeklerin eksik bilgisi (unvan, VKN) de dolsun.
        ortam.bilgiKaydet?.(ad, item);
        bildir();
        continue;
      }

      try {
        await ortam.bekle(ISTEK_ARASI_BEKLEME_MS);
        const base64 = await ortam.pdfUret(item);
        ortam.yaz(ad, base64);
        ortam.bilgiKaydet?.(ad, item);
        sonuc.kaydedilen += 1;
        ardisikHata = 0;
      } catch (err) {
        if (secenek.durduranHataMi(err)) throw err;
        ardisikHata += 1;
        if (ardisikHata >= ARDISIK_HATA_SINIRI) throw err;
        sonuc.hatali += 1;
        sonuc.hatalar.push({
          belge: String(item.belgeNumarasi || item.ettn || ad),
          mesaj: err instanceof Error && err.message ? err.message : 'Bilinmeyen hata',
        });
      }
      bildir();
    }
  }
  return sonuc;
}
