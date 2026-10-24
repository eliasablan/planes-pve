# Prompts para mejorar Skybound Survival

Este documento reúne los prompts y el seguimiento de las cinco sesiones. Antes de iniciar una, consulta su estado y los registros de continuidad enlazados. Copia el bloque de la siguiente sesión pendiente en un chat nuevo dentro de este proyecto. Los prompts originales se conservan como referencia del alcance; los registros documentan la entrega final y los ajustes acordados durante cada sesión.

Las sesiones 1–3 mejoran la experiencia de vuelo; la 4 implementa el ranking global y la 5 lo conecta con tu Redis en Dokploy. Las tareas complejas se delegan a subagentes **Astra (`gpt-6-astra`), razonamiento `medium`**.

## Seguimiento de sesiones

Actualizado el **24 de octubre de 2026**, según los cierres confirmados por el piloto, los registros de continuidad y los commits del repositorio.

| Sesión | Estado | Fecha de cierre | Registro y commits de entrega |
| --- | --- | --- | --- |
| 1 — Sonidos de combate y reabastecimiento | **Cerrada** | 2026-10-24 | [Continuidad de audio](2026-10-24-audio-continuidad.md); `fae1c5a`, `c7fb354`, `1e6f8bd` |
| 2 — Suministros fáciles de reconocer | **Cerrada** | 2026-10-23 | [Continuidad de suministros](2026-10-23-suministros-continuidad.md); `49e40c6`, `a330cf4`, `e15b114` |
| 3 — Relieve y escala del mundo | Pendiente | — | — |
| 4 — Scoreboard global con Redis | Pendiente | — | Requiere completar antes de la sesión 5 |
| 5 — Conexión a Dokploy y comprobación global | Pendiente | — | Depende de la sesión 4 |

**Siguiente sesión: 3 — Relieve y escala del mundo.** La sesión 2 se completó antes que la 1; ambas están cerradas. Las valoraciones de escucha humana y del monitor físico se conservan en sus registros como seguimiento, sin afirmar que se hayan realizado.

Para mantener este índice entre chats:

1. Al iniciar una sesión pendiente, marca su fila **En curso** y lee los registros de las sesiones cerradas.
2. Al terminar, actualiza o crea su registro de continuidad con lo entregado, los ajustes de alcance acordados, las pruebas realizadas y los pendientes reales. Marca **Cerrada** cuando el alcance acordado esté completado y comprobado; conserva por separado las valoraciones humanas pendientes.
3. Actualiza aquí el estado, la fecha, el enlace al registro y los commits si ya existen. Señala la siguiente sesión pendiente. Si queda trabajo requerido, mantén **En curso** y explica en el registro qué falta.

## Sesión 1 — Sonidos de combate y reabastecimiento

