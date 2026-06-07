// Maps settings → presentation. Static visual features are driven entirely by
// data-a11y-* attributes on <html> + the injected stylesheet (cheap, fully
// reversible via reset). The few features that need live JS — the reading guide
// line and the curtain mask — are managed here with tracked listeners so they
// can be torn down without leaks.

import type { A11ySettings } from "../core/state";

const ROOT = document.documentElement;

let guideEl: HTMLElement | null = null;
let curtainEls: { top: HTMLElement; bottom: HTMLElement } | null = null;
let pointerHandler: ((e: PointerEvent) => void) | null = null;

export function applyVisual(s: Readonly<A11ySettings>): void {
  // --- Attribute-driven (CSS reacts). data-a11y-* prefix avoids host clashes.
  setAttr("contrast", s.contrast === "none" ? null : s.contrast);
  setAttr("spacing", s.spacing === "normal" ? null : s.spacing);
  toggleAttr("readable-font", s.readableFont);
  toggleAttr("highlight-links", s.highlightLinks);
  toggleAttr("highlight-headers", s.highlightHeaders);
  toggleAttr("stop-animations", s.stopAnimations);
  toggleAttr("big-cursor", s.bigCursor);

  // Font scale via a CSS custom property the stylesheet multiplies into the
  // root font-size. The attribute guards the override so we only touch the
  // host's html font-size when scaling is actually active.
  if (s.fontScale !== 1) {
    ROOT.style.setProperty("--a11y-font-scale", String(s.fontScale));
    setAttr("fontscale", "");
  } else {
    ROOT.style.removeProperty("--a11y-font-scale");
    setAttr("fontscale", null);
  }

  // --- JS-driven dynamic features.
  setReadingGuide(s.readingGuide);
  setCurtain(s.curtain);
}

function setAttr(name: string, value: string | null): void {
  if (value === null) ROOT.removeAttribute(`data-a11y-${name}`);
  else ROOT.setAttribute(`data-a11y-${name}`, value);
}

function toggleAttr(name: string, on: boolean): void {
  setAttr(name, on ? "" : null);
}

// Horizontal guide line + a curtain that follow the pointer. Both share one
// pointermove listener, (re)bound only when at least one is active.
function syncPointerListener(): void {
  const need = Boolean(guideEl || curtainEls);
  if (need && !pointerHandler) {
    pointerHandler = (e: PointerEvent) => {
      if (guideEl) guideEl.style.top = `${e.clientY}px`;
      if (curtainEls) {
        const h = 120; // viewport reading band height
        curtainEls.top.style.height = `${Math.max(0, e.clientY - h / 2)}px`;
        curtainEls.bottom.style.top = `${e.clientY + h / 2}px`;
      }
    };
    window.addEventListener("pointermove", pointerHandler, { passive: true });
  } else if (!need && pointerHandler) {
    window.removeEventListener("pointermove", pointerHandler);
    pointerHandler = null;
  }
}

function setReadingGuide(on: boolean): void {
  if (on && !guideEl) {
    guideEl = document.createElement("div");
    guideEl.className = "a11y-reading-guide";
    guideEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(guideEl);
  } else if (!on && guideEl) {
    guideEl.remove();
    guideEl = null;
  }
  syncPointerListener();
}

function setCurtain(on: boolean): void {
  if (on && !curtainEls) {
    const mk = (cls: string) => {
      const el = document.createElement("div");
      el.className = `a11y-curtain ${cls}`;
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
      return el;
    };
    curtainEls = { top: mk("a11y-curtain-top"), bottom: mk("a11y-curtain-bottom") };
  } else if (!on && curtainEls) {
    curtainEls.top.remove();
    curtainEls.bottom.remove();
    curtainEls = null;
  }
  syncPointerListener();
}
