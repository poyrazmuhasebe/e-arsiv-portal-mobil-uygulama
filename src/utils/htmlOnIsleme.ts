/**
 * Fatura HTML'ini PDF'e çevirmeden ÖNCE, içindeki betiklerin çizdiği
 * öğeleri (GİB faturasındaki KAREKOD) sabit resme dönüştürür.
 *
 * NEDEN: GİB'in fatura HTML'i karekodu gömülü qrcode.js ile <canvas>'a
 * ÇALIŞMA ANINDA çiziyor. expo-print PDF'i JavaScript'i KAPALI bir WebView
 * ile üretiyor (Android: expo-print PrintPDFRenderTask javaScriptEnabled
 * açmıyor; iOS: UIMarkupTextPrintFormatter betik çalıştırmaz). Sonuç:
 * indirilen/paylaşılan/yedeklenen PDF'te karekod yoktu (kullanıcı bildirimi,
 * 2026-09-21).
 *
 * ÇÖZÜM: HTML görünmez, JavaScript'i açık ama sıkı kısıtlanmış bir WebView'de
 * bir kez çalıştırılır (bkz. components/HtmlOnIsleyici.tsx); her <canvas>
 * `toDataURL` ile <img>'e çevrilir, <script>'ler silinir ve ortaya çıkan HTML
 * PDF'e verilir. GİB'in karekodu hangi metinle/nasıl çağırdığından
 * bağımsızdır; karekodu biz üretmeyiz, GİB'in kendi kodu çizer.
 *
 * GÜVENLİK: Görüntüleyicide JavaScript bu yüzden kapalı tutuluyor (fatura
 * alanları dışarıdan gelen metin içerebilir). Burada betik çalışır ama:
 *  - Sayfaya en başta bir Content-Security-Policy eklenir: hiçbir ağ isteği
 *    (fetch/XHR/resim/form/çerçeve) yapılamaz → veri dışarı sızdırılamaz.
 *  - WebView'de gezinme, yeni pencere, dosya erişimi, depolama, çerez kapalı.
 *  - Çıktıdan betikler ve bizim CSP etiketimiz silinir; PDF'i üreten WebView
 *    zaten betik çalıştırmaz.
 *  - İşlem ÖNİŞLEME_SURESI_MS içinde bitmezse ya da hata olursa özgün HTML
 *    kullanılır (karekodsuz ama PDF yine üretilir — eski davranış).
 *
 * Bu modül SAF: WebView'e bağımlı değil, testlidir. Görünmez WebView'i çizen
 * bileşen kendini `onIsleyiciKaydet` ile kaydeder.
 */

export const ONISLEME_SURESI_MS = 6000;
/** Betikler yüklendikten sonra çizimin bitmesi için beklenen süre. */
export const CIZIM_BEKLEME_MS = 700;

const CSP_ID = 'earsiv-onisleme-csp';

/**
 * Hiçbir dış kaynağa izin vermeyen politika. Satır içi betik/stil (GİB'in
 * kendi kodu) ve data: resimler (çizilen karekod) serbest.
 */
const CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
  "img-src data:; font-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'";

export function cspEkle(html: string): string {
  const etiket = `<meta id="${CSP_ID}" http-equiv="Content-Security-Policy" content="${CSP}">`;
  // Politika, sayfadaki İLK betikten önce gelmeli: <head> varsa hemen başına.
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>${etiket}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html([^>]*)>/i, `<html$1><head>${etiket}</head>`);
  return etiket + html;
}

/**
 * WebView'e enjekte edilen betik (sayfa yüklendikten sonra çalışır).
 * `jeton`: yalnızca bu işin mesajını kabul etmek için.
 */
