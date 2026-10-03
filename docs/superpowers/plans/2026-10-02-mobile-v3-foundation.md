# Mobile V3 Visual Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar primitivas visuales móviles reutilizables, controladas por sus consumidores, con CSS aislado y QA de componentes reales, sin cambiar aún la composición funcional de operación.

**Architecture:** Primitivas bajo `src/components/mobile-ui` reciben datos/slots/callbacks y no resuelven sesión, permisos, tracking o conexiones. `mobile-v3.css` usa variables nuevas y clases propias bajo scope operativo; una fixture protegida por `VISUAL_QA=1` monta las primitivas. Shell/mapa/jornada/comunicación continúan con sus componentes actuales hasta sus fases correspondientes.

**Tech Stack:** Next 15 / React 19 / TypeScript existentes; CSS por dominio; Icon y BrandLogo actuales; Playwright 1.55.1 y Axe 4.10.2 del gate vigente. Sin dependencias runtime nuevas.

**Spec:** [Especificación aprobada](../specs/2026-10-02-mobile-v3-design.md), secciones 2, 4, 5, 9–13. Encargo del usuario de fases 0–8: fase 1 únicamente.

**Rama:** `codex/mobile-v3-foundation`, nacida de `origin/main` `4412a665b662ade31528d53ccad176e89973439e`. #25 ya integrado. Estado de este plan: escrito para revisión; ninguna tarea de producto ejecutada. Consultar nuevamente main y sus runs antes de ejecutar; un SHA nuevo requiere revisar/rebasar la documentación de base sin mezclar RC3.

## Global Constraints

- Freeze: API/core/native/Android/Capacitor/backend/realtime/Mongo/Redis/workers/billing/auth/MFA/sesiones/roles/permisos/GPS/ACK/retry/RTC/PTT/jornada/reconciliación Mapbox.
- Importar sólo tipos de lectura existentes; no modificar `src/core/contracts` ni crear un protocolo paralelo.
- Scope `.driver-shell`, `.operation-auth-shell`, `.operation-session-check`; variables `--mobile-v3-*` y clases `.mobile-v3-*` exclusivamente. No `:root` de tokens nuevos, no reasignar `--brand/--text/--surface` existentes.
- Marca `#E31E24`, geometría original `#D80000`; dark `#080B0F/#10151B/#151C24`, texto `#F5F7FA`, secundario inicial `#8D96A5`; acceso blanco/secundario `#5f6570`. Verificar pares reales con Axe.
- Body 14–16 px, secundaria 12–13, caption 10–11, títulos 28–32; spacing 4/8/12/16/20/24/32/40/48; targets de primitivas ≥44×44 px; reduced motion obligatorio.
- Datos faltantes/permisos no se simulan. G01–G09 siguen vigentes; fixture identificada como QA, sin fallback productivo.
- Esta fase no monta primitivas en DriverShell/Auth ni altera sus handlers. No segundo owner de JourneyPanel/DriverConsole. No nuevos fetch/socket/listener/store/timer de tracking/native.
- ContextSheet de esta fase establece geometría y controles por botones. Drag, pointer capture/cancel, snap por gesto, Home/End/flechas y Escape contextual pertenecen a fase 4, sobre esta misma primitiva.
- Cada commit de producto usa una lista de archivos concreta. La documentación de este plan no equivale a implementación ni PASS de fase 1.

## Review Focus

1. Estilos filtrados al portal/admin/marketing: los tokens legacy de root y su QA actual deben conservarse; prueba en tarea 1 y gate final de tarea 5.
2. Copy largo y targets en 360/412 y landscape: texto legible y controles alcanzables sin overflow; casos de tarea 2 y matriz de tarea 5.
3. Ausencia de dato/callback: ningún timestamp inválido, calidad GPS inventada o retry sin acción real; pruebas de tarea 4.
4. Hoja controlada: cada botón sólo comunica un nivel al owner, sin modalidad ni acciones funcionales; pruebas de tarea 3.
5. Reduced motion y foco: CSS sin animación cuando se solicita reducción y focus visible conservado tras interacciones; pruebas de tareas 2, 3 y 5.

---

## Estructura y allowlist

