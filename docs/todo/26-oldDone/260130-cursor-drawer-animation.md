 # Baseline
 - Time: 2026-01-30
 - Scope: right-click drawer menu open/close animation
 - Status: implemented
 
 ## Original implementation summary (baseline)
 - Right drawer transition uses transform-only slide with 0.2s ease, no opacity or GPU hint. Reference: `src/cpns/ClipDrawerMenu.vue:L181-L228`.
 
 ## Cumulative changes relative to baseline
 - Add a stable transform baseline and `will-change` to reduce animation jank on the right drawer container. Reference: `src/cpns/ClipDrawerMenu.vue:L181-L186`.
 - Enhance the drawer transition with opacity and a smoother easing curve, plus explicit enter/leave targets. Reference: `src/cpns/ClipDrawerMenu.vue:L221-L233`.
 
 ## Impact and risks
 - Smoother, less abrupt drawer motion when opening and closing.
 - Slightly longer transition timing; perceived speed changes are minor.
 - GPU hint may increase memory usage on very low-end devices.
 
 ## Test checklist
 - Normal flow: open drawer via right-click, close by outside click, repeat quickly.
 - Edge / empty cases: open drawer with 0 or 1 items.
 - Permission / authorization: N/A (no auth).
 - Concurrency / duplicate submission: N/A (no async submission).
 - Regression impact: popup placement still uses the fade transition.
 
 ## Out of scope
 - No changes to data loading, item ordering, or shortcut handling.
 - No changes to popup placement animation.
