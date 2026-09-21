/**
 * İtiraz Talebi Oluştur — form kuralları ve istek verisi.
 *
 * Form, GİB portalındaki "İtiraz Talebi Oluştur" penceresinin birebir
 * karşılığıdır (kullanıcının 2026-09-21'de paylaştığı DOM):
 *   - İtiraz Belge Numarası (zorunlu)  → rel="referansBelgeId"
 *   - İtiraz Belge Tarihi   (zorunlu)  → rel="referansBelgeTarihi", "__/__/____"
 *   - İtiraz Yöntemi        (zorunlu)  → rel="itirazYontemi", 4 seçenek
 *   - Açıklama              (isteğe bağlı, en fazla 255) → rel="aciklama"
 *   - UYARI + "Uyarıyı Okudum" (işaretlenmeden gönderilemez)
 *
 * `referansBelgeId`, `referansBelgeTarihi` ve `itirazYontemi` adları ayrıca
 * CANLI DOĞRULANMIŞ "Gelen İptal/İtiraz Talepleri" yanıtında da aynen geçiyor.
 *
 * ⚠️ GİB'e giden İSTEĞİN KENDİSİ (cmd, pageName, açıklama alanının adı,
 * tarih biçimi) HENÜZ YAKALANMADI. Bu yüzden gönderim gibApi.ts'te kilitli;
 * bkz. `itirazTalebiOlustur`. Aşağıdaki `itirazIstekVerisi` en olası biçimi
 * kurar ve yakalama gelince tek yerden düzeltilir.
 *
 * SAF modül — testlidir.
 */

import type { TaslakFatura } from '../types/gib';

/** GİB'in <select> seçenekleri, değer ve etiketleriyle birebir. */
export const ITIRAZ_YONTEMLERI = [
  { deger: 'NOTER', etiket: 'Noter Aracılığıyla' },
  { deger: 'TAAHHUTLU_MEKTUP', etiket: 'Taahhütlü Mektup' },
  { deger: 'TELGRAF', etiket: 'Telgraf' },
  { deger: 'KEP', etiket: 'KEP' },
] as const;

export type ItirazYontemi = (typeof ITIRAZ_YONTEMLERI)[number]['deger'];

export const ITIRAZ_ACIKLAMA_EN_FAZLA = 255;
/** GİB alanında sınır görünmüyor; akıl dışı uzun girişi engellemek için. */
export const ITIRAZ_BELGE_NO_EN_FAZLA = 100;

/** GİB'in kendi uyarı metni, birebir. */
export const ITIRAZ_UYARI_METNI =
  'Düzenlemiş olduğunuz belge için itiraz talebi oluşturmak istiyorsunuz. ' +
  'İtiraz talebi oluşturduğunuzda bu talep geri çekilemeyecek ve alıcıya iletilecektir.';

export interface ItirazFormu {
  belgeNumarasi: string;
  belgeTarihi: Date | null;
  yontem: ItirazYontemi | '';
  aciklama: string;
  uyariOkundu: boolean;
}

export function bosItirazFormu(): ItirazFormu {
  return { belgeNumarasi: '', belgeTarihi: null, yontem: '', aciklama: '', uyariOkundu: false };
}

function gunBasi(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * İlk hatayı döndürür; form gönderilebilirse `null`. Gönder düğmesi bu
 * `null` olmadıkça kapalı kalır (GİB'deki gibi).
 */
export function itirazFormHatasi(form: ItirazFormu, bugun: Date = new Date()): string | null {
  const no = form.belgeNumarasi.trim();
  if (no.length === 0) return 'İtiraz belge numarasını girin.';
  if (no.length > ITIRAZ_BELGE_NO_EN_FAZLA) return 'İtiraz belge numarası çok uzun.';
  if (form.belgeTarihi === null) return 'İtiraz belge tarihini seçin.';
  if (gunBasi(form.belgeTarihi) > gunBasi(bugun)) return 'İtiraz belge tarihi ileri bir tarih olamaz.';
  if (!ITIRAZ_YONTEMLERI.some((y) => y.deger === form.yontem)) return 'İtiraz yöntemini seçin.';
  if (form.aciklama.length > ITIRAZ_ACIKLAMA_EN_FAZLA) {
    return `Açıklama en fazla ${ITIRAZ_ACIKLAMA_EN_FAZLA} karakter olabilir.`;
  }
  if (!form.uyariOkundu) return 'Uyarıyı okuduğunuzu onaylayın.';
  return null;
}

/** GİB tarih alanının biçimi: "__/__/____" → GG/AA/YYYY. */
export function itirazTarihiBicimle(d: Date): string {
  const gg = String(d.getDate()).padStart(2, '0');
  const aa = String(d.getMonth() + 1).padStart(2, '0');
  return `${gg}/${aa}/${d.getFullYear()}`;
}

/**
 * ⚠️ DOĞRULANMADI — en olası istek gövdesi. Alan adları formdaki `rel`
 * değerlerinden ve iptal talebi isteğinden (canlı doğrulandı: ettn,
 * onayDurumu, belgeTuru, talepAciklama) türetildi. Gerçek yakalamayla
 * karşılaştırılmadan GİB'e GÖNDERİLMEZ.
 */
export function itirazIstekVerisi(taslak: TaslakFatura, form: ItirazFormu): Record<string, unknown> {
  if (form.belgeTarihi === null) throw new Error('İtiraz belge tarihi yok.');
  return {
    ettn: taslak.ettn,
    onayDurumu: taslak.onayDurumu ?? 'Onaylandı',
    belgeTuru: taslak.belgeTuru ?? 'FATURA',
    referansBelgeId: form.belgeNumarasi.trim(),
    referansBelgeTarihi: itirazTarihiBicimle(form.belgeTarihi),
    itirazYontemi: form.yontem,
    talepAciklama: form.aciklama.trim(),
  };
}