```text
Implementa los efectos de sonido de Skybound Survival en este repositorio. Lee AGENTS.md, CONTEXT.md y las guías pertinentes de node_modules/next/dist/docs/ antes de escribir código. Revisa el estado actual: puede contener mejoras de sesiones anteriores. Usa subagentes gpt-6-astra con razonamiento medium para la implementación compleja y su revisión; asigna archivos para evitar ediciones simultáneas.

Agrega sonidos distinguibles para:
- Disparo real de ametralladora y lanzamiento real de misil, aunque no acierten.
- Agotamiento de munición y el intento de disparar un arma vacía. Distingue ambos eventos y limita la repetición al mantener pulsado disparar.
- Impacto de un ataque enemigo sobre el avión del piloto, incluido el impacto fatal.
- Recogida de munición, misiles y reparación, con una identidad sonora reconocible para cada tipo.

Inspecciona Airplane.tsx, PveDirector.tsx, combatResolution.ts, useGameStore.ts, Scene.tsx, matchLifecycle.ts y la entrada al juego. El PvE resuelve ataques enemigos directamente en PveDirector: enlaza el sonido al daño efectivamente aplicado, distinguiéndolo del daño por salir del área de combate. Varios enemigos pueden atacar en el mismo frame; contempla esos eventos aunque React agrupe las actualizaciones. Los sonidos deben responder a acciones confirmadas, una vez por evento, con límites de solapamiento; nunca a cada frame o render. Conserva el sonido fatal aunque Scene desmonte el Canvas inmediatamente.

Crea un módulo de audio pequeño que controle desbloqueo, carga, reproducción y limpieza. Inicializa o reanuda el audio desde la interacción que inicia el juego; comprueba también la primera partida tras una recarga. Reutiliza recursos y evita crear un contexto por disparo. Elige clips ligeros con licencia adecuada o síntesis Web Audio de buena calidad; registra los créditos si incorporas archivos externos.

Agrega volumen de efectos y mute accesibles desde la interfaz, con preferencias locales persistentes. Equilibra el volumen para que una ráfaga no tape las alertas. Al salir o reiniciar, limpia sonidos y suscripciones pendientes. Si el navegador bloquea el audio o falla una carga, el juego debe seguir funcionando. Conserva cadencias, daño y recursos actuales. Define el feedback de una caja recogida con ganancia cero para que no anuncie una recuperación inexistente.

Aceptación: comprueba en navegador disparo continuo, última bala, arma vacía, cambio entre armas, daño enemigo normal y fatal, cada suministro, mute/volumen, recarga y varias partidas consecutivas. Incluye una recogida con capacidad casi llena para verificar que sonido y beneficio real coinciden. Añade solo pruebas automatizadas útiles para eventos, repetición y limpieza; ejecuta las comprobaciones pertinentes y build/lint. Distingue lo verificado automáticamente de lo escuchado o pendiente de escucha humana.

Entrega la implementación, el resultado de las pruebas y los ajustes auditivos que aún requieran valoración humana. Deja en docs/plans un breve registro de esta sesión con decisiones, archivos y pendientes para que la siguiente sesión continúe desde el estado real. Esta sesión termina con audio funcional; la iconografía y el mapa se implementarán después.

Actualiza la tabla de seguimiento de docs/plans/2026-10-23-prompts-mejoras-juego.md con el estado, la fecha, el registro y los commits disponibles de esta sesión.
```

## Sesión 2 — Suministros fáciles de reconocer

```text
Mejora la claridad visual de los suministros de Skybound Survival. Lee AGENTS.md, CONTEXT.md, el registro de la sesión anterior y las guías pertinentes de Next instaladas. Usa las habilidades disponibles de diseño y Three.js que correspondan. Delega la implementación compleja y su revisión a subagentes gpt-6-astra con razonamiento medium.

Revisa Pickup en PveDirector.tsx, la guía de suministro y el radar de HUD.tsx, los tipos y collectPvePickup de useGameStore.ts. Actualmente los suministros son cubos de colores con AMMO/MSL/FIX. Sustitúyelos por símbolos comprensibles a primera vista: cartuchos para munición, un misil para misiles y una herramienta de reparación para salud. Usa forma, icono y color conjuntamente. Mantén la estética arcade y la coherencia entre el objeto 3D, el radar y la guía del HUD.

Haz que los símbolos sean legibles al aproximarse desde distintos ángulos y con el tamaño real del avión en pantalla. Usa billboards o geometría sencilla según convenga, contraste sobre mar y terreno y una animación moderada. Los marcadores deben ayudar a encontrar el objeto sin tapar enemigos o la mira. Aprovecha las librerías de iconos existentes; evita añadir una dependencia solo para estos tres símbolos.

En el HUD muestra el tipo, el beneficio disponible, distancia, dirección y diferencia de altura con claridad. Al recoger, muestra una confirmación breve del incremento real: por ejemplo, si faltan 10 balas, indica +10 y no +60. Conserva los sonidos de la sesión anterior y asegura una sola confirmación por recogida. Actualmente una caja se consume incluso con capacidad llena; conserva esa regla en esta mejora visual. Mantén el radio de recogida, cantidades, capacidades y reabastecimiento de emergencia.

Aceptación: se distinguen los tres tipos por su símbolo sin depender del color; las representaciones 3D/HUD/radar coinciden; la guía sigue el suministro útil correcto; se entiende cómo aproximarse y recogerlo; el beneficio mostrado respeta los máximos. Prueba cámara y distancias reales, varios suministros cercanos, reparación y munición casi llenas, reabastecimiento de emergencia y reinicio de partida. Mantén rendimiento comparable y controles accesibles en los tamaños de pantalla soportados.

Entrega la mejora implementada con capturas antes/después y evidencia de pruebas. Ejecuta las comprobaciones pertinentes, build y lint. Actualiza el registro de continuidad en docs/plans con las decisiones visuales y pendientes. El relieve del mapa se abordará en la siguiente sesión.

Actualiza la tabla de seguimiento de docs/plans/2026-10-23-prompts-mejoras-juego.md con el estado, la fecha, el registro y los commits disponibles de esta sesión.
```

