import { afterEach, expect, test } from "bun:test";
import { BROWSER_ID_KEY, getBrowserIdentity } from "./browserIdentity";

const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
afterEach(() => {
  if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
  else Reflect.deleteProperty(globalThis, "localStorage");
});

test("browser identity survives multiple runs and replaces corrupt storage", () => {
  const entries = new Map<string, string>([[BROWSER_ID_KEY, "broken"]]);
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => entries.get(key), setItem: (key: string, value: string) => entries.set(key, value) } });
  const id = getBrowserIdentity();
  expect(id).toMatch(/^[a-f0-9]{64}$/);
  expect(getBrowserIdentity()).toBe(id);
  expect(entries.get(BROWSER_ID_KEY)).toBe(id);
});

test("unavailable browser storage never prevents a run from registering", () => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("Storage blocked"); } });
  expect(getBrowserIdentity()).toBeUndefined();
});
