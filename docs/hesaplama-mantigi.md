# Hesaplama Mantığı — KDV / İskonto / Tevkifat

Uygulamada aynı temel formül **iki ayrı yerde** bağımsız olarak uygulanıyor
(bkz. [bilinen-sinirlamalar.md](bilinen-sinirlamalar.md)'daki tekrar riski
notu):

- `src/utils/faturaHesap.ts` → `kalemHesapla()` / `faturaOzetiHesapla()` —
  **ekranda gösterilen** tutarlar için (`KalemFormu` tipini kullanır, form
  alanları henüz string).
- `src/services/gibApi.ts` → `satirHesapla()` / `buildFaturaOlusturPayload()`
  — **GİB'e gönderilen** payload için (`FaturaSatiri` tipini kullanır,
  alanlar zaten sayısal).

## Kalem bazlı formül

Bir kalem için (miktar, birim fiyat, iskonto oranı, KDV oranı verilmiş):

```
bruttTutar   = miktar × birimFiyat
iskontoTutari = bruttTutar × (iskontoOrani / 100)
netTutar     = bruttTutar − iskontoTutari        # KDV matrahı
kdvTutari    = netTutar × (kdvOrani / 100)
```

Eğer kalemde KDV Tevkifat (`ekVergi.tur === 'V9015'`) seçiliyse ve geçerli
bir Tevkifat Kodu varsa:

```
tevkifatOrani  = TEVKIFAT_KODLARI[kod].oran      # ör. 601 → 4, 603 → 7, 801 → 10
tevkifatTutari = kdvTutari × (tevkifatOrani / 10)
```

Diğer 28 vergi türü **hesaplanmaz** (GİB'e nasıl gönderildikleri bilinmiyor).
Bunlar seçicide "(henüz desteklenmiyor)" olarak pasiftir. Ayrıca şu durumlar
sessizce geçmez, `vergiUyumsuzlukHatasi` (`src/utils/vergiDestegi.ts`) ile
"Oluştur" pasifleşir ve kırmızı uyarı gösterilir: V9015 seçili ama tevkifat
kodu seçilmemiş; tevkifat kodu seçili ama Fatura Tipi tevkifatlı bir tür
değil (önceden bu durumda uyarıya rağmen tevkifat hesaplanıp GİB'e
gönderiliyordu); herhangi bir kalemde desteklenmeyen bir vergi türü.

`oran` alanı "pay/10" biçiminde ifade edilir — ör. 7 → "7/10" tevkifat
oranı (satıcı KDV'nin %70'ini alıcıya/vergi dairesine bırakır, %30'unu
kendisi tahsil eder). 801-825 aralığındaki "tam tevkifat" kodlarında
`oran = 10` (10/10 = KDV'nin tamamı tevkifata tabi).

## Fatura geneli toplamlar

```
malHizmetToplam   = Σ netTutar (tüm kalemler)
toplamIskonto     = Σ iskontoTutari
hesaplananKdv     = Σ kdvTutari
hesaplananKdvTevkifat = Σ tevkifatTutari (yalnızca tevkifatlı kalemler)

vergilerDahilToplam = malHizmetToplam + hesaplananKdv
odenecekTutar       = vergilerDahilToplam − hesaplananKdvTevkifat
```

Yani tevkifat, alıcının fiilen ödeyeceği tutardan **düşülür** (satıcı o
kısmı tahsil etmez, alıcı doğrudan vergi dairesine yatırır).

## GİB'e giden GERÇEK alan adları

`buildFaturaOlusturPayload()` yukarıdaki değerleri GİB'in beklediği `jp`
şemasına dönüştürürken, gerçek DevTools yakalamasından çıkan birkaç
**kritik ve sezgisel olmayan** kural uygulanıyor:

### 1. Tutar biçimlendirme

GİB'in kendi arayüzü (autoNumeric.js kütüphanesi) tutarları ondalık kısmı
sıfırsa `.00` **eklemeden** gösteriyor (`"10"`, `"10.00"` değil; ama
`"10.5"` ise `"10.5"`). Gerçek başarılı isteklerdeki TÜM tutar alanları bu
biçimdeydi, bu yüzden `tutarStr()` yardımcı fonksiyonu kullanılıyor:

```ts
function tutarStr(n: number): string {
  return String(Number(n.toFixed(2)));
}
```

### 2. `vergiCesidi` — sabit değil, dinamik

Faturada **en az bir kalemde** KDV Tevkifat uygulanmışsa, top-level
`vergiCesidi` alanı `V9015` olur; aksi halde tek bir boşluk karakteri
(`" "`) — boş string (`""`) **değil**.

### 3. Tevkifatlı kalemlerde alan adları DİNAMİK

Bir kalemde tevkifat varsa, GİB üç alan bekliyor ve ikisinin **adı seçilen
vergi türü koduna göre değişiyor**:

```json
{
  "tevkifatKodu": "603",
  "V9015Orani": 70,
  "V9015Tutari": "21"
}
```

- `tevkifatKodu` — sabit alan adı (uygulama içi `kdvTevkifatKodu`'ndan
  farklı, bu isim doğrudan GİB'e gidiyor).
- `` `${vergiCesidi}Orani` `` — ör. `V9015Orani`. Değeri, bizim
  `TEVKIFAT_KODLARI`'ndaki `oran` alanının **10 katı**, bir **sayı**
  olarak (string değil) gönderiliyor (`oran=7` → `70`).
- `` `${vergiCesidi}Tutari` `` — ör. `V9015Tutari`. `tutarStr()` ile
  biçimlendirilmiş, **string** bir tutar.

Bu üç alan, tevkifatsız kalemlerde **hiç gönderilmiyor** (boş string ya da
0 olarak değil, tamamen yok).

### 4. Fatura genelinde tevkifat varsa üç ek top-level alan

```json
{
  "tevkifataTabiIslemTutar": "150",
  "tevkifataTabiIslemKdv": "30",
  "hesaplananV9015": "21"
}
```

- `tevkifataTabiIslemTutar` — tevkifatlı kalemlerin **netTutar** toplamı.
- `tevkifataTabiIslemKdv` — tevkifatlı kalemlerin **kdvTutari** toplamı.
- `` `hesaplanan${vergiCesidi}` `` — ör. `hesaplananV9015`, toplam
  `hesaplananKdvTevkifat`.

Bunlar da tevkifat yoksa payload'da hiç yer almıyor.

### 5. `iadeTable` — GENEL İADE için henüz eksik

GENEL İADE tipi faturalarda GİB, iade edilen orijinal faturayı
`iadeTable: [{"faturaNo": "...", "duzenlenmeTarihi": "GG/AA/YYYY"}]`
şeklinde bekliyor. Uygulamada bunu girecek bir form alanı **henüz yok**,
bu yüzden şu an her zaman `iadeTable: []` gönderiliyor (bkz.
[Issue #2](https://github.com/poyrazmuhasebe/e-arsiv-portal-mobil-uygulama/issues/2)).

### 6. Diğer sezgisel olmayan alanlar

- `sehir` boşken `""` değil **tek boşluk** (`" "`) olarak gönderiliyor.
- `hangiTip` her zaman sabit `"5000/30000"` (GİB'in kendi arayüzünün
  gönderdiği sabit değer, anlamı netleşmedi).
- `yatirimTesvikTarihi` boşken de `faturaTarihi` ile aynı (bugünün tarihi)
  doluyor — boş string değil.
- `dovzTLkur` ve `malHizmetTable[].kdvOrani` **string** olarak gönderiliyor
  (sayı değil).
