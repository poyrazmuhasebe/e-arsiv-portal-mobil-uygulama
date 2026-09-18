// GİB e-Arşiv portalının resmi/yayınlanmış bir API sözleşmesi yoktur.
// Aşağıdaki tipler, portalın "dispatch" servisine yapılan isteklerde/yanıtlarda
// gözlemlenen alan adlarına dayanır. Gerçek trafikte (DevTools > Network)
// farklılık görürseniz bu dosyayı buna göre güncelleyin.

export type KdvOrani = 0 | 1 | 8 | 10 | 18 | 20;

// Tam liste artık src/constants/faturaConstants.ts'te (PARA_BIRIMLERI,
// FATURA_TIPLERI) tutuluyor; burada geniş bir string olarak bırakıldı ki iki
// yerde aynı listeyi eş zamanlı güncel tutma yükü olmasın.
export type ParaBirimi = string;
export type FaturaTipi = string;

export interface FaturaSatiri {
  malHizmet: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
  iskontoOrani?: number;
  kdvOrani: KdvOrani;
  // Uygulama içi (dahili) alan adları — GİB'e giden gerçek istekte bunlar
  // "tevkifatKodu" ve seçilen vergi türü koduna göre dinamik isimlendirilen
  // "{kod}Orani"/"{kod}Tutari" alanlarına dönüştürülüyor (bkz. gibApi.ts
  // buildFaturaOlusturPayload — gerçek DevTools yakalamasıyla doğrulandı).
  kdvTevkifatKodu?: string;
  kdvTevkifatOrani?: number;
}

export interface AliciBilgisi {
  vknTckn: string;
  /** VKN (şirket) alıcılarda dolu; TCKN (şahıs) alıcılarda boş, onun yerine ad/soyad kullanılır. */
  unvan: string;
  ad?: string;
  soyad?: string;
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
  saat?: string; // "SS:DD:SS"
  faturaTipi?: FaturaTipi;
  paraBirimi?: ParaBirimi;
  dovizKuru?: number;
  irsaliyeNo?: string;
  irsaliyeTarihi?: string; // "GG/AA/YYYY"
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

// "Kullanıcı İşlemleri > Kullanıcı Bilgileri" (RG_KULLANICI) ekranındaki
// firma/mükellef bilgileri — hem GETIR yanıtının hem KAYDET isteğinin gerçek
// alan adları, kullanıcının kendi ekranından (GİB'in canlı formu) birebir
// doğrulandı. `vknTckn` GİB'in kendi ekranında SALT OKUNUR (bir <span>,
// input değil) — mükellef tarafında değiştirilemez, diğer tüm alanlar
// düzenlenebilir.
export interface KullaniciDetayBilgisi {
  vknTckn: string;
  unvan: string;
  ad: string;
  soyad: string;
  sicilNo: string;
  mersisNo: string;
  vergiDairesi: string;
  cadde: string;
  apartmanAdi: string;
  apartmanNo: string;
  kapiNo: string;
  kasaba: string;
  ilce: string;
  il: string;
  postaKodu: string;
  ulke: string;
  telNo: string;
  faksNo: string;
  ePostaAdresi: string;
  webSitesiAdresi: string;
  isMerkezi: string;
}

export interface TaslakFatura {
  ettn: string;
  // Canlı GİB yanıtıyla doğrulandı (gerçek Network yakalaması):
  // belgeNumarasi, aliciVknTckn, aliciUnvanAdSoyad, belgeTarihi ("GG-AA-YYYY",
  // tireli — sorgu parametreleri "GG/AA/YYYY" ile karıştırılmamalı),
  // belgeTuru ("FATURA"), onayDurumu ("Onaylandı" | "Onaylanmadı" | "Silinmiş").
  belgeTarihi?: string;
  aliciUnvanAdSoyad?: string;
  aliciVknTckn?: string;
  belgeNumarasi?: string;
  belgeTuru?: string;
  onayDurumu?: string;
  // EARSIV_PORTAL_FATURA_SIL isteğinde "silinecekler" dizisinin bir ögesi
  // olarak GERİ GÖNDERİLMESİ gereken alanlar — canlı yakalamayla doğrulandı.
  // taslakGetir()'in döndürdüğü ham objede zaten bu alanlar geliyor.
  faturaOid?: string;
  toplamTutar?: string;
  saticiVknTckn?: string;
  saticiUnvanAdSoyad?: string;
  talepDurumColumn?: string;
  // `iptalItiraz`/`talepDurum`: yalnızca belgede bir iptal/itiraz talebi
  // VARSA gelen alanlar (talepsiz belgelerde bu iki alan hiç yok — canlı
  // konsol yakalamasıyla doğrulandı). `iptalItiraz` talep türü ("0"=İptal
  // doğrulandı, "1"=İtiraz tahmin). `talepDurum`, TALEP_DURUM_GUNCELLE'ye
  // gönderilen `talepCevabi` ile AYNI kod şeması — kullanıcı tarafından
  // doğrulandı: "0"=Aşamasında, "1"=Kabul Edildi, "2"=Reddedildi. Kullanım
  // için bkz. TaslaklarScreen.tsx'teki iptalItirazDurumMetni().
  iptalItiraz?: string;
  talepDurum?: string;
  // Aşağıdakiler henüz doğrulanmadı / eski isim uyumluluğu için tutuluyor.
  faturaTarihi?: string;
  aliciUnvan?: string;
  genelToplam?: number;
  durum?: string;
  [key: string]: unknown;
}

// "Belge İşlemleri > İptal/İtiraz Talepleri" ekranının listesi
// (EARSIV_PORTAL_GELEN_IPTAL_ITIRAZ_TALEPLERINI_GETIR) — canlı yakalamayla
// doğrulanan sütunlar. `iptalItirazOid` tabloda görünen bir sütun değil ama
// EARSIV_PORTAL_IPTAL_ITIRAZ_TALEP_DURUM_GUNCELLE isteğinde zorunlu olduğu
// için satır objesinde geldiği VARSAYILIYOR (henüz ayrı bir liste yanıtı
// yakalamasıyla teyit edilmedi).
export interface IptalItirazTalebi {
  iptalItirazOid: string;
  belgeNumarasi?: string;
  saticiVknTckn?: string;
  saticiUnvanAdSoyad?: string;
  aliciVknTckn?: string;
  aliciUnvanAdSoyad?: string;
  iptalItirazTalepTarihi?: string;
  belgeTuru?: string;
  itirazYontemi?: string;
  referansBelgeId?: string;
  referansBelgeTarihi?: string;
  iptalItirazDurumuColumn?: string;
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
