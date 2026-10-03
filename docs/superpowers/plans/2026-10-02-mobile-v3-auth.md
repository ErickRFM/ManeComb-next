# Mobile V3 Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task. The user explicitly authorized continuous Native execution through phases 2–8 without further plan approval.

**Goal:** Refine existing operational login, activation, recovery, reset, MFA and bootstrap without changing authentication authority.

**Architecture:** Reuse PR #25 components and Foundation styles. Presentation-only JSX and scoped CSS; all existing handlers, effects, payloads, redirects and session policies stay intact. Reset/MFA may select the operational wrapper through the existing surface query convention; reset success still redirects to its existing destination.

**Tech Stack:** Existing Next/React/TypeScript, CSS, Playwright/Axe QA. No dependencies.

**Spec:** ../specs/2026-10-02-mobile-v3-design.md; continuous execution request f72496ff-f4bc-4d21-b2c1-d5b9780e2408, phases 2–8.

## Global Constraints

- Branch codex/mobile-v3-auth; base d38fca5ec3476a4ad1f3d8a15ef0765d2355233f. Main authority, exact PR and post-merge main gates required.
- Freeze all auth/session/JWT/MFA/activation/recovery handlers and redirect rules, backend/API/core/native/tracking/contracts/billing/infra. No RC3 or Event Engine.
- Reuse files; no parallel auth implementation. Preserve G01–G09. No fake fields, permissions or product fixtures.
- Operational logo 170–205px; artwork 130–155px; margins20–24px; inputs/CTA48–52px; radii10–12px; every control>=44px. White access in both themes, readable errors/focus/reduced motion/landscape.
- Allowlist: src/styles/operation-auth.css; src/components/operation-auth-layout.tsx,operation-session-loading.tsx,auth-form.tsx,activation-form.tsx,password-recovery.tsx,password-reset.tsx,mfa-form.tsx; app/(auth)/restablecer-password/page.tsx,mfa/page.tsx; app/visual-qa/[surface]/page.tsx; scripts/visual-qa.mjs,functional-ui-qa.mjs; test/operation-auth-parity.test.ts (approved activation label); this plan. operation-entry inspected but no effect changes needed.

## Review Focus

1. Short landscape/long errors: all controls reachable through page scrolling, no horizontal overflow.
2. MFA setup URI and secret: wrap long real values; do not introduce logging or fake credentials.
3. Pending/error retains input, existing disabled guards and exactly one request; no handler edits.
4. Commercial login and reset success destination stay unchanged; surface query is presentation only.
5. Bootstrap retries only through current callback; immediate session resolution remains immediate.

### Task 1: Refine operational access composition

**Files:** Allowlist above, except scripts/visual-qa.mjs.

**Interfaces:** Preserve OperationAuthLayout({active,children,showRecovery}), AuthForm({mode,planCode,operation}), OperationSessionLoading({error,onRetry}), all form signatures. Consume existing forms, callbacks and actual state. Produce scoped readable layout; add operational wrappers to reset/MFA query presentation only.

- [ ] Add browser test 'Mobile V3 auth controls stay readable and reachable': login, activation/recovery links all>=44px, no overflow at360×800/844×390; logo within170–205px; preserve commercial/operation separation. Run QA_FILTER='Mobile V3 auth' node scripts/test-local-visual.mjs --functional; expect RED for undersized segment/recovery controls.
- [ ] Add browser test 'Mobile V3 auth reset and MFA preserve authority': operational reset and MFA use access wrapper; network failure retains values, existing payloads and destinations; pending input preserved and CTA disabled. Expect RED for missing wrapper.
- [ ] Apply only CSS and JSX refinements. Preserve handlers/effects verbatim; aria-busy reflects existing busy state. Style long text/errors, focus/reduced motion and landscape scrolling. Activation tab copy 'Activar cuenta'.
- [ ] Run filtered tests; expect PASS; typecheck and npm test PASS. Commit concrete allowlist.

### Task 2: Complete access evidence and gates

**Files:** app/visual-qa/[surface]/page.tsx; scripts/visual-qa.mjs,functional-ui-qa.mjs; plan and ignored evidence.

**Interfaces:** Guarded VISUAL_QA server route reuses real forms/layout/loading. No product fixture or authority change. Existing QA contracts and assertions remain intact.

- [ ] Extend visual surfaces with activation/recovery/reset/MFA/bootstrap states; add responsive reachability/Axe checks of real pages in both themes and motion modes including pending/error/focus and long text. Preserve existing matrix.
- [ ] Run npm ci, pinned existing QA tools, typecheck, unit, isolated integration wrapper, build, visual/functional/responsive, native audits. All PASS; save reports/logs and baseline. Mapbox N/A for Auth.
- [ ] Review protected path diff empty and manually compare all handler/effect ranges; obtain fresh whole-branch reviewer; fix Important/Critical via RED→GREEN, no second review.
- [ ] Commit/push PR, attach it; wait exact HEAD CI/UX Android33–36. Merge only with clean tree, green gates and mergeable PR. Update main and await its exact CI/UX. Save phase report then immediately begin phase3 per user authorization.

Self-review: approved access requirements mapped to tasks1–2; no new auth policies or dependencies. Review Focus is covered by browser tests. Later phases use this merged base and independent phase plans; execution never pauses for routine approval.
