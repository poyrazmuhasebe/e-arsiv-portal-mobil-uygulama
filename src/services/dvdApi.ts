/**
 * Dijital Vergi Dairesi (https://dijital.gib.gov.tr) istemcisi —
 * "e-Arşiv Faturalarım": mükellefin ALICI olduğu e-Arşiv faturaları
 * (elektrik, doğalgaz, telefon…).
 *
 * TÜM İSTEKLER kullanıcının 2026-09-22 tarihli tarayıcı (DevTools)
 * yakalamalarıyla BİREBİR yazıldı; alan adı uydurulmadı:
 *
 *   GET  /apigateway/captcha/getnewcaptcha
 *        → { captchaImgBase64, cid, messages }          (PNG, 135×45)
 *   POST /apigateway/auth/tdvd/login
 *        başlık: page-name: login, ui-client: fe
 *        gövde: { dk, userid, sifre, imageId }         (imageId = cid)
 *        → başarı: { messages: null, result: true, token }
 *        → hata:   { messages: [{ code, text, type: "ERROR" }] }
 *   POST /apigateway/eislemler/earsiv/alici-list        (Bearer token)
 *        gövde: { data: { duzenlenmeTarihiBas, duzenlenmeTarihiSon },   GG/AA/YYYY
 *                 meta: { pagination: { pageNo, pageSize },
 *                         sortFieldName: "faturaNo", sortType: "DESC", filters: [] } }
 *        → { messages, pageDetail: { pageNo, pageSize, total, totalPage },
 *            resultListDenormalized: [...] }
 *   POST /apigateway/auth/tdvd/logout                   (Bearer, gövde yok)
 *        → { data: { redirectUrl }, result: true }
 *
 * DOĞRULANMAYANLAR (açıkça): hatalı girişin HTTP durum kodu; oturumu düşmüş
 * bir token'ın yanıtı (401/403 varsayılıyor); tarih aralığı sınırı; `filters`
 * yapısı; iptal/itiraz alanlarının dolu değerleri. Liste yanıtında faturayı
 * açmaya yarayan bir kimlik (ETTN vb.) YOK; GİB'in kendi sayfasında da liste
 * yalnızca metin.
 *
 * GİZLİLİK: İstekler doğrudan telefondan GİB'e gider; uygulama sunucusuna
 * (Cloudflare) hiçbir şey gitmez. Token ve şifre yalnızca bellekte tutulur
 * (bkz. store/useDvdStore.ts, utils/oturumSifresi.ts). Günlüklere token,
 * şifre, güvenlik kodu ya da yanıt içeriği YAZILMAZ.
 */

export const DVD_TABAN = 'https://dijital.gib.gov.tr/apigateway';
const ZAMAN_ASIMI_MS = 20000;
const EN_UZUN_TOKEN = 1024;

export class DvdApiError extends Error {
  /** true: token geçersiz/süresi dolmuş — yeniden giriş gerekir. */
  oturumHatasi: boolean;
  /** true: güvenlik kodu (captcha) yanlış — yeni kod alınmalı. */
  guvenlikKoduHatasi: boolean;

  constructor(mesaj: string, secenek: { oturumHatasi?: boolean; guvenlikKoduHatasi?: boolean } = {}) {
    super(mesaj);
    this.name = 'DvdApiError';
    this.oturumHatasi = !!secenek.oturumHatasi;
    this.guvenlikKoduHatasi = !!secenek.guvenlikKoduHatasi;
  }
}

// ---------------------------------------------------------------------------
// Ortak istek
// ---------------------------------------------------------------------------

interface IstekSecenekleri {
  yol: string;
  yontem: 'GET' | 'POST';
  govde?: unknown;
  token?: string;
  ekBasliklar?: Record<string, string>;
  /** Giriş isteği: 401/403 "oturum sona erdi" sayılmaz (ör. yanlış şifre), GİB mesajı gösterilir. */
  girisIstegi?: boolean;
}

