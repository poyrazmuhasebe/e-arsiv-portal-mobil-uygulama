/**
 * Şifre özeti.
 *
 * NEDEN scrypt, NEDEN PBKDF2 DEĞİL:
 * Cloudflare üretimde PBKDF2'de en fazla 100.000 iterasyon kabul ediyor
 * ("iteration counts above 100000 are not supported"), bu da OWASP'ın
 * önerdiği 600.000'in altında kalıyor. Dahası yerel workerd/wrangler dev ve
 * Node'da bu tavan YOK — yani 100.000'in üstü yerelde geçer, üretimde her
 * kayıt ve girişi kırardı. argon2 Workers'ta desteklenmiyor. scrypt
 * bellek-serttir ve node:crypto üzerinden kullanılabilir (nodejs_compat,
 * 2026-08-04 ve sonrası uyumluluk tarihlerinde varsayılan olarak açık).
 *
 * Özet, algoritma ve parametreleriyle birlikte saklanır; böylece parametreler
 * ileride değiştirilebilir ve eski kayıtlar doğrulanmaya devam eder.
 */

import { scrypt } from "node:crypto";
import { Buffer } from "node:buffer";
import { sabitZamanliEsit } from "./kripto";

const ALGORITMA = "scrypt";
/** ~16 MB bellek (N * r * 128). Workers'ın 128 MB sınırının altında. */
const N = 16384;
const R = 8;
const P = 1;
const ANAHTAR_UZUNLUK = 32;
const TUZ_UZUNLUK = 16;
/** node:crypto varsayılanı 32 MB; N=16384, r=8 için açıkça yükseltiyoruz. */
const EN_FAZLA_BELLEK = 64 * 1024 * 1024;

function scryptTuret(
  sifre: string,
  tuz: Buffer,
  n: number,
  r: number,
  p: number,
): Promise<Buffer> {
  return new Promise((coz, reddet) => {
    scrypt(
      sifre,
      tuz,
      ANAHTAR_UZUNLUK,
      { N: n, r, p, maxmem: EN_FAZLA_BELLEK },
      (hata, anahtar) => {
        if (hata) reddet(hata);
        else coz(anahtar);
      },
    );
  });
}

/**
 * `pepper` veritabanında BULUNMAYAN, yalnızca Worker secret'ında duran bir
 * değerdir. Değişirse mevcut tüm şifreler doğrulanamaz hale gelir.
 */
export async function sifreOzetle(sifre: string, pepper = ""): Promise<string> {
  const tuz = Buffer.alloc(TUZ_UZUNLUK);
  crypto.getRandomValues(new Uint8Array(tuz.buffer, tuz.byteOffset, TUZ_UZUNLUK));
  const ozet = await scryptTuret(sifre + pepper, tuz, N, R, P);
  return [
    ALGORITMA,
    N,
    R,
    P,
    tuz.toString("base64url"),
    ozet.toString("base64url"),
  ].join("$");
}

/**
 * Kayıttaki parametreleri kullanarak doğrular. Bozuk ya da tanınmayan kayıtta
 * `false` döner — hata fırlatmaz, çünkü çağıran taraf zaten "e-posta veya
 * şifre hatalı" diyecek.
 */
export async function sifreDogrula(
  sifre: string,
  kayit: string,
  pepper = "",
): Promise<boolean> {
  const parcalar = kayit.split("$");
  if (parcalar.length !== 6) return false;
  const [algoritma, nMetin, rMetin, pMetin, tuzMetin, ozetMetin] = parcalar as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  if (algoritma !== ALGORITMA) return false;

  const n = Number(nMetin);
  const r = Number(rMetin);
  const p = Number(pMetin);
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p)) {
    return false;
  }
  // Hizmet dışı bırakma saldırısına karşı üst sınır: veritabanına devasa bir
  // N yazılırsa doğrulama CPU'yu tüketmesin.
  if (n < 1024 || n > 1 << 20 || r < 1 || r > 32 || p < 1 || p > 16) return false;

  let uretilen: Buffer;
  try {
    uretilen = await scryptTuret(
      sifre + pepper,
      Buffer.from(tuzMetin, "base64url"),
      n,
      r,
      p,
    );
  } catch {
    return false;
  }
  return sabitZamanliEsit(uretilen.toString("base64url"), ozetMetin);
}

/**
 * Kullanıcı bulunamadığında da bir özet hesaplamak için kullanılan sahte
 * kayıt. Amaç, "bu e-posta kayıtlı mı?" sorusunun yanıt SÜRESİNDEN
 * anlaşılmasını engellemek.
 */
export const SAHTE_KAYIT = [
  ALGORITMA,
  N,
  R,
  P,
  "AAAAAAAAAAAAAAAAAAAAAA",
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
].join("$");
