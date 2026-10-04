# Mobile V3 Alerts + More Implementation Plan

> Native continuous execution authorized. Activate after Phase6 exact main green.

**Goal:** Organize real driver incidents by severity and actual More destinations by purpose.

**Architecture:** DriverAlerts retains its existing fetch/socket/state/effects/retry; pure grouping reads only returned incidents. More is existing server presentation with existing Link and single SignOutButton. ThemeToggle/PushOptIn stay their single existing functional owners.

**Spec:** docs/superpowers/specs/2026-10-02-mobile-v3-design.md plus the approved continuous Phase7 request (artifacts/mobile-v3-closure/user-request.txt).

## Global Constraints

- Fresh main/zero open PRs before codex/mobile-v3-alerts-more; actual base/CI/UX ledgered.
- Freeze backend/API/core/lib/hooks/contracts/realtime/worker/native/Android/auth/activation/billing/infra/deps/workflows. DriverAlerts effects/handlers exact; no new requests/enrichment/permissions.
- Severity: critical/high→Críticas; medium→Operativas; low→Informativas; unknown/null→Reportes. No GPS lost/recovered, deviation, checkpoint or updated-route feed; G07/Event Engine out of scope.
- Only actual type/status/message/createdAt/identity when genuinely supplied. Current API vehicleId is not an economic number; do not invent it or query another API. Missing date/status honest.
- More actual links: route; combined jornada/GPS controls existing hash; SOS; logout. No fake profile/ticket/storage/document destination. Theme/Push never duplicated. G01/G08 unchanged.
- Allowlist: docs/superpowers/plans/2026-10-03-mobile-v3-alerts-more.md; src/components/driver-alerts.tsx presentation type/JSX only; src/components/mobile-ui/alert-presentation.ts; app/(driver)/operacion/mas/page.tsx; src/styles/mobile-v3.css; scripts/functional-ui-qa.mjs; test/mobile-alert-presentation.test.ts.

## Review Focus

1. Severity missing/unknown, empty and error with retained genuine reports; no invented priority or Event Engine event.
2. Null/unknown status/date/identity cannot be presented as confirmed open/current unit or actual timestamp.
3. Existing incident:new/update/connect cleanup and retry/query/tenant behavior remain exact; no new resources.
4. More/hash destinations actually reach single stable journey/GPS owners; SOS/logout behaviors remain exact and optional functional owners stay one.
5. Long report content/labels, grouped headings, hit targets, themes/reduced motion/landscape do not conceal actual errors/actions.

### Task 1: Grouped incidents and real navigation

**Files:** Pure grouping/copy helpers, DriverAlerts JSX/type, More presentation/CSS/unit/browser QA.

**Interfaces:** severityGroup(value:string|null|undefined) returns one of four presentation headings; groupIncidentReports<T extends {severity?:string|null}>(items:readonly T[]) copies into ordered presentation groups with original item identities and order. No backend enum. Existing actual alerts receive optional severity/status/date/type in local view type, with incidentStatus and incidentDate reading only supplied values.

- [ ] Write unit all four groups/unknown/null/frozen array identity/order. Expected RED missing helper.
- [ ] Browser actual API data critical/high/medium/low/unknown/null, no severity, empty/error/retry/retained reports; no phantom unit/event cards. More headings Operación/Emergencia/Sesión, real route/hash/SOS/logout and owner uniqueness. Expected RED absent severity groups/grouped More. Add actual populated44-cell long-report/error-retained/empty/More layout, Axe and44px/viewport/center-hit coverage; record exact-source rows and PNGs.
- [ ] Implement real-only severity headings/cards; honest missing fields/unknown status, actual dates only; no additional data queries. Group actual More links with existing functional logout and single optional owners elsewhere. Scoped CSS accessible hierarchy/wrapping/targets.
- [ ] Focused unit/browser/typecheck/freeze/AST. Expected GREEN. Commit allowlist.

### Task 2: Full evidence and closure

**Files:** Same QA/plan allowlist; ignored evidence.

**Interfaces:** Task1 grouping/navigation consumed by Task2 actual browser regression/authority audit.

- [ ] Full required local gates and real Mapbox regression. Expected PASS.
- [ ] One fresh review; single Important/Critical RED→GREEN fix pass/full suite; ledger minors. Exact PR CI/UX/Android33–36 green/clean→merge→main exact CI/UX green,34-field phase report (all requested fields). Immediately Phase8.

Pre-flight: Helpers read existing data without mutating it; navigation consumes existing destinations. No protected interfaces change; external physical/RC3 gates stay separate.
