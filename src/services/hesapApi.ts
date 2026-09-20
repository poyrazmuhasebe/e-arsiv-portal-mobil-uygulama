/**
 * Uygulama hesabı sunucusu (Cloudflare Worker) istemcisi.
 *
 * ⚠️ TEMEL KURAL: bu modül Cloudflare'e YALNIZCA uygulama hesabı verisi
 * gönderir — e-posta, uygulama kullanıcı adı, şifre ve oturum token'ları.
 * GİB kullanıcı kodu, GİB şifresi, GİB token'ı, VKN/TCKN, unvan, fatura
 * verisi ve defterler HİÇBİR KOŞULDA buradan geçmez.
 *
 * Bu kural iki katmanla korunur:
 * 1. Aşağıdaki `govdeyiDenetle()` gövdeyi göndermeden önce yasaklı alan
 *    adlarına karşı tarar ve bulursa isteği ATMAZ.
 * 2. Worker da bilinmeyen alanları reddeder (worker/src/govde.ts).
 *
 * Bu modül `gibApi.ts`'ten HİÇBİR ŞEY import etmez ve `gibApi ↔ useAuthStore`
 * döngüsel bağımlılığına girmez.
 */

import { hesapSunucuDurumu } from '../config/hesapSunucu';

const ZAMAN_ASIMI_MS = 15000;

export interface HesapKullanicisi {
  id: string;
  eposta: string;
  kullaniciAdi: string;
  epostaDogrulandi: boolean;
}

export interface HesapOturumu {
  erisimToken: string;
  /** Unix zamanı, saniye. */
  erisimBitis: number;
  yenilemeToken: string;
  /** Unix zamanı, saniye. */
  yenilemeBitis: number;
}

export interface HesapYaniti {
  kullanici: HesapKullanicisi;
  oturum: HesapOturumu;
  /** YALNIZCA yerel geliştirme Worker'ından gelir; üretimde bulunmaz. */
  gelistirmeKodu?: string;
}

export class HesapApiHatasi extends Error {
  constructor(
    readonly kod: string,
    override readonly message: string,
    readonly durum: number | null = null,
  ) {
    super(message);
    this.name = 'HesapApiHatasi';
  }
}

/**
 * Hesap sunucusuna ASLA gönderilmemesi gereken alan adları. Küçük harfe
 * çevrilip karşılaştırılır; iç içe nesnelerde de aranır.
 */
const YASAKLI_ALANLAR: readonly string[] = [
  'gibtoken',
  'gibkullanicikodu',
  'gibsifre',
  'kullanicikodu',
  'kullanicisifresi',
  'kullanicibilgisi',
  'vkn',
  'tckn',
  'vknktckn',
  'vergidairesi',
  'unvan',
  'faturalar',
  'fatura',
  'alicidefteri',
  'malhizmetdefteri',
  'iadetable',
  'token',
];

/**
 * Gövdeyi göndermeden önce denetler. Bir hata sonucu GİB verisi buraya
 * sızarsa istek HİÇ atılmaz — sessizce göndermektense görünür biçimde
 * patlaması yeğlenir.
 */
export function govdeyiDenetle(govde: unknown, yol = 'govde'): void {
  if (govde === null || typeof govde !== 'object') return;

  if (Array.isArray(govde)) {
    govde.forEach((oge, i) => govdeyiDenetle(oge, `${yol}[${i}]`));
    return;
  }

  for (const [alan, deger] of Object.entries(govde as Record<string, unknown>)) {
    if (YASAKLI_ALANLAR.includes(alan.toLowerCase())) {
      // Alanın DEĞERİ hata mesajına konmaz.
      throw new HesapApiHatasi(
        'yasakli_alan',
        `Hesap sunucusuna gönderilemeyecek bir alan var: ${yol}.${alan}`,
      );
    }
    govdeyiDenetle(deger, `${yol}.${alan}`);
  }
}

interface IstekSecenekleri {
  yol: string;
  govde?: Record<string, unknown>;
  erisimToken?: string;
  yontem?: 'POST' | 'GET' | 'DELETE';
  gelistirmeMi: boolean;
}

