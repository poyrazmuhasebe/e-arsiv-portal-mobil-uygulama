/**
 * JSON yanıtları ve hata tipi.
 *
 * Bu Worker HİÇBİR ZAMAN HTML döndürmez — Cloudflare'in kendi hata sayfaları
 * (1101 yakalanmayan istisna, 1102 CPU/bellek aşımı, 1027 günlük sınır) HTML
 * döner, bu yüzden istemci ayrıca content-type kontrolü yapar.
 */

const JSON_BASLIK: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  // Yanıtlar kişiye özeldir; hiçbir ara katman önbelleğe almamalı.
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

export function jsonYanit(
  veri: unknown,
  durum = 200,
  ekBaslik: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(veri), {
    status: durum,
    headers: { ...JSON_BASLIK, ...ekBaslik },
  });
}

/**
 * İstemciye gösterilecek hata. `kod` istemcinin dallanması için sabit bir
 * dizgi, `mesaj` kullanıcıya gösterilecek Türkçe metindir.
 *
 * Bu sınıf ASLA kişisel veri (e-posta, şifre, token) taşımaz — mesajları
 * sabittir.
 */
export class IstekHatasi extends Error {
  constructor(
    readonly kod: string,
    readonly durum: number,
    readonly kullaniciMesaji: string,
  ) {
    super(kod);
    this.name = "IstekHatasi";
  }
}

export function hataYaniti(
  hata: IstekHatasi,
  ekBaslik: Record<string, string> = {},
): Response {
  return jsonYanit(
    { hata: { kod: hata.kod, mesaj: hata.kullaniciMesaji } },
    hata.durum,
    ekBaslik,
  );
}