/** GİB'in `messages` dizisindeki metinler (ör. "Güvenlik kodunu yanlış girdiniz…"). */
export function dvdMesajlari(veri: unknown): string[] {
  const mesajlar = (veri as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(mesajlar)) return [];
  return mesajlar
    .map((m) => (m && typeof m === 'object' ? (m as { text?: unknown }).text : undefined))
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .map((t) => t.trim());
}

function guvenlikKoduHatasiMi(mesaj: string): boolean {
  return /güvenlik kodu|doğrulama kodu/i.test(mesaj);
}

async function istek(secenekler: IstekSecenekleri): Promise<unknown> {
  const basliklar: Record<string, string> = {
    accept: 'application/json, text/plain, */*',
    ...secenekler.ekBasliklar,
  };
  if (secenekler.govde !== undefined) basliklar['content-type'] = 'application/json';
  if (secenekler.token) basliklar.authorization = `Bearer ${secenekler.token}`;

  const kesici = new AbortController();
  const sayac = setTimeout(() => kesici.abort(), ZAMAN_ASIMI_MS);
  let yanit: Response;
  try {
    yanit = await fetch(`${DVD_TABAN}${secenekler.yol}`, {
      method: secenekler.yontem,
      headers: basliklar,
      body: secenekler.govde === undefined ? undefined : JSON.stringify(secenekler.govde),
      // GİB'in güvenlik duvarı çerezi (TS01…) captcha ile giriş arasında
      // korunmalı; çerezler işletim sisteminin çerez kabında tutulur.
      credentials: 'include',
      signal: kesici.signal,
    });
  } catch (hata) {
    const kesildi = hata instanceof Error && hata.name === 'AbortError';
    throw new DvdApiError(
      kesildi
        ? 'Dijital Vergi Dairesi zamanında yanıt vermedi. Bağlantınızı kontrol edip tekrar deneyin.'
        : "Dijital Vergi Dairesi'ne ulaşılamadı. İnternet bağlantınızı kontrol edin.",
    );
  } finally {
    clearTimeout(sayac);
  }

  // DOĞRULANMADI: oturumu düşmüş token'ın yanıtı görülmedi; standart
  // 401/403 varsayılıyor.
  if (!secenekler.girisIstegi && (yanit.status === 401 || yanit.status === 403)) {
    throw new DvdApiError('Dijital Vergi Dairesi oturumunuz sona erdi. Lütfen yeniden giriş yapın.', {
      oturumHatasi: true,
    });
  }

  let veri: unknown = null;
  try {
    veri = await yanit.json();
  } catch {
    veri = null;
  }

  const mesajlar = dvdMesajlari(veri);
  if (!yanit.ok) {
    if (yanit.status >= 500) {
      throw new DvdApiError(
        `Dijital Vergi Dairesi şu an hizmet vermiyor (HTTP ${yanit.status}). Birkaç dakika sonra tekrar deneyin.`,
      );
    }
    const mesaj = mesajlar[0] ?? `Dijital Vergi Dairesi isteği reddetti (HTTP ${yanit.status}).`;
    throw new DvdApiError(mesaj, { guvenlikKoduHatasi: guvenlikKoduHatasiMi(mesaj) });
  }
  if (veri === null || typeof veri !== 'object') {
    throw new DvdApiError("Dijital Vergi Dairesi'nden beklenmeyen bir yanıt geldi.");
  }
  return veri;
}

// ---------------------------------------------------------------------------
// Güvenlik kodu (captcha)
// ---------------------------------------------------------------------------

export interface DvdGuvenlikKodu {
  /** PNG, base64 (önek YOK); ekranda `data:image/png;base64,` ile gösterilir. */
  resimBase64: string;
  /** Kodun kimliği; girişte `imageId` olarak gönderilir. */
  cid: string;
}

export async function dvdGuvenlikKoduGetir(): Promise<DvdGuvenlikKodu> {
  const veri = (await istek({ yol: '/captcha/getnewcaptcha', yontem: 'GET' })) as {
    captchaImgBase64?: unknown;
    cid?: unknown;
  };
  const resim = typeof veri.captchaImgBase64 === 'string' ? veri.captchaImgBase64.trim() : '';
  const cid = typeof veri.cid === 'string' ? veri.cid.trim() : '';
  if (!/^[A-Za-z0-9+/=]+$/.test(resim) || !cid) {
    throw new DvdApiError('Güvenlik kodu alınamadı. Yenileyip tekrar deneyin.');
  }
  return { resimBase64: resim, cid };
}

