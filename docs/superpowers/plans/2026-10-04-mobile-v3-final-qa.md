# Mobile V3 Final QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans in this session. Native continuous execution, phase progression and gated merges are user-approved.

**Goal:** Certify all approved Mobile V3 presentation states and close the three deferred automated coverage findings without changing operational authority.

**Architecture:** Actual access/operation pages run with isolated browser API/WebSocket fixtures and actual callbacks. Focused QA modules share one orchestrator and existing browser setup; no product controller is duplicated. Real Mapbox checks use its public token and actual SDK/network. Existing CI/UX/Android workflows stay frozen.

**Tech Stack:** Existing Next.js/React/TypeScript, Playwright, Axe, Socket.IO and browser media adapters; no dependency changes.

**Spec:** docs/superpowers/specs/2026-10-02-mobile-v3-design.md and artifacts/mobile-v3-closure/user-request.txt. The later request defines phases2–8 and continuous execution.

## Global Constraints

- Activate only from fresh exact green origin/main after Phase7, clean tree and zero open PRs; branch codex/mobile-v3-final-qa.
- Freeze backend/API/core/lib/hooks/contracts/realtime/worker/native/Android/auth/activation/billing/infra/dependencies/workflows. Preserve handlers, request shapes, redirects and resource lifecycle. No Event Engine or Telemetry changes.
- Preserve UI_DATA_GAP G01–G09. Fixtures are isolated QA only; never fake production data, metrics, inbox, roster, permissions or destinations.
- Preserve RC3 branch151bfa1 and APK/hash. Browser media, emulators, DOM reading and deployment status do not certify physical audio, GPS/Doze, IME/notch, touch, human three-second reading or APK/web SHA parity.
- All eleven viewports360x800,390x844,412x915,430x932,768x900,1024x960,1366x960,1440x960,1920x960,844x390,915x412; dark/light; no-preference/reduce:44cells per state. Exact92-state inventory from artifacts/mobile-v3-closure/phase8-required-states.json becomes tracked QA inventory;4048rows required. General87states=3828rows; five real-map states=220rows.
- Each row records exact source, family/state/cell, explicit assertions, screenshot and serious/critical Axe violations. No filters or dirty tracked source accepted for certification. Focused diagnostic filters never constitute final coverage.
- No horizontal overflow beyond1px; actual actions44px minimum, within full viewport and owning center hit after stable native focus/scroll. Existing Axe thresholds stay zero serious/critical. Normal motion cannot be inferred from reduced-only suites.
- Access redirects reset→/login and MFA→/admin/salud remain exact. Held requests capture actual loading/pending before response. Long messages use the actual field each page renders, not merely an unmapped fixture error code.
- One independent whole-branch review, one Important/Critical RED→GREEN fix pass. Thread-limit reviewer reuse only if fresh dispatch unavailable and cost explicitly ledgered.

## Concrete Allowlist / Responsibilities

1. docs/superpowers/plans/2026-10-04-mobile-v3-final-qa.md — this plan.
2. docs/mobile-v3-final-qa-state-coverage.md — state matrix, commands, fixture boundaries and limitations.
3. scripts/mobile-v3-matrix-required-states.json — exact92 states.
4. scripts/mobile-v3-matrix-qa.mjs — cells, shared capture/geometry/Axe, source attribution, completeness and final reports.
5. scripts/mobile-v3-matrix/auth.mjs — actual19 access states.
6. scripts/mobile-v3-matrix/operation.mjs — zero/one-unit,11sheet,10journey,6route states.
7. scripts/mobile-v3-matrix/communications.mjs —8chat,9radio,8RTC states.
8. scripts/mobile-v3-matrix/alerts-more.mjs —8alerts and6existing More states.
9. scripts/mobile-v3-matrix/mapbox.mjs — real provider, failure, recenter, manual camera and motion policy across44cells.
10. scripts/functional-ui-qa.mjs — opt-in expanded runner integration and unconditional matching-pointer regression only; preserve every baseline gate.
11. src/components/mobile-ui/context-sheet.tsx — pure presentation pointercancel/lostcapture matching-id guard only after observed behavior RED.
12. src/styles/mobile-v3.css — conditional presentation-only fixes if an actual new matrix failure proves a defect; remove from final allowlist if unused. Any other file needs an explicit ruling before editing.

## Review Focus

1. Completeness/source identity: normal+reduced, all4048actual state rows, diagnostic/dirty-source rejection, actual Mapbox SDK/features and preserved failing artifacts.
2. Access actual long errors/scrolled CTA and held reset/MFA/bootstrap: preserve redirects/contracts and no missing pending/error state hidden by wrong fixture field.
3. Secondary pointer cancellation must preserve captured primary drag; matching-primary cancel, lostcapture, snap, resize, identity and mounted owners remain correct. Browser event probes are not physical multitouch certification.
4. Actual operation text at200percent: summary, next stop, status, metrics and existing actions remain readable/reachable. Do not substitute Foundation fixtures or claim human reading time.
5. Actual communication ACK/clientMessageId/floor/final media/peer cleanup and reconnect; company presence never becomes roster; TURN config never becomes tested network traversal.
6. More navigation reaches actual single journey/GPS/route/SOS/logout/theme/push owner without fake permission grants or unsupported destinations.

### Task 1: Complete state matrix and deferred presentation regression

**Files:** All concrete QA files above plus pure ContextSheet fix and conditional CSS.

