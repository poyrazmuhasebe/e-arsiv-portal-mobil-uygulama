import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store yalnızca iOS/Android'de çalışır; web'de (Expo Web önizlemesi
// dahil) native modül bulunmadığından çağrılar hata fırlatır. Hedef platformlar
// iOS ve Android olduğu için gerçek cihazlarda davranış değişmiyor, web burada
// sessizce devre dışı kalıyor.
const isSupported = Platform.OS !== 'web';

export async function getSecureItem(key: string): Promise<string | null> {
  if (!isSupported) return null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

/**
 * Hata fırlatmaz; yazmanın başarılı olup olmadığını döndürür. SecureStore
 * dokümanına göre büyük değerler işletim sistemi tarafından reddedilebilir
 * (sabit bir sınır belgelenmiyor) — kullanıcıya "kaydedildi" demeden önce
 * dönüş değerine bakın. Web'de (desteklenmiyor) false döner.
 */
export async function setSecureItem(key: string, value: string): Promise<boolean> {
  if (!isSupported) return false;
  try {
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch {
    // Depolama başarısız olsa da oturumun kendisi bellekte geçerli kalmaya devam eder.
    return false;
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (!isSupported) return;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // yoksay
  }
}
