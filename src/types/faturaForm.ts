import type { KdvOrani } from './gib';

export interface KalemVergisi {
  tur: string; // VERGI_TURLERI value (ör. "V9015" = KDV Tevkifat)
  tevkifatKodu?: string; // TEVKIFAT_KODLARI value (ör. "601")
  tevkifatOrani?: number; // % — seçilen tevkifat koduna göre otomatik dolar
}

export interface KalemFormu {
  id: string;
  malHizmet: string;
  miktar: string;
  birim: string;
  birimFiyat: string;
  iskontoOrani: string;
  kdvOrani: KdvOrani;
  ekVergi?: KalemVergisi;
}

export interface AliciFormu {
  vknTckn: string;
  unvan: string;
  ad: string;
  soyad: string;
  vergiDairesi: string;
  ulke: string;
  adres: string;
}

export interface KayitliAlici extends AliciFormu {
  kayitTarihi: string;
}

export interface FaturaFormState {
  faturaTarihi: Date;
  faturaSaati: Date;
  paraBirimi: string;
  dovizKuru: string;
  faturaTipi: string;
  alici: AliciFormu;
  irsaliyeNo: string;
  irsaliyeTarihi: Date | null;
  kalemler: KalemFormu[];
  not: string;
}
