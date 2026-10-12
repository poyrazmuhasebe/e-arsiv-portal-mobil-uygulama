# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Proje kuralları

Yeni bir oturuma başlamadan önce **[docs/devam-rehberi.md](docs/devam-rehberi.md)**
okunur: proje durumu, kurallar, yeni bilgisayar kurulumu, özel dosyalar ve
rutin işler (APK derleme, sürüm yayınlama, Worker deploy) oradadır.

Özet kurallar:
- Türkçe yaz (iletişim, commit, yorum, doküman).
- GİB'e canlı istek atma; GİB komut/alan adlarını uydurma — yalnızca canlı yakalamayla ekle.
- `IS_TEST_MODE` false kalır. Loglara şifre/token/kişisel veri yazılmaz.
- Sunucu başlatma, deploy, uzak migration ve sürüm yayını yalnızca kullanıcı isteyince.
- Doğrulanmayanı "doğrulandı" diye raporlama.
- Kontroller: `npm test`, `npx tsc --noEmit`, `npx expo export --platform android`
  (Worker için `cd worker && npx vitest run`).
- Sırlar (`*.jks`, `yerel-imza.properties`, `credentials.json`, `.env.local`,
  `worker/.dev.vars`, Cloudflare token) asla commit'lenmez.