Crear `src/components/mobile-ui/mobile-section.tsx`, `mobile-status.tsx`, `mobile-top-bar.tsx`, `mobile-bottom-nav.tsx`, `sheet-handle.tsx`, `context-sheet.tsx`, `mobile-state.tsx` y `mobile-freshness.tsx`. Un archivo por responsabilidad; los tres estados comunes comparten un archivo porque tienen la misma estructura. Exportar tipos desde su archivo propietario, sin una nueva capa de dominio.

Crear `src/styles/mobile-v3.css`, `app/visual-qa/mobile-foundation-preview.tsx` y actualizar el allowlist/branch de `app/visual-qa/[surface]/page.tsx`. Modificar `app/globals.css` con un único import, `scripts/functional-ui-qa.mjs` con casos foundation y `scripts/visual-qa.mjs` con nueva superficie/viewport. Ningún otro archivo de producto se permite en esta fase.

La fixture usa un wrapper de scope `.driver-shell` sin montar el DriverShell funcional. Se identifica «Mobile V3 Foundation — fixture QA», contiene componentes reales y estados visuales controlados por `useState`, sin llamadas de operación. No copiar markup de los componentes como sustituto en QA. La ruta conserva el `notFound()` fuera de `VISUAL_QA=1`.

### Task 1: Tokens, sección, estado y fixture inicial

**Files:** crear `mobile-section.tsx`, `mobile-status.tsx`, `mobile-v3.css` y preview; modificar globals, ruta visual QA y script funcional.

**Interfaces:**
- `MobileSection({title, children, action?, id?}: {title:string; children:ReactNode; action?:ReactNode; id?:string})`: sección con h2 y slot de acción existente, sin inventar acciones.
- `MobileTone = "neutral" | "success" | "warning" | "danger"`, exportado por `mobile-status.tsx`.
- `MobileStatus({label,tone?,icon?,announce?}: {label:string; tone?:MobileTone; icon?:IconName; announce?:boolean})`: etiqueta de texto/icono; por defecto neutral y sin live announcement. `announce=true` activa `role=status`/`aria-live=polite`.
- `MobileFoundationPreview()`: componente client usado únicamente por la ruta QA; punto de composición que tareas posteriores amplían.

- [ ] Añadir caso `mobile foundation isolates tokens and status semantics` al harness funcional; navegar a `/visual-qa/mobile-foundation`, exigir fixture, sección y status. Debe fallar antes de crear la superficie.
- [ ] Ejecutar RED con `QA_FILTER="mobile foundation" node scripts/test-local-visual.mjs --functional`; guardar reporte.
- [ ] Implementar las interfaces y CSS scoped. Usar medidas concretas: body 15, secondary 13, caption 11, heading 30 px; sección 16 px de padding/radio 16. Light operativo: fondo `#F8FAFC`, superficies blanco/`#F1F5F9`, texto `#17202B`, secundario `#5f6570`. Acceso mantiene tokens claros independientemente del tema root.
- [ ] Importar CSS una vez después de `operation-auth.css`. Sólo nuevas variables/clases: las reglas no seleccionan elementos legacy genéricos ni recolorean `.driver-shell` por sí misma.
- [ ] Verificar en ambos temas que root conserva `--brand` dark `#e11d48` / light `#d81945` y `--background` dark `#08090b` / light `#f4f6f8`; status muestra texto y sólo anuncia cuando se indica. Contar solicitudes `/api`/Socket dentro de la fixture: cero al render y al cambiar tone. Registrar baseline de superficies vigentes antes de integrar el CSS.
- [ ] Ejecutar GREEN, typecheck y commit `feat(mobile-ui): add scoped visual foundation and status primitives` sólo con los archivos de esta tarea.

### Task 2: Barra superior y navegación inferior presentacionales

**Files:** crear `mobile-top-bar.tsx`, `mobile-bottom-nav.tsx`; ampliar CSS, preview y casos funcionales.

**Interfaces:**
- `MobileTopBar({title,leading?,actions?}: {title:ReactNode; leading?:ReactNode; actions?:ReactNode})`: header de presentación con slots. No permisos, pathname ni consultas.
- `MobileNavItem = {href:string; label:string; icon:IconName; active:boolean}`, exportado por `mobile-bottom-nav.tsx`.
- `MobileBottomNav({items,label?}: {items:readonly MobileNavItem[]; label?:string})`: nav con Next Link/Icon actuales; `active` sólo viene del consumidor; `aria-current=page` sólo en item activo.

