# Accessibility Widget (תוסף נגישות)

Platform-agnostic, self-contained accessibility widget for the Israeli market.
One async `<script>` adds a floating Hebrew/RTL control panel and runs a
background DOM-remediation engine. Targets **WCAG 2.1 AA** and the Israeli
**Equal Rights for Persons with Disabilities Regulations (Accessibility
Adjustments for Services), 2013**.

- **Zero runtime dependencies.** Vanilla TS → single IIFE bundle.
- **Client-side only.** Works on WordPress, Shopify, Wix, Webflow, Next.js, plain HTML.
- **No FOUC.** A tiny critical shim applies saved prefs before first paint.
- **Reversible.** Everything is driven by `data-a11y-*` attributes; reset removes them.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design and the engine's
leak/loop-safety rules.

## Develop

```bash
cd widget
npm install
npm run dev      # local playground
npm run build    # → dist/a11y.js (IIFE, check it stays < 40kb gzipped)
```

## Install on a host site

Paste [`snippet.html`](./snippet.html) before `</body>`, replacing `CDN_URL`
with your CDN. Optional overrides on the script tag:

```html
<script src="CDN_URL/a11y.js" data-a11y
        data-position="bottom-left"
        data-accent="#1a56db"
        data-site-key="YOUR_KEY"  <!-- Phase 2 only -->
        async defer></script>
```

## Feature status (this build = "Architecture + working core")

| Area | Status |
|---|---|
| Floating button + RTL Hebrew panel, focus trap, Esc, ARIA | ✅ |
| State + localStorage persistence, reset, no-FOUC shim | ✅ |
| Contrast: invert / high (dark+yellow) / low / mono | ✅ |
| Font scaling (100–200%), line spacing, readable font | ✅ |
| Highlight links / headers, stop animations, big cursor | ✅ |
| Reading guide + curtain mask | ✅ |
| Engine: skip link, alt fallback, role/keyboard on clickable divs, label binding | ✅ |
| Engine: MutationObserver (debounced, loop-guarded, leak-safe) | ✅ |
| Heading-order repair | ⏳ deliberately conservative (see ARCHITECTURE.md) |
| Remote config / licensing / dashboard (Supabase) | ⏳ Phase 2 |
