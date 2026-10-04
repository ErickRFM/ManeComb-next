# Mobile V3 Communications Presentation Implementation Plan

> Native continuous execution authorized. Activate only after Phase5 exact main green. No Communications Core RC2.

**Goal:** Refine the existing directory/chat, PTT and audio-call presentation without altering communications authority.

**Architecture:** Shared ChatConsole/RadioConsole/RtcConsole may receive optional operation presentation boolean, defaultfalse. Driver pages opt in; portal retains its existing presentation. Existing operational hooks, stores, refs, effects, handlers, ACK/retry/media/signal lifecycle exact. The sole potentially necessary visual-effect exception is Chat's existing scrollTo: after observed RED, operation reduced-motion may use auto instead of smooth, retaining its existing ref and messages trigger plus the presentation mode dependency only. Pure formatting may describe actual message timestamps and actual configuration; no fetch or resources added.

**Spec:** Approved Mobile V3 design and latest user Phase6.

## Global Constraints

- New codex/mobile-v3-communications from fresh green main, zero open PRs; actual base/CI/UX ledgered at setup.
- Freeze backend/API/lib/hooks/core/contracts/realtime/worker/native/Android/auth/activation/billing/infra/deps/workflows.
- G02 directory is not inbox: no unread, last-message preview, fake avatar photo, unit enrichment or permissions. Initials derived from actual supplied names remain identity decoration.
- G06 company presence is not channel roster. No fake channel membership count or measured audio waveform.
- RTC config TURN enabled is configuration, not validated connectivity. No ringing protocol, video, Kotlin migration or new lifecycle.
- Allowlist: final plan; src/components/chat-console.tsx,radio-console.tsx,rtc-console.tsx presentation signature/JSX only, with Chat's explicit visual-scroll exception above if RED proves necessary; app/(driver)/operacion/chat/page.tsx,radio/page.tsx presentation opt-in only; src/components/mobile-ui/communication-presentation.ts; src/styles/mobile-v3.css; scripts/functional-ui-qa.mjs; test/mobile-communication-presentation.test.ts.

## Review Focus

1. All clientMessageId, per-channel draft, pending/failed retry/ACK/attachment/channel cleanup remain exact; no directory item acquires inbox semantics or invented timestamp.
2. PTT final fragment delivery/release, pointer capture/keyboard, blur/visibility/floor-lost/cleanup and reconnect must remain exact; no overlay intercepting release.
3. Company-presence list and current transmitter are distinct; unknown name cannot become fabricated person or membership.
4. RTC configured TURN true/false/loading/error cannot imply network validation or readiness; selection/calling/connected/hangup retains current authority and media cleanup.
5. Portrait/landscape360, long names/messages, composer reachability, normal/reduced motion, light/dark and portal baseline remain accessible.

### Task 1: Operation-only communication hierarchy

**Files:** Optional presentation props, driver opt-in pages, pure formatter/CSS/browser/unit QA.

**Interfaces:** operation?:boolean defaultsfalse for each console, never part of operational effect dependencies; only the visual scroll effect may depend on it. messageTime(value:string|undefined|null):string returns actual locale hour/minute for valid supplied timestamp; missing/invalid→Hora no disponible. JSX consumes existing actual state/speaker/online/turn/users/messages only; callback bodies unchanged.

- [ ] Write focused timestamp unit tests missing/invalid/valid input. Expected RED missing formatter.
- [ ] Write actual driver browser presentation checks directory semantics/no fake inbox, missing timestamp honesty, pending/failure/retry/attachment draft identity, real company-presence vs channel copy, actual PTT statuses and no fake waveform, RTC actual TURN true/false/loading/error. Spy actual existing scrollTo calls after real received messages; operation reduced-motion must not pass behavior smooth. Existing functional media tests remain all active. Expected RED legacy directory conversations/missing timestamp ahora/no configured TURN display and any operation smooth-scroll violation.
- [ ] Implement operation-only JSX/copy/classes and scoped CSS: directory/central-channel distinction, actual bubbles/time/delivery/composer; current channel/PTT/status/transmitter/company presence, omit decorative amplitude bars; actual RTC selection/config/state/errors/audio/actions. All operational handlers/effects/refs/native/API calls unchanged, shared portal default unchanged. If actual scroll RED exists, apply only the visual exception, ledger why/cost and normalize only that known difference in the AST audit; no connection/history/delivery/media lifecycle dependency changes.
- [ ] Focused unit/browser/typecheck/AST authority audit. Expected GREEN. Commit allowlist.

### Task 2: Evidence and gated closure

**Files:** Same QA/plan allowlist; ignored reports/AST audit/screens.

**Interfaces:** Task1 operation presentation consumes existing authorities; Task2 full suites compare exact phase base, including all preexisting protocol/tenant regressions.

- [ ] Full mandatory local gates and actual Mapbox regression. Expected PASS, no threshold/protocol changes.
- [ ] One fresh whole-branch review; single Important/Critical RED→GREEN/full-suite fix pass; ledger minors. Exact PR CI/UX/Android33–36/checks→merge→exact main CI/UX green,35-field report. Immediately Phase7.

Pre-flight: Task1 presentation props consumed only by driver pages; no operational contract. Task2 verifies existing actual media authority independently from synthetic presentation QA. Physical audio/network validation remains external, never fabricated.
