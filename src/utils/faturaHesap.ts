import { TEVKIFAT_KODLARI } from '../constants/faturaConstants';
import type { KalemFormu } from '../types/faturaForm';

// Yalnızca rakamlar ve TEK bir ondalık ayraç (nokta ya da virgül) kabul edilir.
// JavaScript'in Number()'ı "0x10" (onaltılık), "0b11" (ikilik), "1e3" (üstel) ve
// "-5" gibi girdileri de sayıya çevirdiğinden, ham Number()'a güvenmiyoruz.
const SAYI_DESENI = /^(\d+([.,]\d*)?|[.,]\d+)$/;

/** Boş olmayan bir metin geçerli (negatif olmayan, ondalıklı) bir sayı mı? */
export function gecerliSayiMi(deger: string): boolean {
  return SAYI_DESENI.test(deger.trim());
}

/** Geçersiz/boş girdide 0 döner. Negatif, onaltılık, üstel gösterim reddedilir. */
export function parseNumara(deger: string): number {
  const temiz = deger.trim();
  if (!SAYI_DESENI.test(temiz)) return 0;
  const n = Number(temiz.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

// Makul üst sınırlar: aşırı büyük değerler hem hatalı taslağa yol açar hem de
// büyük sayıların üstel ("1e+21") gösterimine düşüp GİB'e bozuk gitmesine.
export const MAX_MIKTAR = 1_000_000_000;
export const MAX_BIRIM_FIYAT = 10_000_000_000;
export const MAX_ISKONTO_ORANI = 100;

/**
 * Kalem alanlarında (miktar, birim fiyat, iskonto) GİRİLMİŞ ama geçersiz/aralık
 * dışı bir değer varsa kullanıcıya gösterilecek ilk hata metnini döndürür;
 * yoksa null. Boş alanlar burada hata sayılmaz (onları "Oluştur" düğmesinin
 * mevcut zorunlu-alan kontrolü ayrıca yakalar).
 */
export function kalemlerAralikHatasi(kalemler: KalemFormu[]): string | null {
  for (let i = 0; i < kalemler.length; i++) {
    const k = kalemler[i];
    const onEk = `${i + 1}. kalem: `;

    const alanlar: Array<[string, string, number]> = [
      ['Miktar', k.miktar, MAX_MIKTAR],
      ['Birim fiyat', k.birimFiyat, MAX_BIRIM_FIYAT],
      ['İskonto oranı', k.iskontoOrani, MAX_ISKONTO_ORANI],
    ];
    for (const [ad, deger, ustSinir] of alanlar) {
      if (deger.trim().length === 0) continue;
      if (!gecerliSayiMi(deger)) {
        return `${onEk}${ad} geçerli bir sayı olmalıdır (yalnızca rakam ve virgül/nokta).`;
      }
      if (parseNumara(deger) > ustSinir) {
        return ad === 'İskonto oranı'
          ? `${onEk}İskonto oranı 0 ile ${MAX_ISKONTO_ORANI} arasında olmalıdır.`
          : `${onEk}${ad} en fazla ${ustSinir.toLocaleString('tr-TR')} olabilir.`;
      }
    }
  }
  return null;
}

export interface KalemHesabi {
  bruttTutar: number; // miktar * birimFiyat (iskonto öncesi)
  iskontoTutari: number;
  netTutar: number; // Mal/Hizmet Tutarı (iskonto sonrası, KDV matrahı)
  kdvTutari: number;
  tevkifatOrani?: number; // pay/10
  tevkifatTutari: number;
}

export function kalemHesapla(kalem: KalemFormu): KalemHesabi {
  const miktar = parseNumara(kalem.miktar);
  const birimFiyat = parseNumara(kalem.birimFiyat);
  const iskontoOrani = parseNumara(kalem.iskontoOrani);

  const bruttTutar = miktar * birimFiyat;
  const iskontoTutari = bruttTutar * (iskontoOrani / 100);
  const netTutar = bruttTutar - iskontoTutari;
  const kdvTutari = netTutar * (kalem.kdvOrani / 100);

  let tevkifatOrani: number | undefined;
  let tevkifatTutari = 0;
  if (kalem.ekVergi?.tur === 'V9015' && kalem.ekVergi.tevkifatKodu) {
    const kod = TEVKIFAT_KODLARI.find((k) => k.value === kalem.ekVergi?.tevkifatKodu);
    if (kod) {
      tevkifatOrani = kod.oran;
      tevkifatTutari = kdvTutari * (kod.oran / 10);
    }
  }

  return { bruttTutar, iskontoTutari, netTutar, kdvTutari, tevkifatOrani, tevkifatTutari };
}

export interface FaturaOzeti {
  malHizmetToplam: number;
  toplamIskonto: number;
  hesaplananKdv: number;
  tevkifataTabiTutar: number;
  tevkifataTabiUzerindenKdv: number;
  hesaplananKdvTevkifat: number;
  vergilerDahilToplam: number;
  odenecekTutar: number;
  tevkifatVarMi: boolean;
}

export function faturaOzetiHesapla(kalemler: KalemFormu[]): FaturaOzeti {
  let malHizmetToplam = 0;
  let toplamIskonto = 0;
  let hesaplananKdv = 0;
  let tevkifataTabiTutar = 0;
  let tevkifataTabiUzerindenKdv = 0;
  let hesaplananKdvTevkifat = 0;
  let tevkifatVarMi = false;

  for (const kalem of kalemler) {
    const h = kalemHesapla(kalem);
    malHizmetToplam += h.netTutar;
    toplamIskonto += h.iskontoTutari;
    hesaplananKdv += h.kdvTutari;

    if (h.tevkifatOrani !== undefined) {
      tevkifatVarMi = true;
      tevkifataTabiTutar += h.netTutar;
      tevkifataTabiUzerindenKdv += h.kdvTutari;
      hesaplananKdvTevkifat += h.tevkifatTutari;
    }
  }

  const vergilerDahilToplam = malHizmetToplam + hesaplananKdv;
  const odenecekTutar = vergilerDahilToplam - hesaplananKdvTevkifat;

  return {
    malHizmetToplam,
    toplamIskonto,
    hesaplananKdv,
    tevkifataTabiTutar,
    tevkifataTabiUzerindenKdv,
    hesaplananKdvTevkifat,
    vergilerDahilToplam,
    odenecekTutar,
    tevkifatVarMi,
  };
}

export function paraFormatla(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
