# Continuidad — suministros, radar y pantalla completa

Fecha: 23 de octubre de 2026. Objetivo vigente: claridad de suministros y ajuste al Dell de 27 pulgadas **1920 × 1080**, resolución confirmada por el piloto.

## Decisiones implementadas

- Suministros volumétricos con escala de mundo y perspectiva real. Se descartó el tamaño fijo de los marcadores flotantes porque impedía percibir acercamiento/alejamiento. No quedan Html, etiquetas ni flechas sobre los objetos.
- Munición: caja de 13 × 8 × 8 unidades, bandas amarillas y seis cartuchos visibles; altura total aproximada 16 unidades. Misil: cuerpo blanco, punta azul y cuatro aletas, altura aproximada 22.5 unidades. Reparación: llave de torsión de unas 21 unidades con carraca, vaso, selector y mango verde calibrado. Geometría facetada y materiales de la escena; giro lento 0.22 rad/s y oscilación vertical 0.8 unidades. `prefers-reduced-motion` detiene ambos.
- Colores conservados: munición `#f4c95d`, misil `#65a6ff`, reparación `#51d6a3`; HUD/radar identifican cada tipo por cartuchos, misil y llave usando Lucide existente y SVG de cartuchos. Sin dependencias nuevas.
- A petición final del piloto se eliminaron **todas las tarjetas de guía de suministro**, incluso las delanteras. No aparecen distancia/giro/altura en una tarjeta lateral. El radar conserva símbolos y resalta el suministro útil delante; los modelos 3D comunican aproximación por perspectiva.
- Radar fijo en la esquina: se eliminó el feed de derribos de su fila horizontal. Un único grupo de notificaciones debajo combina derribos y recogidas, ordenados por fecha, sin mover el mapa. Prueba geométrica del DOM confirmó posición y dimensiones idénticas con cero avisos y con dos derribos más tres recogidas.
- Cada recogida agrega un recibo atómico con la ganancia aplicada; admite varias recogidas en un frame y no repite una caja ya consumida. Avisos durante 3.2 segundos. Con capacidad llena la caja se consume y el aviso dice que el recurso está lleno. Historial acotado a 32 eventos, eliminado al reiniciar.
- Radio de recogida, cantidades (60 balas, 1 misil, 50 salud), capacidades (180/5/100), generación de suministros y emergencia tras cinco segundos se conservan.
- Radar vectorial ampliado, orientado al rumbo real: nariz arriba, cola abajo. Enemigos y suministros comparten proyección. Dos anillos de rango, referencia norte rotatoria y nariz fija. La separación horizontal de iconos próximos conserva delante/detrás y deja líneas a las posiciones reales. No se usan casillas que desplacen arbitrariamente contactos a otra dirección.
- Pantalla completa mediante botón y F, salida con Esc/F. Panel de pantalla con escala HUD 80–150% y render nativo, nítido 125% o rendimiento; preferencias locales `planes-pve:display:v1`. La escala de interfaz no estira el Canvas. Referencia principal Full HD nativo. Presets iniciales 125% para QHD y 150% para pantallas mayores cuando no hay preferencias; ajuste manual disponible.
- Los controles de pantalla no disparan ni capturan teclas de vuelo al cerrar; restauran foco al juego. El vuelo libera entradas al perder foco. El renderer se configura de manera estable y Scene solo observa estado de partida/salud, evitando reconfiguraciones por telemetría. Sombras PCF soportadas por la versión instalada.

## Archivos

`PickupVisual.tsx`, `PveDirector.tsx`, `PickupIcon.tsx`, `pickupPresentation.ts`, `pveSupplies.ts` y sus tests, `useGameStore.ts`, `HUD.tsx`, `CombatRadar.tsx`, `radarProjection.ts` y sus tests, `GameDisplayControls.tsx`, `Scene.tsx`, `useControls.ts`, `CONTEXT.md`.

## Evidencia y reproducción

Las capturas y scripts están en `output/playwright/`. `supplies-before.png` muestra los cubos originales; `supplies-after.png` y `supplies-fullhd.png` corresponden a la solución final. Las imágenes de tamaños y ajustes amplían los casos de cámara, contraste y resolución.

