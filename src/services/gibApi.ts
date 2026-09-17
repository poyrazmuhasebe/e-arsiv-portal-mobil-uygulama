// GİB e-Arşiv Portal istemci servisi.
//
// ÖNEMLİ: IS_TEST_MODE=true iken login/getKullaniciBilgileri/taslakGetir/
// faturaKaydet GİB'e HİÇ istek atmaz — GİB'in test portalı kararsız
// davrandığı için (bkz. "doğrulama hatası (type 5)") UI geliştirmesini ondan
// bağımsızlaştırmak amacıyla sahte (mock) verilerle çalışır. BASE_URL/
// ASSOS_LOGIN_URL yine de test portalına işaret eder (mock kapatılıp gerçek
// isteklere dönüldüğünde kullanılsın diye); ama IS_TEST_MODE=true olduğu
// sürece bu URL'ler fiilen çağrılmaz. Canlıya geçerken bunu false yapın.
//
// earsiv-services/dispatch resmi/yayınlanmış
// bir API değildir; portalın kendi web arayüzünün kullandığı iç bir servistir.
// Alan adları (jp içeriği, yanıt şekli) GİB tarafında haber verilmeden
// değişebilir. Gerçek bir hesapla test ederken DevTools > Network sekmesinden
// gözlemlediğiniz gerçek istek/yanıtlarla bu dosyayı doğrulayıp güncelleyin;
// özellikle FATURA_KAYDET, SMSSIFRE_GONDER/ONAYLA komutlarının "jp" gövdeleri
// portal sürümüne göre farklılık gösterebilir.

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import type {
  AliciBilgisi,
  DispatchEnvelope,
  FaturaTaslagi,
  KullaniciBilgisi,
  TaslakFatura,
} from '../types/gib';

// GİB'in yayınladığı test/sandbox portalı — gerçek mükellef hesaplarını
// etkilemeden fatura kesim akışını (taslak kaydet, SMS onay vb.) denemek
// için kullanılır. false iken gerçek/canlı earsivportal.efatura.gov.tr'ye
// ve mock olmayan gerçek Axios isteklerine geçilir.
export const IS_TEST_MODE = false;

const PORTAL_HOST = IS_TEST_MODE
  ? 'earsivportaltest.efatura.gov.tr'
  : 'earsivportal.efatura.gov.tr';

const BASE_URL = `https://${PORTAL_HOST}/earsiv-services/dispatch`;
// Giriş (login) işlemi dispatch/jp yapısını kullanmıyor; tarayıcı Network
// yakalamasıyla doğrulandı: ayrı, düz form-data alan bir uç nokta.
const ASSOS_LOGIN_URL = `https://${PORTAL_HOST}/earsiv-services/assos-login`;

// Portal, isteklerin kendi web sayfasından (intragiris.html) geliyormuş gibi
// standart bir tarayıcı isteğine ait Origin/Referer/User-Agent/Accept
// başlıklarını taşımasını bekleyebilir. Bunlar gizli bir bypass değil,
// herhangi bir tarayıcı isteğinde zaten açıkça görünen standart HTTP
// başlıklarıdır.
const DEFAULT_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  Accept: 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'X-Requested-With': 'XMLHttpRequest',
  Referer: `https://${PORTAL_HOST}/intragiris.html`,
  Origin: `https://${PORTAL_HOST}`,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

const REQUEST_TIMEOUT_MS = 20000;

export class GibApiError extends Error {
  /** GİB'in döndüğü ham mesaj listesi veya yakalanan alt hata. */
  raw?: unknown;

  constructor(message: string, raw?: unknown) {
    super(message);
    this.name = 'GibApiError';
    this.raw = raw;
  }
}

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    timeout: REQUEST_TIMEOUT_MS,
    headers: DEFAULT_HEADERS,
    // GİB portalı 200 dışı HTTP kodlarında da anlamlı gövde dönebiliyor;
    // durum kodunu burada değil, gövde içeriğini yorumlarken ele alıyoruz.
    validateStatus: () => true,
  });
}

const client = createClient();

function buildFormBody(params: Record<string, string | undefined>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) usp.append(key, value);
  });
  return usp.toString();
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const messages = (payload as DispatchEnvelope).messages;
  if (Array.isArray(messages) && messages.length > 0) {
    const joined = messages
      .map((m) => (typeof m === 'string' ? m : m?.message ?? m?.text))
      .filter(Boolean)
      .join(' ');
    // Beklenen "message"/"text" alanı yoksa sessizce boş dönmek yerine ham
    // içeriği göster ki kayıp bilgi olmasın.
    return joined || `GİB mesajı: ${JSON.stringify(messages)}`;
  }
  return undefined;
}

