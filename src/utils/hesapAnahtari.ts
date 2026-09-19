import { useAuthStore } from '../store/useAuthStore';

/**
 * Oturumdaki kullanıcı koduna özel SecureStore anahtarı; oturum yoksa null.
 *
 * Birden fazla mükellefin hesabına giren bir mali müşavir, bir müşterisinin
 * verisini (alıcılar, mal/hizmet adları) diğer müşterisi için çalışırken
 * görmesin diye cihazdaki defterler giriş yapan kullanıcı koduna özel tutulur.
 * SecureStore anahtarları yalnızca harf/rakam ve ".", "-", "_" kabul ettiği
 * için kullanıcı kodu, karakter kodlarının onaltılık gösterimine çevriliyor
 * (farklı kodlar asla aynı anahtara düşmez). Ör. "123" → `<onek>31-32-33`.
 */
export function hesabaOzelAnahtar(onek: string): string | null {
  const kod = useAuthStore.getState().kullaniciKodu?.trim();
  if (!kod) return null;
  const hex = Array.from(kod)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join('-');
  return onek + hex;
}
