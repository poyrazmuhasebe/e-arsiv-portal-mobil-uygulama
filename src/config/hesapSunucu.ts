/**
 * Uygulama hesabı sunucusunun (Cloudflare Worker) adresi.
 *
 * Adres SIR DEĞİLDİR ama `EXPO_PUBLIC_*` değişkenleri uygulama paketine DÜZ
 * METİN gömülür — buraya yalnızca bu adres konur, başka hiçbir şey konmaz.
 *
 * Nereden gelir:
 * - Yerel geliştirme: git dışı `.env.local` (ör. yerel Worker'ın Wi-Fi adresi)
 * - EAS derlemeleri: `eas.json`'daki profilin `env` alanı
 *   (EAS Build git dışı `.env` dosyalarını GÖRMEZ)
 * - Örnek değer: commit'lenen `.env.example`
 *
 * Değer yoksa istemci HİÇ istek atmaz ve kullanıcıya anlamlı bir hata
 * gösterilir.
 */

export type SunucuDurumu =
  | { tamam: true; taban: string }
  | { tamam: false; mesaj: string };

/**
 * Not: `process.env.EXPO_PUBLIC_...` ifadesi derleme sırasında sabit değerle
 * DEĞİŞTİRİLİR, bu yüzden değişken adı burada birebir yazılmalıdır (dinamik
 * anahtarla okunamaz).
 */
function hamAdres(): string {
  return (process.env.EXPO_PUBLIC_HESAP_API_URL ?? '').trim();
}

/** Sondaki eğik çizgiler atılır ki `taban + '/v1/...'` her zaman doğru olsun. */
function normalize(adres: string): string {
  return adres.replace(/\/+$/, '');
}

/**
 * `gelistirmeMi` parametresi testlerden verilebilsin diye var; uygulamada
 * `__DEV__` geçilir.
 */
export function hesapSunucuDurumu(gelistirmeMi: boolean): SunucuDurumu {
  const taban = normalize(hamAdres());

  if (taban.length === 0) {
    return {
      tamam: false,
      mesaj:
        'Hesap sunucusu yapılandırılmamış. Bu sürüm hesap işlemlerini yapamaz.',
    };
  }

  if (!/^https?:\/\//.test(taban)) {
    return { tamam: false, mesaj: 'Hesap sunucusu adresi geçersiz.' };
  }

  // Yayın derlemesinde yalnızca https kabul edilir; cleartext trafiğe
  // uygulama düzeyinde de izin verilmez. Geliştirmede yerel Worker'a
  // http:// ile bağlanmak gerekiyor.
  if (!gelistirmeMi && !taban.startsWith('https://')) {
    return {
      tamam: false,
      mesaj: 'Hesap sunucusu adresi güvenli değil (https gerekli).',
    };
  }

  return { tamam: true, taban };
}
