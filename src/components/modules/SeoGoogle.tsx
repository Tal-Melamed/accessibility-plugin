import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Search, BarChart3, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Site } from "@/lib/sites";
import { isGoogleConfigured, GOOGLE_CLIENT_ID, buildGoogleAuthUrl } from "@/lib/google";
import { getConnection, deleteConnection, patchConnection } from "@/lib/googleConnections";
import { googleApi } from "@/lib/googleServer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GscRow { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }
interface PropSummary { property: string; displayName: string }

export function SeoGoogle({ site }: { site: Site }) {
  const qc = useQueryClient();
  const api = useServerFn(googleApi);
  const { data: conn, isLoading } = useQuery({
    queryKey: ["google", site.id],
    queryFn: () => getConnection(site.id),
    enabled: isGoogleConfigured,
  });

  const [busy, setBusy] = useState("");
  const [gscRows, setGscRows] = useState<GscRow[] | null>(null);
  const [props, setProps] = useState<PropSummary[] | null>(null);
  const [gaProp, setGaProp] = useState("");
  const [gaMetrics, setGaMetrics] = useState<string[] | null>(null);

  const connect = () => {
    const nonce = crypto.randomUUID();
    sessionStorage.setItem("google_oauth_nonce", nonce);
    const state = btoa(JSON.stringify({ siteId: site.id, nonce }));
    window.location.href = buildGoogleAuthUrl(state);
  };

  const disconnect = async () => {
    await deleteConnection(site.id);
    qc.invalidateQueries({ queryKey: ["google", site.id] });
    setGscRows(null);
    setProps(null);
    setGaMetrics(null);
    toast.success("החיבור נותק");
  };

  // Calls a Google action with the stored creds; persists a refreshed token.
  const call = async (action: Parameters<typeof googleApi>[0]["data"]["action"]) => {
    if (!conn) throw new Error("לא מחובר");
    const creds = {
      access_token: conn.access_token,
      refresh_token: conn.refresh_token,
      token_expiry: conn.token_expiry,
      clientId: GOOGLE_CLIENT_ID,
    };
    const r = await api({ data: { creds, action } });
    if (!r.ok) throw new Error(r.error);
    if (r.token) {
      await patchConnection(site.id, { access_token: r.token.access_token, token_expiry: r.token.token_expiry });
      qc.invalidateQueries({ queryKey: ["google", site.id] });
    }
    return r.data;
  };

  const loadGsc = async () => {
    setBusy("gsc");
    try {
      const sites = (await call({ type: "gsc.sites" })) as { siteEntry?: { siteUrl: string }[] };
      const list = sites.siteEntry ?? [];
      const match =
        list.find((s) => s.siteUrl === `sc-domain:${site.domain}`) ||
        list.find((s) => s.siteUrl.includes(site.domain)) ||
        list[0];
      if (!match) {
        toast.error("לא נמצאו נכסים ב-Search Console לחשבון הזה");
        return;
      }
      const q = (await call({ type: "gsc.query", siteUrl: match.siteUrl })) as { rows?: GscRow[] };
      setGscRows(q.rows ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה ב-Search Console");
    } finally {
      setBusy("");
    }
  };

  const loadGaProps = async () => {
    setBusy("ga");
    try {
      const s = (await call({ type: "ga.summaries" })) as {
        accountSummaries?: { propertySummaries?: PropSummary[] }[];
      };
      const all = (s.accountSummaries ?? []).flatMap((a) => a.propertySummaries ?? []);
      setProps(all);
      if (all.length === 1) {
        setGaProp(all[0].property);
        await loadGaReport(all[0].property);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה ב-Analytics");
    } finally {
      setBusy("");
    }
  };

  const loadGaReport = async (property: string) => {
    setBusy("ga");
    try {
      const rep = (await call({ type: "ga.report", property })) as {
        rows?: { metricValues: { value: string }[] }[];
      };
      setGaMetrics(rep.rows?.[0]?.metricValues.map((m) => m.value) ?? ["0", "0", "0"]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה בדוח");
    } finally {
      setBusy("");
    }
  };

  if (!isGoogleConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" />חיבורי Google</CardTitle>
          <CardDescription>
            נתונים חיים מ-Search Console ו-Analytics. דורש הקמת אפליקציית OAuth ב-Google Cloud
            והגדרת <code>VITE_GOOGLE_CLIENT_ID</code> + <code>GOOGLE_CLIENT_SECRET</code>.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" />חיבורי Google</CardTitle>
          <CardDescription>Search Console + Analytics — נתונים חיים מ-28 הימים האחרונים.</CardDescription>
        </div>
        {conn ? (
          <Button variant="outline" size="sm" onClick={disconnect}>ניתוק</Button>
        ) : (
          <Button size="sm" onClick={connect}>חיבור חשבון Google</Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">טוען…</p>
        ) : !conn ? (
          <p className="text-sm text-muted-foreground">התחברו כדי למשוך נתוני אינדוקס, שאילתות ותנועה.</p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              מחובר{conn.google_email ? ` — ${conn.google_email}` : ""}
            </div>

            {/* Search Console */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium"><Search className="h-4 w-4" />Search Console</span>
                <Button variant="outline" size="sm" onClick={loadGsc} disabled={busy !== ""}>
                  {busy === "gsc" ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" /> : null}
                  שאילתות מובילות
                </Button>
              </div>
              {gscRows && (
                gscRows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">אין נתונים עדיין.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="text-muted-foreground">
                        <tr><th className="py-1 font-medium">שאילתה</th><th className="font-medium">קליקים</th><th className="font-medium">חשיפות</th><th className="font-medium">מיקום</th></tr>
                      </thead>
                      <tbody>
                        {gscRows.map((r) => (
                          <tr key={r.keys[0]} className="border-t">
                            <td className="py-1">{r.keys[0]}</td>
                            <td>{r.clicks}</td>
                            <td>{r.impressions}</td>
                            <td>{r.position.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>

            {/* Analytics */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium"><BarChart3 className="h-4 w-4" />Analytics</span>
                <Button variant="outline" size="sm" onClick={loadGaProps} disabled={busy !== ""}>
                  {busy === "ga" ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" /> : null}
                  טעינת נתונים
                </Button>
              </div>
              {props && props.length > 1 && (
                <div className="mb-2">
                  <Select value={gaProp} onValueChange={(v) => { setGaProp(v); loadGaReport(v); }}>
                    <SelectTrigger><SelectValue placeholder="בחרו נכס GA4" /></SelectTrigger>
                    <SelectContent>
                      {props.map((p) => <SelectItem key={p.property} value={p.property}>{p.displayName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {gaMetrics && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Metric label="משתמשים" value={gaMetrics[0]} />
                  <Metric label="ביקורים" value={gaMetrics[1]} />
                  <Metric label="צפיות" value={gaMetrics[2]} />
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 py-2">
      <div className="text-lg font-bold">{Number(value).toLocaleString()}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
