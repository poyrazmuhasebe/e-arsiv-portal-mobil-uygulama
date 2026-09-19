import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { getSecureItem, setSecureItem } from './secureStorage';

// Uygulama kilidi: oturum (token) cihazda kalıcı saklandığından, kilidi açık
// bir telefonu eline geçiren biri uygulamayı açıp mükellef adına işlem
// yapamasın diye, cihazın kendi kilit yöntemiyle (parmak izi/yüz/PIN/desen/
// parola) doğrulama istenir. Uygulamaya özel ayrı bir şifre TUTULMAZ; doğrulamayı
// işletim sistemi yapar.

const KILIT_AYAR_KEY = 'gib_uygulama_kilidi';

/** Uygulama arka plandan bu süreden uzun sonra dönerse tekrar kilitlenir. */
export const KILIT_ZAMAN_ASIMI_MS = 3 * 60 * 1000;

/** Kullanıcı ayarı. Varsayılan AÇIK; yalnızca açıkça '0' kaydedildiyse kapalı. */
export async function kilitAyariAcikMi(): Promise<boolean> {
  return (await getSecureItem(KILIT_AYAR_KEY)) !== '0';
}

export async function kilitAyariniKaydet(acik: boolean): Promise<void> {
  await setSecureItem(KILIT_AYAR_KEY, acik ? '1' : '0');
}

/**
 * Cihazda kilit açmak için kullanılabilecek bir yöntem (PIN/desen/parola ya da
 * parmak izi/yüz) tanımlı mı? Tanımlı değilse kilit uygulanamaz. Web'de false.
 */
export async function cihazKilidiVarMi(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const seviye = await LocalAuthentication.getEnrolledLevelAsync();
    return seviye !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

/** Şu an kilit ekranı gösterilmeli mi? Ayar açık VE cihazda kilit yöntemi varsa. */
export async function kilitGerekliMi(): Promise<boolean> {
  return (await kilitAyariAcikMi()) && (await cihazKilidiVarMi());
}

/**
 * Uygulama arka plandan dönerken tekrar kilitlenmeli mi? Saat geri alınmışsa
 * (geçen süre negatif) güvenli tarafta kalıp kilitler.
 */
export function zamanAsimiDolduMu(
  arkaPlanaGecisMs: number | null,
  simdiMs: number,
  esikMs: number = KILIT_ZAMAN_ASIMI_MS,
): boolean {
  if (arkaPlanaGecisMs === null) return false;
  const gecen = simdiMs - arkaPlanaGecisMs;
  return gecen < 0 || gecen >= esikMs;
}

export type KilitSonucu = { basarili: true } | { basarili: false; hata: string };

/** Cihazın kendi doğrulama penceresini açar (cihaz PIN/desen yedeği dahil). */
export async function kilidiAcmayiDene(mesaj: string = 'e-Arşiv Portal kilidini açın'): Promise<KilitSonucu> {
  try {
    const sonuc = await LocalAuthentication.authenticateAsync({
      promptMessage: mesaj,
      cancelLabel: 'Vazgeç',
      disableDeviceFallback: false,
    });
    return sonuc.success ? { basarili: true } : { basarili: false, hata: sonuc.error };
  } catch {
    return { basarili: false, hata: 'unknown' };
  }
}

/**
 * Doğrulama hatasının, kullanıcının kilidi aşmasına yol açmadan kilit ekranını
 * KAPATMAYI haklı kılıp kılmadığı: cihazda artık hiç kilit yöntemi kalmamışsa
 * (ör. kullanıcı ekran kilidini kaldırdı) doğrulama yapılamaz, kullanıcı kendi
 * uygulamasından kilitli kalmasın.
 */
export function kilitUygulanamazMi(hata: string): boolean {
  return hata === 'not_enrolled' || hata === 'passcode_not_set' || hata === 'not_available';
}

/** Kullanıcıya gösterilecek kısa açıklama; sessiz iptallerde (kullanıcı vazgeçti) null. */
export function kilitHataMesaji(hata: string): string | null {
  switch (hata) {
    case 'user_cancel':
    case 'system_cancel':
    case 'app_cancel':
    case 'user_fallback':
      return null;
    case 'lockout':
      return 'Çok fazla hatalı deneme yapıldı. Bir süre bekleyip tekrar deneyin.';
    case 'authentication_failed':
      return 'Kimlik doğrulanamadı. Lütfen tekrar deneyin.';
    case 'timeout':
      return 'Doğrulama süresi doldu. Lütfen tekrar deneyin.';
    default:
      return 'Kilit açılamadı. Lütfen tekrar deneyin.';
  }
}
