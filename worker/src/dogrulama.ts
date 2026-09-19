/**
 * Alan doğrulama kuralları — saf fonksiyonlar, hiçbir bağımlılığı yok.
 *
 * Aynı kurallar uygulama tarafında da uygulanır ama TEK DOĞRULUK KAYNAĞI
 * burasıdır: istemci atlatılabilir.
 */

export const KULLANICI_ADI_EN_AZ = 3;
export const KULLANICI_ADI_EN_FAZLA = 20;
export const SIFRE_EN_AZ = 8;
export const SIFRE_EN_FAZLA = 128;
export const EPOSTA_EN_FAZLA = 254;

/** Baştaki/sondaki boşluk atılır ve küçük harfe çevrilir. */
export function epostaNormalize(deger: string): string {
  return deger.trim().toLowerCase();
}

/** Baştaki/sondaki boşluk atılır ve küçük harfe çevrilir. */
export function kullaniciAdiNormalize(deger: string): string {
  return deger.trim().toLowerCase();
}

/**
 * Kasıtlı olarak sade: RFC 5322'yi tam uygulamaya çalışmıyoruz. Amaç, açıkça
 * bozuk adresleri elemek. Adresin gerçekten kullanıcıya ait olduğu, gönderilen
 * doğrulama koduyla anlaşılır.
 */
export function epostaHatasi(eposta: string): string | null {
  if (eposta.length === 0) return "E-posta adresi gerekli.";
  if (eposta.length > EPOSTA_EN_FAZLA) return "E-posta adresi çok uzun.";
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(eposta)) {
    return "Geçerli bir e-posta adresi girin.";
  }
  return null;
}

/**
 * Uygulama kullanıcı adı — GİB kullanıcı kodu DEĞİLDİR.
 *
 * "En az bir harf" kuralı bilinçlidir: yalnızca rakamdan oluşan bir değer
 * reddedilir, böylece VKN/TCKN ve yalnızca rakamlı GİB kullanıcı kodları
 * buraya yazılamaz (ve dolayısıyla Cloudflare'e gitmez).
 */
export function kullaniciAdiHatasi(kullaniciAdi: string): string | null {
  if (kullaniciAdi.length === 0) return "Uygulama kullanıcı adı gerekli.";
  if (
    kullaniciAdi.length < KULLANICI_ADI_EN_AZ ||
    kullaniciAdi.length > KULLANICI_ADI_EN_FAZLA
  ) {
    return `Uygulama kullanıcı adı ${KULLANICI_ADI_EN_AZ}–${KULLANICI_ADI_EN_FAZLA} karakter olmalı.`;
  }
  if (!/^[a-z0-9._]+$/.test(kullaniciAdi)) {
    return "Uygulama kullanıcı adı yalnızca harf, rakam, nokta ve alt çizgi içerebilir (Türkçe karakter kullanılamaz).";
  }
  if (!/[a-z]/.test(kullaniciAdi)) {
    return "Uygulama kullanıcı adı en az bir harf içermeli. Bu alan GİB kullanıcı kodunuz değildir.";
  }
  if (/^[._]/.test(kullaniciAdi) || /[._]$/.test(kullaniciAdi)) {
    return "Uygulama kullanıcı adı nokta veya alt çizgiyle başlayamaz ve bitemez.";
  }
  return null;
}

/**
 * Çok yaygın şifreler. Kapsamlı bir liste değil; amaç en sık denenen
 * birkaç değeri elemek. Tamamı küçük harfle karşılaştırılır.
 */
const YAYGIN_SIFRELER: ReadonlySet<string> = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "password123",
  "qwerty123",
  "qwertyui",
  "iloveyou",
  "abc12345",
  "admin123",
  "sifre123",
  "parola123",
  "123456789a",
  "asdasdasd",
  "11111111",
  "12341234",
  "1q2w3e4r",
  "trustno1",
  "letmein1",
]);

/**
 * Şifre kuralları. `eposta` ve `kullaniciAdi` normalize edilmiş hâlleriyle
 * verilmeli: şifrenin bunlarla aynı olması engellenir.
 */
export function sifreHatasi(
  sifre: string,
  eposta: string,
  kullaniciAdi: string,
): string | null {
  if (sifre.length < SIFRE_EN_AZ) {
    return `Şifre en az ${SIFRE_EN_AZ} karakter olmalı.`;
  }
  if (sifre.length > SIFRE_EN_FAZLA) {
    return `Şifre en fazla ${SIFRE_EN_FAZLA} karakter olabilir.`;
  }
  const kucuk = sifre.toLowerCase();
  if (YAYGIN_SIFRELER.has(kucuk)) {
    return "Bu şifre çok yaygın kullanılıyor, başka bir şifre seçin.";
  }
  if (eposta.length > 0 && kucuk === eposta) {
    return "Şifreniz e-posta adresinizle aynı olamaz.";
  }
  if (kullaniciAdi.length > 0 && kucuk === kullaniciAdi) {
    return "Şifreniz kullanıcı adınızla aynı olamaz.";
  }
  if (new Set(sifre).size === 1) {
    return "Şifre tek bir karakterin tekrarı olamaz.";
  }
  return null;
}
