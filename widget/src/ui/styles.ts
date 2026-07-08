// The single injected stylesheet. Two halves:
//   1. Widget chrome — faithful vanilla port of the bugbox dark panel + trigger.
//   2. Feature CSS   — identical to the bugbox index.css a11y-* rules, driven by
//                      classes on <html>.

export function buildStyles(): string {
  return /* css */ `
#a11y-widget-root, #a11y-widget-root * { box-sizing: border-box; }
#a11y-widget-root {
  font-family: system-ui, "Segoe UI", Arial, "Alef", "Heebo", sans-serif;
  direction: rtl;
}

/* ---- Trigger button — black circle, ISA wheelchair icon, bottom-left ---- */
.a11y-trigger {
  position: fixed; left: 32px; bottom: 24px; z-index: 2147483646;
  width: 36px; height: 36px; border-radius: 9999px;
  background: #000; color: #fff; border: 0; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,.3);
  transition: transform .2s ease, background .2s ease;
}
.a11y-trigger:hover { background: #1f2937; transform: scale(1.1); }
.a11y-trigger:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.a11y-trigger svg { width: 18px; height: 18px; fill: currentColor; }
@media (max-width: 768px) { .a11y-trigger { left: 16px; bottom: 16px; } }

/* ---- Panel ---- */
.a11y-panel {
  position: fixed; left: 16px; bottom: 80px; z-index: 2147483647;
  width: 288px; max-width: calc(100vw - 32px);
  background: #111; border: 1px solid #333; border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,.6); overflow: hidden;
  color: #fff; opacity: 0; visibility: hidden; transform: translateY(8px);
  transition: opacity .15s ease, transform .15s ease, visibility .15s;
}
.a11y-panel[data-open="true"] { opacity: 1; visibility: visible; transform: translateY(0); }
@media (max-width: 768px) { .a11y-panel { left: 16px; bottom: 64px; } }

.a11y-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: #000; border-bottom: 1px solid #333;
}
.a11y-header-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; }
.a11y-header-title svg { width: 20px; height: 20px; fill: #fff; }
.a11y-close { background: transparent; border: 0; color: #9ca3af; cursor: pointer; padding: 4px; border-radius: 9999px; line-height: 0; }
.a11y-close:hover { color: #fff; }
.a11y-close:focus-visible { outline: 2px solid #fff; }
.a11y-close svg { width: 16px; height: 16px; }

.a11y-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.a11y-section-label { font-size: 12px; font-weight: 600; color: #9ca3af; margin: 0 0 8px; }

/* Font-size buttons */
.a11y-font-row { display: flex; gap: 8px; }
.a11y-font-btn {
  flex: 1; height: 44px; border-radius: 12px; font-weight: 700; cursor: pointer;
  border: 2px solid #4b5563; background: transparent; color: #d1d5db; transition: all .15s ease;
}
.a11y-font-btn:hover { border-color: #9ca3af; }
.a11y-font-btn[aria-pressed="true"] { border-color: #fff; background: #fff; color: #000; }
.a11y-font-btn:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }

/* Toggle rows */
.a11y-toggle {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-radius: 12px; border: 1px solid #374151;
  background: transparent; color: #9ca3af; cursor: pointer; transition: all .15s ease;
}
.a11y-toggle:hover { border-color: #6b7280; color: #e5e7eb; }
.a11y-toggle[aria-pressed="true"] { border-color: #fff; background: rgba(255,255,255,.1); color: #fff; }
.a11y-toggle:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.a11y-toggle-label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; }
.a11y-switch { position: relative; width: 36px; height: 20px; border-radius: 9999px; background: #4b5563; transition: background .15s ease; flex: 0 0 auto; }
.a11y-toggle[aria-pressed="true"] .a11y-switch { background: #fff; }
.a11y-switch::after {
  content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  border-radius: 9999px; background: #d1d5db; box-shadow: 0 1px 2px rgba(0,0,0,.4); transition: left .15s ease, background .15s ease;
}
.a11y-toggle[aria-pressed="true"] .a11y-switch::after { left: 18px; background: #000; }

/* Reset */
.a11y-reset {
  width: 100%; height: 36px; display: flex; align-items: center; justify-content: center; gap: 8px;
  border-radius: 12px; border: 1px solid #374151; background: transparent;
  color: #9ca3af; font-size: 12px; font-weight: 500; cursor: pointer; transition: all .15s ease;
}
.a11y-reset:hover { border-color: #6b7280; color: #e5e7eb; }
.a11y-reset:focus-visible { outline: 2px solid #fff; }
.a11y-reset svg { width: 14px; height: 14px; }

.a11y-sr-only { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

/* =========================================================================
   FEATURE CSS — identical to the bugbox index.css a11y-* effects.
   ========================================================================= */
:root { --a11y-font-scale: 100%; }
html { font-size: var(--a11y-font-scale) !important; }

html.a11y-high-contrast * {
  background: #000 !important;
  color: #fff !important;
  border-color: #fff !important;
  box-shadow: none !important;
}
html.a11y-high-contrast img,
html.a11y-high-contrast video { filter: brightness(.85) contrast(1.2) !important; }
html.a11y-high-contrast a,
html.a11y-high-contrast button { color: #ffff00 !important; }

html.a11y-grayscale * { filter: grayscale(100%) !important; }

html.a11y-highlight-links a {
  outline: 3px solid #2563eb !important;
  background: #dbeafe !important;
  color: #1e3a8a !important;
  border-radius: 3px; padding: 0 2px;
}

html.a11y-big-cursor,
html.a11y-big-cursor * {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M6 2l26 15-11 2.5-6 11z' fill='black' stroke='white' stroke-width='2'/%3E%3C/svg%3E") 0 0, auto !important;
}

/* Prevent iOS Safari zoom on input focus */
@media (max-width: 768px) { input, select, textarea { font-size: 16px !important; } }
`;
}
