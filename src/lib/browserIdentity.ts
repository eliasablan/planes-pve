export const BROWSER_ID_KEY = "planes-pve:browser:v1";

// A browser profile, not a fingerprint or a verified person. Storage failures never block play.
export function getBrowserIdentity(): string | undefined {
  try {
    const saved = localStorage.getItem(BROWSER_ID_KEY);
    if (saved && /^[a-f0-9]{64}$/.test(saved)) return saved;
    const id = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(BROWSER_ID_KEY, id);
    return id;
  } catch {
    return undefined;
  }
}