**Interfaces:** Consumes existing pageFor(channel,options), realtime(page,onEvent), settleVisualState(page), base, unit, realMapForQa(page,selector). Produces runMobileV3Matrix({pageFor,realtime,settleVisualState,base,unit,realMapForQa}) and family module functions taking shared context/cell. Reports artifacts/mobile-v3-final-qa/final-matrix.json and real-mapbox-matrix.json, with exact rows/source/status; errors preserve partial FAIL reports. Final consumer verify-final-matrix.mjs refuses missing/duplicate cells, failed rows, wrong source, missing PNG/Axe or fake real-provider claims.

- [ ] Write actual primary capture/move then secondary pointercancel and lostpointercapture regression. Run focused functional QA. Expected RED: primary data-dragging/capture incorrectly cleared; preserve screenshot/log.
- [ ] Implement cancelPointer(event) filtering against drag.current.pointerId, wired only to pointercancel/lostcapture. Unconditional geometry/resize/identity cancel remains. Expected GREEN for secondary event plus primary cancel/snap controls.
- [ ] Create exact inventory and common runner with opt-in QA_V3_MATRIX=1. Real-mode case name includes Mapbox provider Mobile V3 final matrix; general case Mobile V3 final matrix. Default full CI stays full baseline, not filtered. QA-only family/viewport/theme/motion diagnostics mark diagnostic and cannot pass the final consumer.
- [ ] Auth19actual states with long server errors and held submit requests. Operation29states including zero/one unit, sheet all controls/capture/long scroll, journey6confirmed states/held busy/error/actual200percent and route missing/null/zero/off-route. Communications25states through real callbacks/WebSocket ACK/fake browser media, actual real-peer connection and hangup. Alerts8real severity/missing/retained-error/empty; More6actual actions/single owners. Real Mapbox5states with basemap features and actual camera/failure evidence.
- [ ] Run focused diagnostics to resolve actual presentation/test defects. Any product correction requires behavior RED→GREEN, no authority changes, no weakening thresholds. New coverage of already passing behavior does not imply a product regression.
- [ ] Typecheck/unit/freeze; commit exact allowlist. Run unfiltered expanded general+real Mapbox against clean candidate and verify-final-matrix. Expected PASS4048rows/92states/all44cells, with source exact. Save regression-resolutions.json naming auth-long-error-held-reset-mfa, sheet-secondary-pointer, actual-journey-text-200-percent; each44cells and real evidence, status CLOSED_AUTOMATED.
- [ ] Task completion command consumes the exact preserved4048-row certificate and fresh typecheck/unit/secondary-pointer regression/freeze checks. Do not repeat an unchanged expensive matrix merely for bookkeeping; ledger that choice and its environment-drift cost.

### Task 2: Full release evidence, review and exact main closure

**Files:** Same allowlist; ignored evidence/report helpers.

**Interfaces:** Consumes Task1 exact-source4048rows and three regression resolutions. Produces34-field phase report and19-field final certification using all closed phase metadata, file matrix and source/merge chains.

- [ ] Run npm ci, typecheck, unit, integration, build, visual, full functional, responsive, real Mapbox, audit:native, verify:native-generated and freeze; preserve complete logs/source. Expanded matrix supplements all original suites. Expected all PASS.
- [ ] One independent whole-branch review; re-grade by user effect, ledger all decisions/costs and deferred minors. One Important/Critical fix pass with observed RED→GREEN and new-source full suites/matrix if code changes. No second review.
- [ ] Push/create/attach PR only clean gates. Exact HEAD CI/UX/API33–36/all latest checks including Vercel successful, clean mergeable → merge → exact main CI/UX green, identical candidate/main tree. Preserve actual Android Activity-vs-UI limitations and current prior render reproduction/RCA unproven.
- [ ] Download exact remote evidence/source parity; fresh closure verification; archive only this plan's resolved own scratch after identity/reparse/hash checks; phase report.
- [ ] Consolidate phases0–8 file matrix/freeze/architecture/screens/results/gaps/fixed regressions/debt/physical gates. Refresh RC3 remote ref and local APK hash without modifying them. Write final19-field certification and exhaustive chronological rulings with cost plus historical deferred-minor resolutions.
- [ ] Expected final readiness MOBILE_V3_AUTOMATED_READY_WITH_EXTERNAL_GATES only with every executable gate passed. Physical and live-provider gates pending remain explicit; never PRODUCTION READY.

Pre-flight contracts: exactly92inventory states consumed by orchestrator and certificate; distinct family ownership, no product duplicate. General excludes the five real Mapbox states; real mode supplies exactly220remainingrows. Source-changing fixes invalidate prior final reports; archive/metadata changes do not. User's continuous Native approval governs without new per-phase confirmation.
Additional mandatory QA regression discovered before activation: Phase7 merged-main original UX failed the Foundation Tokyo timezone check because networkidle preceded the mounted effect. CPU20 isolated original reproduces ISO then correct21:00 without prop changes. Phase8 functional QA must wait up to15s for actual localized DOM (still asserts exactTokyo21:00, original datetime and zero hydration errors); add same CPU20 stress then normal existing baseline, never accept ISO. No MobileFreshness product effect change. Original failed main run/artifacts and RED/GREEN diagnostic remain preserved; only one diagnosed same-source failed-visual rerun to establish current required main gate before activation.
QA reporting correctness: the original failed baseline partial report had failures[] empty because run() did not record thrown assertions. In Phase8 wrap only each executed run() body in try/catch, append name/error to failures and rethrow; preserve exit1 and every test/threshold. Prove failing isolated original timezone diagnostic produces nonempty failures and no passing full-suite claim. This QA-only producer change prevents misleading partial artifacts; no product feature or dependency.