export function onislemeBetigi(jeton: string): string {
  return `(function () {
  var JETON = ${JSON.stringify(jeton)};
  function gonder(veri) {
    veri.t = JETON;
    window.ReactNativeWebView.postMessage(JSON.stringify(veri));
  }
  function bitir() {
    try {
      var tuvaller = Array.prototype.slice.call(document.getElementsByTagName('canvas'));
      for (var i = 0; i < tuvaller.length; i++) {
        var c = tuvaller[i];
        try {
          var img = document.createElement('img');
          img.src = c.toDataURL('image/png');
          img.width = c.width;
          img.height = c.height;
          if (c.style && c.style.cssText) img.style.cssText = c.style.cssText;
          if (c.className) img.className = c.className;
          if (c.id) img.id = c.id;
          c.parentNode.replaceChild(img, c);
        } catch (e) {}
      }
      var betikler = Array.prototype.slice.call(document.getElementsByTagName('script'));
      for (var j = 0; j < betikler.length; j++) betikler[j].parentNode.removeChild(betikler[j]);
      var csp = document.getElementById(${JSON.stringify(CSP_ID)});
      if (csp) csp.parentNode.removeChild(csp);
      var dt = document.doctype ? new XMLSerializer().serializeToString(document.doctype) : '';
      gonder({ html: dt + document.documentElement.outerHTML, tuval: tuvaller.length });
    } catch (e) {
      gonder({ hata: String(e) });
    }
  }
  setTimeout(bitir, ${CIZIM_BEKLEME_MS});
})();
true;`;
}

/** WebView'den gelen mesajı yorumlar; bu işe ait geçerli HTML değilse null. */
export function mesajiCoz(ham: string, jeton: string): string | null {
  try {
    const veri = JSON.parse(ham) as { t?: unknown; html?: unknown };
    if (veri.t !== jeton || typeof veri.html !== 'string' || veri.html.length === 0) return null;
    return veri.html;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// İş sırası: aynı anda tek WebView, işler sırayla.
// ---------------------------------------------------------------------------

export interface OnislemeIsi {
  jeton: string;
  html: string;
  bitir: (sonuc: string) => void;
  /** Sıra bu işe gelince çağrılır (süre sayacı o an başlar). */
  basladi: () => void;
}

type Isleyici = (is: OnislemeIsi | null) => void;

let isleyici: Isleyici | null = null;
const sira: OnislemeIsi[] = [];
let aktif: OnislemeIsi | null = null;

function siradakiniBaslat(): void {
  if (aktif || !isleyici) return;
  aktif = sira.shift() ?? null;
  if (!aktif) return;
  aktif.basladi();
  isleyici(aktif);
}

/** Görünmez WebView bileşeni bağlanınca/ayrılınca çağırır. */
export function onIsleyiciKaydet(yeni: Isleyici | null): void {
  isleyici = yeni;
  if (yeni) {
    siradakiniBaslat();
    return;
  }
  // Bileşen ayrıldı: bekleyen her iş özgün HTML'le biter (PDF engellenmez).
  if (aktif) aktif.bitir(aktif.html);
  for (const is of sira.slice()) is.bitir(is.html);
}

function yeniJeton(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * HTML'i betikleri çalıştırılmış ve çizimleri resme çevrilmiş hâliyle
 * döndürür. İşleyici yoksa, süre dolarsa ya da hata olursa ÖZGÜN HTML döner.
 * Asla reddedilmez.
 */
export function betikliHtmlHazirla(html: string, sureMs: number = ONISLEME_SURESI_MS): Promise<string> {
  if (!isleyici || !/<script/i.test(html)) return Promise.resolve(html);
  return new Promise<string>((coz) => {
    let bitti = false;
    let zamanlayici: ReturnType<typeof setTimeout> | undefined;
    const is: OnislemeIsi = {
      jeton: yeniJeton(),
      html,
      basladi: () => {
        zamanlayici = setTimeout(() => is.bitir(html), sureMs);
      },
      bitir: (sonuc) => {
        if (bitti) return;
        bitti = true;
        if (zamanlayici) clearTimeout(zamanlayici);
        if (aktif === is) {
          aktif = null;
          isleyici?.(null);
        } else {
          const i = sira.indexOf(is);
          if (i >= 0) sira.splice(i, 1);
        }
        coz(sonuc);
        siradakiniBaslat();
      },
    };
    sira.push(is);
    siradakiniBaslat();
  });
}
