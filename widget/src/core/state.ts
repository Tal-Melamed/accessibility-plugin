// Component C — State management & persistence.
// Single source of truth for user accessibility preferences. Persists to
// localStorage keyed per host so settings carry across page views / subdomains.

export type Contrast = "none" | "invert" | "high" | "low" | "mono";
export type Spacing = "normal" | "wide" | "wider";

export interface A11ySettings {
  contrast: Contrast;
  fontScale: number; // 1.0 .. 2.0
  spacing: Spacing;
  readableFont: boolean;
  highlightLinks: boolean;
  highlightHeaders: boolean;
  stopAnimations: boolean;
  curtain: boolean;
  bigCursor: boolean;
  readingGuide: boolean;
}

export const DEFAULTS: A11ySettings = {
  contrast: "none",
  fontScale: 1,
  spacing: "normal",
  readableFont: false,
  highlightLinks: false,
  highlightHeaders: false,
  stopAnimations: false,
  curtain: false,
  bigCursor: false,
  readingGuide: false,
};

export const FONT_MIN = 1;
export const FONT_MAX = 2;
export const FONT_STEP = 0.1;

type Listener = (s: Readonly<A11ySettings>) => void;

export class Store {
  private settings: A11ySettings;
  private listeners = new Set<Listener>();
  private readonly key: string;

  constructor(storagePrefix: string) {
    // Key per host so subdomains on the same registrable domain can share via
    // a cookie later; localStorage is per-origin which already covers the host.
    this.key = `${storagePrefix}:state:${location.hostname}`;
    this.settings = this.load();
  }

  private load(): A11ySettings {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw) as Partial<A11ySettings>;
      // Merge over defaults so a newer build adding a key never breaks an old
      // saved blob.
      return { ...DEFAULTS, ...parsed };
    } catch {
      return { ...DEFAULTS };
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.settings));
    } catch {
      /* storage full / disabled — settings still apply for this session */
    }
  }

  get(): Readonly<A11ySettings> {
    return this.settings;
  }

  set<K extends keyof A11ySettings>(key: K, value: A11ySettings[K]): void {
    if (this.settings[key] === value) return;
    this.settings = { ...this.settings, [key]: value };
    this.persist();
    this.emit();
  }

  /** Clamp + apply a font scale change in one call. */
  setFontScale(value: number): void {
    const clamped = Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(value * 10) / 10));
    this.set("fontScale", clamped);
  }

  reset(): void {
    this.settings = { ...DEFAULTS };
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* ignore */
    }
    this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.settings);
  }
}
