// `process.env` için DAR tip tanımı.
//
// Neden @types/node değil: bu bir React Native uygulaması, Node değil.
// Bundler (Metro/Babel) `process.env.EXPO_PUBLIC_*` ifadelerini derleme
// sırasında sabit değerle DEĞİŞTİRİR; çalışma zamanında bir Node `process`
// nesnesi yoktur. Bu yüzden yalnızca kullandığımız kadarını tanımlıyoruz.
//
// Testler Node altında koştuğu için gerçek `process.env` görürler; bu tanım
// orada da geçerli olsun diye tsconfig.test.json bu dosyayı `include` eder.

declare const process: {
  env: {
    /** Uygulama hesabı sunucusunun (Cloudflare Worker) adresi. Sır değildir. */
    EXPO_PUBLIC_HESAP_API_URL?: string;
    [anahtar: string]: string | undefined;
  };
};