Las pruebas de navegador usan el Scene/Airplane/PveDirector/HUD reales con enemigos y suministros sembrados mediante Zustand para controlar escenarios. La instrumentación temporal usada durante las pruebas se retira de la entrega:

1. Crear temporalmente `src/app/supply-test/page.tsx` como página client, cargar `Scene` con `dynamic(..., {ssr:false})` y exponer `useGameStore` mediante `Object.assign(window, {__supplyStore: useGameStore})` desde un effect.
2. Para mediciones de geometría y framebuffer, exponer temporalmente el parámetro `state` de `configureRenderer` como `window.__supplyRender`. `state.get()` permite consultar cámara, escena y renderer actuales.
3. Iniciar `bun dev`, abrir `http://localhost:3000/supply-test` con Playwright CLI y ejecutar los scripts `supply-*-check.cjs` con `run-code --filename=...`. Usar localhost evita el bloqueo de origen del HMR de esta instalación Next.
4. Retirar la página y las dos exposiciones antes de build/entrega. No se agrega una ruta de debug al producto.

Implementación y revisión compleja realizadas con subagentes `gpt-6-astra`, razonamiento `medium`. Se corrigieron las observaciones de revisión sobre símbolos superpuestos y, después del cambio a modelos 3D, sobre foco de teclado en ajustes.

## Pendientes reales

- **Audio:** esta copia no tenía implementación de audio ni registro de una sesión de sonidos. El chat anterior «Mejorar juego y scoreboard» solo preparó los cinco prompts. No se quitó audio; queda por implementar la sesión de sonidos.
- Relieve, árboles, proporciones del mundo y colisiones se reservan para la siguiente sesión. No se ha modificado el terreno.
- Validar sensación visual y tamaño preferido del HUD directamente en el Dell físico; las pruebas reproducen sus 1920 × 1080, además de QHD y tamaños pequeños, sin afirmar una evaluación física del monitor.
- Los objetos 3D pueden ocultarse físicamente entre sí si están perfectamente alineados, como cualquier geometría de la escena. El radar mantiene los tipos distinguibles. La siguiente sesión de relieve debe comprobar que las nuevas alturas no entierren suministros.

## Resultados de verificación

- `bun test`: 18 tests, 109 aserciones, cero fallos (suministros, emergencias, radar y scoreboard).
- Playwright: recogidas reales +10/+1/+5 en un frame, idempotencia, consumo a capacidad llena, caducidad, emergencia y botón real de reinicio; seis rumbos de radar, eliminación de tarjetas, persistencia de ajustes, fullscreen mediante botón/F, Escape y foco de teclado. Los clics de ajustes no consumen munición.
- Prueba de notificaciones Full HD: dos derribos y tres recogidas; cinco avisos únicos y radar con bbox idéntico `{x:1680,y:24,width:216,height:235}` antes/después.
- Cámara real: tres modelos a 600/350/130 m, tamaño proyectado creciente; munición 26/45/117 px de alto, misil 35/59/157 px, llave 31/52/138 px en QHD. Preferencia de movimiento reducido detiene giro y oscilación.
- Layouts revisados: 1920×1080 principal, 2560×1440, 844×390, 568×320, 390×844 y 320×700. En tamaños compactos los avisos también están debajo del radar; horizontal pequeño usa dos columnas de avisos.
- Render: Full HD nativo como referencia principal; QHD framebuffer 2560×1440 y modo nítido 3200×1800 comprobados. Escala HUD independiente y persistencia tras recarga verificadas.
- Rendimiento comparable: mediana 16.7 ms en ambos modelos; p95 legado 16.7 ms, final 16.8 ms; 125 frente a 153 draw calls con tres suministros visibles. Misma escena/HUD y viewport1440×900 DPR1,179 intervalos por variante. Medición local corta limitada por sincronización vertical.
- `output/playwright/browser-results.json`, `performance-results.json` y `results.json` conservan evidencia estructurada.

- Comprobaciones finales: `bun run lint` limpio, `git diff --check` limpio y `bun run build` correcto (incluye TypeScript). Rutas finales: `/`, `/docs`, `/leaderboard`; ninguna ruta de debug. Build solo muestra la advertencia externa de Node sobre `module.register()`.
