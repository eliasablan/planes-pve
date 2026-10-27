import { expect, test } from "bun:test";
import { adminCookie, createAdminSession, hasAdminSession, passwordMatches, privateId, requireAdminPassword } from "./adminAuth";
import { analyticsFilter } from "./analytics";

const password = "an-independent-long-admin-password";
const origin = "https://game.test";
const now = Date.parse("2026-10-27T12:00:00Z");
const request = (cookie: string, site = origin) => new Request(`${site}/api/admin/stats`, { headers: { Cookie: `planes_admin=${cookie}` } });

test("admin sessions expire, are signed for one origin and cannot survive a password rotation", async () => {
  const token = await createAdminSession(password, origin, now);
  expect(await hasAdminSession(request(token), password, now)).toBe(true);
  expect(await hasAdminSession(request(token.replace(/.$/, token.endsWith("0") ? "1" : "0")), password, now)).toBe(false);
  expect(await hasAdminSession(request(token, "https://other.test"), password, now)).toBe(false);
  expect(await hasAdminSession(request(token), "a-new-independent-admin-password", now)).toBe(false);
  expect(await hasAdminSession(request(token), password, now + 8 * 60 * 60 * 1000)).toBe(false);
  expect(await hasAdminSession(request(token), password, now - 1000)).toBe(false);
  expect(await hasAdminSession(request("bad-cookie"), password, now)).toBe(false);
  expect(await hasAdminSession(new Request(origin), password, now)).toBe(false);
});

test("private keys are required, cookie settings protect sessions and passwords are compared correctly", async () => {
  expect(() => requireAdminPassword(undefined)).toThrow();
  expect(() => requireAdminPassword("weak")).toThrow();
  expect(requireAdminPassword(password)).toBe(password);
  expect(await passwordMatches(password, password)).toBe(true);
  expect(await passwordMatches(`${password}x`, password)).toBe(false);
  expect(await passwordMatches({}, password)).toBe(false);
  const cookie = adminCookie(new Request(origin), "session");
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=Strict");
  expect(cookie).toContain("Secure");
  expect(adminCookie(new Request("http://localhost:8787"), "session")).not.toContain("Secure");
  expect(adminCookie(new Request(origin), null)).toContain("Max-Age=0");
});

test("network identifiers are stable, keyed and do not contain the IP", async () => {
  const hash = await privateId("independent-salt", "network:203.0.113.1");
  expect(hash).toMatch(/^[a-f0-9]{64}$/);
  expect(await privateId("independent-salt", "network:203.0.113.1")).toBe(hash);
  expect(await privateId("another-salt", "network:203.0.113.1")).not.toBe(hash);
  expect(await privateId("independent-salt", "network:203.0.113.2")).not.toBe(hash);
});

test("analytics filters reject invalid dates and fields; SQL search wildcards are literal", () => {
  for (const query of ["from=2026-02-30", "from=oops", "from=2026-10-28&to=2026-10-27", "country=usa", "status=online", "version=x%27", "page=0", "page=1.5", "page=2&page=3", "unexpected=true"]) {
    expect(() => analyticsFilter(new URLSearchParams(query))).toThrow();
  }
  const filters = analyticsFilter(new URLSearchParams({ from: "2026-10-01", to: "2026-10-27", q: "ACE_%", status: "active", country: "unknown", page: "2" }));
  expect(filters.page).toBe(2);
  expect(filters.where).toContain("country IS NULL");
  expect(filters.values).toEqual(["2026-10-01T00:00:00.000Z", "2026-10-28T00:00:00.000Z", "active", "ACE_%", "ACE\\_\\%%", "ACE\\_\\%%"]);
});
