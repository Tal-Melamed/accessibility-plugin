// Bootstrap — wires Components A (UI), B (engine), C (state) together.
// Self-invoking IIFE entry (see vite.config.ts). Guards double-init and waits
// for <body> before mounting.
import { resolveConfig, loadRemoteConfig } from "./core/config";
import { Store } from "./core/state";
import { Engine } from "./engine/remediation";
import { applyVisual } from "./features/visual";
import { buildStyles } from "./ui/styles";
import { createTrigger } from "./ui/button";
import { Panel } from "./ui/panel";

const FLAG = "__a11yWidgetLoaded";

function boot(): void {
  const w = window as unknown as Record<string, unknown>;
  if (w[FLAG]) return; // already initialized
  w[FLAG] = true;

  const cfg = resolveConfig();

  // --- Component C: state. Rehydrates from localStorage immediately.
  const store = new Store(cfg.storagePrefix);

  // --- Inject the single stylesheet.
  const styleEl = document.createElement("style");
  styleEl.id = "a11y-widget-styles";
  styleEl.textContent = buildStyles(cfg.accent);
  document.head.appendChild(styleEl);

  // --- Apply persisted visual prefs now (the critical shim already prevented
  //     FOUC; this re-applies via the live feature pipeline).
  applyVisual(store.get());
  store.subscribe(applyVisual);

  // --- Component A: UI.
  const root = document.createElement("div");
  root.id = "a11y-widget-root";
  root.className = `a11y-pos-${cfg.position}`;

  const trigger = createTrigger(() => panel.toggle());
  const panel = new Panel(store, trigger);
  root.append(trigger, panel.el);
  document.body.appendChild(root);

  // --- Component B: engine. Starts at once; independent of the UI.
  const engine = new Engine();
  engine.start();

  // --- Phase 2 seam: merge remote config when/if it resolves (non-blocking).
  void loadRemoteConfig(cfg).then((remote) => {
    if (remote.accent) styleEl.textContent = buildStyles(remote.accent);
  });

  // Expose a tiny API for the host / dashboard.
  w["A11yWidget"] = {
    open: () => panel.show(),
    close: () => panel.close(),
    reset: () => store.reset(),
    destroy: () => engine.destroy(),
  };
}

if (document.body) boot();
else document.addEventListener("DOMContentLoaded", boot, { once: true });
