/**
 * Uygulama hesabı alanlarının istemci tarafı doğrulaması.
 *
 * ⚠️ Bu kurallar `worker/src/dogrulama.ts` ile AYNI olmalıdır. Tek doğruluk
 * kaynağı sunucudur (istemci atlatılabilir); buradaki kopya yalnızca
 * kullanıcıya anında geri bildirim vermek ve gereksiz istek atmamak için var.
 *
 * "En az bir harf" kuralı bilinçlidir: yalnızca rakamdan oluşan bir değer
 * reddedilir, böylece VKN/TCKN ve yalnızca rakamlı GİB kullanıcı kodları
 * buraya yazılamaz ve Cloudflare'e hiç gitmez.
 */

export const KULLANICI_ADI_EN_AZ = 3;
export const KULLANICI_ADI_EN_FAZLA = 20;
export const SIFRE_EN_AZ = 8;
export const SIFRE_EN_FAZLA = 128;
export const EPOSTA_EN_FAZLA = 254;

export function epostaNormalize(deger: string): string {
  return deger.trim().toLowerCase();
}

export function kullaniciAdiNormalize(deger: string): string {
  return deger.trim().toLowerCase();
}

export function epostaHatasi(eposta: string): string | null {
  if (eposta.length === 0) return 'E-posta adresi gerekli.';
  if (eposta.length > EPOSTA_EN_FAZLA) return 'E-posta adresi çok uzun.';
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(eposta)) {
    return 'Geçerli bir e-posta adresi girin.';
  }
  return null;
}

export function kullaniciAdiHatasi(kullaniciAdi: string): string | null {
  if (kullaniciAdi.length === 0) return 'Uygulama kullanıcı adı gerekli.';
  if (
    kullaniciAdi.length < KULLANICI_ADI_EN_AZ ||
    kullaniciAdi.length > KULLANICI_ADI_EN_FAZLA
  ) {
    return `Uygulama kullanıcı adı ${KULLANICI_ADI_EN_AZ}–${KULLANICI_ADI_EN_FAZLA} karakter olmalı.`;
  }
  if (!/^[a-z0-9._]+$/.test(kullaniciAdi)) {
    return 'Uygulama kullanıcı adı yalnızca harf, rakam, nokta ve alt çizgi içerebilir (Türkçe karakter kullanılamaz).';
  }
  if (!/[a-z]/.test(kullaniciAdi)) {
    return 'Uygulama kullanıcı adı en az bir harf içermeli. Bu alan GİB kullanıcı kodunuz değildir.';
  }
  if (/^[._]/.test(kullaniciAdi) || /[._]$/.test(kullaniciAdi)) {
    return 'Uygulama kullanıcı adı nokta veya alt çizgiyle başlayamaz ve bitemez.';
  }
  return null;
}

const YAYGIN_SIFRELER: readonly string[] = [
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  'password123',
  'qwerty123',
  'qwertyui',
  'iloveyou',
  'abc12345',
  'admin123',
  'sifre123',
  'parola123',
  '123456789a',
  'asdasdasd',
  '11111111',
  '12341234',
  '1q2w3e4r',
  'trustno1',
  'letmein1',
];

export function sifreHatasi(
  sifre: string,
  eposta: string,
  kullaniciAdi: string,
): string | null {
  if (sifre.length < SIFRE_EN_AZ) return `Şifre en az ${SIFRE_EN_AZ} karakter olmalı.`;
  if (sifre.length > SIFRE_EN_FAZLA) {
    return `Şifre en fazla ${SIFRE_EN_FAZLA} karakter olabilir.`;
  }
  const kucuk = sifre.toLowerCase();
  if (YAYGIN_SIFRELER.includes(kucuk)) {
    return 'Bu şifre çok yaygın kullanılıyor, başka bir şifre seçin.';
  }
  if (eposta.length > 0 && kucuk === eposta) {
    return 'Şifreniz e-posta adresinizle aynı olamaz.';
  }
  if (kullaniciAdi.length > 0 && kucuk === kullaniciAdi) {
    return 'Şifreniz kullanıcı adınızla aynı olamaz.';
  }
  if (new Set(sifre).size === 1) return 'Şifre tek bir karakterin tekrarı olamaz.';
  return null;
}

/**
 * Kullanıcının, uygulama kullanıcı adı alanına GİB kullanıcı kodunu yazmasını
 * yakalar. Karşılaştırma YALNIZCA CİHAZDA yapılır — hatırlanan GİB kodu hiçbir
 * koşulda sunucuya gönderilmez, eşleşme varsa istek hiç atılmaz.
 */
export function gibKoduylaCakisiyorMu(
  kullaniciAdi: string,
  hatirlananGibKodu: string | null,
): boolean {
  if (hatirlananGibKodu === null) return false;
  const kod = hatirlananGibKodu.trim().toLowerCase();
  if (kod.length === 0) return false;
  return kullaniciAdiNormalize(kullaniciAdi) === kod;
}

export const GIB_KODU_CAKISMA_MESAJI =
  'Bu, GİB kullanıcı kodunuz. Uygulama kullanıcı adı GİB hesabınızdan bağımsızdır; farklı bir ad seçin.';