// ---------------------------------------------------------------------------
// Giriş / çıkış
// ---------------------------------------------------------------------------

export interface DvdGirisBilgileri {
  /** T.C. Kimlik No / VKN / Kullanıcı Kodu (e-Arşiv girişindeki kullanıcı kodu). */
  kullaniciKodu: string;
  sifre: string;
  /** Kullanıcının yazdığı güvenlik kodu. */
  guvenlikKodu: string;
  /** dvdGuvenlikKoduGetir'in döndürdüğü cid. */
  cid: string;
}

/**
 * Başarılıysa oturum token'ı. GİB'in hata metni (ör. "Güvenlik kodunu
 * yanlış girdiniz…") DvdApiError olarak fırlatılır; güvenlik kodu yanlışsa
 * `guvenlikKoduHatasi` true olur. Her başarısız denemeden sonra yeni kod
 * alınmalı (kullanılmış kodun tekrar geçip geçmediği görülmedi).
 */
export async function dvdGirisYap(b: DvdGirisBilgileri): Promise<string> {
  const veri = (await istek({
    yol: '/auth/tdvd/login',
    yontem: 'POST',
    govde: { dk: b.guvenlikKodu.trim(), userid: b.kullaniciKodu.trim(), sifre: b.sifre, imageId: b.cid },
    ekBasliklar: { 'page-name': 'login', 'ui-client': 'fe' },
    girisIstegi: true,
  })) as { result?: unknown; token?: unknown };

  const token = typeof veri.token === 'string' ? veri.token.trim() : '';
  if (veri.result === true && token && token.length <= EN_UZUN_TOKEN && !/\s/.test(token)) {
    return token;
  }
  const mesaj = dvdMesajlari(veri)[0] ?? 'Dijital Vergi Dairesi girişi başarısız oldu.';
  throw new DvdApiError(mesaj, { guvenlikKoduHatasi: guvenlikKoduHatasiMi(mesaj) });
}

/** GİB tarafında oturumu kapatır. Hata fırlatmaz (yerel temizlik her durumda yapılır). */
export async function dvdCikisYap(token: string): Promise<void> {
  try {
    await istek({ yol: '/auth/tdvd/logout', yontem: 'POST', token });
  } catch {
    // ağ yoksa ya da token zaten geçersizse yoksay
  }
}

// ---------------------------------------------------------------------------
// e-Arşiv Faturalarım (alıcı listesi)
// ---------------------------------------------------------------------------

export interface DvdEarsivFatura {
  faturaNo: string;
  /** Ham: "YYYY-AA-GG SS:DD:ss" */
  duzenlenmeTarihi?: string;
  /** SATICININ unvanı (mükellef bu faturada alıcı). */
  saticiUnvan?: string;
  /** Satıcı VKN ya da TCKN (boşluk dolgulu alanlar kırpılır). */
  saticiVknTckn?: string;
  toplamTutar?: number;
  vergilerTutari?: number;
  /** GİB metin olarak gönderiyor ("920.00"); sayıya çevrilir. */
  odenecekTutar?: number;
  paraBirimi?: string;
  /** "KAGIT" | "ELEKTRONIK" (görülen değerler) */
  gonderimSekli?: string;
  tesisatNumarasi?: string;
  iptalItirazDurum?: string;
  iptalItirazTarihi?: string;
}

