import { paraFormatla } from './faturaHesap';

// Tutar etiketlerinde gösterilecek para birimi simgesi. YALNIZCA ekranda
// gösterim içindir; GİB'e giden veri (paraBirimi kodu, tutarlar) bundan
// etkilenmez.
//
// Bilerek kısa tutuldu: yalnızca tek bir para birimine karşılık gelen,
// karışıklık yaratmayacak simgeler. "$" (USD, CAD, AUD...), "¥" (JPY, CNY) gibi
// birden fazla para biriminde kullanılan simgelerde yanlış anlaşılmayı
// önlemek için USD dışındakilerde kodun kendisi gösterilir.
const SIMGELER: Readonly<Record<string, string>> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/** Para birimi kodunun simgesi; bilinmeyen kodda kodun kendisi (ör. "CHF"). */
export function paraBirimiSimgesi(kod: string): string {
  const temiz = kod.trim().toUpperCase();
  return SIMGELER[temiz] ?? temiz;
}

/** "1.234,50 ₺" / "1.234,50 CHF" biçiminde tutar etiketi. */
export function tutarEtiketi(tutar: number, paraBirimiKodu: string): string {
  const simge = paraBirimiSimgesi(paraBirimiKodu);
  return simge ? `${paraFormatla(tutar)} ${simge}` : paraFormatla(tutar);
}
