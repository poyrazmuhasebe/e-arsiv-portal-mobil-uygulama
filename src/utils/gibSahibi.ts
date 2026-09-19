/**
 * GİB oturumunun sahibi olan uygulama hesabının kimliği.
 *
 * NEDEN VAR: `gib_token` ve `gib_kullanici_kodu` anahtarlarında hesap kimliği
 * yoktu. Hesap sistemi eklenince bu bir sızma yolu olurdu — cihazda kalan bir
 * GİB oturumu, sonra giren HERHANGİ BİR uygulama hesabına sessizce geri
 * yüklenirdi ve o kişi başkasının GİB oturumunu, dolayısıyla o hesabın alıcı
 * ve mal/hizmet defterlerini görürdü.
 *
 * Çözüm: GİB oturumu kaydedilirken sahibinin kimliği de yazılır. Açılışta
 * kimlik eşleşmiyorsa GİB oturumu geri yüklenmez.
 *
 * Bu anahtar `gib_` DEĞİL `hesap_` öneklidir: GİB verisi değil, uygulama
 * hesabı verisidir.
 */

import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStorage';

export const GIB_SAHIBI_KEY = 'hesap_gib_sahibi';

export async function gibSahibiniKaydet(hesapKullaniciId: string): Promise<boolean> {
  return setSecureItem(GIB_SAHIBI_KEY, hesapKullaniciId);
}

export async function gibSahibiniOku(): Promise<string | null> {
  return getSecureItem(GIB_SAHIBI_KEY);
}

export async function gibSahibiniSil(): Promise<boolean> {
  return deleteSecureItem(GIB_SAHIBI_KEY);
}

/**
 * Cihazda duran GİB oturumu, şu an açık olan uygulama hesabına geri
 * yüklenebilir mi?
 *
 * - `sahip === null`: SAHİPSİZ oturum. Güncellemeden önce açılmış, hangi
 *   hesaba ait olduğu bilinemiyor → geri yüklenmez (karar: silinir).
 * - `aktifHesapId === null`: uygulama hesabı oturumu yok → geri yüklenmez.
 * - Kimlikler farklı: telefonu başka bir uygulama hesabı kullanıyor →
 *   geri yüklenmez.
 */
export function gibOturumuGeriYuklenebilirMi(
  sahip: string | null,
  aktifHesapId: string | null,
): boolean {
  if (sahip === null || sahip.length === 0) return false;
  if (aktifHesapId === null || aktifHesapId.length === 0) return false;
  return sahip === aktifHesapId;
}
