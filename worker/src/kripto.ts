/**
 * Kriptografik yardımcılar: sabit zamanlı karşılaştırma, rastgele değerler,
 * SHA-256 özeti ve HS256 token'ları.
 *
 * `jose` gibi bir kütüphane KURULMADI: HS256 üretip doğrulamak Web Crypto ile
 * birkaç satır. JWKS doğrulaması ancak sosyal giriş aşamasında gerekecek.
 */

import { Buffer } from "node:buffer";

/**
 * Sabit zamanlı dizgi karşılaştırması.
 *
 * Workers'a özgü `crypto.subtle.timingSafeEqual` BİLEREK kullanılmıyor: bu
 * modül Node altındaki testlerde de çalışabilmeli. Erken çıkış yok; uzunluk
 * farkı da sonuca karışır.
 */
export function sabitZamanliEsit(a: string, b: string): boolean {
  const uzunluk = Math.max(a.length, b.length);
  let fark = a.length ^ b.length;
  for (let i = 0; i < uzunluk; i++) {
    const ai = i < a.length ? a.charCodeAt(i) : 0;
    const bi = i < b.length ? b.charCodeAt(i) : 0;
    fark |= ai ^ bi;
  }
  return fark === 0;
}

export function baytlariBase64Url(baytlar: Uint8Array): string {
  return Buffer.from(baytlar).toString("base64url");
}

export function base64UrlBaytlara(metin: string): Uint8Array {
  return new Uint8Array(Buffer.from(metin, "base64url"));
}

/** Kriptografik olarak güçlü rastgele değer. */
export function rastgeleBase64Url(baytSayisi: number): string {
  const baytlar = new Uint8Array(baytSayisi);
  crypto.getRandomValues(baytlar);
  return baytlariBase64Url(baytlar);
}

export function rastgeleKimlik(): string {
  return crypto.randomUUID();
}

export async function sha256Base64Url(metin: string): Promise<string> {
  const veri = new TextEncoder().encode(metin);
  const ozet = await crypto.subtle.digest("SHA-256", veri);
  return baytlariBase64Url(new Uint8Array(ozet));
}

/**
 * Yanlılıksız (modulo bias içermeyen) sayısal kod. Reddetme örneklemesi
 * kullanır: üst sınırın tam katı olmayan değerler atılır.
 */
export function rastgeleSayisalKod(haneSayisi: number): string {
  const ustSinir = 10 ** haneSayisi;
  const enBuyuk = 0x100000000;
  const kabulSiniri = Math.floor(enBuyuk / ustSinir) * ustSinir;
  const tampon = new Uint32Array(1);
  let deger = 0;
  do {
    crypto.getRandomValues(tampon);
    deger = tampon[0] as number;
  } while (deger >= kabulSiniri);
  return String(deger % ustSinir).padStart(haneSayisi, "0");
}

async function hmacAnahtari(gizli: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(gizli),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export interface TokenYuku {
  /** Kullanıcı kimliği. */
  sub: string;
  /** Bitiş anı, saniye cinsinden Unix zamanı. */
  exp: number;
  /** Üretim anı, saniye cinsinden Unix zamanı. */
  iat: number;
  /** Token türü — yenileme token'ının erişim yerine geçmesini engeller. */
  tur: "erisim";
}

function jsonBase64Url(deger: unknown): string {
  return Buffer.from(JSON.stringify(deger), "utf8").toString("base64url");
}

/** HS256 imzalı erişim token'ı üretir. */
export async function tokenUret(
  yuk: TokenYuku,
  imzaAnahtari: string,
): Promise<string> {
  const baslik = jsonBase64Url({ alg: "HS256", typ: "JWT" });
  const govde = jsonBase64Url(yuk);
  const imzalanacak = `${baslik}.${govde}`;
  const imza = await crypto.subtle.sign(
    "HMAC",
    await hmacAnahtari(imzaAnahtari),
    new TextEncoder().encode(imzalanacak),
  );
  return `${imzalanacak}.${baytlariBase64Url(new Uint8Array(imza))}`;
}

/**
 * Token'ı doğrular. Geçersiz imza, bozuk biçim, yanlış tür ya da süresi dolmuş
 * token'da `null` döner — çağıran taraf ayrım yapmaz, hepsi "oturum geçersiz".
 */
export async function tokenDogrula(
  token: string,
  imzaAnahtari: string,
  simdiSn: number,
): Promise<TokenYuku | null> {
  const parcalar = token.split(".");
  if (parcalar.length !== 3) return null;
  const [baslik, govde, imza] = parcalar as [string, string, string];

  let imzaGecerli = false;
  try {
    imzaGecerli = await crypto.subtle.verify(
      "HMAC",
      await hmacAnahtari(imzaAnahtari),
      base64UrlBaytlara(imza),
      new TextEncoder().encode(`${baslik}.${govde}`),
    );
  } catch {
    return null;
  }
  if (!imzaGecerli) return null;

  let cozulmus: unknown;
  try {
    cozulmus = JSON.parse(Buffer.from(govde, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof cozulmus !== "object" || cozulmus === null) return null;

  const yuk = cozulmus as Partial<TokenYuku>;
  if (typeof yuk.sub !== "string" || yuk.sub.length === 0) return null;
  if (typeof yuk.exp !== "number" || typeof yuk.iat !== "number") return null;
  if (yuk.tur !== "erisim") return null;
  if (yuk.exp <= simdiSn) return null;

  return { sub: yuk.sub, exp: yuk.exp, iat: yuk.iat, tur: "erisim" };
}
