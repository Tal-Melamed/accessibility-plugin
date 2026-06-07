// Component A — the floating trigger button.
import { HE } from "../core/i18n";

// Universal accessibility "person" glyph.
const ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a2 2 0 110 4 2 2 0 010-4zm9 6h-6v13a1 1 0 11-2 0v-6h-2v6a1 1 0 11-2 0V8H3a1 1 0 110-2h18a1 1 0 110 2z"/></svg>`;

export function createTrigger(onOpen: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "a11y-trigger";
  btn.setAttribute("aria-haspopup", "true");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-label", HE.triggerLabel);
  btn.innerHTML = ICON;
  btn.addEventListener("click", onOpen);
  return btn;
}