## Sesión 3 — Relieve y escala del mundo

```text
Mejora la topografía y la escala visual del mundo de Skybound Survival: quiero montañas, árboles y aviones que parezcan pertenecer al mismo entorno. Lee AGENTS.md, CONTEXT.md, ADR 0004 y los registros de sesiones anteriores. Consulta las guías locales de Next y las habilidades de Three.js pertinentes.

Empieza midiendo el tamaño renderizado del avión GLB, su alternativa procedural y los enemigos; usa sus dimensiones como referencia y documenta las proporciones elegidas para árboles y montañas. Revisa AirplaneModel.tsx, Environment.tsx, worldTopology.ts, Airplane.tsx, flightFrame.ts, PveDirector.tsx y HUD.tsx. El HUD activo muestra un radar; Minimap.tsx es heredado y no está montado. Conserva esa distinción y comprueba cualquier consumidor de la topología compartida.

Convierte la isla plana con conos aislados en un relieve estilizado y legible: elevaciones conectadas, laderas, valles y costa con transiciones cuidadas. Introduce variedad controlada de tamaños y agrupaciones de vegetación. Coloca árboles y rocas sobre la superficie real, evitando objetos enterrados, flotantes o en el agua. Mantén generación determinista y la topología en una fuente común, con una consulta de altura que puedan compartir colocación, spawns y colisiones cuando corresponda.

Ajusta el tamaño del relieve y la vegetación en relación con el avión y compruébalo volando a baja y media altura. Preserva el manejo del avión y la dificultad de las oleadas. Adapta únicamente lo necesario para que el punto inicial, enemigos y suministros queden en posiciones alcanzables y fuera del terreno. Revisa también los límites de vuelo, hoy definidos aparte del tamaño del mapa: explica cualquier ajuste de coherencia sin ampliar el alcance a un rediseño de la física.

Haz coincidir las colisiones con la superficie visible y deja los valles transitables. Elige colliders apropiados para la geometría final y compruébalos en vuelo, evitando colisiones invisibles. Conserva la identificación ground que usa la colisión letal, su gracia inicial y la regla de agua. Distingue la altura física, la telemetría con su offset actual y la altura sobre el terreno. Comprueba cámara, niebla y nubes con las nuevas elevaciones. Mantén instancing o una estrategia equivalente para la vegetación y reutiliza materiales/geometrías; compara el rendimiento en las mismas condiciones antes y después.

Aceptación: proporciones documentadas y convincentes desde la cámara de juego; laderas y valles con relieve continuo; vegetación asentada correctamente; partida inicial y suministros seguros; colisiones coherentes; radar y topología compartida sin discrepancias introducidas; vuelo y oleadas siguen siendo jugables. Verifica alturas/generación con pruebas útiles, recorre visualmente el mapa y entrega capturas comparables, resultados de rendimiento y build/lint.

Entrega la mejora implementada y actualiza el registro de continuidad en docs/plans. Explica las dimensiones elegidas, la estrategia de colisión y cualquier limitación visual o de rendimiento que haya quedado pendiente.

Actualiza la tabla de seguimiento de docs/plans/2026-10-23-prompts-mejoras-juego.md con el estado, la fecha, el registro y los commits disponibles de esta sesión.
```

