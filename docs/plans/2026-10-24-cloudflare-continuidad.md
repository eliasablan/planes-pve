# Continuidad — Cloudflare Workers y D1

Sesión del **24 de octubre de 2026**, zona del piloto America/Caracas. **Migración completada**: Workers y D1 están implementados, aprovisionados y verificados remotamente, con `https://planes.eablan.dev` conectado y funcionando por HTTPS.

## Recursos y entrega

- Aplicación en producción: https://planes.eablan.dev
- URL alternativa del mismo Worker y D1: https://planes-pve.eliasgui32.workers.dev
- Cuenta Cloudflare: `7de119c4da0acbdc2e66bee49d492ad1`.
- Worker: `planes-pve`.
- D1: `planes-pve`, ID `961c493a-9479-47a2-bbf6-f4fdaeec5e20`, región WEUR.
- Migración `0001_runs.sql` aplicada en D1 remoto y local. Las filas de prueba remotas se eliminan al acabar la verificación; se confirmó que el historial remoto quedó vacío tras la prueba del preview.
- Proyecto Vercel preservado: `prj_JlTSowwJKDxgTnsOaoiOvmeLbo4i`, equipo `team_SixjD2nOjXotbMfM1VsouW22`. Sus dominios son `planes.eablan.dev` y `planes-pve.vercel.app`.
- Primera versión verificada del preview: `f3806c4e-04ce-4442-b9b6-5cd727a34593`. Versión vigente: `4455ecaf-9bfa-4d44-a573-faec68fcc89b`; mismo código y assets. El dominio se conectó después con `wrangler triggers deploy`, sin publicar otra versión del código.
- Cambios locales sin commit: no se creó ni publicó un commit en esta sesión.

## Arquitectura elegida

Next.js 16.2.1 conserva React Compiler y exporta todas las páginas a `out/`. Workers sirve esos assets y ejecuta exclusivamente la API dinámica de D1. No se añadió un servidor Next.js, vinext ni OpenNext porque la aplicación activa no requiere SSR, Server Actions o rutas dinámicas de Next. Se leyeron las guías instaladas de exportación y despliegue antes de modificar código; [ADR 0014](../adr/0014-host-on-workers-and-store-survival-runs-in-d1.md) registra el cambio frente al plan PostgreSQL/API Next y la fase de ranking local.

La tabla `runs` conserva inicio original de servidor, país aproximado de `request.cf`, versión de reglas y modo. El final conserva score, wave, kills, duración activa y estado. Salir explícitamente marca abandono; cerrar una pestaña puede dejar una fila `active`, que significa partida sin finalizar. No se guarda IP sin procesar y el historial no tiene endpoint público.

Un secreto aleatorio por partida se conserva solo en memoria del navegador y como hash SHA-256 en D1. Inicio, finalización y asignación de nombre admiten reintentos sin duplicar; métricas o nombres distintos para una partida ya guardada devuelven conflicto. El ranking usa un índice parcial con score ↓, wave ↓, kills ↓, duración ↑, momento de guardar nombre ↑ e ID para un empate completo. El historial conserva también ceros, resultados sin nombre y resultados fuera del top diez.

Los errores no bloquean el vuelo ni se muestran como un ranking vacío o un guardado exitoso. Hay reintento en game over y ranking. Los resultados pendientes se pierden al recargar/salir antes de enviarlos; no se inventan inicios retroactivos si la partida no pudo registrarse. Los scores locales anteriores se conservan sin subirlos. Las preferencias locales y el código PvP/Supabase heredado permanecen separados.

Controles básicos: JSON de hasta 2 KiB, comprobación de origen, credencial de partida, validación de enteros/rangos y coherencia amplia con las oleadas. Rate limits aproximados por IP y ubicación Cloudflare: 20 registros/minuto y 120 otras peticiones/minuto. No acreditan autenticidad de scores calculados por el navegador. No hay purga automática de historial; vigilar crecimiento de D1.

## Evidencia de verificación

