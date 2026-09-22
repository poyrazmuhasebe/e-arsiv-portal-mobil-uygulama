/**
 * Fatura sorgulama tarih aralığı sınırı.
 *
 * GİB artık 1 haftadan uzun aralıkta fatura sorgulamaya izin vermiyor
 * (kullanıcı bildirimi, 2026-09-21). Kurallar (kullanıcı tarifi, 2026-09-22):
 *  - Bir hafta = BAŞLANGIÇ VE BİTİŞ DAHİL EN_FAZLA_GUN (7) takvim günü:
 *    01/08–07/08, 15/08–21/08. İki uç arasındaki fark en fazla
 *    EN_FAZLA_FARK (6) gün. (Önceki sürüm 7 gün FARKA, yani 8 güne izin
 *    veriyordu.)
 *  - Aralık AY SONUNU GEÇEMEZ: iki uç aynı ayda olmalı. 29/08 seçilirse bitiş
 *    en fazla 31/08; 29/04 seçilirse en fazla 30/04 (29/08–05/09 gibi ay geçen
 *    aralıklar kabul edilmez).
 *
 * SAF modül — testlidir.
 */

/** Bir aralıkta en fazla kaç takvim günü olabilir (uçlar dahil). */
export const EN_FAZLA_GUN = 7;
/** Başlangıç ile bitiş arasındaki en büyük gün farkı (uçlar dahil 7 gün → 6). */
export const EN_FAZLA_FARK = EN_FAZLA_GUN - 1;

const GUN_MS = 24 * 60 * 60 * 1000;

/** Saat bilgisini atar: yalnızca takvim günü karşılaştırılır. */
function gunBasi(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function gunEkle(d: Date, gun: number): Date {
  const yeni = gunBasi(d);
  yeni.setDate(yeni.getDate() + gun);
  return yeni;
}

/** Ayın ilk günü. */
export function ayBasi(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Ayın son günü (30, 31, 28/29). */
export function aySonu(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function enKucuk(a: Date, b: Date): Date {
  return a < b ? a : b;
}

function enBuyuk(a: Date, b: Date): Date {
  return a > b ? a : b;
}

export function ayniAyMi(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** İki tarih arasındaki takvim günü farkı (b − a). Yaz saati kaymasına dayanıklı. */
export function gunFarki(a: Date, b: Date): number {
  return Math.round((gunBasi(b).getTime() - gunBasi(a).getTime()) / GUN_MS);
}

/**
 * Bir BAŞLANGIÇ için izin verilen en geç bitiş: başlangıç + 6 gün, ama ay
 * sonunu geçmez.
 */
export function enGecBitis(baslangic: Date): Date {
  return enKucuk(gunEkle(baslangic, EN_FAZLA_FARK), aySonu(baslangic));
}

/**
 * Bir BİTİŞ için izin verilen en erken başlangıç: bitiş − 6 gün, ama ay
 * başından önceye gitmez.
 */
export function enErkenBaslangic(bitis: Date): Date {
  return enBuyuk(gunEkle(bitis, -EN_FAZLA_FARK), ayBasi(bitis));
}

/**
 * Sorgu ekranlarının varsayılan başlangıcı: bugün dahil son 7 gün, ama ay
 * başından önceye gitmez (bugün 21.09 → 15.09; bugün 03.09 → 01.09).
 */
export function varsayilanBaslangic(bugun: Date = new Date()): Date {
  return enErkenBaslangic(gunBasi(bugun));
}

export interface SinirliAralik {
  baslangic: Date;
  bitis: Date;
  /** Kullanıcının seçmediği uç kaydırıldıysa true (bilgi mesajı için). */
  duzeltildi: boolean;
}

/**
 * Kullanıcı `degisen` ucunu seçtikten sonra aralığı geçerli hâle getirir:
 * - İki uç da bugünden ileri olamaz.
 * - Bitiş başlangıçtan önce olamaz.
 * - Aralık uçlar dahil EN_FAZLA_GUN günü geçemez ve AY SONUNU GEÇEMEZ.
 * Kullanıcının seçtiği uca dokunulmaz (bugünü aşmadıkça); DİĞER uç kaydırılır.
 */
export function araligiSinirla(
  baslangic: Date,
  bitis: Date,
  degisen: 'baslangic' | 'bitis',
  bugun: Date = new Date(),
): SinirliAralik {
  const sonGun = gunBasi(bugun);
  let bas = gunBasi(baslangic);
  let bit = gunBasi(bitis);
  const ilkBas = bas.getTime();
  const ilkBit = bit.getTime();

  if (bas > sonGun) bas = sonGun;
  if (bit > sonGun) bit = sonGun;

  if (degisen === 'baslangic') {
    const sinir = enKucuk(enGecBitis(bas), sonGun);
    if (bit < bas || bit > sinir) bit = sinir < bas ? bas : sinir;
  } else {
    const sinir = enErkenBaslangic(bit);
    if (bas > bit || bas < sinir) bas = sinir;
  }

  const duzeltildi =
    degisen === 'baslangic' ? bit.getTime() !== ilkBit : bas.getTime() !== ilkBas;
  return { baslangic: bas, bitis: bit, duzeltildi };
}

/** Sorgu atılmadan önceki son kontrol (uçlar dahil en fazla 7 gün, aynı ay). */
export function aralikGecerliMi(baslangic: Date, bitis: Date): boolean {
  const fark = gunFarki(baslangic, bitis);
  return fark >= 0 && fark <= EN_FAZLA_FARK && ayniAyMi(baslangic, bitis);
}