## Sesión 4 — Scoreboard global con Redis

```text
Reemplaza el scoreboard local de Skybound Survival por un top 10 global almacenado en Redis autohospedado. Implementa y verifica la aplicación en local; la conexión a mi VPS será la sesión siguiente. Lee AGENTS.md, CONTEXT.md, ADR 0006 y 0009–0013, el registro de sesiones anteriores y las guías de Route Handlers, runtime y variables de entorno en node_modules/next/dist/docs/. Delega backend/Redis y revisión de concurrencia a subagentes gpt-6-astra con razonamiento medium.

Conserva el modelo arcade sin login: se clasifican partidas, no perfiles. Un mismo nombre puede aparecer en distintas partidas. Preserva nombres normalizados de 3–12 caracteres A-Z/0-9 y el orden score descendente, oleada alcanzada descendente, kills descendente, duración ascendente y fecha de recepción en servidor ascendente, con desempate final determinista.

Revisa localScoreboard.ts y sus tests, GameOver.tsx, LocalScoreboardPanel.tsx, LocalScoreboardTable.tsx, /leaderboard, matchLifecycle.ts y useGameStore.ts. Implementa lectura y envío mediante Route Handlers Node y un módulo Redis exclusivo del servidor. Usa REDIS_URL privada y namespace por entorno. La conexión debe admitir Redis estándar autohospedado; evita depender de una API REST de un proveedor específico. El build debe funcionar sin Redis disponible y las respuestas del ranking deben evitar caché obsoleta.

Valida en servidor cuerpo, tamaño, nombre, tipos, enteros seguros y rangos de las métricas. Genera ID de entrada y fecha en servidor. Añade un runId estable por partida para que el doble clic o reintento tras perder una respuesta no duplique el resultado. El mismo runId con contenido diferente debe producir conflicto; documenta la retención de idempotencia, también para resultados que no clasifican.

La clasificación, deduplicación y actualización del top 10 deben ser atómicas bajo concurrencia. Elige la solución más sencilla para diez entradas y justifícala; un sorted set por score solamente no preserva todos los desempates. Devuelve el ID exacto y el resultado definitivo de clasificación. La clasificación previa del navegador es orientativa.

Migra GameOver y /leaderboard con estados de carga, vacío, envío pendiente, éxito, error y reintento. Una caída de Redis debe aparecer como indisponibilidad y permitir seguir jugando, nunca como ranking vacío o guardado exitoso. Conserva los registros locales existentes sin publicarlos automáticamente. localStorage puede seguir guardando preferencias como volumen, pero deja de ser la persistencia del ranking global.

Incluye límites básicos de abuso con alcance documentado. El cliente sigue calculando la simulación: validación y rate limiting no acreditan una partida legítima. Mantén este límite explícito sin construir un sistema anti-cheat completo.

Registra una nueva decisión que sustituya la elección previa de PostgreSQL y la fase local; conserva el historial de ADR. Actualiza CONTEXT.md, textos de interfaz y README. Agrega variables de ejemplo sin secretos y una forma local reproducible de probar Redis con persistencia.

Aceptación: dos contextos de navegador independientes ven el mismo top 10; orden y corte correctos con empates; concurrencia sin pérdida de resultados; reintentos sin duplicados; conflicto de payload para un mismo runId; nombres repetidos entre partidas permitidos; rechazo de datos inválidos; caída y recuperación de Redis recuperables. Prueba contra Redis real aislado, además de las pruebas de contrato y ranking. Ejecuta los checks pertinentes, lint y build; registra evidencia y los datos de configuración que necesitará la sesión de despliegue, sin secretos.

Actualiza la tabla de seguimiento de docs/plans/2026-10-23-prompts-mejoras-juego.md con el estado, la fecha, el registro y los commits disponibles de esta sesión.
```

## Sesión 5 — Conexión a Dokploy y comprobación global

