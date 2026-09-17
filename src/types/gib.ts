// GİB e-Arşiv portalının resmi/yayınlanmış bir API sözleşmesi yoktur.
// Aşağıdaki tipler, portalın "dispatch" servisine yapılan isteklerde/yanıtlarda
// gözlemlenen alan adlarına dayanır. Gerçek trafikte (DevTools > Network)
// farklılık görürseniz bu dosyayı buna göre güncelleyin.

export type KdvOrani = 0 | 1 | 8 | 10 | 18 | 20;

export type ParaBirimi = 'TRY' | 'USD' | 'EUR' | 'GBP';

export type FaturaTipi = 'SATIS' | 'IADE' | 'TEVKIFAT' | 'ISTISNA' | 'OZELMATRAH' | 'IHRACKAYITLI';

export interface FaturaSatiri {
  malHizmet: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
  iskontoOrani?: number;
  kdvOrani: KdvOrani;
}

export interface AliciBilgisi {
  vknTckn: string;
  unvan: string;
  vergiDairesi?: string;
  adres: string;
  ilce?: string;
  il?: string;
  ulke?: string;
  telefon?: string;
  eposta?: string;
}

export interface FaturaTaslagi {
  alici: AliciBilgisi;
  satirlar: FaturaSatiri[];
  faturaTarihi: string; // "GG/AA/YYYY"
  saat?: string; // "SS:DD"
  faturaTipi?: FaturaTipi;
  paraBirimi?: ParaBirimi;
  not?: string;
}

export interface FaturaOzet {
  altToplam: number;
  kdvToplam: number;
  genelToplam: number;
}

export interface KullaniciBilgisi {
  unvan?: string;
  vknTckn?: string;
  [key: string]: unknown;
}

export interface TaslakFatura {
  ettn: string;
  faturaTarihi?: string;
  aliciUnvan?: string;
  genelToplam?: number;
  durum?: string;
  [key: string]: unknown;
}

export interface GibMesaj {
  type?: string;
  // GİB'in hangi alan adını kullandığı doğrulanmadı; ikisi de görülmüş.
  message?: string;
  text?: string;
}

export interface DispatchEnvelope<T = unknown> {
  data?: T;
  // GİB "error" alanını boolean değil, "0" (başarılı) / "1" (hata) gibi
  // STRING olarak dönebiliyor — "0" JS'te truthy olduğundan bunu boolean
  // gibi ele almak başarılı yanıtları yanlışlıkla hataya çevirir.
  error?: boolean | string;
  messages?: GibMesaj[];
}