// GİB "error" alanını bazı uçlarda boolean, bazılarında "0"/"1" gibi bir
// STRING olarak dönüyor. "0" JS'te truthy olduğundan `if (envelope.error)`
// gibi saf bir kontrol, başarılı yanıtları da hataya çevirebilir — bu
// muhtemelen canlı ortamda sorguların "boş dönmesi" şikayetinin sebebi.
function isGibHatasi(error: boolean | string | undefined): boolean {
  if (error === undefined || error === null || error === false) return false;
  if (typeof error === 'string') return error !== '' && error !== '0';
  return error === true;
}

/**
 * GİB "dispatch" servisine tek bir komut gönderir.
 * `token` login hariç tüm komutlarda zorunludur.
 */
async function dispatch<T = unknown>(
  cmd: string,
  pageName: string,
  payload: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const body = buildFormBody({
    cmd,
    pageName,
    token,
    jp: JSON.stringify(payload),
  });

  // Geçici tanı çıktısı: cihazda/terminalde gerçekte neyin gönderildiğini
  // görmek için. Şifre gövdede düz metin gittiğinden, canlı teşhisi
  // bitirince bu satırı kaldırın.
  console.log('GÖNDERİLEN DATA:', JSON.stringify({ cmd, pageName, url: BASE_URL, body }));

  let responseData: unknown;
  try {
    const response = await client.post<DispatchEnvelope<T> | T>('', body);
    responseData = response.data;
    // JSON.stringify kullanıyoruz çünkü Metro/Hermes konsolu iç içe objeleri
    // bazen "[Object]" olarak kısaltıyor; stringify edilmiş hali her zaman
    // tam olarak okunabilir.
    console.log('GİB YANITI (ham):', JSON.stringify(responseData));
    const rawMessages = (responseData as DispatchEnvelope | null)?.messages;
    if (rawMessages) {
      console.log('GİB YANITI (messages):', JSON.stringify(rawMessages));
    }

    if (response.status >= 400) {
      const msg = extractErrorMessage(responseData) ?? `GİB portalı ${response.status} durum kodu döndürdü.`;
      throw new GibApiError(msg, responseData);
    }
  } catch (err) {
    if (err instanceof GibApiError) throw err;

    const axiosErr = err as AxiosError;
    if (axiosErr?.code === 'ECONNABORTED') {
      throw new GibApiError('GİB portalına bağlanırken zaman aşımı oluştu. Lütfen tekrar deneyin.', err);
    }
    if (axiosErr?.isAxiosError && !axiosErr.response) {
      throw new GibApiError('GİB portalına ulaşılamadı. İnternet bağlantınızı kontrol edin.', err);
    }
    throw new GibApiError('Beklenmeyen bir hata oluştu.', err);
  }

  if (responseData && typeof responseData === 'object') {
    const envelope = responseData as DispatchEnvelope<T>;

    if ('error' in envelope && isGibHatasi(envelope.error)) {
      throw new GibApiError(
        extractErrorMessage(envelope) ?? 'GİB portalı işlemi reddetti.',
        envelope,
      );
    }

    // ÖNEMLİ: Gerçek GİB yanıtları çoğunlukla "error" alanı İÇERMEDEN
    // doğrudan {"data": {...}, "metadata": {...}} şeklinde geliyor. Önceden
    // yalnızca "error" alanı varsa "data"yı açıyorduk; bu durumda tüm zarf
    // (data+metadata) hiç açılmadan çağırana dönüyor, alan adları hep boş
    // çıkıyordu. Artık "data" alanı varsa — "error" olsun olmasın — onu açıyoruz.
    if ('data' in envelope) {
      return envelope.data as T;
    }
  }

  return responseData as T;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

// Tarayıcı DevTools > Network yakalamasıyla doğrulandı: assos-login yanıtının
// gerçek şekli (token'ın hangi alanda geldiği) netleşince bu fonksiyonu
// duruma göre güncelleyin.
function extractAssosToken(data: unknown): string | undefined {
  if (typeof data === 'string') {
    const trimmed = data.trim().replace(/^"+|"+$/g, '');
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const candidate = obj.token ?? obj.Token ?? obj.TOKEN ?? obj.data;
    if (typeof candidate === 'string' && candidate.length > 0) return candidate;
  }
  return undefined;
}

const MOCK_TOKEN = 'TEST_MOCK_TOKEN_123';

export async function login(kullaniciKodu: string, kullaniciSifresi: string): Promise<string> {
  if (IS_TEST_MODE) {
    console.log('MOCK LOGIN:', { kullaniciKodu });
    return Promise.resolve(MOCK_TOKEN);
  }

  const body = buildFormBody({
    assoscmd: 'anologin',
    rtype: 'json',
    userid: kullaniciKodu,
    sifre: kullaniciSifresi,
    sifre2: kullaniciSifresi,
    parola: '1',
  });

  console.log('GÖNDERİLEN DATA (assos-login):', JSON.stringify({ url: ASSOS_LOGIN_URL, body }));

  let res: AxiosResponse<unknown>;
  try {
    res = await client.post<unknown>(ASSOS_LOGIN_URL, body);
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axiosErr?.code === 'ECONNABORTED') {
      throw new GibApiError('GİB portalına bağlanırken zaman aşımı oluştu. Lütfen tekrar deneyin.', err);
    }
    if (axiosErr?.isAxiosError && !axiosErr.response) {
      throw new GibApiError('GİB portalına ulaşılamadı. İnternet bağlantınızı kontrol edin.', err);
    }
    throw new GibApiError('Beklenmeyen bir hata oluştu.', err);
  }

  console.log('GİB ASSOS YANITI:', res.data);
  console.log('GİB ASSOS YANITI (stringify):', JSON.stringify(res.data));

  const token = extractAssosToken(res.data);
  if (!token) {
    throw new GibApiError(
      `Giriş başarısız: assos-login yanıtından token okunamadı. Ham yanıt: ${JSON.stringify(res.data)}`,
      res.data,
    );
  }
  return token;
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/**
 * GİB tarafındaki oturumu sonlandırır. Yalnızca yerel token'ı silmek yeterli
 * değildir; GİB tarafında oturum askıda kalırsa sonraki girişler
 * engellenebilir. Bu çağrı başarısız olsa da (ağ hatası vb.) çağıran taraf
 * yerel oturumu temizlemeye devam etmelidir.
 */
export async function logout(token: string): Promise<void> {
  await dispatch('EARSIV_PORTAL_LOGOUT', 'RG_GIRIS', {}, token);
}

// ---------------------------------------------------------------------------
// Kullanıcı bilgileri
// ---------------------------------------------------------------------------

export async function getKullaniciBilgileri(token: string): Promise<KullaniciBilgisi> {
  if (IS_TEST_MODE) {
    // login() mock modda gerçek bir token üretmiyor; bu isteği yine de
    // gerçek sunucuya atmak login mock'unu anlamsız kılar (Dashboard açılır
    // açılmaz başarısız bir ağ isteği fırlatılır). O yüzden bunu da mockluyoruz.
    return Promise.resolve({ unvan: 'Test Mükellef (Mock)', vknTckn: '11111111111' });
  }

  // Canlı GİB yanıtıyla doğrulandı (gerçek Network yakalaması): şirket
  // hesaplarında "unvan" alanı zaten dolu ve güvenilir geliyor; "ad"/"soyad"
  // alanları şirket hesaplarında boş/anlamsız (ör. unvanın kırpılmış bir
  // kopyası) olabiliyor, bu yüzden yalnızca "unvan" boşsa yedek olarak
  // kullanılıyor (şahıs/kişi hesapları için).
  const result = await dispatch<Record<string, unknown>>(
    'EARSIV_PORTAL_KULLANICI_BILGILERI_GETIR',
    'RG_BASITFATURA',
    {},
    token,
  );

  console.log('GİB KULLANICI HAM YANIT:', JSON.stringify(result));

  const veri = (result ?? {}) as Record<string, unknown>;
  const asString = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);

  const ad = asString(veri.ad);
  const soyad = asString(veri.soyad);
  const unvan = asString(veri.unvan) ?? (ad && soyad ? `${ad} ${soyad}` : undefined);

  return { ...veri, unvan };
}

