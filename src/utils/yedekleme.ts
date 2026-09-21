/**
 * Fatura yedekleme — tarih parçaları, dosya adları ve yedekleme döngüsü.
 *
 * GİB en fazla 7 günlük aralıkta sorgulamaya izin veriyor (bkz.
 * tarihAraligi.ts). "Son 1 ay" gibi uzun bir dönem bu yüzden en fazla
 * 1 haftalık parçalara bölünür ve BUGÜNDEN GERİYE doğru tek tek sorgulanır
 * (kullanıcının örneği, bugün 21.09.2026 iken: önce 14–21.09, sonra
 * 06–13.09, …).
 *
 * Döngü (`yedekle`) dosya sistemine ve GİB'e doğrudan bağlı DEĞİL; hepsi
 * `YedekOrtami` ile verilir. Bu sayede testlidir ve ekran yalnızca gerçek
 * bağımlılıkları bağlar.
 *
 * SAF modül — React Native'e bağımlılığı yok.
 */

import type { TaslakFatura } from '../types/gib';
import { EN_FAZLA_GUN } from './tarihAraligi';

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
 * Seçilen sürenin ilk günü. "Son 1 hafta" = bugün − 7 (sorgu ekranlarının
 * varsayılan aralığıyla aynı). Aylar takvim ayıdır: 21.09 → 21.08.
 * Ayın son günlerinde taşma olmasın diye (31.03 − 1 ay ≠ 03.03) gün,
 * hedef ayın son gününe kırpılır.
 */
export function yedekBaslangici(sure: YedekSuresi, bugun: Date = new Date()): Date {
  const son = gunBasi(bugun);
  if (sure === '1h') return gunEkle(son, -EN_FAZLA_GUN);
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
 * [baslangic, bitis] aralığını en fazla EN_FAZLA_GUN gün farklı parçalara
 * böler, EN YENİDEN ESKİYE. Parçalar örtüşmez ve boşluk bırakmaz: bir sonraki
 * parçanın bitişi, öncekinin başlangıcından bir gün öncedir.
 */
export function haftalikParcalar(baslangic: Date, bitis: Date): TarihParcasi[] {
  const ilk = gunBasi(baslangic);
  let sonGun = gunBasi(bitis);
  const parcalar: TarihParcasi[] = [];
  while (sonGun >= ilk) {
    const aday = gunEkle(sonGun, -EN_FAZLA_GUN);
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
 * Yedeklenecek mi? Varsayılan: yalnızca GİB'de onaylanmış (imzalanmış)
 * faturalar — yasal belge olanlar bunlar. `taslaklarDahil` açıksa
 * onaylanmamış taslaklar ve silinmiş belgeler de yedeklenir.
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

export function mukellefKlasoruMu(klasorAdi: string, vkn: string): boolean {
  const temizVkn = guvenliAd(vkn, 20) || 'mukellef';
  return klasorAdi === temizVkn || klasorAdi.startsWith(`${temizVkn} - `);
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
        bildir();
        continue;
      }

      try {
        await ortam.bekle(ISTEK_ARASI_BEKLEME_MS);
        const base64 = await ortam.pdfUret(item);
        ortam.yaz(ad, base64);
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
