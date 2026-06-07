// Widget configuration: build-time defaults, host-page overrides, and a seam
// for a future remote config (Phase 2 / Supabase). The engine and features
// never block on the remote call — it merges over defaults when/if it resolves.

export interface WidgetConfig {
  /** Customer site key — used by the remote control plane (Phase 2). */
  siteKey?: string;
  /** Corner for the floating button. */
  position: "bottom-right" | "bottom-left";
  /** Accent color of the trigger button. */
  accent: string;
  /** Base URL of the remote config endpoint (Phase 2). Empty = disabled. */
  remoteBase: string;
  /** localStorage namespace; persisted state is keyed per host. */
  storagePrefix: string;
}

export const DEFAULT_CONFIG: WidgetConfig = {
  position: "bottom-right",
  accent: "#1a56db",
  remoteBase: "",
  storagePrefix: "a11y",
};

// Reads optional overrides the host page may set on the script tag's dataset,
// e.g. <script src=".../a11y.js" data-position="bottom-left" data-accent="#000">.
export function readHostConfig(): Partial<WidgetConfig> {
  const el =
    document.currentScript ??
    document.querySelector<HTMLScriptElement>("script[data-a11y]");
  if (!el) return {};
  const d = (el as HTMLElement).dataset;
  const out: Partial<WidgetConfig> = {};
  if (d.siteKey) out.siteKey = d.siteKey;
  if (d.position === "bottom-left" || d.position === "bottom-right")
    out.position = d.position;
  if (d.accent) out.accent = d.accent;
  if (d.remoteBase) out.remoteBase = d.remoteBase;
  return out;
}

export function resolveConfig(): WidgetConfig {
  return { ...DEFAULT_CONFIG, ...readHostConfig() };
}

// Phase 2 seam — wire to Supabase later. Returns partial config to merge over
// the resolved defaults. Must never throw and never block widget boot.
export async function loadRemoteConfig(
  cfg: WidgetConfig,
): Promise<Partial<WidgetConfig>> {
  if (!cfg.remoteBase || !cfg.siteKey) return {};
  try {
    const res = await fetch(
      `${cfg.remoteBase}/config?site=${encodeURIComponent(cfg.siteKey)}`,
      { credentials: "omit" },
    );
    if (!res.ok) return {};
    return (await res.json()) as Partial<WidgetConfig>;
  } catch {
    return {};
  }
}
