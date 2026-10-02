# ManeComb Marketing Premium V3

Baseline branch: `main@6744e35cede876b5988a09344cca10acbb648302`  
Implementation branch: `feat/marketing-premium-v3`

## Intent

Elevate ManeComb Ventas from a conventional SaaS landing to a product-led, premium commercial experience without changing commercial prices, checkout contracts, authentication, Portal, Admin Global, GPS, Radio, RTC or billing authority.

## Git concurrency

At implementation start:

- PR #21 `feat/admin-global-rc2` was open and draft.
- `feat/evidence-lifecycle-v2` contained document/incident work and was divergent from main.
- Neither workstream touched `app/(marketing)`, marketing components, marketing styles, navigation or pricing presentation.

For that reason Marketing V3 may be developed in parallel, but **must remain isolated and must rebase/compare against the final main before merge**.

## Product hierarchy

The landing follows this narrative:

1. Brand / promise.
2. Product in action.
3. Operational principles.
4. Capability bento.
5. Three-step process.
6. Canonical commercial plans.
7. FAQ.
8. Final conversion CTA.

The map is the dominant product surface. Chat and Radio are communication capabilities, not equal visual peers to fleet monitoring.

## Visual scale

- marketing container: 1360px
- desktop display: up to 92px
- desktop H2: up to 58px
- target desktop hero: 800–860px minimum
- responsive QA: 360 / 390 / 430 / 768 / 1024 / 1366 / 1920
- touch targets: at least 44px for critical actions

Marketing uses a dedicated ManeComb red token instead of re-coloring operational status tokens.

## Motion

- micro: 160ms
- UI: 240ms
- enter: 520ms
- hero: 720ms
- no mandatory video
- no Three.js
- no decorative canvas runtime
- reduced-motion disables non-essential movement

Product-stage motion is deliberately restrained: one-time route draw, slow live pulse and minimal floating/marker movement on desktop only.

## Functional invariants

This work must not change:

- `COMMERCIAL_PLANS` values or codes;
- checkout routes;
- registration plan propagation;
- authentication contracts;
- installed operational login;
- API routes;
- billing providers.

Conversion links remain:

- Comenzar -> `/registro`
- Plan -> `/checkout/<plan.code>`
- Entrar -> `/login`
- Planes -> `/planes`
- Contacto -> `/contacto`

## QA

Automated visual QA includes a dedicated `/visual-qa/marketing` surface across all standard responsive widths, dark/light schemes, horizontal-overflow checks, axe serious/critical violations and screenshots.

Unit contract coverage asserts:

- premium landing stays componentized;
- old product-preview mock is not the home-page authority;
- plan prices remain domain-driven;
- responsive and reduced-motion contracts remain present;
- conversion destinations remain stable.

## Merge gate

Before merge:

1. compare/rebase against latest `main`;
2. confirm PR #21/evidence work did not start touching Marketing files;
3. typecheck PASS;
4. unit tests PASS;
5. integration tests PASS;
6. Next build PASS;
7. UX visual QA PASS;
8. Vercel preview READY when account build quota/access permits;
9. inspect screenshots at 390 and 1440 first, then all QA widths.

Do not merge based only on appearance.
