// The single stylesheet injected by the widget. Two halves:
//   1. Widget chrome  — the floating button + RTL panel (namespaced .a11y-*).
//   2. Feature CSS    — reacts to data-a11y-* on <html>, scoped to NOT touch
//                       the widget's own UI (#a11y-widget-root) so contrast/
//                       invert/font changes never mangle the control panel.
import { DEFAULT_CONFIG } from "../core/config";

export function buildStyles(accent: string): string {
  return /* css */ `
#a11y-widget-root, #a11y-widget-root * { box-sizing: border-box; }
#a11y-widget-root {
  --a11y-accent: ${accent || DEFAULT_CONFIG.accent};
  font-family: Arial, "Alef", "Heebo", sans-serif;
  direction: rtl;
}

/* ---- Trigger button ---- */
.a11y-trigger {
  position: fixed; bottom: 20px; z-index: 2147483646;
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--a11y-accent); color: #fff; border: 0; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(0,0,0,.25);
}
.a11y-trigger:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.a11y-pos-bottom-right .a11y-trigger { right: 20px; }
.a11y-pos-bottom-left  .a11y-trigger { left: 20px; }
.a11y-trigger svg { width: 30px; height: 30px; fill: currentColor; }

/* ---- Panel (modal) ---- */
.a11y-panel {
  position: fixed; top: 0; bottom: 0; z-index: 2147483647;
  width: 360px; max-width: 92vw; background: #fff; color: #1a1a1a;
  box-shadow: 0 0 40px rgba(0,0,0,.3); overflow-y: auto;
  transform: translateX(100%); transition: transform .2s ease;
  font-size: 16px; line-height: 1.5;
}
.a11y-pos-bottom-right .a11y-panel { right: 0; }
.a11y-pos-bottom-left  .a11y-panel { left: 0; transform: translateX(-100%); }
.a11y-panel[data-open="true"] { transform: translateX(0); }
.a11y-panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px; background: var(--a11y-accent); color: #fff;
  position: sticky; top: 0;
}
.a11y-panel-header h2 { margin: 0; font-size: 18px; }
.a11y-close { background: transparent; border: 0; color: #fff; cursor: pointer; font-size: 22px; line-height: 1; padding: 6px; }
.a11y-close:focus-visible { outline: 2px solid #fff; }

.a11y-group { padding: 12px 16px; border-bottom: 1px solid #eee; }
.a11y-group h3 { margin: 0 0 10px; font-size: 14px; color: #555; }
.a11y-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

.a11y-toggle {
  display: flex; align-items: center; gap: 8px; justify-content: flex-start;
  padding: 10px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa;
  cursor: pointer; font: inherit; color: inherit; text-align: right; width: 100%;
}
.a11y-toggle:hover { background: #f0f0f0; }
.a11y-toggle:focus-visible { outline: 3px solid var(--a11y-accent); outline-offset: 2px; }
.a11y-toggle[aria-pressed="true"] { border-color: var(--a11y-accent); background: #eef3ff; font-weight: 600; }
.a11y-toggle[aria-pressed="true"]::before { content: "✓"; color: var(--a11y-accent); }

.a11y-font-row { display: flex; align-items: center; gap: 8px; }
.a11y-font-row button { flex: 0 0 44px; height: 44px; font-size: 20px; border-radius: 8px; border: 1px solid #ddd; background: #fafafa; cursor: pointer; }
.a11y-font-row output { flex: 1; text-align: center; font-weight: 600; }

.a11y-reset {
  margin: 16px; width: calc(100% - 32px); padding: 12px;
  background: #b91c1c; color: #fff; border: 0; border-radius: 8px;
  cursor: pointer; font: inherit; font-weight: 600;
}
.a11y-reset:focus-visible { outline: 3px solid #000; outline-offset: 2px; }

.a11y-sr-only {
  position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* Skip-to-content link injected by the engine */
.a11y-skip-link {
  position: fixed; top: -100px; right: 0; z-index: 2147483647;
  background: var(--a11y-accent, ${DEFAULT_CONFIG.accent}); color: #fff;
  padding: 12px 18px; border-radius: 0 0 0 8px; text-decoration: none;
  transition: top .15s ease;
}
.a11y-skip-link:focus { top: 0; }

/* =========================================================================
   FEATURE CSS — reacts to data-a11y-* on <html>. Never targets the widget UI.
   ========================================================================= */

/* Invert & monochrome via root filter; cancel on the widget so it stays normal */
html[data-a11y-contrast="invert"] { filter: invert(1) hue-rotate(180deg); }
html[data-a11y-contrast="mono"]   { filter: grayscale(1); }
html[data-a11y-contrast="low"]    { filter: contrast(.75); }
html[data-a11y-contrast="invert"] #a11y-widget-root { filter: invert(1) hue-rotate(180deg); }
html[data-a11y-contrast="mono"]   #a11y-widget-root { filter: grayscale(0); }
/* Images shouldn't be inverted twice — keep media true-color under invert */
html[data-a11y-contrast="invert"] img,
html[data-a11y-contrast="invert"] video,
html[data-a11y-contrast="invert"] picture { filter: invert(1) hue-rotate(180deg); }

/* High contrast: dark background, yellow text (per spec) */
html[data-a11y-contrast="high"] body :not(#a11y-widget-root):not(#a11y-widget-root *) {
  background-color: #000 !important;
  color: #ff0 !important;
  border-color: #ff0 !important;
}
html[data-a11y-contrast="high"] body a:not(#a11y-widget-root *) { color: #4dd2ff !important; }

/* Font scaling — root percentage so rem/em-based sites scale cleanly */
html[data-a11y-fontscale] { font-size: calc(100% * var(--a11y-font-scale, 1)) !important; }

/* Line spacing */
html[data-a11y-spacing="wide"]  body :not(#a11y-widget-root *) { line-height: 1.8 !important; }
html[data-a11y-spacing="wider"] body :not(#a11y-widget-root *) { line-height: 2.2 !important; letter-spacing: .05em !important; }

/* Readable sans-serif font */
html[data-a11y-readable-font] body :not(#a11y-widget-root):not(#a11y-widget-root *) {
  font-family: Arial, "Alef", "Heebo", sans-serif !important;
}

/* Highlight links / headers */
html[data-a11y-highlight-links] a:not(#a11y-widget-root *) {
  text-decoration: underline !important; outline: 2px solid #ffbf00 !important; outline-offset: 1px;
}
html[data-a11y-highlight-headers] :is(h1,h2,h3,h4,h5,h6):not(#a11y-widget-root *) {
  outline: 2px dashed #1a56db !important; outline-offset: 2px;
}

/* Stop animations / transitions / motion */
html[data-a11y-stop-animations] *:not(#a11y-widget-root *) {
  animation: none !important; transition: none !important; scroll-behavior: auto !important;
}

/* Big cursor */
html[data-a11y-big-cursor], html[data-a11y-big-cursor] * {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' stroke='%23fff' stroke-width='1.5' d='M5 2l14 11-6 1 4 7-3 1-4-7-5 4z'/%3E%3C/svg%3E') 5 2, auto !important;
}

/* Reading guide (follows pointer; positioned by visual.ts) */
.a11y-reading-guide {
  position: fixed; left: 0; right: 0; height: 3px; pointer-events: none;
  background: rgba(255,0,0,.6); z-index: 2147483645;
}

/* Curtain mask (two bands; sized by visual.ts) */
.a11y-curtain { position: fixed; left: 0; right: 0; pointer-events: none; background: rgba(0,0,0,.75); z-index: 2147483644; }
.a11y-curtain-top { top: 0; height: 0; }
.a11y-curtain-bottom { top: 0; bottom: 0; }
`;
}
