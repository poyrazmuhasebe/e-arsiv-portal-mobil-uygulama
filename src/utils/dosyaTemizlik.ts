import * as FileSystem from 'expo-file-system/legacy';

// pdf.ts'in ürettiği dosyalar: `Fatura_<Date.now()>.pdf`. Yalnızca bu desene
// uyan dosyalara dokunuluyor; uygulama dizinindeki başka hiçbir şey silinmez.
const FATURA_PDF_DESENI = /^Fatura_(\d+)\.pdf$/;

const BIR_SAAT_MS = 60 * 60 * 1000;

/**
 * Uygulamanın belge dizininde biriken fatura PDF'lerini (alıcı VKN/unvan/tutar
 * gibi kişisel/mali veri içerirler, şifresiz saklanırlar) siler.
 *
 * `azamiYasMs` süresinden yeni dosyalara dokunulmaz — paylaşım penceresinden
 * hemen sonra alıcı uygulamanın (ör. WhatsApp, e-posta) dosyayı okuyabilmesi
 * için. `0` verilirse yaşa bakılmadan TÜM fatura PDF'leri silinir (çıkışta
 * kullanılır). Hiçbir zaman hata fırlatmaz; silinen dosya sayısını döndürür.
 */
export async function eskiFaturaPdfleriniSil(azamiYasMs: number = BIR_SAAT_MS): Promise<number> {
  const dizin = FileSystem.documentDirectory;
  if (!dizin) return 0;

  let adlar: string[];
  try {
    adlar = await FileSystem.readDirectoryAsync(dizin);
  } catch {
    return 0;
  }

  const simdi = Date.now();
  let silinen = 0;
  for (const ad of adlar) {
    const eslesme = FATURA_PDF_DESENI.exec(ad);
    if (!eslesme) continue;

    const yas = simdi - Number(eslesme[1]);
    const taze = azamiYasMs > 0 && yas >= 0 && yas < azamiYasMs;
    if (taze) continue;

    try {
      await FileSystem.deleteAsync(`${dizin}${ad}`, { idempotent: true });
      silinen += 1;
    } catch {
      // tek bir dosya silinemese de diğerlerine devam et
    }
  }
  return silinen;
}

/**
 * Yedeklenen faturaları paylaşmak için önbelleğe kopyalanan PDF'lerin klasörü
 * (bkz. services/yedekDeposu.ts → yedegiPaylas). Bu kopyalar da mali veri
 * içerir; GİB oturumu kapanınca silinir, bir sonraki mükellefe kalmaz.
 */
export const PAYLASIM_KLASORU = 'yedek-paylasim';

export async function paylasimKopyalariniSil(): Promise<void> {
  const dizin = FileSystem.cacheDirectory;
  if (!dizin) return;
  try {
    await FileSystem.deleteAsync(`${dizin}${PAYLASIM_KLASORU}/`, { idempotent: true });
  } catch {
    // silinemese de çıkışı engelleme
  }
}
