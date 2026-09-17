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

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (!isSupported) return;
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Depolama başarısız olsa da oturumun kendisi bellekte geçerli kalmaya devam eder.
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