- `bun test src`: **59 pruebas aprobadas**, incluidas las nuevas pruebas de registro único, pausa, abandono y reintento de métricas inmutables.
- `bun run test:worker`: **8 pruebas aprobadas** contra workerd y D1 reales aislados mediante Miniflare, no un mock SQL. Cubren concurrencia, idempotencia, conflictos, todos los desempates, corte a diez sin borrar historia, propiedad, campos inválidos, coherencia, recuperación de inicio, abandono, indisponibilidad y rate limiting. Se comprobó que la consulta usa `runs_leaderboard`.
- `bun run typecheck`, `bun run lint`, `git diff --check`: aprobados.
- `bun run build`: aprobado; páginas `/`, `/leaderboard`, `/docs`, `/docs/assets` y 404 exportadas.
- `wrangler deploy --dry-run`: aprobado. Worker comprimido aproximadamente **3.49 KiB**, arranque remoto **1 ms**.
- Navegador local sobre Wrangler: navegación cliente y directa, carga del juego y GLB, registro, finalización automática, partida con **3,370 puntos / wave 5 / 14 kills**, formulario de nombre, fallo 503 simulado sin falso éxito y reintento con guardado único `QAFLIGHT`. Captura en `output/playwright/cloudflare-game-over.png` (ignorada por Git).
- Preview remoto: inicio → final → reintento → conflicto de métricas → nombre → ranking, con un único resultado temporal `CFSMOKE` y limpieza obligatoria en `finally`. Dos contextos independientes de navegador vieron el mismo resultado en D1. La prueba se ejecutó con un script temporal fuera del repositorio; no se conserva el score artificial.
- Preview remoto: respuesta 503 simulada solo en el navegador mostró indisponibilidad y botón Retry; recuperación del servicio mediante reintento.
- Dominio final: HTTPS válido y respuestas 200 para `/`, `/leaderboard`, `/docs`, `/docs/assets`, JavaScript y modelo GLB. Los chunks conservan `Cache-Control: public, max-age=31536000, immutable`; las APIs usan `no-store`. Una página inexistente devuelve 404 HTML y una ruta API inexistente devuelve 404 JSON.
- D1 a través del dominio final: inicio, finalización, reintento, conflicto, nombre y ranking comprobados; consulta autorizada de la propia fila temporal confirmó el inicio original, estado completado, duración activa y país aproximado `NL` de la petición de prueba. No se consultó ni publicó la ubicación de partidas reales.
- Dos contextos independientes vieron la misma puntuación temporal a través de `planes.eablan.dev`; la limpieza en `finally` eliminó únicamente esa fila. La puntuación real `ELIAS` de **7,480 puntos** se conservó y aparece en el dominio final. La primera navegación del segundo contexto agotó el límite de 30 segundos esperando el evento `load`; el reintento esperando DOM listo y la fila del ranking pasó. Captura final: `output/playwright/cloudflare-production-ranking.png`.
- Advertencias preexistentes del juego: Three.Clock y la inicialización de Rapier usan APIs deprecadas. No hubo errores de carga de assets durante el vuelo; el error 503 observado en consola fue inyectado para comprobar recuperación.
- La restauración de un backup remoto/Time Travel y una sesión humana de escucha no se han probado.

## Dominio y rollback

Estado previo leído públicamente antes del cambio:

```text
planes.eablan.dev CNAME 0e456b931e7dff3d.vercel-dns-017.com.
```

La consulta inicial mostró un TTL restante de 163 segundos; después se consultó directamente a `barbara.ns.cloudflare.com`, que confirmó el CNAME con TTL **300 segundos**. El CNAME era visible públicamente y resolvía a Vercel. Se mantiene el proyecto original para rollback.

`wrangler.jsonc` declara el dominio como Custom Domain. Los intentos iniciales de `wrangler deploy` y `wrangler triggers deploy` fueron rechazados por Cloudflare con **100117**, debido al CNAME externo. El piloto confirmó que retiró **solo el CNAME `planes` en la zona `eablan.dev`**; a continuación `bunx wrangler triggers deploy` conectó el dominio correctamente. La consulta directa a `barbara.ns.cloudflare.com` confirmó respuestas A de Cloudflare (`172.67.210.55`, `104.21.85.203`, TTL 300) y la ausencia del CNAME anterior. HTTPS, páginas, assets y API se verificaron por el dominio final.

Para volver a Vercel tras un corte efectivo: retirar la asociación Custom Domain del Worker, restaurar el CNAME anterior en Cloudflare, y comprobar el dominio contra `planes-pve.vercel.app`. Conservar D1: el rollback de hosting no requiere borrar partidas. Un rollback de versión de Workers tampoco revierte una migración D1.

## Operación y seguridad

Los comandos de desarrollo, migración, despliegue, consulta de historial y exportación están en [README](../../README.md). `bun dev` ahora prueba el flujo completo en Wrangler; `bun run dev:ui` solo sirve UI con Next y no incluye la API. No se requieren secretos de runtime para la aplicación; Wrangler usa autenticación OAuth del operador. Se renovó con permisos de D1 y Workers Scripts tras comprobar que los permisos anteriores no bastaban.

El modo verbose del gestor de paquetes expuso una credencial npm en una salida de herramienta durante la instalación. Se desactivó ese modo y se informó al piloto de que debe revocar o rotar ese token. No se copió la credencial a archivos del repositorio ni a esta documentación.

Fuentes contrastadas: [Next.js en Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/), [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [D1](https://developers.cloudflare.com/d1/), [rate limits](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) y [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/). La documentación actual recomienda vinext para aplicaciones Next con servidor; este proyecto usa una exportación estática compatible con Workers Assets y una API separada.