async function istek<T>(secenekler: IstekSecenekleri): Promise<T> {
  const durum = hesapSunucuDurumu(secenekler.gelistirmeMi);
  if (!durum.tamam) {
    throw new HesapApiHatasi('yapilandirma_eksik', durum.mesaj);
  }

  if (secenekler.govde !== undefined) govdeyiDenetle(secenekler.govde);

  const basliklar: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
  };
  if (secenekler.erisimToken !== undefined) {
    basliklar.authorization = `Bearer ${secenekler.erisimToken}`;
  }

  const kesici = new AbortController();
  const sayac = setTimeout(() => kesici.abort(), ZAMAN_ASIMI_MS);

  let yanit: Response;
  try {
    yanit = await fetch(`${durum.taban}${secenekler.yol}`, {
      method: secenekler.yontem ?? 'POST',
      headers: basliklar,
      body: JSON.stringify(secenekler.govde ?? {}),
      signal: kesici.signal,
    });
  } catch (hata) {
    const kesildi = hata instanceof Error && hata.name === 'AbortError';
    throw new HesapApiHatasi(
      kesildi ? 'zaman_asimi' : 'ag_hatasi',
      kesildi
        ? 'Hesap sunucusu yanıt vermedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'
        : 'Hesap sunucusuna ulaşılamadı. İnternet bağlantınızı kontrol edin.',
    );
  } finally {
    clearTimeout(sayac);
  }

  // Cloudflare'in kendi hata sayfaları (1101 yakalanmayan istisna, 1102
  // CPU/bellek aşımı, 1027 günlük sınır) JSON DEĞİL HTML döner. Bunlar
  // JSON.parse'a girerse anlamsız bir hata çıkar; içerik tipine bakıyoruz.
  const icerikTipi = yanit.headers.get('content-type') ?? '';
  if (!icerikTipi.toLowerCase().includes('application/json')) {
    throw new HesapApiHatasi(
      'sunucu_yaniti_bozuk',
      'Hesap sunucusu şu anda hizmet veremiyor. Lütfen birazdan tekrar deneyin.',
      yanit.status,
    );
  }

  let veri: unknown;
  try {
    veri = await yanit.json();
  } catch {
    throw new HesapApiHatasi(
      'sunucu_yaniti_bozuk',
      'Hesap sunucusundan beklenmeyen bir yanıt geldi.',
      yanit.status,
    );
  }

  if (!yanit.ok) {
    const hata = (veri as { hata?: { kod?: unknown; mesaj?: unknown } } | null)?.hata;
    const kod = typeof hata?.kod === 'string' ? hata.kod : 'sunucu_hatasi';
    const mesaj =
      typeof hata?.mesaj === 'string' && hata.mesaj.length > 0
        ? hata.mesaj
        : 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
    throw new HesapApiHatasi(kod, mesaj, yanit.status);
  }

  return veri as T;
}

export function kayitOl(
  eposta: string,
  kullaniciAdi: string,
  sifre: string,
  gelistirmeMi: boolean,
): Promise<HesapYaniti> {
  return istek<HesapYaniti>({
    yol: '/v1/kayit',
    govde: { eposta, kullaniciAdi, sifre },
    gelistirmeMi,
  });
}

export function girisYap(
  eposta: string,
  sifre: string,
  gelistirmeMi: boolean,
): Promise<HesapYaniti> {
  return istek<HesapYaniti>({
    yol: '/v1/giris',
    govde: { eposta, sifre },
    gelistirmeMi,
  });
}

export function oturumYenile(
  yenilemeToken: string,
  gelistirmeMi: boolean,
): Promise<HesapYaniti> {
  return istek<HesapYaniti>({
    yol: '/v1/oturum/yenile',
    govde: { yenilemeToken },
    gelistirmeMi,
  });
}

export function cikisYap(
  yenilemeToken: string,
  gelistirmeMi: boolean,
): Promise<{ tamam: boolean }> {
  return istek<{ tamam: boolean }>({
    yol: '/v1/cikis',
    govde: { yenilemeToken },
    gelistirmeMi,
  });
}

export function epostaKoduGonder(
  erisimToken: string,
  gelistirmeMi: boolean,
): Promise<{ tamam: boolean; zatenDogrulandi?: boolean; gelistirmeKodu?: string }> {
  return istek({
    yol: '/v1/eposta/kod-gonder',
    govde: {},
    erisimToken,
    gelistirmeMi,
  });
}

export function epostaDogrula(
  erisimToken: string,
  kod: string,
  gelistirmeMi: boolean,
): Promise<{ tamam: boolean; epostaDogrulandi: boolean }> {
  return istek({
    yol: '/v1/eposta/dogrula',
    govde: { kod },
    erisimToken,
    gelistirmeMi,
  });
}

/** Hesabı kalıcı olarak siler. Şifre yeniden istenir. */
export function hesabiSil(
  erisimToken: string,
  sifre: string,
  gelistirmeMi: boolean,
): Promise<{ tamam: boolean; silindi: boolean }> {
  return istek({
    yol: '/v1/hesap',
    yontem: 'DELETE',
    govde: { sifre },
    erisimToken,
    gelistirmeMi,
  });
}

export function sifreSifirlamaBaslat(
  eposta: string,
  gelistirmeMi: boolean,
): Promise<{ tamam: boolean; gelistirmeKodu?: string }> {
  return istek({
    yol: '/v1/sifre/sifirlama-baslat',
    govde: { eposta },
    gelistirmeMi,
  });
}

export function sifreSifirlamaTamamla(
  eposta: string,
  kod: string,
  yeniSifre: string,
  gelistirmeMi: boolean,
): Promise<{ tamam: boolean }> {
  return istek({
    yol: '/v1/sifre/sifirlama-tamamla',
    govde: { eposta, kod, yeniSifre },
    gelistirmeMi,
  });
}