```text
Conecta y verifica el scoreboard global de la sesión anterior con el Redis que desplegué en Dokploy en mi VPS. Lee AGENTS.md, CONTEXT.md, el registro de implementación, las variables documentadas y las guías locales de Next pertinentes. Usa subagentes gpt-6-astra con razonamiento medium para ajustes complejos de conectividad y revisión. Consulta documentación oficial actual de Dokploy y Redis para los cambios que realices.

Primero identifica la instancia existente y dónde se ejecuta realmente Next.js. Reutiliza Redis y sus datos/volúmenes actuales; el README genérico no demuestra dónde está desplegada la app. Solicita únicamente acceso o datos que falten para continuar y usa el mecanismo de secretos del entorno, sin publicar credenciales en el chat, repositorio o logs.

Comprueba autenticación, permisos, namespace y conectividad desde el runtime real de Next. Si ambos servicios comparten red privada accesible, usa la dirección interna. Si Next corre fuera del VPS, establece una vía protegida compatible con ese alojamiento; un hostname interno de Docker no basta desde fuera. Mantén Redis fuera del acceso público directo sin protección y las credenciales exclusivamente en servidor.

Comprueba volumen persistente, directorio real de datos, persistencia AOF/RDB y política de memoria/expulsión. Las claves del ranking deben persistir y no expirar; las claves temporales de idempotencia y límites de abuso pueden tener su propia retención. Si Redis se comparte con otras aplicaciones, evalúa su impacto antes de cambiar opciones globales o reiniciarlo. Documenta el compromiso de durabilidad y el procedimiento de copia y restauración; si ya hay backups, comprueba una restauración en un entorno aislado cuando el acceso lo permita.

Configura REDIS_URL y las variables necesarias como secretos de runtime, despliega la app en su alojamiento real y verifica todo el recorrido: terminar una partida, enviar un nombre, ver el resultado desde otro navegador y confirmar ID, posición y desempates. Usa datos aislados para probar concurrencia, duplicados e indisponibilidad. Conserva cualquier resultado de usuarios reales.

Comprueba por separado que el ranking sobrevive al reinicio de la aplicación y al reinicio controlado del servicio Redis con su volumen conservado. Coordina el reinicio si la instancia es compartida; usa el servicio concreto, sin reiniciar todo el VPS. Verifica también el comportamiento ante una interrupción temporal y el reintento del mismo envío. Evita que las pruebas de disponibilidad afecten a otras aplicaciones.

Aceptación: el ranking se comparte entre navegadores; el resultado sobrevive a ambos reinicios comprobados; reintentar no duplica; no hay credenciales en bundle, respuestas o logs; la vía de red prevista funciona; una caída produce error recuperable. Entrega evidencia de las comprobaciones, configuración operativa sin secretos, rollback y pendientes reales. Si un acceso o permiso impide una prueba, deja claro qué falta; no des por demostrada la persistencia o restauración sin comprobarlas.

Actualiza la tabla de seguimiento de docs/plans/2026-10-23-prompts-mejoras-juego.md con el estado, la fecha, el registro y los commits disponibles de esta sesión.
```

## Fundamento de las decisiones

- El desbloqueo del audio al iniciar la partida y los controles de volumen siguen las recomendaciones de [Web Audio: buenas prácticas](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) y las restricciones descritas en la [guía de autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
- Los desempates requieren atención: los sorted sets ordenan miembros con el mismo score lexicográficamente, mientras este juego compara varias métricas. Consulta [Redis sorted sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/). Una operación acotada de servidor puede resolver el top 10 de manera atómica; véase [Redis scripting](https://redis.io/docs/latest/develop/programmability/eval-intro/).
- La persistencia tras reinicios depende de la configuración efectiva y del almacenamiento, no solo de usar Redis. Véase [persistencia Redis](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/).
- La dirección de conexión depende de dónde corre la app; Dokploy distingue [conexiones internas y externas](https://docs.dokploy.com/docs/core/databases/connection). Comprueba el mecanismo de [copias de volúmenes](https://docs.dokploy.com/docs/core/volume-backups) que corresponda a la instalación.

Las rutas de código citadas describen el estado revisado el 23 de octubre de 2026. Cada sesión debe comprobar el estado actual antes de trabajar.
