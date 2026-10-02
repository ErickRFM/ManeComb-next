# UI System Polish RC2 — Audit and Acceptance

## Scope

This pass consolidates branding, form focus, plan presentation and restrained motion across ManeComb without changing business logic, APIs, GPS, Socket.IO, Mapbox, billing contracts or permissions.

## Findings confirmed before implementation

1. Form fields received two focus treatments at once:
   - `.input:focus` added border + box shadow.
   - global accessibility styles added a second 3px outline to every input/select/textarea.
   This produced the oversized ring visible in auth and could propagate to every surface using `.input`.

2. Wrapped controls such as fleet/entity search and non-`.input` controls such as Chat composer, Radio selects and Admin compact selects needed their own focus treatment after removing the global duplicate outline.

3. The canonical ManeComb wordmark in the legacy repository uses the same vector geometry as the current component, but the original red is `#D80000`. The current component used a different red. RC2 restores the canonical source color and removes the obsolete CSS text-wordmark fallback.

4. Plan data is already centralized in `src/core/domain/commercial-plans.ts`. RC2 changes presentation only; prices and plan codes remain untouched.

## Implemented

### Focus/forms
- [x] Unified focus tokens.
- [x] Inputs use one visual focus system instead of outline + shadow duplication.
- [x] Hover, disabled, readonly, placeholder and WebKit autofill states normalized.
- [x] Entity search and fleet search use wrapper `:focus-within`.
- [x] Chat composer focus normalized.
- [x] Radio/Admin select focus normalized.
- [x] Password visibility button keeps explicit keyboard focus.
- [x] Contact form now has visible labels and semantic autocomplete/inputMode hints.
- [x] Auth form receives a stable shared class for future QA.

### Branding
- [x] Canonical legacy ManeComb red restored in the wordmark.
- [x] Original legacy vector geometry retained exactly.
- [x] Obsolete text wordmark fallback removed.
- [x] BrandLogo remains the shared source for navigation, auth, portal/operation shells and marketing footer.

### Plans
- [x] Business data remains centralized and unchanged.
- [x] Five plan cards now share one ManeComb surface language.
- [x] Accent colors communicate hierarchy without replacing the core brand.
- [x] Responsive 5/3/2/1 layout added.
- [x] CTA remains brand-colored and consistent.

### Motion
- [x] Auth branding and form card receive restrained entry motion.
- [x] Live preview status gets a subtle pulse.
- [x] Primary preview unit gets a subtle operational glow.
- [x] Existing reveal system remains intact.
- [x] All new motion is disabled under `prefers-reduced-motion`.

## Areas affected by the global fix

- Marketing and contact forms.
- Login, registration, recovery, reset, activation and MFA forms using shared input classes.
- Portal/Admin forms using shared input classes.
- Fleet and entity search wrappers.
- Chat composer.
- Radio channel selector.
- Admin compact selectors.
- Password visibility controls.

## Release acceptance

- [ ] CI PASS.
- [ ] UX QA PASS.
- [ ] Visual review: login desktop 1366/1920.
- [ ] Visual review: auth mobile 360/390/430.
- [ ] Dark theme PASS.
- [ ] Light theme PASS.
- [ ] Keyboard focus PASS.
- [ ] Autofill does not replace ManeComb field colors.
- [ ] Plan cards fit without horizontal overflow at 360–1920.
- [ ] No business plan price/code changes.
- [ ] Vercel preview reviewed before merge.

## Non-goals

- No changes to pricing.
- No changes to checkout rules.
- No auth/backend behavior changes.
- No GPS or native Android changes.
- No map or telemetry behavior changes.