- [ ] Añadir RED `mobile foundation preserves navigation identity and long labels`: fixture con los cinco destinos existentes y un único activo; verificar hrefs y `aria-current`, foco de teclado y targets de slots/nav. Todavía no existen los componentes.
- [ ] Ejecutar RED del caso y crear las interfaces. Alturas base topbar 56 px + inset superior y bottomnav 68 px + inset inferior; controles ≥44 px en ambos ejes. El layout de la fixture reserva espacio sin sumar dos veces los insets. No fixed globals que afecten otras superficies.
- [ ] Componer con BrandLogo/Icon existentes, sin arte nuevo; el consumidor de prueba controla el activo. No copiar la configuración funcional de tabs a un store; la futura fase 3 entregará items desde la configuración actual de DriverShell.
- [ ] Probar widths 360,390,412,430,768,1024 y landscape 844×390/915×412, incluyendo título/copy largos y labels existentes; medir overflow, solapamiento de targets y foco visible con Tab. No truncar la única información crítica.
- [ ] Verificar que `prefers-reduced-motion: reduce` produce duration 0 s en nuevos controles; no agregar animación JS.
- [ ] Ejecutar GREEN y commit `feat(mobile-ui): add controlled top bar and bottom navigation` con su allowlist.

### Task 3: Base controlada de hoja y handle

**Files:** crear `sheet-handle.tsx`, `context-sheet.tsx`; ampliar CSS, preview y casos funcionales.

**Interfaces:**
- `SheetLevel = "compact" | "medium" | "expanded"`, exportado por `sheet-handle.tsx`.
- `SheetHandle({level,controlsId,onLevelChange}: {level:SheetLevel; controlsId:string; onLevelChange:(level:SheetLevel)=>void})`: botones «Ampliar contexto» / «Reducir contexto», disabled en extremos; una notificación por click, sin efecto funcional.
- `ContextSheet({id,title,level,summary,children,onLevelChange}: {id:string; title:string; level:SheetLevel; summary:ReactNode; children:ReactNode; onLevelChange:(level:SheetLevel)=>void})`: región no modal, handle, summary siempre visible y cuerpo con scroll para contenido ampliado. El owner conserva nivel; la primitiva no tiene store propio.

- [ ] Añadir RED `mobile foundation sheet is controlled and non-modal`: mismo nodo de summary entre niveles, región nombrada, sin `aria-modal`/dialog; callback recibe medium/expanded/medium/compact una vez por click.
- [ ] Ejecutar RED e implementar: área disponible = `100dvh - 56px - 68px - safe-area-top - safe-area-bottom`, mediante variable CSS de presentación. Compacto base 128 px y crecimiento si summary/handle exigen más; medio objetivo 44% y expandido 82%. En alturas cortas, medio reserva al menos 44 px más que compacto y expandido 44 px más que medio, hasta el máximo disponible: orden de niveles y controles accesibles tiene prioridad sobre los porcentajes objetivo. Si no cabe el contenido, scroll del cuerpo; no recortar feedback ni targets. Radio 24 px, transición 320 ms `cubic-bezier(.22,1,.36,1)`.
- [ ] Mantener el summary montado al cambiar nivel. El consumidor actualiza props; sin callback no se fabrica acción porque la interfaz exige uno. Botones controlan `id` por `aria-controls`; el nivel tiene etiqueta legible.
- [ ] Probar Tab/Enter en botones, disabled extremos, scroll independiente y foco conservado. Verificar contador del callback del owner de fixture y ausencia de requests funcionales. En reduced motion, duración 0 s.
- [ ] Ejecutar GREEN y commit `feat(mobile-ui): add controlled context sheet foundation`. No implementar todavía gesto, pointer capture, snap por arrastre ni integración de JourneyPanel.

### Task 4: Estados comunes y frescura de lectura

**Files:** crear `mobile-state.tsx`, `mobile-freshness.tsx`; ampliar CSS, preview y casos funcionales.

**Interfaces:**
- `MobileEmptyState({title,message,action?}: {title:string; message:string; action?:ReactNode})`: sin CTA cuando no hay slot.
- `MobileErrorState({title,message,onRetry?,retryDisabled?}: {title:string; message:string; onRetry?:()=>void; retryDisabled?:boolean})`: alerta y «Reintentar» sólo con callback, disabled según prop; no política de retry nueva.
- `MobileLoadingState({label}: {label:string})`: estado indeterminado/aria-busy; no porcentaje, timer ni espera mínima.
- `MobileFreshness({freshness,recordedAt}: {freshness:GpsFreshness; recordedAt:string|null})`: sólo labels del enum actual y hora existente; sin recálculo de freshness/calidad. Labels: live «En vivo», delayed «Reporte demorado», stale «Dato antiguo», lost «Sin señal reciente», never_reported «Sin reportes».

