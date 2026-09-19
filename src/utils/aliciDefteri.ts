import { deleteSecureItem } from './secureStorage';
import { defterGuncelle, defterOku, type DefterTanimi } from './bolunmusDefter';
import { vknTcknGecerliMi } from './kimlikDogrula';
import type { AliciFormu, KayitliAlici } from '../types/faturaForm';

// Eskiden tüm hesaplar TEK bir ortak defteri paylaşıyordu; birden fazla
// mükellefin hesabına giren bir mali müşavir, bir müşterisinin alıcılarını
// (VKN/TCKN, unvan, adres) diğer müşterisi için fatura keserken görüyordu.
// Artık defter, giriş yapan kullanıcı koduna özel anahtarlarda tutuluyor
// (bkz. hesapAnahtari.ts) ve her kayıt ayrı bir anahtarda (bkz.
// bolunmusDefter.ts). Hesaba özel ama tek değerli önceki biçim
// (`gib_alici_defteri_<hex>`) ilk erişimde yeni biçime taşınır.
const ESKI_ORTAK_DEFTER_KEY = 'gib_alici_defteri';
export const MAX_ALICI_KAYDI = 50;

/** Kayıt işlemlerinin sonucu; `false` ise kullanıcıya "kaydedilemedi" denmeli. */
export type DefterSonucu = boolean;

const ALICI_DEFTERI: DefterTanimi<KayitliAlici> = {
  onek: 'gib_alici',
  eskiOnek: 'gib_alici_defteri_',
  enFazla: MAX_ALICI_KAYDI,
  kayitMi: (deger): deger is KayitliAlici =>
    typeof deger === 'object' &&
    deger !== null &&
    typeof (deger as { vknTckn?: unknown }).vknTckn === 'string',
};

/**
 * Eski sürümlerden kalan, hesaplar arası ORTAK defteri cihazdan siler.
 * Kimin alıcısı olduğu bilinemediğinden başka bir hesaba taşınamıyor; bu
 * yüzden silinir (kayıtlı alıcılar yeniden, fatura kesildikçe oluşur).
 */
export async function eskiOrtakAliciDefteriniSil(): Promise<void> {
  await deleteSecureItem(ESKI_ORTAK_DEFTER_KEY);
}

export async function aliciListesiGetir(): Promise<KayitliAlici[]> {
  return defterOku(ALICI_DEFTERI);
}

/**
 * Deftere yazılabilecek bir alıcı mı? VKN/TCKN kontrol basamağı geçerli olmalı
 * ve unvan (VKN) ya da ad+soyad (TCKN) dolu olmalı. Unvan/ad/soyad/vergi
 * dairesi uygulamada yalnızca GİB sorgusuyla (mukellefBilgisiGetir) dolduğu
 * için bu kontrol, sorgusu yapılmamış bir kaydın deftere girmesini engeller.
 */
export function aliciKaydedilebilirMi(alici: AliciFormu): boolean {
  const vkn = alici.vknTckn.trim();
  if (!vknTcknGecerliMi(vkn)) return false;
  return vkn.length === 10
    ? alici.unvan.trim().length > 0
    : alici.ad.trim().length > 0 && alici.soyad.trim().length > 0;
}

/**
 * Aynı VKN/TCKN zaten kayıtlıysa günceller (en üste taşır), yoksa yeni ekler.
 * Geçersiz alıcıda, oturum yokken ya da cihaz depolaması yazmayı reddederse false.
 */
export async function aliciKaydet(alici: AliciFormu): Promise<DefterSonucu> {
  if (!aliciKaydedilebilirMi(alici)) return false;
  const temizVkn = alici.vknTckn.trim();
  return defterGuncelle(ALICI_DEFTERI, (mevcut) => {
    const digerleri = mevcut.filter((a) => a.vknTckn.trim() !== temizVkn);
    return [{ ...alici, vknTckn: temizVkn, kayitTarihi: new Date().toISOString() }, ...digerleri].slice(
      0,
      MAX_ALICI_KAYDI,
    );
  });
}

/**
 * Kayıtlı bir alıcının YALNIZCA adres/ülke bilgisini günceller; sırası
 * değişmez. Unvan/ad/soyad/vergi dairesi burada değiştirilemez (onlar yalnızca
 * GİB sorgusuyla dolar). Kayıt bulunamazsa false.
 */
export async function aliciAdresGuncelle(
  vknTckn: string,
  degisiklik: Pick<AliciFormu, 'adres' | 'ulke'>,
): Promise<DefterSonucu> {
  const hedef = vknTckn.trim();
  return defterGuncelle(ALICI_DEFTERI, (mevcut) => {
    if (!mevcut.some((a) => a.vknTckn.trim() === hedef)) return null;
    return mevcut.map((a) =>
      a.vknTckn.trim() === hedef ? { ...a, adres: degisiklik.adres, ulke: degisiklik.ulke } : a,
    );
  });
}

/** Kaydı defterden siler. Kayıt yoksa ya da yazma başarısızsa false. */
export async function aliciSil(vknTckn: string): Promise<DefterSonucu> {
  const hedef = vknTckn.trim();
  return defterGuncelle(ALICI_DEFTERI, (mevcut) => {
    const yeniListe = mevcut.filter((a) => a.vknTckn.trim() !== hedef);
    return yeniListe.length === mevcut.length ? null : yeniListe;
  });
}