function metin(v: unknown): string | undefined {
  if (typeof v === 'number') return String(v);
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

function sayi(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Tek kaydı normalleştirir; fatura numarası yoksa null. */
export function dvdFaturaCoz(ham: unknown): DvdEarsivFatura | null {
  if (!ham || typeof ham !== 'object') return null;
  const k = ham as Record<string, unknown>;
  const faturaNo = metin(k.faturaNo);
  if (!faturaNo) return null;
  return {
    faturaNo,
    duzenlenmeTarihi: metin(k.duzenlenmeTarihi),
    saticiUnvan: metin(k.unvan),
    saticiVknTckn: metin(k.tcknVkn) ?? metin(k.mukellefVkn) ?? metin(k.mukellefTckn),
    toplamTutar: sayi(k.toplamTutar),
    vergilerTutari: sayi(k.vergilerTutari),
    odenecekTutar: sayi(k.odenecekTutar),
    paraBirimi: metin(k.paraBirimi),
    gonderimSekli: metin(k.gonderimSekli),
    tesisatNumarasi: metin(k.tesisatNumarasi),
    iptalItirazDurum: metin(k.iptalItirazDurum),
    iptalItirazTarihi: metin(k.iptalItirazTarihi),
  };
}

export interface DvdSayfa {
  faturalar: DvdEarsivFatura[];
  sayfa: number;
  toplam: number;
  toplamSayfa: number;
}

export const DVD_SAYFA_BOYUTU = 10;

/**
 * Mükellefin alıcı olduğu e-Arşiv faturaları. Tarihler "GG/AA/YYYY".
 * GİB istenen sıralamayı uygulamıyor görünüyor (yakalamada sıra ne numaraya
 * ne tarihe göre) — sıralama ekranda yapılır.
 */
export async function dvdEarsivFaturalariGetir(
  token: string,
  filtre: { baslangic: string; bitis: string; sayfa: number },
): Promise<DvdSayfa> {
  const veri = (await istek({
    yol: '/eislemler/earsiv/alici-list',
    yontem: 'POST',
    token,
    govde: {
      data: { duzenlenmeTarihiBas: filtre.baslangic, duzenlenmeTarihiSon: filtre.bitis },
      meta: {
        pagination: { pageNo: filtre.sayfa, pageSize: DVD_SAYFA_BOYUTU },
        sortFieldName: 'faturaNo',
        sortType: 'DESC',
        filters: [],
      },
    },
  })) as { resultListDenormalized?: unknown; pageDetail?: unknown };

  const liste = veri.resultListDenormalized;
  if (!Array.isArray(liste)) {
    const mesaj = dvdMesajlari(veri)[0];
    if (mesaj) throw new DvdApiError(mesaj);
    // Kayıt yoksa GİB boş dizi yerine alanı hiç göndermeyebilir (görülmedi).
    if (veri.resultListDenormalized === null || veri.resultListDenormalized === undefined) {
      return { faturalar: [], sayfa: filtre.sayfa, toplam: 0, toplamSayfa: 0 };
    }
    throw new DvdApiError("Dijital Vergi Dairesi'nden beklenmeyen bir fatura listesi geldi.");
  }
  const sayfaBilgisi = (veri.pageDetail ?? {}) as Record<string, unknown>;
  const faturalar = liste.map(dvdFaturaCoz).filter((f): f is DvdEarsivFatura => f !== null);
  return {
    faturalar,
    sayfa: sayi(sayfaBilgisi.pageNo) ?? filtre.sayfa,
    toplam: sayi(sayfaBilgisi.total) ?? faturalar.length,
    toplamSayfa: sayi(sayfaBilgisi.totalPage) ?? 1,
  };
}

// ---------------------------------------------------------------------------
// Gösterim yardımcıları (saf)
// ---------------------------------------------------------------------------

/** "2026-08-07 14:29:30" → "07.08.2026 14:29" */
export function dvdTarihiGoster(t: string | undefined): string | undefined {
  const m = t ? /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(t) : null;
  if (!m) return t;
  return `${m[3]}.${m[2]}.${m[1]}${m[4] ? ` ${m[4]}:${m[5]}` : ''}`;
}

/** Yeniden eskiye: düzenlenme tarihi, eşitse fatura no. */
export function dvdFaturalariSirala(liste: DvdEarsivFatura[]): DvdEarsivFatura[] {
  return [...liste].sort(
    (a, b) =>
      (b.duzenlenmeTarihi ?? '').localeCompare(a.duzenlenmeTarihi ?? '') || b.faturaNo.localeCompare(a.faturaNo),
  );
}
