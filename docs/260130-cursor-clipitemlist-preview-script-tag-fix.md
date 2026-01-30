# Cursor ClipItemList preview script end-tag fix

Baseline
- Time: 2026-01-30
- Scope: External image preview HTML template string in ClipItemList
- Status: Baseline captured before fix

Original implementation summary (baseline)
- External preview builds a full HTML document in a template literal and writes it to a popup window (`src/cpns/ClipItemList.vue:374-419`).
- The HTML includes an inline script block used to resize the popup after image load (`src/cpns/ClipItemList.vue:395-413`).

Cumulative changes relative to baseline
- Escaped the inline closing script tag inside the HTML template literal so Vue SFC parsing does not terminate early (`src/cpns/ClipItemList.vue:395-415`).

Impact and risks
- Build: removes Vue compiler "Invalid end tag" error when compiling the SFC.
- Runtime: popup HTML output remains the same because `<\/script>` renders as `</script>` in the new window.
- Risk: if any tooling treats the escaped sequence differently, confirm the popup script still executes.

Test checklist
- Normal flow: open an image preview; popup renders and auto-resizes.
- Edge / empty cases: open preview without footer text; popup still renders and resizes.
- Permission / authorization: N/A.
- Concurrency / duplicate submission: open preview repeatedly; window reuse still works.
- Regression impact: build/compile succeeds with no Vue SFC parse errors.

Out of scope
- No layout, styling, or resize logic changes.
- No changes to uTools window APIs or focus behavior.
