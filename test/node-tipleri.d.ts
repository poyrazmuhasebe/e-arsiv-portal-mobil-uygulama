// Testlerin kullandığı Node yerleşik modüllerinin DAR tip tanımları.
//
// Neden @types/node değil: projede doğrudan bir bağımlılık değil (yalnızca
// @expo/ngrok üzerinden geçişli geliyor) ve TypeScript 6'da `types` varsayılanı
// boş olduğundan otomatik yüklenmiyor. Yeni bağımlılık eklemeden hem
// `tsc --noEmit -p .` hem de test derlemesi geçsin diye, testlerde kullanılan
// API'lerin yalnızca kullanılan kısmı burada tanımlanıyor. Bir testte yeni bir
// assert/test fonksiyonu kullanırsanız buraya ekleyin.

declare module 'node:test' {
  type TestFn = () => void | Promise<void>;
  export function test(ad: string, fn: TestFn): Promise<void>;
  export function describe(ad: string, fn: () => void): Promise<void>;
  export function beforeEach(fn: TestFn): void;
  export function afterEach(fn: TestFn): void;
}

declare module 'node:assert/strict' {
  interface Assert {
    equal<T>(gercek: unknown, beklenen: T, mesaj?: string): asserts gercek is T;
    notEqual(gercek: unknown, beklenen: unknown, mesaj?: string): void;
    deepEqual<T>(gercek: unknown, beklenen: T, mesaj?: string): asserts gercek is T;
    notDeepEqual(gercek: unknown, beklenen: unknown, mesaj?: string): void;
    ok(deger: unknown, mesaj?: string): asserts deger;
    match(deger: string, desen: RegExp, mesaj?: string): void;
    doesNotMatch(deger: string, desen: RegExp, mesaj?: string): void;
    fail(mesaj?: string): never;
    rejects(islem: Promise<unknown> | (() => Promise<unknown>), beklenen?: RegExp | object, mesaj?: string): Promise<void>;
  }
  const assert: Assert;
  export default assert;
}

declare module 'node:module' {
  const Module: object;
  export default Module;
}
