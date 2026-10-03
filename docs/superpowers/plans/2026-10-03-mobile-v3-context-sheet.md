# Mobile V3 Context Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Native continuous execution through phase8 explicitly approved; no further handoff approval.

**Goal:** Complete the controlled three-stage sheet with handle-only gestures, keyboard access, focus restoration and stable operational owners.

**Architecture:** ContextSheet retains its existing DOM and observer. SheetHandle exposes a named slider grip separate from existing expand/reduce buttons. Drag changes presentation height only; release publishes one visual level. CSS geometry probes share the same level variables; they contain no copied operational DOM. All JourneyPanel/DriverConsole functional code remains untouched.

**Tech Stack:** Existing React/TypeScript/CSS/Playwright/Axe/Vitest; no dependency changes.

**Spec:** docs/superpowers/specs/2026-10-02-mobile-v3-design.md and latest user Phase4 request.

## Global Constraints

- New branch codex/mobile-v3-context-sheet from fresh green origin/main61738ab6f0e73ca5b2dff48c146b64d8af18dfcf; main CI37153043624 and UX37153043625 SUCCESS; zero open PRs.
- Frozen API/core/lib/hooks/realtime/worker/native/Android/infra/workflows/deps/auth/billing and operational effects. Driver0/1 only; G01–G09 remain.
- Compact112–144px when copy fits, medium40–48%, expanded78–84% approximately; Phase3 short-landscape control reservation and intrinsic-copy fallback retained. Controls>=44; light/dark; normal/reduced motion;11 viewports.
- Nonmodal region, no aria-modal/dialog/trap. Gesture only central grip; body scroll remains independent. Existing endpoint buttons stay focusable aria-disabled with guards.
- Allowlist: this final plan; src/components/mobile-ui/context-sheet.tsx,sheet-handle.tsx,sheet-geometry.ts; src/components/driver-shell.tsx visual identity/reset prop only; src/styles/mobile-v3.css; scripts/functional-ui-qa.mjs; test/mobile-sheet-geometry.test.ts; app/visual-qa/mobile-foundation-preview.tsx for QA-only external collapse and input focus probes.

## Review Focus

1. Pointer capture lost or cancelled, resize/orientation and identity change during drag must restore confirmed/external level without actions.
2. Body input focus during external compact must return to grip; inputs and child dialogs retain Escape, nav/endpoint focus stays put.
3. Long copy/text scaling at360 and short landscape must keep body/action targets reachable without changing map controls or clipping feedback.
4. Drift between CSS and snap heights must not create ambiguous stages; exact closest ties preserve previous level, even when not among tied candidates.
5. Level/tab changes must preserve checklist draft, DOM owners, the existing baseline Socket/listener counts and existing GPS start/stop/action count.

### Task 1: Handle-only gesture and accessible level control

**Files:** ContextSheet, SheetHandle, sheet-geometry, CSS, unit/browser tests above, DriverShell visual reset key.

**Interfaces:** Keep ContextSheet existing controlled props; optional resetKey:string|null cancels visual gesture on identity change. SheetHandle accepts gripRef and gripProps typed HTMLAttributes<HTMLSpanElement>, retains button callbacks. closestSheetLevel(height:number,heights:Record<SheetLevel,number>,previous:SheetLevel):SheetLevel returns closest; numerical tie returns previous. No functional context/store.

- [ ] Write unit tests closest/endpoints/exact ties including previous not among nearest; run npm test -- test/mobile-sheet-geometry.test.ts. Expected RED absent function.
- [ ] Write browser cases `Mobile V3 context sheet handle gesture and keyboard`, `Mobile V3 context sheet preserves owners drafts and tracking`, `Mobile V3 context sheet long copy and resize`: real mouse capture/up/cancel/lost capture/body-start exclusion; ArrowUp/Down/Home/End; contextual Escape/input Escape; external focus restoration; resize/orientation; actual CSS heights; unchanged owner references/checklist values; API/action/ws/window-listener/GPS counters; long360 copy and200% text; ordinary short-landscape next-stop fully visible at compact without summary scroll. Run filtered functional suite. Expected RED missing named slider/gestures.
- [ ] Implement closestSheetLevel pure function. ContextSheet uses aria-hidden empty height probes for three resolved CSS targets. Primary grip down captures pointer; move clamps visual height; up chooses closest and calls level once; cancel/lost capture restore confirmed height. Controlled level/resetKey/viewport changes cancel visual drag. CSS custom height override suppresses transition while dragging, reduced motion0 retained. Scoped short-landscape summary may use side-by-side identity/next-stop and smaller gaps/padding to keep ordinary next-stop fully visible; long feedback retains scroll fallback.
- [ ] Implement slider accessible name/value/text;44px grip; arrows one stage/Home compact/End expanded. Escape compact only sheet control region, not input/select/textarea/contenteditable or child dialog. Capture focused body target and restore grip only if hidden by external compact; no focus trap.
- [ ] Run unit/filter/typecheck. Expected GREEN. Commit allowlisted files.

### Task 2: Complete evidence and phase closure

**Files:** Same QA/plan allowlist; ignored reports/logs/screens/authority audit.

**Interfaces:** Task1 stable DOM/controlled props consumed by actual browser geometry/resource tests. Operational components/effects are read-only and AST comparison remains exact.

- [ ] Full npm ci/typecheck/unit/integration/build/visual/functional/responsive/Axe/native audit/generated verification and real Mapbox regression. Expected all PASS, no thresholds relaxed. Freeze/allowlist audit.
- [ ] Fresh whole-branch review once; regrade actual effects, Important/Critical single RED→GREEN fix pass and full gates. Minors documented. Then exact-head PR CI/UX/API33–36, clean/mergeable gated merge, exact main CI/UX green and35-field phase report. Immediate Phase5.

Pre-flight: Task1 defines exact CSS target heights and stable slider/DOM; Task2 consumes them and checks resource identity; no operational interface changes. Review precedes remote closure, completion ledger only after fresh main green.