- [ ] Añadir RED `mobile foundation keeps missing data and callbacks honest`: error sin callback no tiene retry; con callback invoca una vez; null/invalid fecha no genera `<time datetime>` inválido; todos los estados existentes conservan labels distintos.
- [ ] Ejecutar RED e implementar, reutilizando MobileStatus/Icon y slots de tarea 1. Fecha válida usa `<time dateTime=recordedAt>` y formato local `es-MX`; null/inválida muestra «Hora no disponible». Estado inesperado en runtime usa «Estado GPS no disponible», nunca «Excelente» ni accuracy.
- [ ] Probar loading/error/empty, copy largo, botón disabled, timestamps válidos/null/inválidos y freshness existente; no timers/requests. No inferir live a partir de browser online o del tiempo local.
- [ ] Ejecutar GREEN y commit `feat(mobile-ui): add honest loading error empty and freshness states`.

### Task 5: Matriz visual y cierre de foundation

**Files:** modificar scripts QA existentes, preview y documentación/evidencia; correcciones pequeñas sólo en primitivas/CSS de esta fase.

**Interfaces:** reutilizar las tareas 1–4; añadir `mobile-foundation` a `surfaces`. La ruta QA monta esos componentes reales y no se usa como fallback productivo.

- [ ] Registrar baseline y añadir casos de viewport: 360×800,390×844,412×915,430×932,768×900,1024×960; conservar 1366/1440/1920 y sus alturas actuales. Agregar landscape 844×390/915×412. Mantener todas las superficies y assertions existentes.
- [ ] En los casos foundation del harness funcional medir todos sus botones/links visibles (no sólo `data-critical-action`) ≥44×44, contrast/foco/overflow/solapamientos en ambos temas y `no-preference`/`reduce`. Verificar la geometría no modal sin declarar probado el gesto de fase 4.
- [ ] Ejecutar npm ci, herramientas QA fijadas del workflow, typecheck, unit, integración QA aislada, build, visual, functional y responsive. Evitar servidores/build simultáneos. Si aparece un fallo previo fuera del scope, registrar baseline/dependencia y no alterar una autoridad protegida.
- [ ] Revisar diff de freeze contra origin/main y efectos de archivos mixtos: estos últimos deben estar completamente intactos porque foundation no los edita. Mapbox real no aplica aquí; no cambió el mapa.
- [ ] Obtener native audit y verify-generated de lectura; Android API 33–36 por CI del HEAD exacto, sin regenerar el APK RC3 local. Preservar su checksum y distinguir emulator smoke de physical PASS.
- [ ] Guardar screenshots before/after y metadatos SHA/base/viewport/theme/motion/state, informe de fase 1 con G01–G09, límites y gates. Pedir revisión de código según skill; resolver findings importantes dentro del scope autorizado.
- [ ] Commit final de QA/evidencia, abrir PR foundation contra main vigente, adjuntarlo al chat y esperar CI/UX de ese HEAD. Confirmar todos los gates antes del merge autorizado por la estrategia. No abrir la rama auth hasta foundation correctamente cerrado y main actualizado.

## Auto-revisión del plan

Scope: foundation exclusivamente; acceso integrado de #25 se consume, no se duplica. Interfaces de tareas posteriores referencian exactamente los exports anteriores. Los cinco focos tienen pruebas propietarias. No campos, enum de servidor, permisos o handlers nuevos. Gestos/integración operativa quedan explícitamente para sus fases, sin declararlos terminados aquí. Cada paso es verificable y el único CSS import no reasigna tokens globales.

## Handoff

El usuario revisa este plan escrito y elige ejecución antes de implementar foundation. Native: el agente implementa las tareas en esta sesión con revisión al final. Subagent-driven: implementadores/revisores por tarea. Recomendación: Native, porque el bloque es presentación aislada, pequeño y secuencial, con gates completos y revisión de cierre; mantiene un único owner del checkout. La estrategia Git y las autorizaciones de merge condicionadas ya aportadas por el usuario se conservan.
