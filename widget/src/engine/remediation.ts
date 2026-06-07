// Component B — Automated remediation engine.
// Repairs the host DOM for everyone (independent of user prefs): skip link,
// alt-text fallbacks, role/keyboard on clickable <div>s, orphan <label> binding.
// Watches for SPA/AJAX changes via ONE debounced MutationObserver, with a
// disconnect/reconnect guard so our own writes can't trigger an infinite loop.
import { HE } from "../core/i18n";

const FIXED = "data-a11y-fixed"; // idempotency marker — touched nodes are skipped
const PASS_CAP = 400; // max nodes processed per idle pass (overflow → next tick)

type IdleHandle = number;

export class Engine {
  private observer: MutationObserver | null = null;
  private idle: IdleHandle | null = null;
  private pending = new Set<Node>();
  private uid = 0;

  start(): void {
    this.injectSkipLink();
    // Initial full pass over the existing document.
    this.repair([document.body]);

    this.observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "childList") r.addedNodes.forEach((n) => this.pending.add(n));
      }
      this.schedule();
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.idle !== null) cancelIdle(this.idle);
    this.idle = null;
    this.pending.clear();
  }

  // Coalesce bursts of mutations into a single idle pass.
  private schedule(): void {
    if (this.idle !== null) return;
    this.idle = requestIdle(() => {
      this.idle = null;
      const batch = Array.from(this.pending);
      this.pending.clear();
      this.repair(batch);
    });
  }

  // Loop guard: disconnect while we mutate, drain self-generated records, then
  // reconnect. Every fixed node is marked so re-entry is idempotent.
  private repair(roots: Node[]): void {
    this.observer?.disconnect();
    let budget = PASS_CAP;
    try {
      for (const root of roots) {
        if (!(root instanceof Element)) continue;
        // Process the node itself + its element descendants.
        const nodes: Element[] = [root, ...root.querySelectorAll<Element>("*")];
        for (const el of nodes) {
          if (budget-- <= 0) {
            this.pending.add(el); // defer overflow to the next idle tick
            this.schedule();
            break;
          }
          this.fixOne(el);
        }
      }
    } finally {
      // Drain records our own writes produced, then resume observing.
      this.observer?.takeRecords();
      this.observer?.observe(document.body, { childList: true, subtree: true });
    }
  }

  private fixOne(el: Element): void {
    if (el.hasAttribute(FIXED)) return;
    const tag = el.tagName;

    // 1. Images missing alt → empty alt (decorative) unless clearly meaningful.
    if (tag === "IMG" && !el.hasAttribute("alt")) {
      el.setAttribute("alt", "");
      el.setAttribute("role", "presentation");
    }

    // 2. Clickable <div>/<span> with a handler-ish signal → expose as button.
    if ((tag === "DIV" || tag === "SPAN") && this.looksClickable(el)) {
      if (!el.hasAttribute("role")) el.setAttribute("role", "button");
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
      this.bindKeyActivation(el as HTMLElement);
    }

    // 3. Orphan <label> → bind to its input via a generated id.
    if (tag === "LABEL") this.bindLabel(el as HTMLLabelElement);

    el.setAttribute(FIXED, "");
  }

  private looksClickable(el: Element): boolean {
    return (
      el.hasAttribute("onclick") ||
      el.getAttribute("role") === "button" ||
      (el as HTMLElement).style.cursor === "pointer"
    );
  }

  // Enter/Space should activate ARIA buttons. One listener per fixed node;
  // nodes are GC'd with their listener when removed from the DOM.
  private bindKeyActivation(el: HTMLElement): void {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    });
  }

  private bindLabel(label: HTMLLabelElement): void {
    if (label.htmlFor || label.querySelector("input,select,textarea")) return;
    // Heuristic: bind to the next form control sibling if it lacks a label.
    const ctrl = label.parentElement?.querySelector<HTMLElement>("input,select,textarea");
    if (!ctrl) return;
    if (!ctrl.id) ctrl.id = `a11y-f-${++this.uid}`;
    if (!ctrl.getAttribute("aria-labelledby") && !ctrl.getAttribute("aria-label")) {
      label.htmlFor = ctrl.id;
    }
  }

  // Hidden "Skip to content" link, revealed on first Tab. Added once.
  private injectSkipLink(): void {
    if (document.querySelector(".a11y-skip-link")) return;
    const main =
      document.querySelector("main, [role='main'], #main, #content") ||
      document.querySelector("h1");
    if (main && !main.id) main.id = "a11y-main";
    const link = document.createElement("a");
    link.className = "a11y-skip-link";
    link.href = `#${main?.id ?? "a11y-main"}`;
    link.textContent = HE.skipToContent;
    link.setAttribute(FIXED, "");
    document.body.insertBefore(link, document.body.firstChild);
  }
}

// requestIdleCallback with a setTimeout fallback (Safari < 16, older browsers).
function requestIdle(cb: () => void): IdleHandle {
  const ric = (window as unknown as { requestIdleCallback?: (c: () => void, o?: object) => number })
    .requestIdleCallback;
  return ric ? ric(cb, { timeout: 500 }) : (window.setTimeout(cb, 100) as unknown as number);
}

function cancelIdle(h: IdleHandle): void {
  const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
  if (cic) cic(h);
  else clearTimeout(h);
}
