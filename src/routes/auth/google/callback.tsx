import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, XCircle } from "lucide-react";
import { exchangeGoogleCode } from "@/lib/googleServer";
import { GOOGLE_CLIENT_ID, googleRedirectUri } from "@/lib/google";
import { upsertConnection } from "@/lib/googleConnections";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/auth/google/callback")({
  component: GoogleCallback,
});

function GoogleCallback() {
  const exchange = useServerFn(exchangeGoogleCode);
  const navigate = useNavigate();
  const session = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session === undefined) return; // wait for auth to resolve
    if (!session) {
      setError("צריך להיות מחובר. התחברו ונסו שוב.");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const rawState = params.get("state");
    const oauthError = params.get("error");
    if (oauthError) {
      setError(`Google: ${oauthError}`);
      return;
    }
    if (!code || !rawState) {
      setError("חסרים פרמטרים מ-Google.");
      return;
    }
    let siteId: string;
    try {
      const state = JSON.parse(atob(rawState)) as { siteId: string; nonce: string };
      const expected = sessionStorage.getItem("google_oauth_nonce");
      if (!state.nonce || state.nonce !== expected) throw new Error("nonce mismatch");
      siteId = state.siteId;
    } catch {
      setError("אימות בקשה נכשל (state). נסו להתחבר שוב.");
      return;
    }

    (async () => {
      const r = await exchange({ data: { code, clientId: GOOGLE_CLIENT_ID, redirectUri: googleRedirectUri() } });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      try {
        await upsertConnection({
          site_id: siteId,
          owner_id: session.user.id,
          google_email: r.email,
          access_token: r.access_token,
          refresh_token: r.refresh_token,
          token_expiry: r.token_expiry,
        });
        sessionStorage.removeItem("google_oauth_nonce");
        navigate({ to: "/dashboard/sites/$siteId", params: { siteId } });
      } catch (e) {
        setError(e instanceof Error ? e.message : "שמירת החיבור נכשלה");
      }
    })();
  }, [session, exchange, navigate]);

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center text-center">
      {error ? (
        <div className="max-w-sm space-y-2">
          <XCircle className="mx-auto h-8 w-8 text-red-600" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">מחבר את חשבון Google…</p>
        </div>
      )}
    </div>
  );
}
