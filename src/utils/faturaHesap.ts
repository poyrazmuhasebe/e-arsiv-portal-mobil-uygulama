import { TEVKIFAT_KODLARI } from '../constants/faturaConstants';
import type { KalemFormu } from '../types/faturaForm';

export function parseNumara(deger: string): number {
  const normalized = deger.trim().replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
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
