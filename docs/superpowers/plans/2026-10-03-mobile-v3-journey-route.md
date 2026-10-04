# Mobile V3 Journey + Route Implementation Plan

> Execute natively in this session, continuously authorized through phase8. This draft becomes the branch plan only after Phase4 exact main CI/UX green.

**Goal:** Make real unit, journey, next stop, ETA/distance, progress and permitted actions understandable through presentation alone.

**Architecture:** Existing map read model supplies accepted snapshot/route fields to pure views. Existing JourneyPanel remains the sole action authority. New presentation helpers format existing values and copy stops before sorting; no fetch/store/listener/controller added. All existing effects/handlers and native calls remain exact.

**Tech Stack:** Existing React/TypeScript/CSS/Vitest/Playwright/Axe; no deps.

**Spec:** docs/superpowers/specs/2026-10-02-mobile-v3-design.md and latest continuous-execution user request Phase5.

## Global Constraints

- Fresh main and zero open PRs before codex/mobile-v3-journey-route. Record actual base/CI/UX at setup.
- Freeze backend/API/core/contracts/lib/hooks/realtime/worker/native/Android/auth/activation/billing/infra/workflows/deps. JourneyPanel, DriverNavigation and DriverMapHome allow presentation JSX/import changes only; functions/effects/guards/native calls exact.
- Driver0/1, G01–G09 unchanged. No summary persistence, visited stops, historic totals, incident totals, GPS-ready assertion, route download or invented ETA.
- Null ETA→Sin estimación; nextStop→Sin siguiente parada proyectada; route→Sin ruta asignada. Numeric0 valid. Read only real route.name/origin/destination/revision/geometry/stops and snapshot fields already approved.
- Binding spec labels: ASSIGNED→Preparando jornada; READY→Lista para iniciar; RUNNING→En ruta; PAUSED→Jornada pausada; FINISHED→Jornada finalizada; CANCELLED→Jornada cancelada. Pending remains Actualizando jornada…; no new pending-action state or invented native certainty. Existing native confirmation suffix remains only when its existing controller actually supplies it.
- Allowlist: this final plan, src/components/mobile-ui/journey-presentation.ts, operation-map-summary.tsx; src/components/journey-panel.tsx,driver-navigation.tsx,driver-map-home.tsx presentation only; src/styles/mobile-v3.css; scripts/functional-ui-qa.mjs; test/mobile-journey-presentation.test.ts. No OperationMapContext contract change needed: existing route origin/destination available.

## Review Focus

1. Null versus0, invalid/missing values, unknown journey/route states, no invented metrics or certainty.
2. Checklist and ready/start/pause/resume/finish handlers/busy/errors/server/native-confirmation behavior must remain byte-equivalent AST; no hidden or duplicated actions.
3. Map read model can lag JourneyPanel confirmation; do not introduce a second action owner or claim native confirmation from projected state.
4. Ordered stops must never mutate original response; omitted radius/metadata cannot acquire fictional defaults.
5. Long next stop, compact portrait/landscape,200% copy and expansion keep meaningful reading/actions reachable; automated DOM timing never certifies human3-second reading.

### Task 1: Honest journey/route hierarchy

**Files:** Pure helpers, summary/owning presentation/CSS/unit/browser QA above.

**Interfaces:** journeyStateLabel(state:string):string localizes six real server values with honest unknown fallback. distanceLabel(value:number|null|undefined):string preserves0 and missing. orderedStops<T extends {order:number}>(stops:readonly T[]):T[] sorts a copy. Views accept existing data; no new state/resource owner. Existing callbacks and effects unchanged.

If localizing projected route state, a pure routeStateLabel reads only the five existing main RouteState strings ON_ROUTE,NEAR_ROUTE,POSSIBLE_DEVIATION,OFF_ROUTE_CONFIRMED,RECOVERING and otherwise says Estado de ruta no disponible; it neither changes isOffRoute nor creates Event Engine events. Do not replace raw values by an invented backend enum.

- [ ] Write unit tests six states, unknown, null and0, immutable frozen stop ordering. Run focused unit. Expected RED absent helper.
- [ ] Write actual operation browser tests six server states/permitted actions, held POST busy and rejected response preserving confirmed state, one ready/start/pause/resume/finish POST each, native start/stop counters after actual confirmed response, canonical route null/zero/full/partial values, next-stop geometry/read hierarchy. Expected RED raw enums/missing canonical null copy and absent hierarchy. Existing native browser QA adapter may be reused; no actual device PASS.
- [ ] Implement pure helper/localized presentation and prominent next stop, ETA/distance/progress, actual origin/destination/revision when supplied. Route stops copy before sort. Missing metrics stay missing; no default radius50 or distance0. Refine JourneyPanel JSX/class/copy without moving or rewriting handlers/effects/guards/native calls. DriverMapHome only missing off-route distance display if relevant; map authority exact.
- [ ] Use existing nextStop.order alone for current-stop visual distinction, not visited-stop inference. Existing freshness/recordedAt may use Foundation MobileFreshness, explicitly distinct from GPS quality; no new resource owner. Preserve real speed display used by provider-failure regression.
- [ ] Run focused unit/browser/typecheck and protected AST/freeze audit. Expected GREEN. Commit exact allowlist.

### Task 2: Full evidence and gated closure

**Files:** Same QA/plan allowlist; ignored reports/logs/screens/authority audit.

**Interfaces:** Task1 presentation consumes existing authoritative values; full browser regression and AST audit compare against exact Phase4 main base.

- [ ] Full npm ci/typecheck/unit/integration/build/visual/functional/responsive/Axe/native audit/generated verification and actual Mapbox regression. Expected PASS with thresholds intact.
- [ ] One fresh whole-branch review, regrade actual effects, one Critical/Important RED→GREEN fix pass plus whole suite; ledger minors. Push/create/attach PR; exact-head CI/UX/API33–36/checks clean→merge; exact main CI/UX green,35-field report. Immediately Phase6.

Pre-flight: Task1 helpers/views consumed by Task2 QA; no new operational contract. Final review before remote closure. Physical reading speed, IME/notch/GPS/Doze and RC3/APK-web parity remain external gates.
