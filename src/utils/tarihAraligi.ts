/**
 * Fatura sorgulama tarih aralığı sınırı.
 *
 * GİB artık 1 haftadan uzun aralıkta fatura sorgulamaya izin vermiyor
 * (kullanıcı bildirimi, 2026-09-21). Bir hafta = BAŞLANGIÇ VE BİTİŞ DAHİL
 * EN_FAZLA_GUN (7) takvim günü: 01/08–07/08, 15/08–21/08 (kullanıcı tarifi,
 * 2026-09-22). Önceki sürüm 7 gün FARKA izin veriyordu (01/08–08/08 = 8 gün);
 * düzeltildi. İki uç arasındaki fark en fazla EN_FAZLA_FARK (6) gündür.
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

/** İki tarih arasındaki takvim günü farkı (b − a). Yaz saati kaymasına dayanıklı. */
export function gunFarki(a: Date, b: Date): number {
  return Math.round((gunBasi(b).getTime() - gunBasi(a).getTime()) / GUN_MS);
}

/**
 * Sorgu ekranlarının varsayılan başlangıcı: bugün dahil son 7 gün
 * (bugün 21.09 → 15.09).
 */
export function varsayilanBaslangic(bugun: Date = new Date()): Date {
  return gunEkle(bugun, -EN_FAZLA_FARK);
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
 * - Aralık uçlar dahil EN_FAZLA_GUN günü geçemez.
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
    if (bit < bas || gunFarki(bas, bit) > EN_FAZLA_FARK) {
      const aday = gunEkle(bas, EN_FAZLA_FARK);
      bit = aday > sonGun ? sonGun : aday;
      if (bit < bas) bit = bas;
    }
  } else {
    if (bit < bas || gunFarki(bas, bit) > EN_FAZLA_FARK) {
      bas = gunEkle(bit, -EN_FAZLA_FARK);
    }
  }

  const duzeltildi =
    degisen === 'baslangic' ? bit.getTime() !== ilkBit : bas.getTime() !== ilkBas;
  return { baslangic: bas, bitis: bit, duzeltildi };
}

/** Sorgu atılmadan önceki son kontrol (uçlar dahil en fazla 7 gün). */
export function aralikGecerliMi(baslangic: Date, bitis: Date): boolean {
  const fark = gunFarki(baslangic, bitis);
  return fark >= 0 && fark <= EN_FAZLA_FARK;
}
