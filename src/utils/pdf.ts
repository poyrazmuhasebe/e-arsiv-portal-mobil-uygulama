import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
// "/legacy" burada kasıtlı olarak korundu: aşağıdaki writeAsStringAsync/
// EncodingType/documentDirectory de copyAsync ile aynı eski (klasik) API
// ailesinin parçası — standart "expo-file-system"a geri dönmek bu sefer de
// "deprecated, use legacy or File/Directory" uyarısını geri getirirdi.
// (Asıl "isn't readable" hatasının kaynağı import yolu değil, Android'in
// expo-print'in cache dizinindeki dosyayı başka bir modülün doğrudan
// okumasına izin vermemesiydi — aşağıdaki Base64 yaklaşımı bunu çözüyor.)
import * as FileSystem from 'expo-file-system/legacy';

import { eskiFaturaPdfleriniSil } from './dosyaTemizlik';

// GİB'in döndürdüğü HTML bazen <meta charset> içermiyor; bu durumda
// Türkçe karakterler (ş, ı, ğ vb.) PDF'e yanlış kodlanabiliyor.
function utf8MetaEkle(html: string): string {
  if (/<meta[^>]+charset/i.test(html)) return html;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, '<head$1><meta charset="utf-8">');
  }
  return `<meta charset="utf-8">${html}`;
}

// Sayfanın tam ortasına, çapraz (-35°), yarı saydam kırmızı bir filigran
// metni ekler — ör. "İPTAL AŞAMASINDA" / "İPTAL KABUL EDİLDİ". `position:
// fixed` her sayfada tekrar eder (expo-print/Chromium PDF motoru bunu
// destekliyor); `pointer-events:none` metnin altındaki fatura içeriğinin
// tıklanabilirliğini/seçilebilirliğini etkilemiyor (PDF çıktısında zaten
// anlamsız ama HTML önizlemesinde bozulmasın diye).
function filigranEkle(html: string, metin?: string): string {
  if (!metin) return html;
  const guvenliMetin = metin.toLocaleUpperCase('tr-TR');
  const filigranDiv = `<div style="position:fixed;top:50%;left:50%;` +
    `transform:translate(-50%,-50%) rotate(-35deg);` +
    `font-size:54px;font-weight:800;color:rgba(200,0,0,0.32);` +
    `white-space:nowrap;z-index:99999;pointer-events:none;` +
    `font-family:Arial,sans-serif;letter-spacing:2px;">${guvenliMetin}</div>`;
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${filigranDiv}`);
  }
  return filigranDiv + html;
}

/**
 * GİB'den gelen fatura HTML'ini PDF'e çevirip Base64 olarak döndürür.
 *
 * Önceki yaklaşım (`copyAsync({from: printToFileAsync().uri, to: ...})`)
 * Android'de "isn't readable" hatası veriyordu: `expo-file-system`,
 * `expo-print`'in kendi cache dizinine yazdığı dosyayı ayrı bir modül
 * olarak okuyamıyor (Android'in dosya/URI izin sınırı). Çözüm: dosyayı hiç
 * "okumaya" çalışmıyoruz — `printToFileAsync`'e `base64: true` verip PDF
 * içeriğini doğrudan Base64 metni olarak alıyoruz.
 */
async function pdfBase64Uret(html: string, filigranMetni?: string): Promise<string> {
  const isaretliHtml = filigranEkle(utf8MetaEkle(html), filigranMetni);
  const { base64 } = await Print.printToFileAsync({ html: isaretliHtml, base64: true });
  if (!base64) {
    throw new Error('PDF oluşturulamadı (Base64 verisi alınamadı).');
  }
  return base64;
}

/**
 * PDF'i üretip uygulamanın kendi belge dizinine (paylaşım için) yazar.
 * `filigranMetni` verilirse (ör. "İptal Kabul Edildi") sayfanın ortasına
 * çapraz bir filigran olarak eklenir.
 */
export async function generatePDF(html: string, filigranMetni?: string): Promise<string> {
  // Önceki oturumlardan/paylaşımlardan kalan eski PDF'leri temizle.
  await eskiFaturaPdfleriniSil();
  const base64 = await pdfBase64Uret(html, filigranMetni);
  const yeniUri = `${FileSystem.documentDirectory}Fatura_${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(yeniUri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return yeniUri;
}

/**
 * PDF'i oluşturur ve native paylaşım penceresini (WhatsApp, Mail, "Dosyalara
 * Kaydet" vb.) açar.
 */
export async function pdfPaylas(html: string, dialogTitle?: string, filigranMetni?: string): Promise<void> {
  const uri = await generatePDF(html, filigranMetni);
  const kullanilabilir = await Sharing.isAvailableAsync();
  if (!kullanilabilir) {
    throw new Error('Bu cihazda paylaşım/kaydetme desteklenmiyor.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: dialogTitle ?? 'Faturayı Kaydet / Paylaş',
    UTI: 'com.adobe.pdf',
  });
}

/**
 * Gerçek "cihaza indir": paylaşım penceresi AÇILMAZ. Android'de
 * StorageAccessFramework ile kullanıcıya bir klasör seçtirilir ve PDF
 * doğrudan oraya yazılır. iOS'ta SAF karşılığı olmadığından (Apple'ın
 * sistemi "Dosyalara Kaydet"i yalnızca paylaşım sayfası üzerinden sunar)
 * orada paylaşım sayfasına düşülür — bu, iOS'un kendi standart yoludur.
 */
export async function pdfIndir(html: string, filigranMetni?: string): Promise<void> {
  if (__DEV__) console.log('pdfIndir çağrıldı, Platform.OS =', Platform.OS);
  if (Platform.OS !== 'android') {
    await pdfPaylas(html, "PDF'i Kaydet", filigranMetni);
    return;
  }

  const izin = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!izin.granted) {
    throw new Error('Kaydetmek için bir klasör seçmeniz gerekiyor.');
  }

  const base64 = await pdfBase64Uret(html, filigranMetni);
  const dosyaAdi = `Fatura_${Date.now()}`;
  const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
    izin.directoryUri,
    dosyaAdi,
    'application/pdf',
  );
  await FileSystem.writeAsStringAsync(safUri, base64, { encoding: FileSystem.EncodingType.Base64 });
}
