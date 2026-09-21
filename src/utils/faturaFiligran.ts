/**
 * Fatura filigranı: hangi durumda hangi metin, ve HTML'e nasıl eklenir.
 *
 * Hem görüntüleme ekranı (WebView) hem PDF aynı fonksiyonları kullanır.
 * Önceden filigran yalnızca PDF'e ekleniyordu; faturayı uygulamada açınca
 * "İptal Kabul Edildi" hiç görünmüyordu (2026-09-21, kullanıcı bildirimi).
 *
 * SAF modül — React Native'e bağımlılığı yok, testlidir.
 */

import type { TaslakFatura } from '../types/gib';

/**
 * İptal/itiraz talebinin kart ve filigran metni.
 *
 * `talepDurum` kodları (kullanıcı tarafından doğrulandı, TALEP_DURUM_GUNCELLE
 * ile aynı şema): "0" = Aşamasında, "1" = Kabul Edildi, "2" = Reddedildi.
 *
 * TALEP YOKSA GİB "-99" gönderiyor (2026-09-21 portal yakalaması:
 * `"iptalItiraz":"-99","talepDurum":"-99"`). Önceki kod yalnızca "1" ve "2"yi
 * tanıyıp gerisini "Aşamasında" sayıyordu; bu yüzden talebi OLMAYAN her fatura
 * "İptal/İtiraz Aşamasında" olarak işaretleniyordu. Artık yalnızca bilinen üç
 * kod bir talep sayılır; "-99", boş ya da tanınmayan değer = talep yok.
 *
 * `iptalItiraz`: "0" = İptal (doğrulandı), "1" = İtiraz (tahmin).
 */
export function iptalItirazDurumMetni(item: TaslakFatura): string | undefined {
  const talepDurum = typeof item.talepDurum === 'string' ? item.talepDurum : undefined;
  const tur = item.iptalItiraz === '1' ? 'İtiraz' : 'İptal';
  if (talepDurum === '0') return `${tur} Aşamasında`;
  if (talepDurum === '1') return `${tur} Kabul Edildi`;
  if (talepDurum === '2') return `${tur} Reddedildi`;
  return undefined;
}

/**
 * Faturanın üzerine basılacak filigran metni; filigran yoksa `undefined`.
 *
 * Öncelik: silinmiş belge → "Fatura Silindi". Silinmiş bir belgede
 * iptal/itiraz talebi anlamsız olduğundan talep durumuna bakılmaz.
 * Reddedilen talepler de filigranla gösterilir (kullanıcı isteği,
 * 2026-09-21). Belge geçerliliğini korusa da talebin reddedildiği belgede
 * görünür olmalı.
 */
export function faturaFiligranMetni(item: TaslakFatura): string | undefined {
  if (item.onayDurumu === 'Silinmiş') return 'Fatura Silindi';
  return iptalItirazDurumMetni(item);
}

/**
 * GİB, `onayDurumu: "Silinmiş"` ile istenen faturanın HTML'ine KENDİ
 * "İPTAL EDİLMİŞ" filigranını çiziyor. Silinmiş (hiç onaylanmamış) bir taslak
 * için bu yanıltıcı: belge iptal edilmedi, silindi.
 *
 * GİB'in biçimi GÖRÜLDÜ (2026-09-21, geliştirme logu): filigran bir METİN,
 * kendi <p> etiketinde:
 *   <p style='...transform:rotate(310deg);...color:lightcoral'>İPTAL EDİLMİŞ</p>
 *
 * Yalnızca metnin TAMAMI bu ifade olan bir etiket içeriği değiştirilir
 * (`>İPTAL EDİLMİŞ<`); fatura notu gibi uzun bir metnin içinde geçen
 * "iptal edildi" gibi ifadelere dokunulmaz.
 *
 * NFC: "İ" bazen iki kod noktası (I + U+0307) olarak kodlanır; eşleşme
 * kaçmasın diye HTML önce kanonik biçime getirilir (görünümü değiştirmez).
 */
const GIB_IPTAL_FILIGRANI =
  />(\s|&nbsp;)*(İPTAL|İptal|iptal|IPTAL)(\s|&nbsp;)+(EDİLMİŞTİR|EDİLMİŞ|EDİLDİ|EDILMISTIR|EDILMIS|EDILDI|edilmiştir|edilmiş|edildi)(\s|&nbsp;)*</g;

export function gibIptalMetniniDegistir(html: string): { html: string; degisti: boolean } {
  let degisti = false;
  const sonuc = html.normalize('NFC').replace(GIB_IPTAL_FILIGRANI, () => {
    degisti = true;
    return '>FATURA SİLİNDİ<';
  });
  return { html: degisti ? sonuc : html, degisti };
}

/** HTML'e yerleştirilen metin kaçışlanır (filigran metni sabit olsa da). */
function kacisla(metin: string): string {
  return metin
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sayfanın tam ortasına, çapraz (-35°), yarı saydam kırmızı bir filigran
 * ekler. `position: fixed` PDF'te her sayfada tekrar eder (expo-print/
 * Chromium), WebView'de ekranın ortasında sabit durur. `pointer-events:none`
 * altındaki içeriği etkilemez. Metin yoksa HTML değişmeden döner.
 */
export function filigranEkle(html: string, metin?: string): string {
  if (!metin) return html;
  const div =
    '<div data-earsiv-filigran="1" style="position:fixed;top:50%;left:50%;' +
    'transform:translate(-50%,-50%) rotate(-35deg);' +
    'font-size:54px;font-weight:800;color:rgba(200,0,0,0.32);' +
    'white-space:nowrap;z-index:99999;pointer-events:none;' +
    'font-family:Arial,sans-serif;letter-spacing:2px;">' +
    kacisla(metin.toLocaleUpperCase('tr-TR')) +
    '</div>';
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${div}`);
  }
  return div + html;
}

/**
 * Fatura HTML'ini filigranıyla birlikte hazırlar. Silinmiş faturada GİB'in
 * kendi filigranı yerinde "FATURA SİLİNDİ" yapılır; diğer durumlarda bizim
 * filigranımız eklenir. Görüntüleme ve PDF bu tek fonksiyonu kullanır.
 */
export function filigranliFaturaHtml(html: string, item: TaslakFatura): string {
  if (item.onayDurumu === 'Silinmiş') {
    // GİB'in kendi filigranı bulunup "FATURA SİLİNDİ" yapıldıysa İKİNCİ bir
    // filigran eklenmez (üst üste iki farklı açıda yazı olmasın). Bulunamazsa
    // (GİB biçimi değişirse) bizimki eklenir.
    const { html: duzeltilmis, degisti } = gibIptalMetniniDegistir(html);
    return degisti ? duzeltilmis : filigranEkle(html, faturaFiligranMetni(item));
  }
  return filigranEkle(html, faturaFiligranMetni(item));
}
