/**
 * Worker'ın ana modülünü Cloudflare'in tip sistemine tanıtır.
 *
 * Bunsuz `exports.default.fetch()` (testlerde Worker'ı gerçek çalışma
 * zamanında çağırma yolu) tip denetiminden geçmez.
 */
declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import("./index");
  }
}
