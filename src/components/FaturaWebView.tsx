import React from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  html: string;
  /**
   * Varsayılan KAPALI. GİB'in fatura HTML'i yalnızca görüntülenir; içindeki
   * alanlar (alıcı unvanı, mal/hizmet adı, not vb.) üçüncü tarafça
   * belirlenebildiğinden içerik güvenilmez kabul edilir ve betik çalıştırılmaz.
   * Yalnızca kullanıcı, fatura boş/bozuk göründüğü için bilinçli olarak
   * "gelişmiş görünüm"ü açtığında true olur.
   */
  javaScriptAcik?: boolean;
}

/**
 * GİB'den gelen fatura HTML'ini, gereksiz yetkileri kapatılmış (en az yetki)
 * bir WebView içinde gösterir:
 * - Sayfa içi gezinme engellenir: yalnızca `about:`/`data:` (yani bizim
 *   verdiğimiz HTML'in kendisi) yüklenir; bağlantılara tıklamak hiçbir yere
 *   götürmez, dış siteler bu pencerede açılmaz.
 * - Yeni pencere açma, dosya sistemi erişimi, DOM depolama, çerezler ve önbellek
 *   kapalıdır; `incognito` ile fatura içeriği WebView önbelleğinde kalmaz.
 * - JavaScript varsayılan olarak kapalıdır (bkz. `javaScriptAcik`).
 */
export default function FaturaWebView({ html, javaScriptAcik = false }: Props) {
  return (
    <WebView
      // JavaScript ayarı değişince sayfanın yeni ayarla baştan yüklenmesi için.
      key={javaScriptAcik ? 'js-acik' : 'js-kapali'}
      source={{ html }}
      style={styles.flex}
      // originWhitelist '*' bırakılıyor çünkü listede olmayan adresleri
      // react-native-webview sistem tarayıcısında açardı; gezinme denetimi
      // aşağıdaki onShouldStartLoadWithRequest ile SESSİZCE engelleniyor.
      originWhitelist={['*']}
      onShouldStartLoadWithRequest={(istek) => istek.url.startsWith('about:') || istek.url.startsWith('data:')}
      javaScriptEnabled={javaScriptAcik}
      javaScriptCanOpenWindowsAutomatically={false}
      setSupportMultipleWindows={false}
      domStorageEnabled={false}
      incognito
      cacheEnabled={false}
      thirdPartyCookiesEnabled={false}
      sharedCookiesEnabled={false}
      allowFileAccess={false}
      allowFileAccessFromFileURLs={false}
      allowUniversalAccessFromFileURLs={false}
      mixedContentMode="never"
      allowsLinkPreview={false}
      geolocationEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