// ---------------------------------------------------------------------------
// VKN/TCKN'den mükellef bilgisi sorgulama (fatura formunda alıcı otomatik
// doldurma için kullanılır)
// ---------------------------------------------------------------------------

export interface MukellefBilgisi {
  unvan: string;
  vergiDairesi?: string;
}

export async function mukellefBilgisiGetir(
  token: string,
  vknTckn: string,
): Promise<MukellefBilgisi | undefined> {
  const temiz = vknTckn.trim();
  if (!/^\d{10}(\d)?$/.test(temiz)) return undefined;

  if (IS_TEST_MODE) {
    // Test modunda gerçek bir mükellef veritabanı yok; 10-11 haneli her
    // numara için aynı örnek kaydı döndürüyoruz.
    console.log('MOCK MÜKELLEF BİLGİSİ GETİR:', { vknTckn: temiz });
    return Promise.resolve({ unvan: 'TEST LİMİTED ŞİRKETİ', vergiDairesi: 'Marmara Kurumlar' });
  }

  // Canlı GİB yanıtıyla doğrulandı (gerçek Network yakalaması):
  // VKN (şirket) → {"unvan": "...", "vergiDairesi": "..."}
  // TCKN (şahıs) → {"unvan": "", "adi": "...", "soyadi": "...", "vergiDairesi": "..."}
  // "unvan" boşsa "adi"+"soyadi" birleştirilerek kullanılıyor.
  const result = await dispatch<Record<string, unknown> | string>(
    'SICIL_VEYA_MERNISTEN_BILGILERI_GETIR',
    'RG_BASITFATURA',
    { vknTcknn: temiz },
    token,
  );

  // dispatch() zaten her çağrıda genel "GİB YANITI (ham)" logunu basıyor;
  // bu satır aynı veriyi bu fonksiyona özel, terminalde aramayı
  // kolaylaştıran bir etiketle tekrar yazdırıyor.
  console.log('GİB MÜKELLEF HAM YANIT:', JSON.stringify(result));

  if (typeof result === 'string') return result ? { unvan: result } : undefined;
  if (!result || typeof result !== 'object') return undefined;

  const veri = result as Record<string, unknown>;
  const asString = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);

  const adi = asString(veri.adi);
  const soyadi = asString(veri.soyadi);
  const unvan = asString(veri.unvan) ?? (adi && soyadi ? `${adi} ${soyadi}` : undefined);

  if (!unvan) return undefined;

  const vergiDairesi = asString(veri.vergiDairesi);

  return { unvan, vergiDairesi };
}

