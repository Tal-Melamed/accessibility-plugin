// Component A — the control panel (accessible RTL modal).
// Built once, wired with event delegation (a couple of listeners on the root,
// not one per control), and kept in sync with the Store via subscribe().
import { HE } from "../core/i18n";
import { Store, type A11ySettings, type Contrast, type Spacing } from "../core/state";

const SPACING_CYCLE: Spacing[] = ["normal", "wide", "wider"];

// Boolean toggles grouped for rendering.
const BOOL_GROUPS: { title: string; items: { key: keyof A11ySettings; label: string }[] }[] = [
  {
    title: HE.groupTypography,
    items: [{ key: "readableFont", label: HE.readableFont }],
  },
  {
    title: HE.groupNavigation,
    items: [
      { key: "highlightLinks", label: HE.highlightLinks },
      { key: "highlightHeaders", label: HE.highlightHeaders },
    ],
  },
  {
    title: HE.groupContent,
    items: [
      { key: "stopAnimations", label: HE.stopAnimations },
      { key: "curtain", label: HE.curtain },
    ],
  },
  {
    title: HE.groupPointer,
    items: [
      { key: "bigCursor", label: HE.bigCursor },
      { key: "readingGuide", label: HE.readingGuide },
    ],
  },
];

const CONTRAST_OPTS: { val: Contrast; label: string }[] = [
  { val: "invert", label: HE.contrastInvert },
  { val: "high", label: HE.contrastHigh },
  { val: "low", label: HE.contrastLow },
  { val: "mono", label: HE.contrastMono },
];

export class Panel {
  readonly el: HTMLDivElement;
  private trigger: HTMLElement;
  private live: HTMLElement;
  private open = false;
  private lastFocus: HTMLElement | null = null;

  constructor(private store: Store, trigger: HTMLElement) {
    this.trigger = trigger;
    this.el = document.createElement("div");
    this.el.className = "a11y-panel";
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-modal", "true");
    this.el.setAttribute("aria-label", HE.panelTitle);
    this.el.setAttribute("data-open", "false");
    this.el.innerHTML = this.render();

    this.live = this.el.querySelector(".a11y-live")!;

    // Event delegation: one click + one keydown listener.
    this.el.addEventListener("click", this.onClick);
    this.el.addEventListener("keydown", this.onKeydown);

    this.store.subscribe((s) => this.sync(s));
    this.sync(this.store.get());
  }

  private render(): string {
    const contrastBtns = CONTRAST_OPTS.map(
      (o) =>
        `<button type="button" class="a11y-toggle" data-act="contrast" data-val="${o.val}" aria-pressed="false">${o.label}</button>`,
    ).join("");

    const boolGroups = BOOL_GROUPS.map(
      (g) => `
      <section class="a11y-group">
        <h3>${g.title}</h3>
        <div class="a11y-controls">
          ${g.items
            .map(
              (it) =>
                `<button type="button" class="a11y-toggle" data-act="toggle" data-key="${String(it.key)}" aria-pressed="false">${it.label}</button>`,
            )
            .join("")}
        </div>
      </section>`,
    ).join("");

    return `
      <div class="a11y-panel-header">
        <h2>${HE.panelTitle}</h2>
        <button type="button" class="a11y-close" data-act="close" aria-label="${HE.close}">×</button>
      </div>

      <section class="a11y-group">
        <h3>${HE.groupContrast}</h3>
        <div class="a11y-controls">${contrastBtns}</div>
      </section>

      <section class="a11y-group">
        <h3>${HE.groupTypography}</h3>
        <div class="a11y-font-row">
          <button type="button" data-act="font" data-dir="-1" aria-label="${HE.fontDecrease}">−</button>
          <output class="a11y-font-out">100%</output>
          <button type="button" data-act="font" data-dir="1" aria-label="${HE.fontIncrease}">+</button>
        </div>
        <div class="a11y-controls" style="margin-top:8px">
          <button type="button" class="a11y-toggle" data-act="spacing" aria-pressed="false">${HE.lineSpacing}</button>
        </div>
      </section>

      ${boolGroups}

      <button type="button" class="a11y-reset" data-act="reset">${HE.reset}</button>
      <div class="a11y-sr-only a11y-live" role="status" aria-live="polite"></div>
    `;
  }

  private onClick = (e: MouseEvent): void => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!t) return;
    const act = t.dataset.act!;
    const s = this.store.get();

    switch (act) {
      case "close":
        this.close();
        break;
      case "contrast": {
        const val = t.dataset.val as Contrast;
        this.store.set("contrast", s.contrast === val ? "none" : val);
        break;
      }
      case "toggle": {
        const key = t.dataset.key as keyof A11ySettings;
        this.store.set(key, !s[key] as never);
        this.announce(!s[key] ? HE.on : HE.off);
        break;
      }
      case "font": {
        const dir = Number(t.dataset.dir);
        this.store.setFontScale(s.fontScale + dir * 0.1);
        this.announce(HE.fontNow(Math.round(this.store.get().fontScale * 100)));
        break;
      }
      case "spacing": {
        const next = SPACING_CYCLE[(SPACING_CYCLE.indexOf(s.spacing) + 1) % SPACING_CYCLE.length];
        this.store.set("spacing", next);
        break;
      }
      case "reset":
        this.store.reset();
        this.announce(HE.resetDone);
        break;
    }
  };

  // Esc closes; Tab is trapped within the dialog (focus loop).
  private onKeydown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      this.close();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = this.focusable();
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  private focusable(): HTMLElement[] {
    return Array.from(
      this.el.querySelectorAll<HTMLElement>("button, [href], output, [tabindex]:not([tabindex='-1'])"),
    ).filter((el) => el.offsetParent !== null);
  }

  // Reflect current settings onto control pressed-states + font readout.
  private sync(s: Readonly<A11ySettings>): void {
    this.el.querySelectorAll<HTMLElement>("[data-act='contrast']").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.val === s.contrast));
    });
    this.el.querySelectorAll<HTMLElement>("[data-act='toggle']").forEach((b) => {
      b.setAttribute("aria-pressed", String(Boolean(s[b.dataset.key as keyof A11ySettings])));
    });
    const spacingBtn = this.el.querySelector<HTMLElement>("[data-act='spacing']");
    spacingBtn?.setAttribute("aria-pressed", String(s.spacing !== "normal"));
    const out = this.el.querySelector<HTMLOutputElement>(".a11y-font-out");
    if (out) out.textContent = `${Math.round(s.fontScale * 100)}%`;
  }

  private announce(msg: string): void {
    this.live.textContent = "";
    // Force a re-announce even if text repeats.
    window.requestAnimationFrame(() => (this.live.textContent = msg));
  }

  toggle(): void {
    this.open ? this.close() : this.show();
  }

  show(): void {
    this.open = true;
    this.lastFocus = document.activeElement as HTMLElement;
    this.el.setAttribute("data-open", "true");
    this.trigger.setAttribute("aria-expanded", "true");
    this.focusable()[0]?.focus();
  }

  close(): void {
    this.open = false;
    this.el.setAttribute("data-open", "false");
    this.trigger.setAttribute("aria-expanded", "false");
    this.lastFocus?.focus?.();
  }
}
