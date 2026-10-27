import type { Env } from "./index";
import { adminCookie, createAdminSession, hasAdminSession, passwordMatches, requireAdminPassword } from "./adminAuth";
import { getAnalytics } from "./analytics";
import { ApiError, onlyKeys, readBody } from "./validation";

const json = (data: unknown, headers?: HeadersInit) => Response.json(data, {
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", ...headers },
});

export async function handleAdmin(request: Request, env: Env) {
  const url = new URL(request.url);
  const password = requireAdminPassword(env.ADMIN_PASSWORD);
  if (url.pathname === "/api/admin/session" && request.method === "POST") {
    const ip = request.headers.get("CF-Connecting-IP") ?? "local";
    if (!(await env.ADMIN_LOGIN_LIMITER.limit({ key: ip })).success) throw new ApiError(429, "Demasiados intentos. Espera un minuto.");
    const body = await readBody(request);
    onlyKeys(body, ["password"]);
    if (!await passwordMatches(body.password, password)) throw new ApiError(401, "La clave no es correcta.");
    return json({ authenticated: true }, { "Set-Cookie": adminCookie(request, await createAdminSession(password, url.origin)) });
  }
  if (url.pathname === "/api/admin/session" && request.method === "DELETE") {
    return json({ authenticated: false }, { "Set-Cookie": adminCookie(request, null) });
  }
  if (!await hasAdminSession(request, password)) throw new ApiError(401, "Introduce tu clave para ver las estadísticas.");
  if (url.pathname === "/api/admin/session" && request.method === "GET") return json({ authenticated: true });
  if (url.pathname === "/api/admin/stats" && request.method === "GET") return json(await getAnalytics(env.DB, url.searchParams));
  throw new ApiError(404, "Ruta privada no encontrada.");
}