// ---------------------------------------------------------------------------
// Fatura kaydet (taslak oluştur)
// ---------------------------------------------------------------------------

export interface FaturaKaydetSonucu {
  /** GİB'in ürettiği elektronik tekil belge numarası. */
  ettn: string;
  uuid?: string;
}

function toGibAlici(alici: AliciBilgisi) {
  return {
    vknTckn: alici.vknTckn,
    aliciUnvan: alici.unvan,
    vergiDairesi: alici.vergiDairesi ?? '',
    aliciAdres: alici.adres,
    ilce: alici.ilce ?? '',
    il: alici.il ?? '',
    ulke: alici.ulke ?? 'Türkiye',
    tel: alici.telefon ?? '',
    eposta: alici.eposta ?? '',
  };
}

export async function faturaKaydet(
  token: string,
  taslak: FaturaTaslagi,
): Promise<FaturaKaydetSonucu> {
  if (IS_TEST_MODE) {
    console.log('MOCK FATURA KAYDET:', JSON.stringify(taslak, null, 2));
    return Promise.resolve({ ettn: `MOCK-ETTN-${Date.now()}` });
  }

  // DOĞRULANMADI: cmd adı ("EARSIV_PORTAL_FATURA_KAYDET") ve aşağıdaki
  // payload alan adları GİB'in gerçek/canlı portalında henüz gerçek
  // trafikle (DevTools > Network) teyit edilmedi — projenin en başında
  // verilen komut adı kullanılıyor. Login'de yaşadığımız gibi (assos-login
  // sürprizi) burada da gerçek uç nokta/alan adları farklı çıkabilir.
  // Küçük/gerçek bir denemeden önce mutlaka portalda tarayıcıdan elle bir
  // fatura kesip Network sekmesinden gerçek isteği bu fonksiyonla
  // karşılaştırın; GİB'de kesilen bir e-Arşiv faturası düzeltilmesi zor,
  // gerçek bir belgedir.
  const payload = {
    ...toGibAlici(taslak.alici),
    faturaTarihi: taslak.faturaTarihi,
    saat: taslak.saat ?? new Date().toTimeString().slice(0, 5),
    paraBirimi: taslak.paraBirimi ?? 'TRY',
    faturaTipi: taslak.faturaTipi ?? 'SATIS',
    not: taslak.not ?? '',
    malHizmetTable: taslak.satirlar.map((satir) => ({
      malHizmet: satir.malHizmet,
      miktar: satir.miktar,
      birim: satir.birim,
      birimFiyat: satir.birimFiyat,
      iskontoOrani: satir.iskontoOrani ?? 0,
      kdvOrani: satir.kdvOrani,
    })),
  };

  const result = await dispatch<{ ettn?: string; uuid?: string } | string>(
    'EARSIV_PORTAL_FATURA_KAYDET',
    'RG_BASITFATURA',
    payload,
    token,
  );

  const ettn = typeof result === 'string' ? result : result?.ettn ?? result?.uuid;
  if (!ettn) {
    throw new GibApiError('Fatura kaydedildi ancak belge numarası (ETTN) alınamadı.', result);
  }
  return { ettn, uuid: typeof result === 'object' ? result?.uuid : undefined };
}

