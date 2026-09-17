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
  FaturaSatiri,
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

function toGibAlici(alici: AliciBilgisi) {
  return {
    vknTckn: alici.vknTckn,
    aliciUnvan: alici.unvan,
    // DOĞRULANMADI: aliciAdi/aliciSoyadi, kısmen doğrulanmış açık kaynak
    // referansla uyumlu (TCKN/şahıs alıcılar için).
    aliciAdi: alici.ad ?? '',
    aliciSoyadi: alici.soyad ?? '',
    vergiDairesi: alici.vergiDairesi ?? '',
    // Formumuz adresi tek bir serbest metin alanı olarak topluyor; GİB'in
    // gerçek DTO'sunun adresi cadde/bina/kapı/mahalle/şehir/posta kodu diye
    // parçalara ayırdığına dair kanıt var (bkz. referans) ama biz bu kadar
    // ayrıntılı toplamıyoruz. Hangi alan adı gerçekte kullanılıyorsa
    // dolsun diye HEM eski (aliciAdres/ilce/il) HEM referanstaki
    // (bulvarcaddesokak/mahalleSemtIlce/sehir) adları aynı değerle
    // dolduruyoruz — tanınmayan alanlar GİB tarafında muhtemelen yok sayılır.
    aliciAdres: alici.adres,
    bulvarcaddesokak: alici.adres,
    binaAdi: '',
    binaNo: '',
    kapiNo: '',
    kasabaKoy: '',
    ilce: alici.ilce ?? '',
    mahalleSemtIlce: alici.ilce ?? '',
    il: alici.il ?? '',
    sehir: alici.il ?? '',
    postaKodu: '',
    ulke: alici.ulke ?? 'Türkiye',
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

/**
 * DOĞRULANMADI ama önceki turlarda incelediğim (bu projede assos-login,
 * SICIL_VEYA_MERNISTEN_BILGILERI_GETIR, EARSIV_PORTAL_TASLAKLARI_GETIR gibi
 * birçok kez doğru çıkan) açık kaynak referansla uyumlu. Minimal bir payload
 * ("yetkiniz yok" hatasını veren önceki deneme) muhtemelen GİB'in katı
 * DTO'sunun beklediği zorunlu-ama-bizim SATIŞ faturasında kullanmadığımız
 * (komisyon/navlun/hammaliye/nakliye/hal rüsumu vb.) alanları içermiyordu —
 * bu yüzden hepsi güvenli varsayılanlarla dolduruldu.
 */
function buildFaturaOlusturPayload(taslak: FaturaTaslagi) {
  let malHizmetToplam = 0;
  let toplamIskonto = 0;
  let hesaplananKdv = 0;
  let hesaplananKdvTevkifat = 0;

  const malHizmetTable = taslak.satirlar.map((satir) => {
    const brut = satir.miktar * satir.birimFiyat;
    const iskontoOrani = satir.iskontoOrani ?? 0;
    const iskontoTutari = brut * (iskontoOrani / 100);
    const hesap = satirHesapla(satir);

    malHizmetToplam += hesap.netTutar;
    toplamIskonto += iskontoTutari;
    hesaplananKdv += hesap.kdvTutari;
    hesaplananKdvTevkifat += hesap.tevkifatTutari;

    return {
      iskontoArttm: 'İskonto',
      malHizmet: satir.malHizmet,
      miktar: satir.miktar,
      birim: satir.birim,
      birimFiyat: satir.birimFiyat.toFixed(2),
      fiyat: brut.toFixed(2),
      iskontoOrani,
      iskontoTutari: iskontoTutari.toFixed(2),
      iskontoNedeni: '',
      malHizmetTutari: hesap.netTutar.toFixed(2),
      kdvOrani: satir.kdvOrani,
      vergiOrani: satir.kdvOrani,
      kdvTutari: hesap.kdvTutari.toFixed(2),
      vergininKdvTutari: hesap.kdvTutari.toFixed(2),
      // DOĞRULANMADI — bkz. FaturaSatiri yorumları.
      kdvTevkifatKodu: satir.kdvTevkifatKodu ?? '',
      kdvTevkifatOrani: satir.kdvTevkifatOrani ?? 0,
    };
  });

  const vergilerDahilToplam = malHizmetToplam + hesaplananKdv;
  const odenecekTutar = vergilerDahilToplam - hesaplananKdvTevkifat;

  return {
    ...toGibAlici(taslak.alici),
    faturaTarihi: taslak.faturaTarihi,
    saat: taslak.saat ?? new Date().toTimeString().slice(0, 8),
    paraBirimi: taslak.paraBirimi ?? 'TRY',
    // DOĞRULANMADI: alan adı "dovzTLkur" — referanstan; ilk tahminimiz
    // "dovizKuru" idi, o hâlâ yanlış çıkabilir.
    dovzTLkur: taslak.dovizKuru ?? 0,
    faturaTipi: taslak.faturaTipi ?? 'SATIS',
    hangiTip: 'Buyuk', // DOĞRULANMADI — referanstaki varsayılan, anlamı netleşmedi.
    siparisNumarasi: '',
    siparisTarihi: '',
    irsaliyeNumarasi: taslak.irsaliyeNo ?? '',
    irsaliyeTarihi: taslak.irsaliyeTarihi ?? '',
    fisNo: '',
    fisTarihi: '',
    fisSaati: ' ',
    fisTipi: ' ',
    zRaporNo: '',
    okcSeriNo: '',
    // Komisyon/navlun/hammaliye/nakliye/hal rüsumu/ticaret borsası/milli
    // savunma fonu/diğer alanları standart bir SATIŞ faturasında kullanılmaz,
    // ama referansa göre GİB'in DTO'su bunları sıfır değerle de olsa bekliyor
    // olabilir.
    komisyonOrani: 0,
    navlunOrani: 0,
    hammaliyeOrani: 0,
    nakliyeOrani: 0,
    komisyonTutari: '0',
    navlunTutari: '0',
    hammaliyeTutari: '0',
    nakliyeTutari: '0',
    komisyonKDVOrani: 0,
    navlunKDVOrani: 0,
    hammaliyeKDVOrani: 0,
    nakliyeKDVOrani: 0,
    komisyonKDVTutari: '0',
    navlunKDVTutari: '0',
    hammaliyeKDVTutari: '0',
    nakliyeKDVTutari: '0',
    gelirVergisiOrani: 0,
    bagkurTevkifatiOrani: 0,
    gelirVergisiTevkifatiTutari: '0',
    bagkurTevkifatiTutari: '0',
    halRusumuOrani: 0,
    ticaretBorsasiOrani: 0,
    milliSavunmaFonuOrani: 0,
    digerOrani: 0,
    halRusumuTutari: '0',
    ticaretBorsasiTutari: '0',
    milliSavunmaFonuTutari: '0',
    digerTutari: '0',
    halRusumuKDVOrani: 0,
    ticaretBorsasiKDVOrani: 0,
    milliSavunmaFonuKDVOrani: 0,
    digerKDVOrani: 0,
    halRusumuKDVTutari: '0',
    ticaretBorsasiKDVTutari: '0',
    milliSavunmaFonuKDVTutari: '0',
    digerKDVTutari: '0',
    iadeTable: [] as unknown[],
    ozelMatrahTutari: '0',
    ozelMatrahOrani: 0,
    ozelMatrahVergiTutari: '0.00',
    vergiCesidi: ' ',
    malHizmetTable,
    tip: 'İskonto',
    matrah: malHizmetToplam.toFixed(2),
    malhizmetToplamTutari: malHizmetToplam.toFixed(2),
    toplamIskonto: toplamIskonto.toFixed(2),
    hesaplanankdv: hesaplananKdv.toFixed(2),
    vergilerToplami: hesaplananKdv.toFixed(2),
    vergilerDahilToplamTutar: vergilerDahilToplam.toFixed(2),
    toplamMasraflar: '0',
    odenecekTutar: odenecekTutar.toFixed(2),
    not: taslak.not ?? '',
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

  // DOĞRULANDI (kullanıcı geri bildirimiyle): "EARSIV_PORTAL_FATURA_OLUSTUR"
  // (f/fatura referansından) hesabın ERİŞEMEDİĞİ farklı bir ekrana/komuta
  // gidiyor ("e-Arşiv Portal Fatura" — kullanıcı bu ekrandan değil,
  // "e-Arşiv Fatura (interaktif) Oluştur" ekranından fatura kesebiliyor).
  // Bu yüzden projenin en başında verilen orijinal komuta geri dönüldü.
  // Payload'ı (buildFaturaOlusturPayload) DEĞİŞTİRMEDİK — o hâlâ en zengin/
  // en olası doğru şekil; yalnızca hangi cmd'nin bu payload'ı kabul ettiğini
  // netleştirmemiz gerekiyor.
  //
  // Yanıt şekli de artık belirsiz (FATURA_OLUSTUR'un "...başarıyla
  // oluşturulmuştur" metni FATURA_KAYDET için geçerli olmayabilir), bu
  // yüzden başarıyı METİN EŞLEŞMESİNE değil, oluşturmadan ÖNCE/SONRA taslak
  // listesini karşılaştırıp yeni bir kayıt çıkıp çıkmadığına göre belirliyoruz
  // — bu, cmd/yanıt formatı ne olursa olsun güvenilir bir yöntem.
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
    'EARSIV_PORTAL_FATURA_KAYDET',
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

  // cmd/pageName ve "baslangic"/"bitis" alan adları, önceki turda incelediğim
  // (kısmen doğrulanmış, kısmen şüpheli bulduğum) açık kaynak referansla
  // uyumlu; "hangiTip"/"table" de aynı kaynaktan — GİB'in doğrulaması katı
  // olduğundan bilinen çalışan gövdeye birebir uyduk. Yine de canlı yanıtla
  // teyit edilmesi gerekiyor.
  const result = await dispatch<TaslakFatura[] | { data: TaslakFatura[] } | Record<string, unknown>>(
    'EARSIV_PORTAL_TASLAKLARI_GETIR',
    'RG_BASITTASLAKLAR',
    { baslangic, bitis, hangiTip: '5000/30000', table: [] },
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

export const gibApi = {
  login,
  logout,
  getKullaniciBilgileri,
  mukellefBilgisiGetir,
  faturaKaydet,
  taslakGetir,
  smsSifreGonder,
  smsSifreOnayla,
  faturaHTMLGetir,
  faturaIndir,
  gibHatasiniIsle,
};

export default gibApi;
