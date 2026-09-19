import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store yalnızca iOS/Android'de çalışır; web'de (Expo Web önizlemesi
// dahil) native modül bulunmadığından çağrılar hata fırlatır. Hedef platformlar
// iOS ve Android olduğu için gerçek cihazlarda davranış değişmiyor, web burada
// sessizce devre dışı kalıyor.
const isSupported = Platform.OS !== 'web';

export async function getSecureItem(key: string): Promise<string | null> {
  const sonuc = await secureItemOku(key);
  return sonuc.basarili ? sonuc.deger : null;
}

export type OkumaSonucu = { basarili: true; deger: string | null } | { basarili: false };

/**
 * getSecureItem gibi, ama okuma HATASINI "değer yok"tan ayırır. Parçalı
 * defterler (bolunmusDefter.ts), okunamayan bir değeri yok sayıp üzerine
 * yazarak veri kaybetmesin diye bunu kullanır. Web'de "değer yok" döner.
 */
export async function secureItemOku(key: string): Promise<OkumaSonucu> {
  if (!isSupported) return { basarili: true, deger: null };
  try {
    return { basarili: true, deger: await SecureStore.getItemAsync(key) };
  } catch {
    return { basarili: false };
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

/** Hata fırlatmaz; silmenin başarılı olup olmadığını döndürür (web'de false). */
export async function deleteSecureItem(key: string): Promise<boolean> {
  if (!isSupported) return false;
  try {
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch {
    return false;
  }
}
