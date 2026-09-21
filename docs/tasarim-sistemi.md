# Tasarım Sistemi

Koyu finans/muhasebe uygulaması görünümü: koyu grafit + lacivert zemin,
kontrollü lavanta vurgu, yeşil/kırmızı/amber durum renkleri. Neon, oyun
havası, yoğun cam efekti yok. Form okunabilirliği her şeyden önce gelir.

## Token'lar — `src/theme/`

| Dosya | İçerik |
|---|---|
| `colors.ts` | Tüm renkler (`colors.background`, `colors.surface`, `colors.primary`, `colors.textSecondary`, `colors.danger`…). **Ekranlarda renk kodu yazılmaz.** |
| `index.ts` | `spacing` (4, 8, 12, 16, 20, 24, 32, 40; `spacing.screen` = 16), `radius` (small 10, medium 14, large 18, xlarge 24, pill), `TOUCH_MIN` = 44 |
| `typography.ts` | `screenTitle`, `headerTitle`, `sectionTitle`, `cardTitle`, `body`, `bodySecondary`, `caption`, `overline`, `label`, `amount`, `amountLarge` |
| `shadows.ts` | Yalnızca `modal` için hafif gölge; kartlar gölgeyle değil yüzey + kenarlıkla ayrılır |
| `paperTheme.ts` | Token'lardan üretilen react-native-paper ve React Navigation temaları |

## Bileşenler — `src/components/ui/`

`import { … } from '../components/ui';`

| Bileşen | Ne için |
|---|---|
| `AppScreen` | Her ekranın kökü: güvenli alan + zemin + hafif üst ışıma. `edges` ile kenarlar seçilir |
| `AppHeader` | Ortak başlık: `title`, `subtitle`, `eyebrow`, `onBack`, `right` (ikon düğmeleri), `large` |
| `AppIconButton` | 44×44 ikon düğmesi. `accessibilityLabel` zorunlu |
| `AppCard` | Temel kart. `onPress`, `tone` ('danger' / 'warning' / 'primary'), `elevated` |
| `SectionHeader` | Bölüm başlığı. `variant="overline"`: ana sayfa bölümleri |
| `SectionCard` | Uzun formların başlıklı bölüm kartı. `optional` → "İsteğe bağlı" etiketi |
| `FormRow` | Alanları yan yana dizer; dar ekranda tek sütuna düşer |
| `MenuCard` | Ana sayfa gezinme kartı: ikon karosu + başlık + açıklama + ok / `rightElement` |
| `DetailRow` | Etiket–değer satırı; `numeric`, `emphasize` (ör. Ödenecek Tutar) |
| `AppInput` | Tek tip metin alanı (Paper outlined + tema). `errorText`, `helperText` |
| `AppSelect` (= `SecimAlani`) | Seçim alanı + temalı seçenek dialog'u |
| `DateField` | Dokununca tarih seçici açan alan (yalnızca görünüm) |
| `SearchBar` | Arama kutusu |
| `ToggleRow` | Başlık + açıklama + anahtar |
| `CheckRow` | Onay kutusu satırı ("Uyarıyı Okudum") |
| `EmptyState` | Boş liste: ikon + başlık + açıklama (+ eylem) |
| `InfoBox` | Açıklama/uyarı kutusu: `tone` info / warning / danger / success / neutral / primary |
| `StatusBadge` | Durum rozeti: approved, deleted, cancelled, cancelAccepted, rejected, pending, draft, info |
| `PrimaryButton`, `SecondaryButton`, `DangerButton`, `DangerSoftButton`, `SuccessSoftButton`, `TextButton` | Düğme ailesi. `icon`, `loading`, `disabled`, `compact`, `fullWidth` |
| `AppDialog` | Temalı dialog (Paper `Modal` üstünde; klavyeyle uyumlu). `title`, `icon`, `tone`, `actions`, `stackedActions` |
| `ConfirmDialog` | Onay dialog'u: `confirmLabel`, `tone="danger"`, `confirmDisabled` |
| `Alert` / `AlertHost` | `react-native` `Alert.alert` ile AYNI imza, temalı. Ekranlarda `import { Alert } from '../components/ui'` |
| `Icon` | MaterialCommunityIcons (tek ikon seti; emoji ikon yok) |

## Kurallar

1. **İş mantığı değişmez.** GİB çağrıları, payload'lar, hesaplamalar,
   depolama, doğrulama ve gezinme aynı kalır; yalnızca görünüm değişir.
2. Renk, boşluk ve köşe değerleri token'lardan gelir.
3. Paper `Card.Actions`, `Dialog`, `Dialog.Actions` çocuklarına `style`
   ekler; bunların içine `<>…</>` konmaz. Yeni kodda `AppCard` ve
   `AppDialog` kullanılır.
4. Uzun listeler `FlatList`/`SectionList` ile.
5. Dokunma alanı en az 44dp; ikon düğmelerinde `accessibilityLabel`.
6. Pasif durum yalnızca saydamlıkla değil, renk değişimiyle de belli olur.
7. Ekran genişliği sabit yazılmaz; `flex`, `flexWrap`, `minWidth` kullanılır.
