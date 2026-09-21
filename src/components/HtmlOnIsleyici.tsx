import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { cspEkle, mesajiCoz, onIsleyiciKaydet, onislemeBetigi, type OnislemeIsi } from '../utils/htmlOnIsleme';

/**
 * PDF'ten önce fatura HTML'indeki betikleri (GİB karekodu) bir kez çalıştıran
 * GÖRÜNMEZ WebView. App.tsx'te bir kez yerleştirilir; işleri
 * utils/htmlOnIsleme.ts sırasından alır. Ayrıntı ve güvenlik gerekçesi o
 * dosyada.
 *
 * Kısıtlar FaturaWebView ile aynı (gezinme yok, yeni pencere yok, dosya /
 * depolama / çerez / önbellek kapalı); tek fark JavaScript'in açık olması —
 * sayfaya eklenen CSP ağ erişimini tamamen kapatır.
 */
export default function HtmlOnIsleyici() {
  const [is, setIs] = useState<OnislemeIsi | null>(null);

  useEffect(() => {
    onIsleyiciKaydet(setIs);
    return () => onIsleyiciKaydet(null);
  }, []);

  if (!is) return null;

  const mesajGeldi = (e: WebViewMessageEvent) => {
    const html = mesajiCoz(e.nativeEvent.data, is.jeton);
    // Geçersiz/eksik yanıtta özgün HTML (karekodsuz ama PDF yine üretilir).
    is.bitir(html ?? is.html);
  };

  return (
    <View style={styles.gizli} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <WebView
        key={is.jeton}
        source={{ html: cspEkle(is.html) }}
        injectedJavaScript={onislemeBetigi(is.jeton)}
        onMessage={mesajGeldi}
        onError={() => is.bitir(is.html)}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={(istek) => istek.url.startsWith('about:') || istek.url.startsWith('data:')}
        javaScriptEnabled
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
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Ekranda yer kaplamaz ve görünmez; yine de WebView'in sayfayı yükleyip
  // betikleri çalıştırabilmesi için sıfırdan büyük bir boyutu olmalı.
  gizli: { position: 'absolute', left: -10000, top: 0, width: 820, height: 1200, opacity: 0 },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
