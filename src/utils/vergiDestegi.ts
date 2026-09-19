import { KDV_TEVKIFAT_VERGI_TURU, VERGI_TURLERI, type SecenekOgesi } from '../constants/faturaConstants';
import type { KalemFormu } from '../types/faturaForm';

// GİB'in "Vergi Seçiniz" listesindeki 29 türden yalnızca KDV Tevkifat (V9015)
// için gerçek, başarılı bir GİB isteği yakalandı ve hesaplama/alan adları
// biliniyor (bkz. gibApi.ts buildFaturaOlusturPayload). Diğer türlerin GİB'e
// nasıl gönderildiği (alan adları, matrah/oran kuralları) bilinmediğinden
// hesaplanmıyor; eskiden seçilebiliyor ama sessizce yok sayılıyordu. Artık
// seçicide pasif ("henüz desteklenmiyor") gösteriliyorlar.
const DESTEKLENEN_VERGI_TURLERI: ReadonlySet<string> = new Set([KDV_TEVKIFAT_VERGI_TURU]);

// KDV tevkifatı yalnızca bu fatura tiplerinde anlamlı.
const TEVKIFAT_DESTEKLEYEN_FATURA_TIPLERI: ReadonlySet<string> = new Set([
  'TEVKIFAT',
  'TEVKIFATIADE',
  'YTBTEVKIFAT',
  'YTBTEVKIFATIADE',
]);

export const DESTEKLENMIYOR_EKI = ' (henüz desteklenmiyor)';

export function vergiTuruDesteklenirMi(kod: string): boolean {
  return DESTEKLENEN_VERGI_TURLERI.has(kod);
}

export function tevkifatFaturaTipiyleUyumluMu(faturaTipi: string): boolean {
  return TEVKIFAT_DESTEKLEYEN_FATURA_TIPLERI.has(faturaTipi);
}

/** "Vergi Seçiniz" seçicisi için: desteklenmeyen türler pasif ve etiketli. */
export const VERGI_SECENEKLERI: SecenekOgesi[] = VERGI_TURLERI.map((v) =>
  vergiTuruDesteklenirMi(v.value) ? v : { ...v, label: v.label + DESTEKLENMIYOR_EKI, disabled: true },
);

/**
 * Tek bir kalemin ek vergisinde, GİB'e gönderilecek faturayı ekranda
 * görünenden farklı kılacak (sessizce yok sayılacak ya da istenmeden
 * uygulanacak) bir durum varsa açıklaması; yoksa null.
 */
export function kalemVergiHatasi(kalem: KalemFormu, faturaTipi: string): string | null {
  const vergi = kalem.ekVergi;
  if (!vergi) return null;

  if (!vergiTuruDesteklenirMi(vergi.tur)) {
    const ad = VERGI_TURLERI.find((v) => v.value === vergi.tur)?.label ?? vergi.tur;
    return `"${ad}" vergi türü henüz desteklenmiyor ve faturaya yansımaz. Lütfen bu vergiyi kaldırın.`;
  }
  // Buradan sonrası KDV Tevkifat (desteklenen tek tür).
  if (!tevkifatFaturaTipiyleUyumluMu(faturaTipi)) {
    return 'KDV Tevkifat yalnızca Fatura Tipi "TEVKİFAT" (ya da ilgili iade/yatırım teşvik türü) iken uygulanabilir. Fatura tipini değiştirin ya da vergiyi kaldırın.';
  }
  if (!vergi.tevkifatKodu) {
    return 'KDV Tevkifat için bir tevkifat kodu seçin ya da vergiyi kaldırın.';
  }
  return null;
}

/**
 * Tüm kalemler için ilk vergi hatası ("N. kalem: ..." önekiyle); yoksa null.
 * Hata varken "Oluştur" pasif kalır.
 */
export function vergiUyumsuzlukHatasi(kalemler: KalemFormu[], faturaTipi: string): string | null {
  for (let i = 0; i < kalemler.length; i++) {
    const hata = kalemVergiHatasi(kalemler[i], faturaTipi);
    if (hata) return `${i + 1}. kalem: ${hata}`;
  }
  return null;
}
