/**
 * Zorunlu güncelleme gerektiğinde (bkz. utils/surumKontrolu.ts) GİB e-Arşiv
 * ve Dijital Vergi Dairesi oturumlarını kapatır. Uygulama hesabı oturumu
 * KAPATILMAZ: güncellemeden sonra kullanıcı yeniden hesap girişi yapmak
 * zorunda kalmasın. Ekranın ana ekrana dönmesi App.tsx'te yapılır.
 *
 * Ağ hatası yerel temizliği engellemez: her iki store da GİB'e çıkış isteği
 * başarısız olsa bile token'ı yerelde siler.
 */

import { useAuthStore } from '../store/useAuthStore';
import { useDvdStore } from '../store/useDvdStore';

export async function guncellemeIcinOturumlariKapat(): Promise<void> {
  // Önce Dijital VD: GİB çıkışı da (useDvdStore aboneliğiyle) DVD çıkışını
  // tetikliyor; sırayla gidilince ikinci bir çıkış isteği atılmaz.
  try {
    await useDvdStore.getState().cikisYap();
  } catch {
    useDvdStore.getState().oturumuUnut();
  }
  try {
    await useAuthStore.getState().logout();
  } catch {
    // logout() kendi içinde ağ hatasını yutar; yine de açılış akışı bozulmasın.
  }
}
