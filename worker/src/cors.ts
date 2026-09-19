/**
 * CORS.
 *
 * Yalnızca AÇIK bir izin listesi; wildcard (`*`) hiçbir koşulda
 * kullanılmaz. Üretimde liste boştur, yani tarayıcıdan hiçbir kaynak
 * geçemez. Yerel web önizlemesi (`npx expo start --web`) için `.dev.vars`'ta
 * "http://localhost:8081" verilir.
 *
 * Mobil uygulamanın isteklerinde Origin başlığı bulunmaz; bu yüzden CORS
 * listesinin boş olması mobil akışı etkilemez.
 */

import type { Ortam } from "./turler";

function izinListesi(env: Ortam): string[] {
  return (env.CORS_IZIN_LISTESI ?? "")
    .split(",")
    .map((deger) => deger.trim())
    .filter((deger) => deger.length > 0);
}

/** İzin verilen kaynağı döndürür, izinli değilse null. */
export function izinliKaynak(env: Ortam, istek: Request): string | null {
  const kaynak = istek.headers.get("origin");
  if (kaynak === null) return null;
  return izinListesi(env).includes(kaynak) ? kaynak : null;
}

export function corsBasliklari(kaynak: string | null): Record<string, string> {
  if (kaynak === null) return {};
  return {
    "access-control-allow-origin": kaynak,
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}
