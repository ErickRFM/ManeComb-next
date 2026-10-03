# Mobile V3 Map-first Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Native continuous execution through phase8 is explicitly approved; no further handoff approval.

**Goal:** Give the existing authorized driver map a viewport canvas, floating chrome and contextual sheet while keeping every operational controller and data authority.

**Architecture:** DriverShell consumes Foundation top/bottom bars and owns one always-mounted sheet hosting the existing JourneyPanel, DriverConsole and PushOptIn. A presentation-only context publishes the read model already accepted by DriverMapHome; no fetch/socket/ordering/projection in that context. Sheet gestures belong to phase4. Journey/route refinement belongs to phase5.

**Tech Stack:** Existing React/Next/TypeScript/CSS/Playwright/Axe; no dependencies.

**Spec:** ../specs/2026-10-02-mobile-v3-design.md; latest continuous request f72496ff-f4bc-4d21-b2c1-d5b9780e2408.

## Global Constraints

- Branch codex/mobile-v3-map-shell; base ce597dd5b1ec925e35478e96a4c2e80f2a85715b. Main CI37142546631 and UX37142546626 SUCCESS. No open PRs.
- Freeze API/core/lib/hooks/realtime/worker/native/android/infra/dependencies/billing and all operational handlers/effects. Camera duration respects reduced motion; no GPS changes.
- Driver0/1 only; no portal live query or UnitDetailPanel. One map and one JourneyPanel/DriverConsole/Push owner. G01–G09 remain.
- Preserve existing lifecycle on journey identity changes; context clears when map leaves. No fake product data; QA fixtures isolated.
- Allowlist: this plan; src/components/driver-shell.tsx,driver-map-home.tsx,driver-tools.tsx; src/components/mobile-ui/operation-map-context.tsx,operation-map-summary.tsx; src/styles/mobile-v3.css; scripts/functional-ui-qa.mjs; app/visual-qa/[surface]/page.tsx,mobile-map-preview.tsx. Read-only driver-navigation/JourneyPanel/DriverConsole in this phase.

## Review Focus

1. Map ref and functional effects remain identical apart from explicitly approved camera duration.
2. Sheet level and tab changes preserve single functional owners and hidden semantics; no hidden-body anchor regression.
3. 360px and short landscape: top/nav/control targets>=44, no overlap, long status and provider failure remain readable.
4. Bridge clears on departure; accepted snapshots alone, no alternate API, fake identity or second arbitration.
5. Real Mapbox canvas and controls remain accessible when sheet expanded; distinguish canvas geometry from uncovered map rectangle.

### Task 1: Compose the map-first driver shell

**Files:** Presentation components/styles in allowlist; scripts/functional-ui-qa.mjs for regression.

**Interfaces:** Existing DriverShell({children}), DriverMapHome(), DriverTools({children}) retained. Optional stable DriverTools onOpen is a presentation callback from existing details toggle/hash handling, not another hash/resource listener. Foundation ContextSheet remains controlled. Read model context setter is stable and publishes only current accepted data.

- [ ] Write browser regression 'Mobile V3 map shell is map-first with one owner': real /operacion0/1 responses, chrome targets, fixed canvas, Foundation sheet, single owner and forbidden API count0; run filtered suite and observe RED for missing composition.
- [ ] Implement Foundation composition and stable controller host; publish accepted read model, clear on map unmount, preserve current route/camera/follow/data effects. Move existing summary presentation into sheet without a duplicate old bottom card. Follow control remains existing callback, duration0 in reduced motion.
- [ ] Keep map error/status/retry and no-journey/error/loading UI readable and actions reachable. Existing hash link to controls opens context through details toggle without remounting owners.
- [ ] Run filtered tests, typecheck and unit. Expected PASS. Commit only allowlisted source.

### Task 2: Certify map-first geometry and closure

**Files:** QA scripts/guarded fixture and ignored evidence; no protected source.

**Interfaces:** Browser QA exercises actual driver pages with isolated API/WebSocket responses. Real Mapbox uses existing authorized .env.local public token without logging it. Existing assertions/thresholds and baseline matrices preserved.

- [ ] Add real-provider geometry check across11 viewports/both themes, one canvas, sheet levels, camera manual/recenter/reduced motion; record actual canvas and uncovered rectangle. Add no-journey/provider-error/long-copy/landscape checks. Expected PASS; any observed regression gets RED→GREEN.
- [ ] Adapt existing provider-unavailable/GPS/tab/fixture tests to the new explicit sheet controls while preserving all behavioral assertions.
- [ ] Run npm ci, typecheck, unit, isolated integration, build, visual/functional/responsive/Axe, real Mapbox, native audit/generated verify; exact allowlist and frozen effects audit. Expected all PASS.
- [ ] One fresh whole-branch review; regrade and fix Important/Critical once using RED→GREEN and full gates. Push/create/attach PR, exact CI/UX/Android33–36 green, merge only clean/mergeable. Main exact CI/UX green, phase report and immediate phase4.

Pre-flight: Task1 publishes accepted read model and stable host; Task2 consumes their presentation/DOM only. No shared operational authority or new dependencies.