// ---------------------------------------------------------------------------
// Taslak/kesilen faturaları listele
// ---------------------------------------------------------------------------

export interface TaslakGetirFiltre {
  baslangicTarihi?: string; // "GG/AA/YYYY"
  bitisTarihi?: string; // "GG/AA/YYYY"
}

const MOCK_TASLAKLAR: TaslakFatura[] = [
  { ettn: 'MOCK-ETTN-0001', faturaTarihi: '15/09/2026', aliciUnvan: 'ABC Ticaret Ltd. Şti.', genelToplam: 1180.5, durum: 'Taslak' },
  { ettn: 'MOCK-ETTN-0002', faturaTarihi: '12/09/2026', aliciUnvan: 'Veli Yılmaz', genelToplam: 350, durum: 'Onaylandı' },
  { ettn: 'MOCK-ETTN-0003', faturaTarihi: '05/09/2026', aliciUnvan: 'XYZ Danışmanlık A.Ş.', genelToplam: 2450.75, durum: 'Onaylandı' },
];

export async function taslakGetir(
  token: string,
  filtre: TaslakGetirFiltre = {},
): Promise<TaslakFatura[]> {
  if (IS_TEST_MODE) {
    console.log('MOCK TASLAK GETIR:', filtre);
    return Promise.resolve(MOCK_TASLAKLAR);
  }

  const result = await dispatch<TaslakFatura[] | { data: TaslakFatura[] }>(
    'EARSIV_PORTAL_TASLAK_GETIR',
    'RG_BASITFATURA',
    { ...filtre },
    token,
  );
  return Array.isArray(result) ? result : result?.data ?? [];
}

// ---------------------------------------------------------------------------
// SMS ile imzalama
// ---------------------------------------------------------------------------

export async function smsSifreGonder(token: string, ettn: string): Promise<void> {
  if (IS_TEST_MODE) {
    console.log('MOCK SMS GÖNDER:', { ettn });
    return Promise.resolve();
  }
  await dispatch('EARSIV_PORTAL_SMSSIFRE_GONDER', 'RG_BASITFATURA', { ettn }, token);
}

export async function smsSifreOnayla(
  token: string,
  ettn: string,
  smsKodu: string,
): Promise<void> {
  if (IS_TEST_MODE) {
    console.log('MOCK SMS ONAYLA:', { ettn, smsKodu });
    return Promise.resolve();
  }
  await dispatch(
    'EARSIV_PORTAL_SMSSIFRE_ONAYLA',
    'RG_BASITFATURA',
    { ettn, sifre: smsKodu },
    token,
  );
}

// ---------------------------------------------------------------------------
// Fatura indirme (HTML/PDF)
// ---------------------------------------------------------------------------

export type FaturaIndirFormat = 'HTML' | 'PDF';

/**
 * GİB, imzalanmış faturayı base64 kodlanmış bir gövde olarak döndürür.
 * Dönen değeri react-native-fs / expo-file-system ile diske yazıp
 * paylaşabilir veya WebView'de gösterebilirsiniz.
 */
export async function faturaIndir(
  token: string,
  ettn: string,
  format: FaturaIndirFormat = 'PDF',
): Promise<string> {
  const result = await dispatch<{ data?: string } | string>(
    'EARSIV_PORTAL_FATURA_INDIR',
    'RG_BASITFATURA',
    { ettn, format },
    token,
  );

  const base64 = typeof result === 'string' ? result : result?.data;
  if (!base64) {
    throw new GibApiError('Fatura indirilemedi.', result);
  }
  return base64;
}

export const gibApi = {
  login,
  logout,
  getKullaniciBilgileri,
  mukellefBilgisiGetir,
  faturaKaydet,
  taslakGetir,
  smsSifreGonder,
  smsSifreOnayla,
  faturaIndir,
};

export default gibApi;
