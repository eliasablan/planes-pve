import { ApiError } from "./validation";

export const ADMIN_COOKIE = "planes_admin";
const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");

export async function privateId(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export function requireAdminPassword(password: string | undefined): string {
  if (!password || password.length > 256) throw new ApiError(503, "El acceso privado aún no está configurado. Configura ADMIN_PASSWORD en el Worker.");
  return password;
}

export async function adminSigningKey(password: string, secret: string | undefined) {
  if (!secret || secret.length < 32) throw new ApiError(503, "El acceso privado aún no está configurado. Configura ADMIN_SESSION_SECRET en el Worker.");
  // The independently random secret protects cookie signatures even for a short login password.
  // Including the password also invalidates sessions whenever the operator changes it.
  return privateId(secret, `admin-password:${password}`);
}

export async function passwordMatches(candidate: unknown, password: string) {
  if (typeof candidate !== "string" || candidate.length > 256) return false;
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  const [a, b] = await Promise.all([digest(candidate), digest(password)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

export async function createAdminSession(signingKey: string, origin: string, now = Date.now()) {
  const expires = Math.floor(now / 1000) + SESSION_SECONDS;
  return `${expires}.${await privateId(signingKey, `admin-session:${origin}:${expires}`)}`;
}

export async function hasAdminSession(request: Request, signingKey: string, now = Date.now()) {
  const value = request.headers.get("Cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length + 1);
  const match = /^(\d{10})\.([a-f0-9]{64})$/.exec(value ?? "");
  if (!match) return false;
  const expires = Number(match[1]);
  const seconds = Math.floor(now / 1000);
  if (expires <= seconds || expires > seconds + SESSION_SECONDS) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(signingKey), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const signature = Uint8Array.from(match[2].match(/../g)!, byte => parseInt(byte, 16));
  return crypto.subtle.verify("HMAC", key, signature, encoder.encode(`admin-session:${new URL(request.url).origin}:${expires}`));
}

export function adminCookie(request: Request, session: string | null) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${session ?? ""}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${session ? SESSION_SECONDS : 0}${secure}`;
}
