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
// özellikle SMSSIFRE_GONDER/ONAYLA komutlarının "jp" gövdeleri
// portal sürümüne göre farklılık gösterebilir.

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import type {
  AliciBilgisi,
  DispatchEnvelope,
  FaturaSatiri,
  FaturaTaslagi,
  IptalItirazTalebi,
  KullaniciBilgisi,
  TaslakFatura,
} from '../types/gib';
import { KDV_TEVKIFAT_VERGI_TURU } from '../constants/faturaConstants';

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
  /** true ise mesaj oturum/token geçersizliğine işaret ediyor (bkz. oturumHatasiMi). */
  oturumHatasi: boolean;

  constructor(message: string, raw?: unknown, oturumHatasi = false) {
    super(message);
    this.name = 'GibApiError';
    this.raw = raw;
    this.oturumHatasi = oturumHatasi;
  }
}

// DİKKAT: "Bu işlem için yetkiniz yok" (type 7) mesajını KASITLI OLARAK
// buraya eklemedik. Bu projede aynı mesajı hem geçersiz bir dispatch cmd'i
// (taslakGetir'in ilk hâli, logout'un ilk hâli) hem de eksik bir payload
// (faturaKaydet) için gördük — yani muhtemelen GİB'in "cmd/istek geçersiz"
// jenerik hatası, oturum süresi dolduğunu göstermiyor. Onu oturum hatası
// sayıp kullanıcıyı otomatik çıkışa zorlamak, gerçek bir kod/payload
// hatasını "tekrar giriş yapın" diye yanlış yorumlatabilir. Gerçek oturum
// süresi dolma mesajının tam metnini gördükçe bu listeye ekleyin.
const OTURUM_HATASI_ANAHTAR_KELIMELER = ['oturum sonland', 'token geçersiz', 'tekrar giriş yapınız', 'süresi dol'];

function oturumHatasiMi(mesaj: string): boolean {
  const kucukMesaj = mesaj.toLocaleLowerCase('tr-TR');
  return OTURUM_HATASI_ANAHTAR_KELIMELER.some((kelime) => kucukMesaj.includes(kelime));
}

/**
 * Merkezi hata işleyici: bir GibApiError oturum hatasıysa yerel oturumu
 * temizler (useAuthStore token'ı sıfırlar, App.tsx otomatik olarak Login
 * ekranına döner) ve kullanıcıya gösterilecek nihai mesajı döndürür.
 * Ekranlar kendi catch bloklarında `Alert.alert(baslik, (await gibHatasiniIsle(err)).mesaj)`
 * şeklinde kullanabilir.
 */
