// VKN (10 hane) ve TCKN (11 hane) kontrol basamağı doğrulaması.
// Yalnızca yerel/biçimsel bir ön kontrol: numaranın GİB'de gerçekten kayıtlı
// bir mükellefe ait olup olmadığını değil, yazım/basamak hatası içerip
// içermediğini denetler (gerçek varlık kontrolü mukellefBilgisiGetir ile yapılır).

/** Yalnızca rakamlardan oluşuyor mu? */
function sadeceRakam(deger: string): boolean {
  return /^\d+$/.test(deger);
}

/** 11 haneli T.C. Kimlik Numarası algoritması. */
export function tcknGecerliMi(tckn: string): boolean {
  if (tckn.length !== 11 || !sadeceRakam(tckn)) return false;
  const d = tckn.split('').map(Number);
  if (d[0] === 0) return false;

  const tekler = d[0] + d[2] + d[4] + d[6] + d[8];
  const ciftler = d[1] + d[3] + d[5] + d[7];
  // JS'te % negatif sonuç verebildiği için +10 ile pozitife çekiliyor.
  const onuncu = (((tekler * 7 - ciftler) % 10) + 10) % 10;
  if (onuncu !== d[9]) return false;

  const ilkOnToplam = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return ilkOnToplam % 10 === d[10];
}

/** 10 haneli Vergi Kimlik Numarası algoritması. */
export function vknGecerliMi(vkn: string): boolean {
  if (vkn.length !== 10 || !sadeceRakam(vkn)) return false;
  const d = vkn.split('').map(Number);

  let toplam = 0;
  for (let i = 0; i < 9; i++) {
    const t = (d[i] + (9 - i)) % 10;
    if (t === 0) continue;
    let p = (t * 2 ** (9 - i)) % 9;
    if (p === 0) p = 9;
    toplam += p;
  }
  const kontrol = (10 - (toplam % 10)) % 10;
  return kontrol === d[9];
}

/** Uzunluğa göre VKN ya da TCKN olarak doğrular (10 → VKN, 11 → TCKN). */
export function vknTcknGecerliMi(deger: string): boolean {
  const temiz = deger.trim();
  if (temiz.length === 10) return vknGecerliMi(temiz);
  if (temiz.length === 11) return tcknGecerliMi(temiz);
  return false;
}

/**
 * Kullanıcıya gösterilecek hata metni; numara henüz tamamlanmadıysa (10/11
 * haneden kısa) ya da geçerliyse null döner ki yazarken erken uyarı çıkmasın.
 */
export function vknTcknHatasi(deger: string): string | null {
  const temiz = deger.trim();
  if (temiz.length === 0) return null;
  if (!sadeceRakam(temiz)) return 'VKN/TCKN yalnızca rakamlardan oluşmalıdır.';
  if (temiz.length !== 10 && temiz.length !== 11) return null;
  if (vknTcknGecerliMi(temiz)) return null;
  return temiz.length === 10
    ? 'Geçersiz VKN (kontrol basamağı hatalı). Lütfen numarayı kontrol edin.'
    : 'Geçersiz TCKN (kontrol basamağı hatalı). Lütfen numarayı kontrol edin.';
}
