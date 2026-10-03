# ManeComb Mobile V3 — especificación implementable

Fecha: 2026-10-02, America/Mexico_City. Estado: especificación aprobada como base por el encargo de fases 0–8. Fase 0 integrada; foundation implementado según plan aprobado Native, con cierre/gates registrados por separado. Este documento define presentación y no autoriza cambios de autoridad funcional.

## 1. Resultado y autoridad

El conductor debe identificar su unidad, jornada y próxima parada desde un mapa dominante, ampliar su contexto sin abandonar el mapa y acceder a comunicación y alertas con cinco destinos estables. El acceso instalado conserva la identidad ManeComb y una superficie propia, separada del acceso comercial web.

La autoridad es `main`. Foundation nace del main `4412a665b662ade31528d53ccad176e89973439e`, resultado del merge verificado de #25. La base previa de esta especificación fue `50540e03abab258783c0289a51d7fcab7128bc42`. Sus cambios de Admin Global RC2, Marketing V3, Evidence Lifecycle y bootstrap WebView se conservan. Antes de cada fase se vuelve a consultar `origin/main`: un SHA nuevo exige revisar la base y la dependencia, no recuperar un main histórico.

Dependencia de acceso: [PR #25](https://github.com/ErickRFM/ManeComb-next/pull/25), rama `fix/operation-auth-mobile-parity`, inicialmente `21e9e933089ac4858f9702cf30bf9a921f432b71`. La corrección de contraste b400bc6 y la corrección QA e4e0699 se hicieron en esa misma rama. #25 quedó completamente verde e integrado en main mediante merge 4412a66, según la estrategia autorizada. Las fases siguientes consumen esos archivos existentes; no los copian ni recrean.

La rama `feat/telemetry-core-rc2`, observada en `151bfa10813f2a7d1c2646f4194426a6b89fe797`, el APK RC3 y sus resultados quedan preservados. V3 no inicia Event Engine ni certifica paridad web/APK, GPS físico, Doze o producción.

Referencias de composición: Legacy ManeComb y Ride Share UI Kit, auditadas en `artifacts/mobile-ux-v3/AUDIT_REPORT.md`. Se adapta mapa, controles flotantes y hoja contextual. Identidad, tarifas, reservas, wallet y datos de demostración de Ride Share quedan fuera del producto.

## 2. Límites de cambio

Se permite composición JSX, CSS con scope móvil, textos, etiquetas localizadas, formato de datos existentes, navegación a destinos existentes y estado puramente visual de selección/expansión. Los componentes actuales conservan sus controladores; las nuevas primitivas reciben valores y callbacks, sin obtener permisos ni abrir conexiones propias.

Quedan congelados:

- Backend, endpoints, payloads, modelos, contratos, schemas y códigos de estado.
- Auth, activación, MFA, recuperación, sesiones, roles, permisos y reglas de redirección.
- GPS, aceptación/orden de snapshots, deduplicación, timestamps, frescura, persistencia, cola y tracking web/Android.
- Socket.IO, listeners funcionales, ACK/retry, autoridad RTC/PTT, captura, release/cancel y cierre de recursos.
- MongoDB, Redis, workers, billing, infraestructura, variables productivas y configuración native/Capacitor/Android.

Cambiar un permiso o agregar una propiedad al contrato requiere otro encargo. Un `UI_DATA_GAP` es una limitación explícita de aceptación; no se resuelve con números de ejemplo, permisos aparentes, API alternativa ni un botón que promete una capacidad inexistente.

## 3. Dependencia A: acceso existente y contraste primero

Los 12 archivos de #25 son la única base de acceso:

```text
app/(auth)/activar/page.tsx
app/(auth)/login/page.tsx
app/(auth)/recuperar-password/page.tsx
app/globals.css
app/visual-qa/[surface]/page.tsx
public/manecomb-mobile-faster.png
scripts/visual-qa.mjs
src/components/operation-auth-layout.tsx
src/components/operation-entry.tsx
src/components/operation-session-loading.tsx
src/styles/operation-auth.css
test/operation-auth-parity.test.ts
```

Corrección inmediata y acotada: `#71788a` sobre blanco falla Axe en el slogan de 14 px, con 4.41:1. Sustituir por `#5f6570` en los tres textos equivalentes del CSS de acceso: slogan, explicación de activación y comprobación de sesión. Mantener umbral Axe, layout, APIs y comportamiento. El gate debe reproducir el fallo antes y pasar después. Esta corrección no constituye implementación de operación V3.

Corrección entregada en #25: `b400bc60dfa103cc32f9bb4769531d41886d0ea4`, un archivo y tres sustituciones. Validación local: RED reproducido; GREEN visual con 96 combinaciones y cero violaciones reportadas; responsive con 336 checks y cero fallos; typecheck y 130 tests en 44 archivos pasan. Evidencia en `artifacts/mobile-ux-v3/contrast-{red,green}-report.json`, `responsive-report.json`, `typecheck.log` y `unit.log`. Build, integración y Android no se reejecutaron localmente para este cambio CSS; no atribuir sus resultados anteriores al SHA nuevo.

El fallo original de functional quedó cerrado en e4e0699: aserciones positivas de acceso operativo, negativas de superficies ajenas y nueve mutation probes sólo de navegador QA. El HEAD exacto pasó 25 casos funcionales, 96 visuales, 336 responsive, CI Node 20/24, contenedor y Android API 33–36. #25 se integró sólo después de confirmar base/HEAD y todos los checks. Evidencia de fase 0: artifacts/mobile-v3-phase-0/PHASE_REPORT.md. El nuevo main tiene sus propios runs; no confundir esos resultados con los del candidato anterior.

Después de integrar la dependencia, refinar la misma superficie: logo original de 170–205 px, artwork existente de 130–155 px, contenido con 20–24 px de margen horizontal, campos/CTA de 48–52 px y radios de 10–12 px. Usar «Iniciar sesión» / «Activar cuenta»: la activación usa la clave y el contrato actual. No agregar teléfono, registro libre, selección de unidad ni «recordarme» sin soporte actual.

`/login` comercial conserva su presentación. `/login?surface=operation`, activación y recuperación mantienen su contexto existente. Reset y MFA pueden recibir refinamientos de presentación sobre sus componentes actuales; sus destinos de redirección y contratos permanecen intactos. No prometer conservación de `surface` en enlaces de email si el contrato actual no la proporciona.

Bootstrap sigue la resolución real de sesión: redirección inmediata cuando corresponde, timeout/abort actual de 10 segundos y retry existente. Un mensaje visual tardío puede aparecer entre 800 y 1000 ms; no introduce espera mínima ni cambia timeout. Orden accesible: marca, estado «Comprobando tu sesión operativa…», error y reintento cuando existan. Animar entrada de marca 220–300 ms, contenido 300–420 ms y salida 180–240 ms sin prolongar una respuesta rápida.

## 4. Sistema visual con scope móvil

El scope operativo es `.driver-shell` y sus primitivas; acceso conserva `.operation-auth-*`. Un CSS móvil dedicado puede importarse una sola vez desde `app/globals.css`. No sustituir tokens globales ni reglas de marketing/admin/portal.

| Uso | Decisión |
|---|---|
| Marca | Logo canónico; rojo `#E31E24` / geometría original `#D80000` |
| Operación oscura | Fondo `#080B0F`, superficies `#10151B` y `#151C24` |
| Texto oscuro | Principal `#F5F7FA`, secundario inicial `#8D96A5`; verificar cada combinación real |
| Acceso | Blanco, texto principal actual, secundario corregido `#5f6570` |
| Tipografía | Body 14–16 px; secundaria 12–13; caption 10–11; títulos 28–32 |
| Espaciado | 4, 8, 12, 16, 20, 24, 32, 40, 48 px |
| Radios | Inputs 10–12 px, cards 14–18, hoja 22–28 |
| Interacción | Todos los controles con target mínimo 44×44 px, incluidos mapa, password, canal y handle |

Estado activo usa icono, texto y `aria-current`/etiqueta, además del color. No convertir un caption en la única fuente de próxima parada o estado crítico. El modo claro operativo también debe pasar contraste; el acceso permanece claro en ambos temas.

Motion: selección 160–220 ms, tabs 140–180, pantalla 220–280, hoja 280–360 con `cubic-bezier(.22,1,.36,1)` y press `.98`. `prefers-reduced-motion` desactiva transiciones relevantes y animación JS/Mapbox explícitamente. No pulsos/glows permanentes ni onda de audio que aparente amplitud medida.

## 5. Arquitectura de presentación

`DriverShell` sigue siendo el propietario estable de navegación, `JourneyPanel`, `DriverConsole` y controles existentes. `DriverMapHome` conserva fetch, selección de la unidad autorizada, listeners y reconciliación de snapshots. `DriverNavigation` conserva su ruta fallback. `ChatConsole`, `RadioConsole` y `RtcConsole` conservan sus recursos y handlers.

Las primitivas nuevas se ubican bajo `src/components/mobile-ui/`; no se reorganiza todo el repositorio. Interfaces de presentación:

| Pieza | Entradas | Responsabilidad y exclusiones |
|---|---|---|
| Barra flotante | Destinos actuales, estado de red existente | Marca, acceso a Más y SOS; no resolver sesión/roles |
| Hoja contextual | Nivel `compact/medium/expanded`, callback de nivel, contenido | Altura, gesto, foco y scroll; sin fetch ni tracking |
| Contexto de unidad/ruta | Read model ya aceptado por `DriverMapHome` | Identidad, próxima parada, ETA/progreso conocidos; sin reconciliar snapshots otra vez |
| Presentación de jornada | Estado/busy/error/checklist y callbacks actuales | Etiquetas y disposición; no segundo controlador de acciones |
| Estado común | Loading/error/empty/offline/stale y retry existente | Copy, icono y accesibilidad; no cambiar políticas de recuperación |

Si la composición necesita compartir datos entre mapa y shell, usar un puente de presentación con el último read model aceptado. No abre fetch/socket, no transforma coordenadas, no arbitra versiones y no se convierte en autoridad. Los campos de estado visual se limitan a nivel de hoja, selección local, sección visible y foco. El valor compartido se elimina al salir de su contexto para no mostrar una unidad anterior como vigente.

`JourneyPanel` y `DriverConsole` permanecen montados una sola vez en el shell. La hoja organiza su salida existente, usando un host estable en el shell. Cambiar nivel, cerrar hasta compacto o cambiar de tab no los desmonta ni monta copias. Un portal de presentación, si se necesita, conserva host e identidad de React; no crea otro owner. Se preservan `hidden` y los efectos actuales al navegar. La reorganización se verifica contando acciones y recursos, no sólo con screenshots.

No montar `UnitDetailPanel` del portal en conductor: sus APIs, enlaces y permisos pertenecen a otra superficie.

## 6. B: operación map-first

El mapa forma el fondo del viewport operativo entre safe areas. La barra superior flota (52–58 px más inset superior); navegación inferior (64–72 px más inset inferior) conserva Mapa, Chat, Radio, Alertas y Más. En compacto, el canvas ocupa aproximadamente 75–90% de la composición vertical total; esta medida incluye zonas bajo overlays. La hoja y la barra no pueden tapar los controles ni impedir leer la próxima parada. Medir también el rectángulo realmente libre y alcanzable, no afirmar que todo el canvas es visible.

SOS sigue accesible desde la barra y desde su destino actual. Red del navegador, conexión Socket, estado de jornada y frescura GPS se muestran como conceptos separados. «Red disponible» no acredita Socket conectado ni GPS vigente.

El marcador muestra `economicNumber` cuando existe, con texto/icono derivados de `status`/`freshness` actuales. Si falta identidad no se inventa C-5, conductor, foto ni velocidad. Coordenadas sólo desde snapshots aceptados; sin extrapolación, interpolación de backlog ni nuevos filtros. No cambiar `mergeSnapshots`, listeners, reglas de aceptación o tiempos. La selección puede animar su estilo; recenter usa el control de cámara existente y respeta reduced motion.

Se conserva una instancia de mapa al cambiar nivel de hoja o contexto visual. Los cambios de jornada mantienen el ciclo de vida existente; V3 no promete persistencia transversal nueva ni altera ese efecto para conseguirla. Zoom/compás y seguimiento usan controles reales. Sólo se exponen capas/estilos actualmente soportados. Si Mapbox falla, jornada, ruta conocida y acceso a acciones siguen disponibles con retry existente; no usar una imagen como si fuera un mapa vivo.

El conductor ve 0 o 1 unidad autorizada mediante `/api/operation/navigation`. N unidades pertenece al mapa de portal y sus permisos. Nunca consultar `/api/locations/live` para convertir conductor en gestor de flota.

### Hoja de tres niveles

| Nivel | Tamaño objetivo | Contenido |
|---|---|---|
| Compacto | 112–144 px cuando el contenido cabe | Unidad, ruta/estado, próxima parada conocida; acceso para ampliar |
| Medio | 40–48% del área operativa disponible | Lo anterior, ETA/distancia/progreso presentes y enlaces reales Chat/Radio |
| Expandido | 78–84% máximo, manteniendo barra/nav accesibles | Ruta/paradas, acciones/checklist de jornada y acceso a diagnóstico existente |

Texto ampliado, traducción o ancho 360 pueden superar la altura compacta objetivo: preferir contenido legible y ausencia de solapamiento. El cuerpo ampliado tiene scroll; no recortar error ni CTA para conservar una cifra de altura.

El gesto empieza sólo en el handle, con pointer capture y sin convertir scroll del cuerpo en arrastre. Al soltar, elegir el nivel más cercano por altura; empates conservan el nivel anterior. `pointercancel` restaura el último nivel confirmado. El handle no dispara acciones funcionales. Botones accesibles «Ampliar contexto» / «Reducir contexto» funcionan sin gesto; sobre el handle, flechas cambian un nivel y Home/End eligen compacto/expandido. Escape compacta sólo cuando el foco está en controles de la hoja, sin capturar Escape de inputs o de un modal hijo.

La hoja es una región no modal con nombre accesible; no `aria-modal` ni focus trap. Mantener foco al cambiar nivel y anunciar el nivel con moderación. Si el control enfocado queda oculto al compactar, devolver foco al handle. El checklist mantiene el formulario existente, sin modal nuevo obligatorio. Cerrar significa compacto; no borra jornada ni detiene GPS. Nueva identidad de unidad/jornada reinicia sólo el nivel visual a compacto.

## 7. B: jornada, ruta y próxima parada

La autoridad de acciones es `JourneyPanel`: mismos payloads `ready/start/pause/resume/finish`, mismo guard `busy`, eventos y arranque/parada native después de confirmación actual del servidor. El refactor se limita a la salida de presentación y callbacks existentes. No mover estos efectos a un provider nuevo ni cambiar elegibilidad de acciones.

| Estado real | Etiqueta y contenido |
|---|---|
| Sin jornada | «Sin jornada asignada», explicación y «Consultar jornada» existente; sin CTA de iniciar |
| `ASSIGNED` | «Preparando jornada», checklist y odómetro actuales |
| `READY` | «Lista para iniciar», CTA actual de inicio |
| `RUNNING` | «En ruta», pausar/finalizar actuales |
| `PAUSED` | «Jornada pausada», reanudar/finalizar actuales |
| `FINISHED` | «Jornada finalizada» sólo si el controlador conserva la respuesta confirmada |
| `CANCELLED` | «Jornada cancelada», sin acciones inventadas |
| Acción pendiente | Copy «Actualizando jornada…»; «Finalizando…» sólo si la presentación dispone de la acción pendiente real |

«Finalizando» no es un nuevo enum del backend. Pérdida de red/frescura no cambia estado ni pausa automáticamente. No afirmar «GPS listo», «ruta descargada» o «conexión operativa lista» a partir de permisos o señales que no acreditan esas condiciones.

Ruta consume `route.name/origin/destination/revision/geometry/stops` y `snapshot.nextStop/progressPercent/distanceRemainingM/isOffRoute/routeState/etaMinutes/etaAt`. Próxima parada es el primer dato de orientación tras identidad/estado. El conductor debe localizarla en menos de tres segundos en una prueba de lectura; esto se mide, no se declara sólo por tamaño de fuente.

`null` implica dato ausente: ETA «Sin estimación», próxima parada «Sin siguiente parada proyectada», ruta «Sin ruta asignada». Cero numérico es válido y no equivale a ausente. Mostrar distancias en m/km, porcentajes con etiqueta y timestamps con `<time>` cuando el campo exista. No inventar origen/destino al faltar. Ordenar una copia de `stops` por `order`; no mutar la respuesta. El punto actual se identifica sólo por `nextStop.order`; no marcar paradas como visitadas sin evidencia de eventos de paso.

El resumen de finalización muestra únicamente campos realmente confirmados/disponibles. `/api/operation/navigation` no garantiza una jornada `FINISHED` recuperable. Distancia total recorrida, paradas cumplidas, total de incidencias y resumen persistente tras reload quedan como gap. No iniciar Event Engine para obtenerlos.

## 8. C: comunicación, alertas y Más

### Chat

Refinar directorio y conversación actuales: iniciales/nombre real, presencia existente, separación de burbujas, hora del mensaje y estados reales de envío, adjuntos actuales y composer visible con teclado. Preservar draft por canal, `clientMessageId`, ACK, retry y guards de envío. No montar otra conexión o duplicar stores para lista/conversación.

El directorio no es un inbox: carece de preview/unread/avatar/unidad. No badges rojos numéricos ni timestamps de una supuesta última conversación. Tampoco cargar todos los historiales para simular ese contrato. Usar los nombres del directorio; prioridad del operador existente se conserva. Al cambiar de tab/conversación, conservar el comportamiento actual del draft y el envío pendiente.

### Radio/PTT y RTC

Jerarquía: canal actual, estado real, botón PTT y acción RTC secundaria. Las etiquetas mapean los estados que ya emite `RadioConsole` (conexión, escucha, solicitud de turno, transmisión, terminación, ocupado/error), sin crear estados de protocolo. Mantener press/release/cancel, blur/visibility, teclado, floor/ACK, captura y cierre/final chunk sin modificaciones. `RtcConsole` conserva selección, conexión, hangup y cleanup existentes.

Presencia de empresa se llama «Personal en línea». No «miembros del canal», número de oyentes ni roster. Una indicación visual de transmisión depende del estado real; no aparenta audio recibido ni nivel/amplitud medidos. Todos los estados conservan target, label y feedback accesible.

### Alertas

Mostrar únicamente incidentes que devuelve `/api/incidents` al conductor, respetando su alcance. Jerarquía desde `severity` existente: critical/high → «Críticas», medium → «Operativas», low → «Informativas»; valor ausente/desconocido → grupo neutral «Reportes». No cambiar severidad del servidor porque un diseño esperaba una alarma roja. SOS puede identificarse por tipo sin afirmar que todo SOS tiene severity high.

Renderizar tipo, status, mensaje y `createdAt`; unidad sólo con identidad presente. Si sólo llega `vehicleId`, no derivar un número económico ni consultar flota para enriquecerlo. Los campos de lectura locales pueden incluir propiedades ya devueltas por el endpoint sin ampliar su contrato. Empty, error y reconexión son distintos. No inventar alertas de GPS perdido o ruta actualizada que no pertenezcan al feed actual.

### Más

Agrupar «Operación» (ruta/paradas/avance y controles de jornada/GPS), «Emergencia» (SOS) y «Sesión» (logout). Apariencia/notificaciones sólo reutilizan `ThemeToggle`/`PushOptIn` existentes y una única instancia funcional. Mantener enlaces, autorización y recuperación de logout actuales.

Perfil editable, almacenamiento, soporte con tickets y documentos de conductor no se presentan como destinos funcionales. No llenar grupos con botones ficticios/disabled para conseguir una captura parecida a la referencia.

## 9. Registro obligatorio de UI_DATA_GAP

| ID | Brecha comprobada | Fallback V3 | Condición para un encargo posterior |
|---|---|---|---|
| G01 | GET listado y owners requieren `company_portal/manage_documents`; POST y download sí admiten documentos del propio driver, pero no proporcionan listado móvil ni selección de unidad | No montar DocumentManager ni presentar listado/upload integrado conductor en V3; portal y endpoints actuales intactos | Read model de listado conductor autorizado, alcance probado y definición de superficie completa |
| G02 | Directorio sin lastMessage/unread/avatar/unidad | Nombres, iniciales, presencia y conversación actuales | Read model inbox autorizado |
| G03 | Snapshot de main sin accuracy/calidad que acredite «Excelente» | Frescura y último reporte existentes | Campo servido y semántica certificada; schema de ingreso no basta |
| G04 | Navigation conductor entrega una unidad | 0/1 en conductor; N sólo portal | Nuevo alcance autorizado fuera de V3 |
| G05 | Sin resumen consolidado/persistente de jornada | Resultado confirmado y campos disponibles; sin totales supuestos | Contrato de resumen separado |
| G06 | Presencia no acredita membresía de canal | «Personal en línea»; sin roster/oyentes | Roster con autoridad definida |
| G07 | Sin feed de eventos automáticos GPS/ruta certificado | Sólo incidentes reales del feed | Eventos/contrato de alertas separado |
| G08 | Sin perfil editable/storage/tickets internos | Destinos actuales de Más | Superficies y contratos autorizados |
| G09 | Sin implementación haptics autorizada bajo freeze native | Sin vibración nueva; especificación de intención solamente | Encargo native separado |

Haptics diferidos: medium al iniciar jornada, light en inicio/fin PTT, heavy en SOS y success/error según resultado real. No instalar plugin, cambiar bridge ni declarar implementado.

G01 se precisa contra main actual: no significa que toda operación documental esté prohibida al conductor. POST fuerza ownerType driver y ownerId de sesión; download limita al mismo propietario. Esa capacidad parcial no acredita el listado o acceso a documentos de unidad del diseño. Esta precisión sustituye la afirmación más amplia del informe previo, sin cambiar permisos ni implementar un módulo incompleto.

Cada gap permanece en el reporte de aceptación con su ID. Las fixtures QA pueden tener valores deterministas para probar presentación, identificadas como fixtures; nunca se usan como fallback de producción. Ausencia de permiso no se muestra como lista vacía ni se elimina de las pruebas para marcar PASS.

## 10. Estados transversales

Loading usa skeleton/contexto y `aria-busy`; error conserva campos/draft/dato conocido cuando la política actual lo permita y ofrece sólo retry existente. Empty distingue falta de asignación, falta de ubicación, sin ruta, conversación vacía y sin incidentes. Forbidden muestra limitación de acceso, sin abrir otra API. Offline conserva datos anteriores con timestamp y etiqueta; no cambia freshness ni afirma que un dato viejo es live. Stale/lost/never_reported mantienen semántica actual con etiquetas humanas y sin alterar tracking.

No bloquear todo el mapa por un fallo de un módulo. No ocultar un error funcional bajo una animación de éxito. Anuncios live se limitan a cambios importantes y no leen cada paquete GPS. El teclado deja el composer/CTA y el foco visibles; safe area se suma una sola vez por borde.

## 11. Archivos permitidos y revisión de freeze

| Área | Superficie permitida |
|---|---|
| Corrección inmediata #25 | Sólo `src/styles/operation-auth.css`, tres colores de texto |
| Acceso posterior | Componentes/pages existentes de #25 y JSX/CSS de forms/reset/MFA actuales; autoridad funcional intacta |
| Shell/mapa/ruta | `driver-shell.tsx`, presentación de `driver-map-home.tsx` y `driver-navigation.tsx`; controles visuales de cámara/reduced motion; no reconciliación/fetch/listeners nuevos |
| Jornada/diagnóstico | JSX/CSS de `journey-panel.tsx`, `driver-tools.tsx`, `driver-console.tsx`; handlers, effects, mount ownership y native calls intactos |
| Comunicación | JSX/CSS de `chat-console.tsx`, `radio-console.tsx`, `rtc-console.tsx`; recursos, hooks y handlers intactos |
| Alertas/Más | `driver-alerts.tsx`, pages/wrappers actuales bajo `app/(driver)/operacion`; tipos de lectura sólo de campos existentes |
| Primitivas | `src/components/mobile-ui/*` presentacionales; CSS dedicado y un import en globals; sin paquete runtime nuevo |
| QA/evidencia | Fixtures reales en `app/visual-qa`, scripts/tests UI existentes, casos de interacción y documentación; assertions no se rebajan |

La lista es un techo de alcance, no autorización para editar cada archivo. Cada fase declara su lista concreta antes del cambio. Prohibidos cambios en `app/api`, `src/core`, modelos/persistencia, `src/hooks`, `src/lib/native-*`, helpers funcionales de snapshots/auth/RTC, server/worker/realtime, Android/native/Capacitor, manifests y lockfiles para dependencias runtime, infraestructura y billing. Aun dentro de archivos permitidos, cualquier diff en handlers/efectos protegidos bloquea la aceptación y se retira o pasa a otro encargo autorizado. No usar renombrados/refactors para esconder esos cambios.

## 12. Fases y criterios de salida

| Fase | Entregable | Dependencia y salida verificable |
|---|---|---|
| 0 | Contraste de #25 en su rama | RED/GREEN Axe; gates existentes del PR; sin duplicación de archivos. Merge verificado de #25 completado en 4412a66 |
| 1 | Tokens y primitivas móviles | Main vigente; CSS scoped, targets/foco/estados y reduced motion; portal/admin/marketing sin regresión |
| 2 | Refinamiento de acceso | #25 integrado; login/activation/recovery/bootstrap y presentación reset/MFA; autoridad y separación Web/Operation verificadas |
| 3 | Shell map-first | Fase 1; barra flotante/nav/safe areas/SOS y fallback Mapbox; 0/1 autorizado; sin cambios GPS |
| 4 | Hoja compacta/media/expandida | Fase 3; gesto/scroll/cancel/keyboard/foco, host estable y controladores únicos |
| 5 | Jornada/ruta contextual | Fase 4; checklist/acciones existentes, próxima parada/progreso conocidos; gap G05 explícito y lifecycle intacto |
| 6 | Chat, Radio/PTT, alertas y Más | Fase 1 y shell estable; draft/ACK/cleanup, severidad real, grupos disponibles; G01/G02/G06/G07/G08 respetados |
| 7 | Estados y validación transversal | Fases anteriores; errores/loading/empty/offline/stale, a11y, responsive y evidencia before/after |

Los cambios se realizan en ramas `codex/` desde main actualizado, con PRs pequeños por fase/bloque. Esta rama de especificación contiene documentación, sin copiar #25. Ninguna fase mergea automáticamente otra ni incluye RC3. Si una fase necesita un cambio protegido, se registra la dependencia y se detiene esa parte; las partes independientes conservan sus límites.

## 13. Gates y evidencia de aceptación

Para una implementación V3, ejecutar `npm run typecheck`, `npm test`, integración con entorno QA aislado existente y `npm run build`. Validar visual, funcional y responsive con `scripts/test-local-visual.mjs`, `--functional` y `--responsive`. Para cambios de mapa, agregar `--mapbox` con token público autorizado: fixture sin proveedor no acredita tiles ni interacción real. No imprimir secretos ni modificar configuración productiva para probar.

Cobertura requerida:

- 360×800, 390×844, 412×915, 430×932; tablet 768/1024; landscape, ambos temas y reduced motion. Agregar 412 al gate existente sin retirar tamaños actuales.
- Componentes reales: acceso default/focus/error/loading, activation/recovery/bootstrap; mapa 0/1 y N únicamente portal; tres niveles y cancel del sheet; estados jornada y ruta parcial; chat draft/adjunto/retry; radio idle/transmit/reconnect; alertas por severity y Más.
- Axe sin serious/critical, contraste 4.5:1 texto normal y 3:1 texto grande; keyboard/focus, targets de todos los controles ≥44×44 y ausencia de overflow/solapamientos. No limitar verificación de targets al atributo `data-critical-action`.
- Tracking/controladores: navegación de tabs y niveles no añade starts/stops/listeners/sockets, no pierde tracking y no duplica una acción. Preservar las pruebas actuales de GPS, PTT/RTC real, ACK/retry, sesión y permisos.
- Gaps: ausencia de controles/data inventados y acceso denegado comprobado. Respetar null/cero, snapshot anterior durante carga y falta de proveedor.
- Screenshots antes/después con SHA, viewport, tema y estado. Separar fixture y proveedor real; registrar oclusión del mapa y prueba de lectura de próxima parada.
- Audit native, verify generated y smoke Android API 33–36 existentes siguen como gates de regresión. No regenerar artefactos native ni cambiar fuentes Android para resolver un fallo de UI.
- Diff de rutas congeladas vacío y revisión manual de handlers en archivos mixtos. CI/UX verdes del SHA candidato antes de solicitar merge.

Headless/resize no acredita teclado IME, notch físico, Doze ni GPS Android. La validación física de safe areas/teclado sigue pendiente hasta evidencia real; la certificación RC3 continúa separada con sus propios requisitos de SHA/paridad. Deployment status de GitHub no demuestra readiness ni SHA servido por un alias.

## 14. Qué entrega esta especificación

Este documento prepara las fases y sus límites. El diseño, esta especificación y el plan de foundation están aprobados. La fase 0 cerró contraste y gate funcional en #25, integrado en main 4412a66 con todos sus gates verdes. Foundation entrega las primitivas en una fixture QA protegida y sus pruebas; `artifacts/mobile-v3-foundation/PHASE_REPORT.md` registra SHAs, resultados y estado de cierre. No equivale a operación V3 integrada ni a certificación física. Las fases posteriores conservan sus dependencias y gates. RC3 sigue intacto.