export async function gibHatasiniIsle(err: unknown): Promise<{ mesaj: string; oturumKapandi: boolean }> {
  if (err instanceof GibApiError && err.oturumHatasi) {
    // Döngüsel import'tan kaçınmak için dinamik import (gibApi <- useAuthStore
    // zaten gibApi'ye bağımlı; useAuthStore'u burada statik import etmiyoruz).
    const { useAuthStore } = await import('../store/useAuthStore');
    await useAuthStore.getState().logout();
    return { mesaj: 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.', oturumKapandi: true };
  }
  const mesaj = err instanceof Error && err.message ? err.message : 'Beklenmeyen bir hata oluştu.';
  return { mesaj, oturumKapandi: false };
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

// Gerçek portal isteklerinde her dispatch çağrısının yanında bir "callid"
// parametresi gidiyor (DevTools yakalamasıyla doğrulandı). Tam formatı
// önemli görünmüyor — GİB muhtemelen yalnızca isteği ayırt etmek için
// kullanıyor — bu yüzden basit, her seferinde benzersiz bir değer üretiyoruz.
function benzersizCallId(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 10)}`;
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
    callid: benzersizCallId(),
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
      throw new GibApiError(msg, responseData, oturumHatasiMi(msg));
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
      const mesaj = extractErrorMessage(envelope) ?? 'GİB portalı işlemi reddetti.';
      throw new GibApiError(mesaj, envelope, oturumHatasiMi(mesaj));
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
 *
 * DOĞRULANMADI (ama bir kez elendi): "EARSIV_PORTAL_LOGOUT" dispatch
 * komutu tanınmıyordu ("yetkiniz yok"). login()'in gerçekte dispatch/jp
 * değil assos-login uç noktasını kullandığını keşfedip logout'u da oraya
 * taşımıştık — ancak `assoscmd=anologin` GİB tarafından LOGIN komutu olarak
 * yorumlanıp "Sisteme giriş için eksik bilgi verildi" hatası verdi (çünkü
 * kullanıcı adı/şifre eksikti). Şimdi `assoscmd=logout` deniyoruz. Konsoldaki
 * "GİB ASSOS LOGOUT YANITI" ile teyit edin; bu da tutmazsa GİB'in çıkış için
 * hiç ayrı bir servis çağrısı istemiyor olması (yalnızca token'ı istemci
 * tarafında silmek yeterli) ihtimalini de değerlendirmemiz gerekebilir.
 */
export async function logout(token: string): Promise<void> {
  if (IS_TEST_MODE) {
    console.log('MOCK LOGOUT');
    return Promise.resolve();
  }

  const body = buildFormBody({ assoscmd: 'logout', rtype: 'json', token });
  console.log('GÖNDERİLEN DATA (assos-logout):', JSON.stringify({ url: ASSOS_LOGIN_URL, body }));

  let res: AxiosResponse<unknown>;
  try {
    res = await client.post<unknown>(ASSOS_LOGIN_URL, body);
  } catch (err) {
    throw new GibApiError('Çıkış isteği gönderilemedi.', err);
  }

  console.log('GİB ASSOS LOGOUT YANITI:', JSON.stringify(res.data));
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
  /** VKN (şirket) sorgusunda dolu; TCKN (şahıs) sorgusunda genelde boş gelir. */
  unvan: string;
  vergiDairesi?: string;
  /** Yalnızca TCKN (şahıs) sorgusunda dolu gelir — Ad/Soyad'ı ayrı alanlara koymak isteyen ekranlar için. */
  ad?: string;
  soyad?: string;
}

export async function mukellefBilgisiGetir(
  token: string,
  vknTckn: string,
): Promise<MukellefBilgisi | undefined> {
  const temiz = vknTckn.trim();
  if (!/^\d{10}(\d)?$/.test(temiz)) return undefined;

  if (IS_TEST_MODE) {
    // Test modunda gerçek bir mükellef veritabanı yok; VKN (10 hane) için
    // sahte bir şirket, TCKN (11 hane) için sahte bir şahıs kaydı dönüyoruz
    // ki FaturaKesimScreen'in iki farklı doldurma davranışı da test edilebilsin.
    console.log('MOCK MÜKELLEF BİLGİSİ GETİR:', { vknTckn: temiz });
    if (temiz.length === 11) {
      return Promise.resolve({ unvan: '', ad: 'TEST', soyad: 'KULLANICI', vergiDairesi: 'Marmara Kurumlar' });
    }
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

  return { unvan, vergiDairesi, ad: adi, soyad: soyadi };
}

// ---------------------------------------------------------------------------
// Fatura kaydet (taslak oluştur)
// ---------------------------------------------------------------------------

export interface FaturaKaydetSonucu {
  /** GİB'in ürettiği elektronik tekil belge numarası. */
  ettn: string;
  uuid?: string;
}

// Tarayıcı DevTools > Network yakalamasıyla BİREBİR DOĞRULANDI (gerçek
// "e-Arşiv Fatura (interaktif) Oluştur" ekranından gönderilen istek).
function toGibAlici(alici: AliciBilgisi) {
  return {
    vknTckn: alici.vknTckn,
    aliciUnvan: alici.unvan,
    aliciAdi: alici.ad ?? '',
    aliciSoyadi: alici.soyad ?? '',
    binaAdi: '',
    binaNo: '',
    kapiNo: '',
    kasabaKoy: '',
    vergiDairesi: alici.vergiDairesi ?? '',
    ulke: alici.ulke ?? 'Türkiye',
    bulvarcaddesokak: alici.adres,
    mahalleSemtIlce: alici.ilce ?? '',
    // Gerçek yakalamada boşken tek boşluk karakteri (" ") gönderiliyordu,
    // boş string değil.
    sehir: alici.il || ' ',
    postaKodu: '',
    tel: alici.telefon ?? '',
    fax: '',
    eposta: alici.eposta ?? '',
    websitesi: '',
  };
}

interface SatirHesabi {
  netTutar: number;
  kdvTutari: number;
  tevkifatTutari: number;
}

function satirHesapla(satir: FaturaSatiri): SatirHesabi {
  const brut = satir.miktar * satir.birimFiyat;
  const iskontoTutari = brut * ((satir.iskontoOrani ?? 0) / 100);
  const netTutar = brut - iskontoTutari;
  const kdvTutari = netTutar * (satir.kdvOrani / 100);
  const tevkifatTutari = satir.kdvTevkifatOrani ? kdvTutari * (satir.kdvTevkifatOrani / 10) : 0;
  return { netTutar, kdvTutari, tevkifatTutari };
}

// GİB'in kendi arayüzü (autoNumeric.js) tutarları biçimlendirirken ondalık
// kısmı sıfırsa ".00"yı basmıyor (ör. "10", "10.00" değil; ama "10.5" ise
// "10.5"). Gerçek DevTools yakalamalarında (İADE/TEVKİFAT başarılı istekleri)
// TÜM tutar alanları bu şekildeydi — bu yüzden toFixed(2) yerine bunu kullanıyoruz.
function tutarStr(n: number): string {
  return String(Number(n.toFixed(2)));
}

/**
 * Tarayıcı DevTools > Network yakalamasıyla BİREBİR DOĞRULANDI — hem de iki
 * ayrı GERÇEK BAŞARILI istekle (İADE ve TEVKİFAT fatura tipleri, ikisi de
 * "Faturanız başarıyla oluşturulmuştur" yanıtını döndürdü). Önceki sürümdeki
 * komisyon/navlun/hammaliye/nakliye/hal rüsumu/ticaret borsası/milli savunma
 * fonu/diğer/top-level özel matrah alanları hayaliydi (açık kaynak referanstan
 * tahmin edilmişti) — gerçek istekte HİÇ YOKLAR, kaldırıldı.
 *
 * Kritik bulgular:
 * - `iadeTable`: her istekte var, GENEL İADE dışında boş dizi. İADE'de
 *   `[{faturaNo, duzenlenmeTarihi}]` — iade edilen orijinal faturayı belirtir.
 *   Bu uygulamada henüz bunu girecek bir form alanı YOK (bkz. TODO.md);
 *   şimdilik her zaman boş dizi gönderiliyor — yani GENEL İADE tipi fatura
 *   büyük olasılıkla GİB tarafından reddedilecek ta ki bu alan eklenene kadar.
 * - `vergiCesidi` sabit bir boşluk değil: KDV Tevkifat uygulanan bir fatura
 *   tevkifat türünün kodunu (`V9015`) taşır, aksi halde tek boşluk (" ").
 * - Tevkifatlı kalemlerde alan adı `kdvTevkifatKodu` değil `tevkifatKodu`;
 *   oran/tutar alanları da SABİT değil, seçilen vergi türü koduna göre
 *   DİNAMİK isimlendiriliyor (ör. "V9015Orani"/"V9015Tutari" — alan adının
 *   içine kodu gömüyor). Oran alanı bizim TEVKIFAT_KODLARI'ndaki "oran"
 *   değerinin (7 = 7/10) 10 katı olarak (70) gönderiliyor.
 * - Fatura genelinde en az bir tevkifatlı kalem varsa üç ek top-level alan
 *   daha gönderiliyor: `tevkifataTabiIslemTutar`, `tevkifataTabiIslemKdv` ve
 *   dinamik `hesaplanan${vergiCesidi}` (ör. "hesaplananV9015").
 */
function buildFaturaOlusturPayload(taslak: FaturaTaslagi) {
  let malHizmetToplam = 0;
  let toplamIskonto = 0;
  let hesaplananKdv = 0;
  let hesaplananKdvTevkifat = 0;
  let tevkifataTabiIslemTutar = 0;
  let tevkifataTabiIslemKdv = 0;

  const malHizmetTable = taslak.satirlar.map((satir) => {
    const brut = satir.miktar * satir.birimFiyat;
    const iskontoOrani = satir.iskontoOrani ?? 0;
    const iskontoTutari = brut * (iskontoOrani / 100);
    const hesap = satirHesapla(satir);

    malHizmetToplam += hesap.netTutar;
    toplamIskonto += iskontoTutari;
    hesaplananKdv += hesap.kdvTutari;

    const satirData: Record<string, unknown> = {
      malHizmet: satir.malHizmet,
      miktar: satir.miktar,
      birim: satir.birim,
      birimFiyat: String(satir.birimFiyat),
      fiyat: tutarStr(brut),
      iskontoOrani,
      iskontoTutari: tutarStr(iskontoTutari),
      iskontoNedeni: '',
      malHizmetTutari: tutarStr(hesap.netTutar),
      // Gerçek yakalamada kdvOrani STRING'di ("20"), vergiOrani/
      // vergininKdvTutari ise KDV'yi tekrar etmiyordu — hep "0" gönderiliyordu
      // (muhtemelen ayrı bir vergi türü/ÖTV alanı, bizim akışımızda kullanılmıyor).
      kdvOrani: String(satir.kdvOrani),
      vergiOrani: 0,
      kdvTutari: tutarStr(hesap.kdvTutari),
      vergininKdvTutari: '0',
      ozelMatrahTutari: '0',
      hesaplananotvtevkifatakatkisi: '0',
    };

    if (satir.kdvTevkifatKodu) {
      hesaplananKdvTevkifat += hesap.tevkifatTutari;
      tevkifataTabiIslemTutar += hesap.netTutar;
      tevkifataTabiIslemKdv += hesap.kdvTutari;
      satirData.tevkifatKodu = satir.kdvTevkifatKodu;
      satirData[`${KDV_TEVKIFAT_VERGI_TURU}Orani`] = (satir.kdvTevkifatOrani ?? 0) * 10;
      satirData[`${KDV_TEVKIFAT_VERGI_TURU}Tutari`] = tutarStr(hesap.tevkifatTutari);
    }

    return satirData;
  });

  const tevkifatVar = taslak.satirlar.some((s) => s.kdvTevkifatKodu);
  const vergilerDahilToplam = malHizmetToplam + hesaplananKdv;
  const odenecekTutar = vergilerDahilToplam - hesaplananKdvTevkifat;

  const payload: Record<string, unknown> = {
    faturaUuid: '',
    belgeNumarasi: '',
    faturaTarihi: taslak.faturaTarihi,
    saat: taslak.saat ?? new Date().toTimeString().slice(0, 8),
    paraBirimi: taslak.paraBirimi ?? 'TRY',
    dovzTLkur: String(taslak.dovizKuru ?? 0),
    faturaTipi: taslak.faturaTipi ?? 'SATIS',
    // Gerçek yakalamada "Buyuk" değil "5000/30000" gönderiliyordu.
    hangiTip: '5000/30000',
    ...toGibAlici(taslak.alici),
    irsaliyeNumarasi: taslak.irsaliyeNo ?? '',
    irsaliyeTarihi: taslak.irsaliyeTarihi ?? '',
    // GENEL İADE tipi faturalarda iade edilen orijinal faturayı belirtir
    // ({faturaNo, duzenlenmeTarihi}); bu uygulamada henüz bunu girecek bir
    // form alanı yok, bu yüzden şimdilik her zaman boş gönderiliyor.
    iadeTable: [],
    ihracKayitliKarsiBelgeNo: '',
    yatirimTesvikNumarasi: '',
    // Gerçek yakalamada boşken bugünün tarihiyle doluydu (faturaTarihi ile aynı).
    yatirimTesvikTarihi: taslak.faturaTarihi,
    kdvOranKontrolMuafiyeti: false,
    vergiCesidi: tevkifatVar ? KDV_TEVKIFAT_VERGI_TURU : ' ',
    malHizmetTable,
    tip: 'İskonto',
    matrah: tutarStr(malHizmetToplam),
    malhizmetToplamTutari: tutarStr(malHizmetToplam),
    toplamIskonto: tutarStr(toplamIskonto),
    hesaplanankdv: tutarStr(hesaplananKdv),
    vergilerToplami: tutarStr(hesaplananKdv),
    vergilerDahilToplamTutar: tutarStr(vergilerDahilToplam),
    odenecekTutar: tutarStr(odenecekTutar),
    not: taslak.not ?? '',
    siparisNumarasi: '',
    siparisTarihi: '',
    fisNo: '',
    fisTarihi: '',
    fisSaati: ' ',
    fisTipi: ' ',
    zRaporNo: '',
    okcSeriNo: '',
  };

  if (tevkifatVar) {
    payload.tevkifataTabiIslemTutar = tutarStr(tevkifataTabiIslemTutar);
    payload.tevkifataTabiIslemKdv = tutarStr(tevkifataTabiIslemKdv);
    payload[`hesaplanan${KDV_TEVKIFAT_VERGI_TURU}`] = tutarStr(hesaplananKdvTevkifat);
  }

  return payload;
}

export async function faturaKaydet(
  token: string,
  taslak: FaturaTaslagi,
): Promise<FaturaKaydetSonucu> {
  if (IS_TEST_MODE) {
    console.log('MOCK FATURA KAYDET:', JSON.stringify(taslak, null, 2));
    return Promise.resolve({ ettn: `MOCK-ETTN-${Date.now()}` });
  }

  // KESİN OLARAK DOĞRULANDI: kullanıcının gerçek DevTools yakalamasıyla,
  // "EARSIV_PORTAL_FATURA_OLUSTUR" cmd'i İKİ AYRI GERÇEK, BAŞARILI fatura
  // oluşturma isteğinde (GENEL İADE ve TEVKİFAT fatura tipleri) kullanılmış
  // ve ikisi de GİB'den "Faturanız başarıyla oluşturulmuştur. Düzenlenen
  // Belgeler menüsünden faturanıza ulaşabilirsiniz." yanıtını almış. Yani
  // doğru/çalışan cmd budur, "EARSIV_PORTAL_FATURA_KAYDET" DEĞİL.
  //
  // GİB'in başarı yanıtı ettn/uuid İÇERMİYOR — yalnızca düz bir metin
  // ("...başarıyla oluşturulmuştur..."). Bu yüzden ettn'i, oluşturmadan
  // ÖNCE/SONRA taslak listesini karşılaştırıp yeni çıkan kaydı bularak elde
  // ediyoruz (metne bağımlı olmayan, güvenilir bir yöntem).
  let oncekiEttnler = new Set<string>();
  try {
    const oncekiListe = await taslakGetir(token, {
      baslangicTarihi: taslak.faturaTarihi,
      bitisTarihi: taslak.faturaTarihi,
    });
    oncekiEttnler = new Set(oncekiListe.map((t) => t.ettn));
  } catch {
    // Taslak listesi çekilemezse diff atlanır; sonuçta ettn bulunamayacak
    // ve hataya (aşağıda) düşülecek.
  }

  const payload = buildFaturaOlusturPayload(taslak);

  const result = await dispatch<string | { ettn?: string; uuid?: string }>(
    'EARSIV_PORTAL_FATURA_OLUSTUR',
    'RG_BASITFATURA',
    payload,
    token,
  );

  // Bazı GİB yanıtları doğrudan ettn/uuid içeren bir obje dönebilir —
  // varsa taslak listesini karşılaştırmaya bile gerek kalmadan kullanılır.
  if (result && typeof result === 'object') {
    const dogrudanEttn = result.ettn ?? result.uuid;
    if (dogrudanEttn) return { ettn: dogrudanEttn };
  }

  const hamMetin = typeof result === 'string' ? result : JSON.stringify(result);

  let ettn: string | undefined;
  try {
    const sonrakiListe = await taslakGetir(token, {
      baslangicTarihi: taslak.faturaTarihi,
      bitisTarihi: taslak.faturaTarihi,
    });
    ettn = sonrakiListe.find((t) => !oncekiEttnler.has(t.ettn))?.ettn;
  } catch {
    // yoksay
  }

  if (ettn) return { ettn };

  // Taslak listesinde yeni bir kayıt çıkmadıysa gerçekten başarısız demektir.
  throw new GibApiError(hamMetin || 'GİB taslak faturayı oluşturmadı.', result);
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

function ggAaYyyy(d: Date): string {
  const gg = String(d.getDate()).padStart(2, '0');
  const aa = String(d.getMonth() + 1).padStart(2, '0');
  return `${gg}/${aa}/${d.getFullYear()}`;
}

export async function taslakGetir(
  token: string,
  filtre: TaslakGetirFiltre = {},
): Promise<TaslakFatura[]> {
  // GİB, tarih aralığı filtresi olmadan (boş jp: {}) "Bu işlem için yetkiniz
  // yok" hatası veriyor — filtre verilmezse son 7 günü varsayılan alıyoruz.
  const bugun = new Date();
  const yediGunOnce = new Date(bugun);
  yediGunOnce.setDate(bugun.getDate() - 7);

  const baslangic = filtre.baslangicTarihi ?? ggAaYyyy(yediGunOnce);
  const bitis = filtre.bitisTarihi ?? ggAaYyyy(bugun);

  if (IS_TEST_MODE) {
    console.log('MOCK TASLAK GETIR:', { baslangic, bitis });
    return Promise.resolve(MOCK_TASLAKLAR);
  }

  // cmd/pageName/"baslangic"/"bitis"/"hangiTip" gerçek DevTools yakalamasıyla
  // birebir doğrulandı: {"baslangic":"GG/AA/YYYY","bitis":"GG/AA/YYYY","hangiTip":"5000/30000"}.
  // Önceki sürümde spekülatif olarak eklenen "table: []" alanı gerçek
  // istekte YOK — kaldırıldı.
  const result = await dispatch<TaslakFatura[] | { data: TaslakFatura[] } | Record<string, unknown>>(
    'EARSIV_PORTAL_TASLAKLARI_GETIR',
    'RG_BASITTASLAKLAR',
    { baslangic, bitis, hangiTip: '5000/30000' },
    token,
  );

  console.log('GİB TASLAK HAM YANIT:', JSON.stringify(result));

  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && Array.isArray((result as { data?: unknown }).data)) {
    return (result as { data: TaslakFatura[] }).data;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Taslak fatura silme
// ---------------------------------------------------------------------------

/**
 * Tarayıcı DevTools > Network yakalamasıyla BİREBİR DOĞRULANDI. GİB'in kendi
 * arayüzü, silme isteğinde `taslakGetir`'den gelen satırın TÜM alanlarını
 * (ettn dışındaki her şey dahil) olduğu gibi geri gönderiyor — bu yüzden
 * burada `taslak` parametresi olarak `taslakGetir()`'in döndürdüğü ham
 * `TaslakFatura` objesi bekleniyor, yeniden inşa edilmiyor. Tek eklenen alan
 * kullanıcının girdiği silme gerekçesi (`aciklama`).
 */
export async function faturaSil(
  token: string,
  taslak: TaslakFatura,
  aciklama: string,
): Promise<void> {
  if (IS_TEST_MODE) {
    console.log('MOCK FATURA SİL:', { ettn: taslak.ettn, aciklama });
    return Promise.resolve();
  }

  const silinecek = {
    faturaOid: taslak.faturaOid ?? '',
    toplamTutar: taslak.toplamTutar ?? '0',
    belgeNumarasi: taslak.belgeNumarasi ?? '',
    aliciVknTckn: taslak.aliciVknTckn ?? '',
    aliciUnvanAdSoyad: taslak.aliciUnvanAdSoyad ?? '',
    saticiVknTckn: taslak.saticiVknTckn ?? '',
    saticiUnvanAdSoyad: taslak.saticiUnvanAdSoyad ?? '',
    belgeTarihi: taslak.belgeTarihi ?? '',
    belgeTuru: taslak.belgeTuru ?? 'FATURA',
    onayDurumu: taslak.onayDurumu ?? '',
    ettn: taslak.ettn,
    talepDurumColumn: taslak.talepDurumColumn ?? '----------',
    iptalItiraz: taslak.iptalItiraz ?? '-99',
    talepDurum: taslak.talepDurum ?? '-99',
  };

  await dispatch(
    'EARSIV_PORTAL_FATURA_SIL',
    'RG_BASITTASLAKLAR',
    { silinecekler: [silinecek], aciklama },
    token,
  );
}

// ---------------------------------------------------------------------------
// İptal talebi oluşturma (onaylanmış/imzalanmış bir fatura için)
// ---------------------------------------------------------------------------

/**
 * Tarayıcı DevTools > Network yakalamasıyla BİREBİR DOĞRULANDI — GERÇEK,
 * BAŞARILI bir istek ("İptal talebiniz başarıyla oluşturulmuştur." yanıtı
 * alındı). `faturaSil`'in aksine, bu istek taslağın TÜM alanlarını değil
 * yalnızca dördünü taşıyor.
 *
 * Not: Bu, taslağın kendisini SİLMEZ, GİB'e "bu onaylı/imzalı faturayı iptal
 * etmek istiyorum" talebi iletir; alıcıya bildirilir ve GİB tarafında ayrı
 * bir onay/red süreci işler (bkz. iptalItirazTalepleriGetir). Bu yüzden
 * yalnızca ONAYLANMIŞ (imzalanmış) faturalar için anlamlıdır — taslak
 * (henüz onaylanmamış) bir fatura silinir (`faturaSil`), iptal edilmez.
 * GİB, zaten silinmiş bir belge için bu işlem denenirse
 * "Silinmiş belgeler düzenlenemez!" mesajıyla reddediyor (canlı
 * gözlemlendi) — bu durum, dispatch()'in genel hata/mesaj işleyişiyle
 * zaten otomatik olarak yakalanıp çağırana iletiliyor.
 */
export async function iptalTalebiOlustur(
  token: string,
  taslak: TaslakFatura,
  talepAciklama: string,
): Promise<void> {
  if (IS_TEST_MODE) {
    console.log('MOCK İPTAL TALEBİ OLUŞTUR:', { ettn: taslak.ettn, talepAciklama });
    return Promise.resolve();
  }

  await dispatch(
    'EARSIV_PORTAL_IPTAL_TALEBI_OLUSTUR',
    'RG_BASITTASLAKLAR',
    {
      ettn: taslak.ettn,
      onayDurumu: taslak.onayDurumu ?? 'Onaylandı',
      belgeTuru: taslak.belgeTuru ?? 'FATURA',
      talepAciklama,
    },
    token,
  );
}

// ---------------------------------------------------------------------------
// Kayıtlı cep telefonu sorgulama (SMS onay akışının 1. adımında gösterilir)
// ---------------------------------------------------------------------------

/**
 * Tarayıcı DevTools > Network yakalamasıyla cmd/pageName/jp DOĞRULANDI
 * ("GİB İmza" tıklanınca ilk atılan istek buydu, boş jp: {}). GİB'e kayıtlı
 * cep telefonu numarasını döndürüyor; SMS Onay ekranında maskeli gösterilip
 * (ör. "(555) 123 45 67"), `smsSifreGonder`'e ham rakamlarla ("5551234567")
 * geçiriliyor.
 *
 * NOT: Yanıtın tam gövdesi (düz string mi, obje mi) bağımsız olarak
 * yakalanıp teyit edilmedi — GİB'in tek-değer döndüren diğer uçlarındaki
 * (ör. faturaHTMLGetir) kalıba göre `data` alanının doğrudan telefon
 * numarası string'i olduğu VARSAYILIYOR. `dispatch()`'in ham yanıtı zaten
 * konsola bastığı için ilk canlı denemede bu varsayım kolayca doğrulanabilir.
 */
export async function telefonnoSorgula(token: string): Promise<string> {
  if (IS_TEST_MODE) {
    return Promise.resolve('5551234567');
  }

  const result = await dispatch<string | { data?: string } | Record<string, unknown>>(
    'EARSIV_PORTAL_TELEFONNO_SORGULA',
    'RG_BASITTASLAKLAR',
    {},
    token,
  );

  console.log('GİB TELEFON NO HAM YANIT:', JSON.stringify(result));

  if (typeof result === 'string' && result.length > 0) return result.replace(/\D/g, '');
  if (result && typeof result === 'object') {
    const veri = (result as { data?: unknown }).data;
    if (typeof veri === 'string' && veri.length > 0) return veri.replace(/\D/g, '');
  }
  throw new GibApiError('Kayıtlı cep telefonu numarası alınamadı.', result);
}

// ---------------------------------------------------------------------------
// SMS ile imzalama
// ---------------------------------------------------------------------------

/**
 * Tarayıcı DevTools > Network yakalamasıyla BİREBİR DOĞRULANDI. Önceki
 * sürüm yanlıştı: `{ettn}` gönderiyordu ve pageName `RG_BASITFATURA` idi.
 * Gerçek istek `RG_SMSONAY` sayfasından, `ettn` OLMADAN, GİB'e kayıtlı cep
 * telefonu numarasına gönderiliyor — fatura ile bağlantı yalnızca 2. adımda
 * (`smsSifreOnayla`'nın `DATA` alanında) kuruluyor.
 *
 * Yanıt, `smsSifreOnayla`'da geçmesi gereken bir "OID" (işlem kimliği)
 * içeriyor olmalı — bkz. `smsSifreOnayla` üstündeki not. Bu fonksiyon, GİB'in
 * tek-değer döndüren diğer uçlarındaki kalıba uyarak `dispatch()`'in açtığı
 * `data`'yı doğrudan OID olarak döndürüyor; bu, HENÜZ bağımsız bir yanıt
 * yakalamasıyla teyit edilmedi.
 */
export async function smsSifreGonder(token: string, cepTel: string): Promise<string> {
  if (IS_TEST_MODE) {
    console.log('MOCK SMS GÖNDER:', { cepTel });
    return Promise.resolve('MOCK-OID');
  }

  const result = await dispatch<string | { data?: string } | Record<string, unknown>>(
    'EARSIV_PORTAL_SMSSIFRE_GONDER',
    'RG_SMSONAY',
    { CEPTEL: cepTel, KCEPTEL: false, TIP: '' },
    token,
  );

  console.log('GİB SMS GÖNDER HAM YANIT:', JSON.stringify(result));

  if (typeof result === 'string' && result.length > 0) return result;
  if (result && typeof result === 'object') {
    const veri = (result as Record<string, unknown>).data ?? (result as Record<string, unknown>).OID;
    if (typeof veri === 'string' && veri.length > 0) return veri;
  }
  throw new GibApiError('SMS gönderme yanıtından işlem kimliği (OID) okunamadı.', result);
}

/**
 * Tarayıcı DevTools > Network yakalamasıyla BİREBİR DOĞRULANDI — GERÇEK,
 * BAŞARILI bir SMS imzalama isteği ("SMS şifreniz doğrulandı, işlem
 * başarılı." yanıtı alındı). Üç kritik, sezgisel olmayan bulgu:
 *
 * 1. `cmd` alanı GİB'in standart `EARSIV_PORTAL_*` isimlendirmesine
 *    UYMUYOR — opak, anlamsız görünen bir string: "0lhozfib5410mp". Bu proje
 *    içinde daha önce bu TAM DEĞER açık kaynak bir referansta (f/fatura)
 *    görülüp şüpheli bulunarak reddedilmişti; kullanıcının kendi GERÇEK,
 *    canlı DevTools yakalamasında AYNI değerle karşılaşılması, bunun enjekte
 *    edilmiş şüpheli bir değer değil, GİB'in kendi JS kodunda sabit kodlanmış
 *    gerçek bir cmd olduğunu doğruluyor.
 * 2. `jp.DATA`, imzalanacak taslağı `EARSIV_PORTAL_FATURA_SIL`'deki
 *    "silinecekler" ile AYNI desende taşıyor: `taslakGetir()`'den gelen ham
 *    satır, hiç değiştirilmeden bir dizi içinde gönderiliyor.
 * 3. `jp.OID` — `smsSifreGonder`'in döndürdüğü işlem kimliği; `jp.OPR` sabit
 *    `1` (muhtemelen "onayla" işlem tipi).
 */
const SMS_ONAYLA_CMD = '0lhozfib5410mp';

export async function smsSifreOnayla(
  token: string,
  taslak: TaslakFatura,
  smsKodu: string,
  oid: string,
): Promise<void> {
  if (IS_TEST_MODE) {
    console.log('MOCK SMS ONAYLA:', { ettn: taslak.ettn, smsKodu, oid });
    return Promise.resolve();
  }

  const veri = {
    faturaOid: taslak.faturaOid ?? '',
    toplamTutar: taslak.toplamTutar ?? '0',
    belgeNumarasi: taslak.belgeNumarasi ?? '',
    aliciVknTckn: taslak.aliciVknTckn ?? '',
    aliciUnvanAdSoyad: taslak.aliciUnvanAdSoyad ?? '',
    saticiVknTckn: taslak.saticiVknTckn ?? '',
    saticiUnvanAdSoyad: taslak.saticiUnvanAdSoyad ?? '',
    belgeTarihi: taslak.belgeTarihi ?? '',
    belgeTuru: taslak.belgeTuru ?? 'FATURA',
    onayDurumu: taslak.onayDurumu ?? '',
    ettn: taslak.ettn,
    talepDurumColumn: taslak.talepDurumColumn ?? '----------',
    iptalItiraz: taslak.iptalItiraz ?? '-99',
    talepDurum: taslak.talepDurum ?? '-99',
  };

  await dispatch(
    SMS_ONAYLA_CMD,
    'RG_SMSONAY',
    { SIFRE: smsKodu, OID: oid, OPR: 1, DATA: [veri] },
    token,
  );
}

// ---------------------------------------------------------------------------
// Fatura HTML görüntüleme (WebView'de göstermek için)
// ---------------------------------------------------------------------------

const MOCK_FATURA_HTML = (ettn: string) => `
  <html><body style="font-family:sans-serif;padding:24px;background:#111;color:#eee;">
    <h2>Mock Fatura Önizleme</h2>
    <p>ETTN: ${ettn}</p>
    <p>IS_TEST_MODE=true olduğundan bu içerik GİB'den değil, sahte veriden gelir.</p>
  </body></html>
`;

/**
 * DOĞRULANMADI: cmd adı ("EARSIV_PORTAL_FATURA_GOSTER") ve payload
 * ("onayDurumu" alanı) canlı ortamda henüz sizin gerçek Network
 * yakalamanızla teyit edilmedi — önceki turlarda incelediğim (kısmen
 * doğrulanmış) açık kaynak referansla uyumlu bir tahmindir. "Görüntüle"yi
 * denediğinizde terminaldeki "GİB FATURA HTML HAM YANIT" logunu kontrol edin.
 */
export async function faturaHTMLGetir(
  token: string,
  ettn: string,
  onayDurumu?: string,
): Promise<string> {
  if (IS_TEST_MODE) {
    console.log('MOCK FATURA HTML GETIR:', { ettn });
    return Promise.resolve(MOCK_FATURA_HTML(ettn));
  }

  const result = await dispatch<string | { data?: string } | Record<string, unknown>>(
    'EARSIV_PORTAL_FATURA_GOSTER',
    'RG_BASITTASLAKLAR',
    { ettn, onayDurumu: onayDurumu ?? 'Onaylanmadı' },
    token,
  );

  // HTML gövdesi çok uzun olabileceğinden konsolu boğmamak için kısaltıyoruz.
  const onizleme = typeof result === 'string' ? result : JSON.stringify(result);
  console.log('GİB FATURA HTML HAM YANIT (ilk 300 karakter):', onizleme.slice(0, 300));

  if (typeof result === 'string' && result.length > 0) return result;
  if (result && typeof result === 'object') {
    const veri = (result as { data?: unknown }).data;
    if (typeof veri === 'string' && veri.length > 0) return veri;
  }
  throw new GibApiError('Fatura HTML içeriği alınamadı.', result);
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

// ---------------------------------------------------------------------------
// İptal/İtiraz Talepleri (Belge İşlemleri menüsünün 3. sekmesi)
// ---------------------------------------------------------------------------

export interface IptalItirazTalepFiltre {
  baslangicTarihi?: string; // "GG/AA/YYYY"
  bitisTarihi?: string; // "GG/AA/YYYY"
}

/**
 * Tarayıcı DevTools > Network yakalamasıyla cmd/pageName/jp DOĞRULANDI.
 * "İptal/İtiraz Talepleri" ekranındaki "Sorgula" butonuna karşılık gelir —
 * gerçek yakalamada tarih alanları hep bugünün tarihiyle dolu geldi
 * (varsayılan aralık), ama filtresiz (jp: {}) davranış test edilmedi; bu
 * yüzden `taslakGetir`'deki gibi bir "filtre zorunlu" varsayımı yapılmadı,
 * yalnızca çağıran taraf tarih vermezse bugünü kullanıyoruz.
 */
export async function iptalItirazTalepleriGetir(
  token: string,
  filtre: IptalItirazTalepFiltre = {},
): Promise<IptalItirazTalebi[]> {
  const bugun = ggAaYyyy(new Date());
  const baslangic = filtre.baslangicTarihi ?? bugun;
  const bitis = filtre.bitisTarihi ?? bugun;

  if (IS_TEST_MODE) {
    console.log('MOCK İPTAL/İTİRAZ TALEPLERİ GETİR:', { baslangic, bitis });
    return Promise.resolve([]);
  }

  const result = await dispatch<IptalItirazTalebi[] | { data: IptalItirazTalebi[] } | Record<string, unknown>>(
    'EARSIV_PORTAL_GELEN_IPTAL_ITIRAZ_TALEPLERINI_GETIR',
    'RG_IPTALITIRAZTASLAKLAR',
    { baslangic, bitis },
    token,
  );

  console.log('GİB İPTAL/İTİRAZ TALEPLERİ HAM YANIT:', JSON.stringify(result));

  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && Array.isArray((result as { data?: unknown }).data)) {
    return (result as { data: IptalItirazTalebi[] }).data;
  }
  return [];
}

/**
 * Tarayıcı DevTools > Network yakalamasıyla DOĞRULANDI — ama YALNIZCA
 * "Talep Kabul Et" (kabul) yolu: gerçek istekte `talepCevabi: 1` ve
 * `retAciklama: ""` gönderilmişti. "Talep Reddet" (`kabul=false`) yolu
 * canlı bir yakalamayla HENÜZ doğrulanmadı — `talepCevabi: 0` ve dolu bir
 * `retAciklama` göndermek, alan adlarından (`talepCevabi` = ikili bir kabul/
 * red cevabı, `retAciklama` = "ret açıklaması") çıkarılan MANTIKLI ama
 * DOĞRULANMAMIŞ bir varsayımdır. Canlıda "Talep Reddet" denendiğinde
 * konsoldaki ham istek/yanıt logları kontrol edilip bu varsayım teyit
 * edilmeli veya düzeltilmeli.
 */
export async function iptalItirazTalepDurumGuncelle(
  token: string,
  talep: IptalItirazTalebi,
  kabul: boolean,
  retAciklama = '',
): Promise<void> {
  if (IS_TEST_MODE) {
    console.log('MOCK İPTAL/İTİRAZ TALEP DURUM GÜNCELLE:', { oid: talep.iptalItirazOid, kabul, retAciklama });
    return Promise.resolve();
  }

  await dispatch(
    'EARSIV_PORTAL_IPTAL_ITIRAZ_TALEP_DURUM_GUNCELLE',
    'RG_IPTALITIRAZTASLAKLAR',
    {
      iptalItirazOid: talep.iptalItirazOid,
      talepCevabi: kabul ? 1 : 0,
      belgeTuru: talep.belgeTuru ?? 'FATURA',
      retAciklama,
    },
    token,
  );
}

export const gibApi = {
  login,
  logout,
  getKullaniciBilgileri,
  mukellefBilgisiGetir,
  faturaKaydet,
  taslakGetir,
  faturaSil,
  iptalTalebiOlustur,
  telefonnoSorgula,
  smsSifreGonder,
  smsSifreOnayla,
  faturaHTMLGetir,
  faturaIndir,
  iptalItirazTalepleriGetir,
  iptalItirazTalepDurumGuncelle,
  gibHatasiniIsle,
};

export default gibApi;
