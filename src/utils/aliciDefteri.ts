import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStorage';
import { hesabaOzelAnahtar } from './hesapAnahtari';
import { vknTcknGecerliMi } from './kimlikDogrula';
import type { AliciFormu, KayitliAlici } from '../types/faturaForm';

// Eskiden tüm hesaplar TEK bir ortak defteri paylaşıyordu; birden fazla
// mükellefin hesabına giren bir mali müşavir, bir müşterisinin alıcılarını
// (VKN/TCKN, unvan, adres) diğer müşterisi için fatura keserken görüyordu.
// Artık defter, giriş yapan kullanıcı koduna özel bir anahtarda tutuluyor
// (bkz. hesapAnahtari.ts).
const ESKI_ORTAK_DEFTER_KEY = 'gib_alici_defteri';
const DEFTER_ANAHTAR_ONEKI = 'gib_alici_defteri_';
export const MAX_ALICI_KAYDI = 50;

/** Kayıt işlemlerinin sonucu; `false` ise kullanıcıya "kaydedilemedi" denmeli. */
export type DefterSonucu = boolean;

function defterAnahtari(): string | null {
  return hesabaOzelAnahtar(DEFTER_ANAHTAR_ONEKI);
}

/**
 * Eski sürümlerden kalan, hesaplar arası ORTAK defteri cihazdan siler.
 * Kimin alıcısı olduğu bilinemediğinden başka bir hesaba taşınamıyor; bu
 * yüzden silinir (kayıtlı alıcılar yeniden, fatura kesildikçe oluşur).
 */
export async function eskiOrtakAliciDefteriniSil(): Promise<void> {
  await deleteSecureItem(ESKI_ORTAK_DEFTER_KEY);
}

export async function aliciListesiGetir(): Promise<KayitliAlici[]> {
  const anahtar = defterAnahtari();
  if (!anahtar) return [];
  const ham = await getSecureItem(anahtar);
  if (!ham) return [];
  try {
    const liste = JSON.parse(ham);
    return Array.isArray(liste) ? liste : [];
  } catch {
    return [];
  }
}

async function listeyiYaz(anahtar: string, liste: KayitliAlici[]): Promise<DefterSonucu> {
  return setSecureItem(anahtar, JSON.stringify(liste));
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
  const anahtar = defterAnahtari();
  if (!anahtar || !aliciKaydedilebilirMi(alici)) return false;

  const temizVkn = alici.vknTckn.trim();
  const mevcut = await aliciListesiGetir();
  const digerleri = mevcut.filter((a) => a.vknTckn.trim() !== temizVkn);
  const yeniListe: KayitliAlici[] = [
    { ...alici, vknTckn: temizVkn, kayitTarihi: new Date().toISOString() },
    ...digerleri,
  ].slice(0, MAX_ALICI_KAYDI);

  return listeyiYaz(anahtar, yeniListe);
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
  const anahtar = defterAnahtari();
  if (!anahtar) return false;
  const hedef = vknTckn.trim();
  const mevcut = await aliciListesiGetir();
  if (!mevcut.some((a) => a.vknTckn.trim() === hedef)) return false;

  const yeniListe = mevcut.map((a) =>
    a.vknTckn.trim() === hedef ? { ...a, adres: degisiklik.adres, ulke: degisiklik.ulke } : a,
  );
  return listeyiYaz(anahtar, yeniListe);
}

/** Kaydı defterden siler. Kayıt yoksa ya da yazma başarısızsa false. */
export async function aliciSil(vknTckn: string): Promise<DefterSonucu> {
  const anahtar = defterAnahtari();
  if (!anahtar) return false;
  const hedef = vknTckn.trim();
  const mevcut = await aliciListesiGetir();
  const yeniListe = mevcut.filter((a) => a.vknTckn.trim() !== hedef);
  if (yeniListe.length === mevcut.length) return false;
  return listeyiYaz(anahtar, yeniListe);
}
