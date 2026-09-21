import { colors } from './colors';

/**
 * İkonun ANLAMINA göre rengi. Düğmeler, ikon düğmeleri, bölüm başlıkları ve
 * boş durumlar ikona ayrıca renk verilmemişse buradan alır; böylece aynı
 * eylem her ekranda aynı renkte görünür:
 *
 *   silme / kapatma / iptal / PDF → kırmızı      görüntüleme / arama / bilgi → mavi
 *   indirme / kaydetme / onay / kilit → yeşil     düzenleme / uyarı / klasör / saat → amber
 *   defter / liste / gelen belge → turkuaz        ekleme / paylaşma / hesap → lavanta
 *
 * Kurallar yukarıdan aşağı denenir; ilk eşleşen kazanır. Eşleşme yoksa
 * `undefined` (çağıran kendi varsayılanını kullanır). Geri oku gibi gezinme
 * ikonları bilerek renksiz kalır.
 */
const KURALLAR: [RegExp, string][] = [
  [/^(arrow-|chevron-|menu|dots-)/, ''],
  [/delete|trash|remove|close|cancel|alert-octagon|file-pdf|logout(?!-variant)/, colors.danger],
  [/download|content-save|check|lock|shield|cellphone-check|send/, colors.success],
  [/pencil|edit|undo|alert|clock|timer|folder|logout-variant/, colors.warning],
  [/eye|magnify|information|help|refresh|calendar|file-document|file-sign|message|cellphone|email/, colors.info],
  [/book|card-account|package|inbox|format-list|clipboard|store/, colors.teal],
  [/plus|share|account|export|login/, colors.primary],
];

export function ikonRengi(ad: string | undefined): string | undefined {
  if (!ad) return undefined;
  for (const [desen, renk] of KURALLAR) {
    if (desen.test(ad)) return renk || undefined;
  }
  return undefined;
}
