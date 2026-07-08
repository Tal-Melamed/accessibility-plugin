import { createServerFn } from "@tanstack/react-start";

// Server-only Google calls. The client SECRET is read from a server env var and
// never reaches the browser. Tokens are passed in from the client's RLS-protected
// row; when a call refreshes the access token, the fresh token is returned so the
// client can persist it.

const TOKEN_URL = "https://oauth2.googleapis.com/token";

function clientSecret(): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.GOOGLE_CLIENT_SECRET;
}

export interface Token {
  access_token: string;
  token_expiry: string; // ISO
}
export interface GoogleCreds {
  access_token: string;
  refresh_token: string;
  token_expiry: string | null;
  clientId: string;
}

// --- Exchange the OAuth code for tokens (called once from the callback) ---
export const exchangeGoogleCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; clientId: string; redirectUri: string }) => d)
  .handler(async ({ data }) => {
    const secret = clientSecret();
    if (!secret) return { ok: false as const, error: "GOOGLE_CLIENT_SECRET לא מוגדר בשרת" };
    try {
      const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: data.code,
          client_id: data.clientId,
          client_secret: secret,
          redirect_uri: data.redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const json = (await res.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        id_token?: string;
        error_description?: string;
      };
      if (!res.ok || !json.access_token) {
        return { ok: false as const, error: json.error_description ?? `token ${res.status}` };
      }
      return {
        ok: true as const,
        access_token: json.access_token,
        refresh_token: json.refresh_token ?? "",
        token_expiry: isoIn(json.expires_in ?? 3600),
        email: emailFromIdToken(json.id_token),
      };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "exchange failed" };
    }
  });

type Action =
  | { type: "gsc.sites" }
  | { type: "gsc.query"; siteUrl: string }
  | { type: "gsc.submitSitemap"; siteUrl: string; feedpath: string }
  | { type: "ga.summaries" }
  | { type: "ga.report"; property: string };

// --- Unified caller: refresh if needed, then dispatch ---
export const googleApi = createServerFn({ method: "POST" })
  .inputValidator((d: { creds: GoogleCreds; action: Action }) => d)
  .handler(async ({ data }) => {
    const secret = clientSecret();
    if (!secret) return { ok: false as const, error: "GOOGLE_CLIENT_SECRET לא מוגדר בשרת" };

    let token: Token = { access_token: data.creds.access_token, token_expiry: data.creds.token_expiry ?? "" };
    let refreshed = false;
    const expMs = data.creds.token_expiry ? Date.parse(data.creds.token_expiry) : 0;
    if (!expMs || expMs < Date.now() + 60_000) {
      const r = await refresh(data.creds, secret);
      if (!r.ok) return { ok: false as const, error: r.error };
      token = { access_token: r.access_token, token_expiry: r.token_expiry };
      refreshed = true;
    }

    try {
      const data_ = await dispatch(data.action, token.access_token);
      return { ok: true as const, data: data_, token: refreshed ? token : null };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "google api failed" };
    }
  });

async function refresh(creds: GoogleCreds, secret: string) {
  if (!creds.refresh_token) return { ok: false as const, error: "אין refresh token — התחברו מחדש" };
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: secret,
      refresh_token: creds.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.access_token) return { ok: false as const, error: json.error_description ?? "refresh failed" };
  return { ok: true as const, access_token: json.access_token, token_expiry: isoIn(json.expires_in ?? 3600) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function dispatch(action: Action, accessToken: string): Promise<any> {
  const auth = { authorization: `Bearer ${accessToken}` };
  switch (action.type) {
    case "gsc.sites": {
      const r = await gfetch("https://www.googleapis.com/webmasters/v3/sites", { headers: auth });
      return r;
    }
    case "gsc.query": {
      const r = await gfetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(action.siteUrl)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: { ...auth, "content-type": "application/json" },
          body: JSON.stringify({
            startDate: daysAgo(28),
            endDate: daysAgo(2),
            dimensions: ["query"],
            rowLimit: 15,
          }),
        },
      );
      return r;
    }
    case "gsc.submitSitemap": {
      const res = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(action.siteUrl)}/sitemaps/${encodeURIComponent(action.feedpath)}`,
        { method: "PUT", headers: auth },
      );
      return { submitted: res.ok, status: res.status };
    }
    case "ga.summaries": {
      const r = await gfetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", { headers: auth });
      return r;
    }
    case "ga.report": {
      const r = await gfetch(`https://analyticsdata.googleapis.com/v1beta/${action.property}:runReport`, {
        method: "POST",
        headers: { ...auth, "content-type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
        }),
      });
      return r;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gfetch(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message ?? `${res.status}`;
    throw new Error(msg);
  }
  return json;
}

function isoIn(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}
function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return (json as { email?: string }).email ?? null;
  } catch {
    return null;
  }
}
