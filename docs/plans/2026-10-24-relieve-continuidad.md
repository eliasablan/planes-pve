# Continuidad — relieve y escala del mundo

> Registro histórico de una sesión cerrada. Las capturas y scripts de `output/playwright/` descritos aquí se retiraron durante la limpieza final; su versión se conserva en el commit `9dbabe9`. Los pasos de instrumentación son una referencia histórica y requieren recuperar esos archivos. Las pruebas automatizadas del juego se mantienen.

Sesión 3, 24 de octubre de 2026. Cerrada tras la confirmación del piloto de que completó todas las sesiones. Commits de entrega: `50184fd` (código), `9dbabe9` (pruebas y evidencia), `8e520a5` (documentación) y `462d43b` (oclusión de disparos por terreno). Estado general: [seguimiento de sesiones](2026-10-23-prompts-mejoras-juego.md#seguimiento-de-sesiones).

## Medición de referencia

Medido en el navegador sobre la escena real (bounding box de las mallas en el marco del cuerpo rígido, escala aplicada):

| Avión | Envergadura | Largo | Alto |
| --- | --- | --- | --- |
| Jugador, GLB (escala 0.46) | 2.60 u | 1.97 u | 0.96 u |
| Scout / Fighter / Bomber, GLB (0.44 × rol) | 1.96 / 2.30 / 2.95 u | 1.46 / 1.74 / 2.23 u | 0.72 / 0.85 / 1.09 u |
| Respaldo procedural, jugador | 5.75 u (luces de navegación incluidas) | ≈3.6 u | ≈2.0 u |

- La referencia es el GLB: es lo que se ve en partida, y los colliders cuboides automáticos del jugador se calculan sobre él. El procedural, que solo aparece si el GLB falla, es 2.2× mayor. **No se ha reescalado**, porque cambiaría también los colliders del jugador; queda como discrepancia conocida.
- Velocidad de crucero ≈33 u/s; el HUD muestra ×10 «km/h», es decir, 1 u ≈ 2.8 m. A esa escala el biplano mide ≈7 m de envergadura.
- Giro solo con guiñada: unos 90° en 7 s, radio ≈90 u. Tirando desde vuelo nivelado se ganan ≈40 u en 4 s, con unos 25 u/s sostenidos tras 3 s. Estos valores fijan el ancho y las salidas de los valles.

## Proporciones elegidas

| Elemento | Tamaño (u) | Relación con la envergadura de 2.6 u | Equivalente aprox. |
| --- | --- | --- | --- |
| Árbol frondoso | 5–8 de alto | 2–3× | 14–22 m |
| Pino | 6.5–11 | 2.5–4× | 18–31 m |
| Arbusto | 1.2–2.4 | ½–1× | 3–7 m |
| Roca / peñasco | 1.2–3.4 en llano; hasta 6.5 en laderas y altura | — | 3–18 m |
| Colinas del sur | 50–70 | ≈20–27× | 140–200 m |
| Crestas este/oeste | 110–160 de control; máximo real ≈200 | ≈60–77× | ≈560 m |
| Valle central (suelo < 45 u) | ≥ 250 de ancho en todo su recorrido; ≈580 entre macizos | > diámetro de giro (≈180) | — |

- La isla conserva su radio medio (islandRadius 1000 y coastRadius 1050). La costa tiene una ondulación de unas ±34 u.
- El punto inicial `(0, 250, 0)` y el rumbo −Z no cambian: el corredor norte queda a menos de 16 u de altura, y la prueba exige que la holgura supere las 150 u. El valle se abre al norte; al sur lo cierran parcialmente colinas de 50–70 u con pasos a sus lados.

## Topología compartida

- `worldTopology.ts` sigue siendo la fuente común (ADR 0004). Ahora incluye los puntos de control `mountains`, que mantienen los campos `x/z/radius/height` que leía el Minimap heredado; las crestas conectadas `ridges`; `seaLevel: -5`; y `combatBoundary` con los mismos radios de antes, 3800/4600.
- `terrainHeight.ts` es puro y no depende de Three:
  - `terrainElevation` genera la forma analítica: crestas en polilínea con caída compacta, unidas por p-norma; colinas bajas; detalle de ruido de valor y mezcla costera hacia el fondo marino.
  - Una rejilla de 201×201 vértices (celda de 12.5 u, ±1250) se calcula una vez (~30 ms).
  - `sampleTerrainHeight` interpola **con la misma diagonal de triángulo que la malla**. Así colocación, spawns, telemetría y collider coinciden también dentro de cada celda.
  - El módulo exporta además `sampleTerrainSlope`, `maxTerrainHeightNear`, `minimumAirborneY` y `buildTerrainMesh` (buffers compartidos por la malla y el collider).
- `terrainScatter.ts` genera la vegetación de forma determinista. Hay 110 intentos de cúmulos forestales, en los que los pinos dominan con la altitud y hay arbustos en los bordes; árboles y arbustos sueltos; y rocas preferentes en laderas y altura, más algunas en la playa. Resultado actual: 819 árboles, 254 pinos, 242 arbustos y 129 rocas (1444 en total).
  - Cada objeto se asienta en el punto más bajo de su huella (8 muestras) con un hundimiento pequeño.
  - Se descartan los lugares donde la pendiente enterraría más del 30% del objeto (38% en rocas), el agua, la playa para la vegetación, las pendientes > 0.6 (0.75 en arbustos) y las cotas > 150.
- El radar no dibuja terreno y no cambia. El Minimap sigue sin montarse: compila y dibuja círculos en los puntos de control, que son una aproximación de la huella de cada macizo.

## Colisiones

- `RigidBody type="fixed" colliders={false} name="ground"` con `TrimeshCollider` sobre los mismos `positions/indices` que la malla visible. Se eliminó el antiguo `colliders="hull"`, que creaba un casco convexo por malla y, con un terreno continuo, habría tapado los valles.
- Se conservan el nombre `ground` para la colisión letal, la gracia inicial de 3 s y la regla de agua: `y < seaLevel + 0.5`, el mismo −4.5 de antes.
- Vegetación y rocas son decorativas y no tienen collider. Así los valles boscosos siguen transitables y no hay colisiones invisibles en sus copas; atravesar visualmente un árbol a ras de suelo es el compromiso aceptado.
- Verificado en navegador con Rapier real:
  - 1500 rayos verticales en puntos aleatorios, incluidos interiores de celda: error máximo 8·10⁻⁵ u frente a `sampleTerrainHeight`, sin fallos. El mundo tiene 11 colliders: 10 del avión y 1 del terreno.
  - Un picado sobre la ladera este a ≈75 u/s (45 vertical y 60 horizontal), más del doble de la velocidad de crucero, termina la partida al contacto, a menos de 3 u de la superficie y sin atravesarla.
  - Un recorrido rasante de ≈5.5 km a 4.5 u sobre el punto más alto bajo el avión, a lo largo del valle, una diagonal, la cresta este, su collado y el macizo oeste, termina sin muertes: no hay geometría invisible sobre la superficie.

## Alturas, spawns y vuelo

- Hay tres alturas distintas: la `y` física de Rapier; la `altitude` de la telemetría, que conserva su offset (y + 5, sobre la superficie del mar) y que PveDirector y HUD siguen invirtiendo con −5; y `groundClearance` (y − max(mar, terreno bajo el avión)), que el HUD muestra como «AGL» bajo la altitud en pantallas amplias.
- Enemigos: misma IA, velocidades y ataques. Tras su ajuste de altura se aplica `y ≥ minimumAirborneY(x, z, 30)`; el spawn de cada oleada usa la misma cota mínima.
  - Comprobado: un enemigo forzado dentro de la cresta (y = 50 sobre suelo de 196) estaba 44 u sobre el terreno a los 300 ms.
  - En una partida natural de 25 s, los enemigos estuvieron siempre a ≥138 u del suelo y atacaron con normalidad.
- Suministros: `spawnPickupsAhead`, usado en recuperación y emergencia, aplica `max(30, altura del jugador, terreno + 28)`. Con el jugador encarando la cresta este, munición y reparación aparecieron a 220/227, 28–45 u sobre crestas de 175/198: alcanzables subiendo, nunca enterrados. Radio de recogida, cantidades y reglas sin cambios.
- Manejo del avión sin cambios: `FLIGHT_MODEL`, fuerzas, cámara y armas intactos.
- Límites de vuelo: los radios de aviso y daño se trasladan a `WORLD_TOPOLOGY.combatBoundary` **con los mismos valores**, para que mapa, isla y espacio aéreo se definan juntos. `mapWorldSize` (4000) sigue siendo solo la extensión del minimapa heredado, menor que el límite de aviso. La niebla (650–3900) termina cerca del radio de aviso. No se cambió la física.
- Sombras: el sol mantiene su dirección, pero se alejó (×5) y su cámara de sombras abarca near 500 / far 3300. Con los valores por defecto (0.5–500), según la proyección sobre la dirección del sol, parte de la isla (incluidas las cumbres oeste y sureste) quedaba fuera del rango de profundidad de las sombras.
- Cámara, niebla y nubes: las crestas, de unas 200 u como máximo, quedan bajo las nubes (520–800 u). La niebla integra las cumbres lejanas en el horizonte, como muestran las capturas. La cámara va 5 u detrás del avión y 2 u por encima, así que en vuelo bajo contra una ladera el avión choca antes de que la cámara entre en el terreno.

## Rendimiento (mismas poses, antes = `1e6f8bd`, después = árbol de trabajo)

Viewport emulado de 1440×900, canvas de 2880×1800 (DPR 2), ANGLE Metal en Apple M2 Pro, 240 frames por pose. GPU medida con `EXT_disjoint_timer_query_webgl2` y CPU de render envolviendo `gl.render`. El intervalo entre frames está limitado por vsync (16.7 ms en todas las poses).

| Pose | GPU mediana antes → después | CPU render | Paso de física (mediana / p95) | Draw calls | Triángulos |
| --- | --- | --- | --- | --- | --- |
| spawn-250 | 4.05 → 4.87 ms | 1.2 → 1.0 ms | 0.0/0.1 → 0.0/0.2 ms | 118 → 105 | 38k → 252k |
| low-35-south | 3.91 → 4.12 ms | 0.9 → 0.7 ms | 0.1/0.1 → 0.1/0.2 ms | 39 → 35 | 26k → 240k |
| forest-30 | 3.71 → 4.57 ms | 1.1 → 0.9 ms | 0.1/0.2 → 0.1/0.1 ms | 101 → 95 | 36k → 250k |
| mid-130 | 4.22 → 4.93 ms | 1.2 → 1.0 ms | 0.1/0.1 → 0.0/0.1 ms | 118 → 105 | 38k → 252k |

Medido con la entrega final: 1444 objetos y rango de sombras ampliado. El paso de física se obtiene envolviendo `world.step` de Rapier; el trimesh de 80k triángulos no lo encarece de forma apreciable.

- La vegetación usa 5 `InstancedMesh` con geometrías unitarias y materiales compartidos, y el color por instancia (`setColorAt`) da variedad sin materiales extra. El terreno es una sola malla con colores por vértice y una textura de detalle neutra. Se eliminaron 3 texturas y las mallas de capas.
- Coste: unas 7× más triángulos, por la malla de 80k triángulos (dibujada también en la pasada de sombras) y las copas. Supone +0.2 a +0.9 ms de GPU por frame en este equipo, sombras incluidas; la CPU baja ligeramente.
- Datos: `output/playwright/terrain-perf-before.json` y `terrain-perf-after.json`.

## Pruebas y evidencia

- `bun test`: 50 pruebas, cero fallos. Hay 15 nuevas en `terrainHeight.test.ts` y `terrainScatter.test.ts`:
  - determinismo; coincidencia de la rejilla con la forma analítica; muestreo igual al plano de los triángulos de la malla; triángulos hacia arriba;
  - costa bajo el mar con playa suave; máximo 150–230; pendiente acotada; crestas conectadas; valle > 250 u en todo el recorrido; corredor del spawn; cota mínima aérea; límites fuera de la isla;
  - vegetación determinista, variada, sobre tierra, sin flotar ni enterrarse, fuera de playa, pendientes y cumbres, y agrupada (vecino medio < 15 u frente a ≈27 u de una distribución uniforme).
- `bun run lint` limpio, `git diff --check` limpio y `bun run build` correcto, con TypeScript incluido. Rutas finales: `/`, `/docs`, `/leaderboard`.
- Capturas comparables (mismas poses de cámara de juego): `output/playwright/terrain-before-after.jpg` (izquierda antes, derecha después: spawn 250, baja 35 al sur, bosque 30, media 130) y las individuales `terrain-before-*.jpg` / `terrain-after-*.jpg`. Recorrido: `terrain-tour-coast.jpg` (costa y playa a 45 u) y `terrain-tour-east-saddle.jpg` (collado este).
- Flujo real (Inicio → Play) tras retirar el puente: escena cargada, AGL visible y sin errores nuevos en consola.
- HUD: la línea AGL solo aparece en el layout amplio. En 1920×1080 la fila inferior cabe (alto 103 px, termina a 24 px del borde) y el radar conserva el bbox `{x:1680,y:24,width:216,height:235}` de la sesión 2. En 568×320 y 390×844 la línea se oculta (`max-sm` / `max-height:500px`) y las tarjetas mantienen alturas iguales.

### Reproducción

El puente temporal se **retiró de la entrega**. Para repetir las medidas:

1. Crear `src/app/terrain-test/page.tsx` como página client que cargue `Scene` con `dynamic(..., { ssr: false })`, llame una vez a `resetRun()` y exponga `{ __store: useGameStore, __terrain: import * from "@/lib/terrainHeight", __scatter: generateScatter }` en `window`.
2. En `configureRenderer` de `Scene.tsx`, exponer `state` como `window.__render`. En el `useFrame` de `Airplane.tsx`, exponer `rb.current` como `__rb` y, con `useRapier()`, `world` y `rapier` como `__world` / `__rapier`.
3. Copiar `output/playwright/terrain-debug-helpers.js` a `public/__terrain-helpers.js`, abrir `http://localhost:3000/terrain-test` con el panel visible (en segundo plano `requestAnimationFrame` se detiene) e importar el script. Usar `__pose(pos, yaw, pitch)` y `__perf(label, pos, yaw, pitch)` con las poses de la tabla.
4. Para la línea base, restaurar temporalmente desde `HEAD` los archivos de juego modificados y volver a aplicar solo los puntos 2–3. Retirar todo antes de build.

## Pendientes y limitaciones

- **Valoración del piloto**: sensación de escala, legibilidad del relieve y dificultad con montañas, volando de verdad en su monitor de 1920×1080. Las capturas proceden de un viewport emulado de 1440×900.
- El respaldo procedural del avión es 2.2× mayor que el GLB (ver medición). Igualarlo exige recalibrar sus colliders; queda fuera de este alcance.
- Los enemigos no rodean las montañas: suben por encima de ellas para mantener 30 u, lo que puede parecer un salto sobre crestas abruptas. No se modificó su IA.
- La vegetación no tiene colliders (decisión documentada arriba).
- El Minimap heredado (no montado) dibuja círculos en los puntos de control y la costa sin su ondulación de ±34 u; si se vuelve a montar, debería muestrear `sampleTerrainHeight`.
- Rendimiento medido solo en Apple M2 Pro. En GPUs integradas modestas convendría reducir la rejilla (p. ej. 160 segmentos) o desactivar `castShadow` del terreno si el coste de sombras fuese visible.
