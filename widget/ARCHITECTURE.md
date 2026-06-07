# Accessibility Widget — Architecture

A self-contained, platform-agnostic accessibility widget (תוסף נגישות) for the
Israeli market. Ships as a single async `<script>` that injects a floating
Hebrew/RTL control panel and runs a background remediation engine. Targets
**WCAG 2.1 AA** and the **Israeli Equal Rights Regulations (Accessibility
Adjustments for Services), 2013**.

> Pure client-side. Zero runtime dependencies. No backend required for the core.
> A remote-config seam exists for a future SaaS control plane (see "Phase 2").

---

## 1. High-level workflow — how the components communicate

```
                         ┌──────────────────────────────────────────┐
   Host page <head>      │  CRITICAL SHIM  (inline, ~0.5kb, blocking) │
   (snippet, see below)  │  reads localStorage → sets data-a11y-* on  │
                         │  <html> + injects critical CSS → NO FOUC   │
                         └────────────────────┬─────────────────────┘
                                              │ (paint happens with
                                              │  prefs already applied)
   Host page <body> end ┌────────────────────▼─────────────────────┐
   async/defer ───────► │  MAIN BUNDLE  (a11y.js, IIFE, <40kb gz)    │
                        └───────────────┬─────────────┬────────────┘
                                        │             │
                ┌───────────────────────▼──┐   ┌──────▼───────────────────┐
                │  Component C: STATE        │   │  Component B: ENGINE      │
                │  - load() from storage     │   │  (runs immediately,       │
                │  - get/set/subscribe       │◄──┤   independent of UI)      │
                │  - persist() to storage    │   │  - skip-to-content link   │
                │  - reset()                 │   │  - alt-text fallbacks     │
                └───────┬──────────┬─────────┘   │  - <div role=button> fix  │
                        │ notify   │ notify       │  - orphan <label> binding │
            ┌───────────▼──┐   ┌───▼───────────┐  │  - heading-order repair   │
            │ Component A:  │   │ FEATURES      │  │  - MutationObserver loop  │
            │ UI (button +  │   │ apply state → │  │    (debounced, guarded)   │
            │ RTL panel)    │   │ <html> attrs  │  └───────────────────────────┘
            │ toggles ──────┼──►│ + scoped CSS  │
            └───────────────┘   └───────────────┘
```

**Communication contract — a single store is the source of truth:**

1. **Critical shim** (synchronous, in the snippet) applies persisted prefs to
   `<html>` *before first paint* so visitors never see a flash (no FOUC).
2. **Main bundle** boots: `State.load()` rehydrates from `localStorage`.
3. **Engine (B)** starts at once — it does not wait for the UI and does not need
   user prefs; it repairs the DOM for everyone (skip link, alt, labels, roles).
4. **UI (A)** renders the floating button + panel; panel toggles call
   `State.set(key, value)`.
5. `State.set` → persists → emits a change event. **Features** and **UI**
   subscribe: features re-apply by toggling `data-a11y-*` attributes / classes on
   the root element (CSS does the visual work); the UI re-syncs control states.
6. **Reset** clears storage keys + strips every `data-a11y-*` attribute → host
   site instantly returns to its native CSS.

Why root-attribute + CSS instead of inline-styling nodes?
- **Reversible:** reset = remove attributes. We never mutate host author styles.
- **Cheap:** one attribute write re-themes the whole page via the cascade.
- **SPA-safe:** new DOM nodes inherit the active theme automatically — no rescan.

---

## 2. Module map

| Module | Responsibility |
|---|---|
| `src/index.ts` | Bootstrap: guard double-init, mount engine + state + UI. |
| `src/core/state.ts` | Store: load/get/set/subscribe/persist/reset (Component C). |
| `src/core/config.ts` | Defaults + remote-config seam (Phase 2 / Supabase). |
| `src/core/i18n.ts` | Hebrew strings, RTL, SR announcements. |
| `src/features/visual.ts` | Maps state → `data-a11y-*` on `<html>` (Component A visuals). |
| `src/ui/styles.ts` | The single injected stylesheet (panel chrome + feature CSS). |
| `src/ui/button.ts` | Floating trigger button. |
| `src/ui/panel.ts` | Accessible RTL modal with grouped toggles. |
| `src/engine/remediation.ts` | Background DOM repairs + `MutationObserver` (Component B). |

---

## 3. The background engine — hooking DOM changes without leaks or loops

The engine is the part most likely to misbehave on a live site. Four rules:

1. **One observer, debounced.** A single `MutationObserver` on `document.body`
   with `{ childList: true, subtree: true }`. Mutations are coalesced into one
   `requestIdleCallback` (falling back to a `setTimeout`) pass — we never run
   repair work synchronously inside the callback.

2. **Re-entrancy guard against infinite loops.** Our own DOM writes (adding
   `alt`, `role`, `for`, the skip link, etc.) trigger the observer. Before each
   repair pass we set a `mutating` flag and **disconnect** the observer, do the
   batch of writes, then `takeRecords()` (to drain self-generated records) and
   `reconnect`. Every node we touch is also stamped with a
   `data-a11y-fixed` marker and skipped on subsequent passes (idempotent).

3. **No leaks.** Everything cleanable is tracked: the observer, the idle handle,
   and any listeners live on a single `Engine` instance with a `destroy()` that
   disconnects/cancels/removes them. The UI uses event delegation (a couple of
   listeners on the panel root, not one per control) so detached nodes are GC'd.
   We never hold references to host DOM nodes across passes — we re-query.

4. **Bounded work.** Each pass processes only newly-added subtrees from the
   batched records (not a full re-scan), with a per-pass node cap so a giant
   AJAX payload can't jank the main thread; overflow is picked up next idle tick.

```
mutations ──► coalesce (rIC/timeout) ──► [disconnect observer]
                                          repair newly-added nodes (idempotent,
                                          capped, marked data-a11y-fixed)
                                          [takeRecords + reconnect observer]
```

---

## Build & delivery

- **Bundle:** Vite library build → single **IIFE** `dist/a11y.js` (self-invoking,
  no globals leaked beyond one namespaced object). Target <40kb gzipped.
- **CDN:** serve `a11y.js` from a real CDN (jsDelivr-on-GitHub-tag to start;
  Cloudflare/Bunny later). The Lovable React app hosts the marketing site,
  dashboard, and snippet generator — **not** the hot-path widget JS.
- **Snippet:** see `snippet.html` — a tiny blocking critical shim (FOUC guard)
  plus the async main bundle.

## Phase 2 (not in core) — the SaaS control plane

`config.ts` exposes `loadRemoteConfig(siteKey)`. When wired to **Supabase** it
will provide: site-key/license validation, per-domain config (color, position,
enabled features), the legally-required accessibility statement (הצהרת נגישות)
and coordinator contact, plus usage analytics. The engine/features never block
on this call — config arrives async and merges over defaults.
