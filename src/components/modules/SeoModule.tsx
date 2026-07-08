import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Copy, Download, Play, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { runSeoAudit } from "@/lib/seoAudit";
import {
  generateRobotsTxt,
  generateSitemapXml,
  generateLlmsTxt,
  type SeoAudit,
  type CheckStatus,
  type Severity,
  type Recommendation,
} from "@/lib/seo";
import type { Site } from "@/lib/sites";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_ICON: Record<CheckStatus, typeof CheckCircle2> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
};
const STATUS_COLOR: Record<CheckStatus, string> = {
  pass: "text-emerald-600",
  warn: "text-amber-500",
  fail: "text-red-600",
};
const SEV_LABEL: Record<Severity, string> = { high: "דחוף", medium: "בינוני", low: "קל" };
const SEV_CLASS: Record<Severity, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-muted text-muted-foreground",
};

export function SeoModule({ site }: { site: Site }) {
  const audit = useServerFn(runSeoAudit);
  const [result, setResult] = useState<SeoAudit | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const r = await audit({ data: { domain: site.domain } });
      setResult(r);
      if (!r.ok) toast.error("לא ניתן לגשת לאתר — בדקו את הדומיין");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה בהרצת האודיט");
    } finally {
      setRunning(false);
    }
  };

  // Apply an action-linked recommendation = generate the file to the clipboard.
  // Nothing on the live site changes until the user deploys it.
  const applyAction = async (rec: Recommendation) => {
    const content =
      rec.action === "robots"
        ? generateRobotsTxt(site.domain)
        : rec.action === "sitemap"
          ? generateSitemapXml(site.domain, result?.internalLinks ?? [])
          : rec.action === "llms"
            ? generateLlmsTxt({ name: site.name, domain: site.domain })
            : "";
    if (!content) return;
    await navigator.clipboard.writeText(content);
    toast.success(`${rec.action} נוצר והועתק — הדביקו לאתר`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>אודיט SEO</CardTitle>
            <CardDescription>
              סורק את <span dir="ltr">{site.domain}</span> — אינדוקס, on-page, קישורים, נראוּת AI.
            </CardDescription>
          </div>
          <Button onClick={run} disabled={running}>
            {running ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Play className="ml-1 h-4 w-4" />}
            {running ? "סורק…" : "הרצת אודיט"}
          </Button>
        </CardHeader>
        {result?.ok && (
          <CardContent>
            <div className="flex items-center gap-6">
              <ScoreRing score={result.score} />
              <div className="space-y-1 text-sm">
                <div className="flex gap-4">
                  <Count status="pass" checks={result} label="תקין" />
                  <Count status="warn" checks={result} label="לשיפור" />
                  <Count status="fail" checks={result} label="בעיות" />
                </div>
                <p className="text-xs text-muted-foreground">נסרקו {result.pagesScanned} עמודים · {result.checks.length} בדיקות</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {result?.ok && result.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>משימות מומלצות</CardTitle>
            <CardDescription>
              לפי סדר עדיפות. שום שינוי לא מתבצע באתר אוטומטית — אתם בוחרים מה ליישם.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.recommendations.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${SEV_CLASS[r.severity]}`}>
                      {SEV_LABEL[r.severity]}
                    </span>
                    <p className="text-sm font-medium">{r.title}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.why}</p>
                </div>
                {r.action && (
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => applyAction(r)}>
                    <Wand2 className="ml-1 h-3.5 w-3.5" />
                    צור קובץ
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {result?.ok && (
        <Card>
          <CardHeader>
            <CardTitle>כל הבדיקות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-lg border">
              {result.checks.map((c) => {
                const Icon = STATUS_ICON[c.status];
                return (
                  <div key={c.id} className="flex items-start gap-3 px-3 py-2.5">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${STATUS_COLOR[c.status]}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{c.label}</p>
                      <p dir="auto" className="text-xs text-muted-foreground">{c.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <GeneratorCard title="robots.txt" filename="robots.txt" description="גישה לבוטים של AI + הפניה ל-sitemap." content={generateRobotsTxt(site.domain)} />
        <GeneratorCard title="sitemap.xml" filename="sitemap.xml" description={result ? `מבוסס על ${result.internalLinks.length} קישורים.` : "הריצו אודיט לגילוי עמודים."} content={generateSitemapXml(site.domain, result?.internalLinks ?? [])} />
        <GeneratorCard title="llms.txt" filename="llms.txt" description="נראוּת ל-ChatGPT/Claude. השלימו פרטים." content={generateLlmsTxt({ name: site.name, domain: site.domain })} />
      </div>
    </div>
  );
}

function Count({ status, checks, label }: { status: CheckStatus; checks: SeoAudit; label: string }) {
  const n = checks.checks.filter((c) => c.status === status).length;
  return <span className={STATUS_COLOR[status]}>{n} {label}</span>;
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-500" : "text-red-600";
  return (
    <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-current/15">
      <span className={`text-2xl font-bold ${color}`}>{score}</span>
      <span className="text-[10px] text-muted-foreground">ציון</span>
    </div>
  );
}

function GeneratorCard({
  title,
  filename,
  description,
  content,
}: {
  title: string;
  filename: string;
  description: string;
  content: string;
}) {
  const copy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success(`${title} הועתק`);
  };
  const download = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base" dir="ltr">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <pre dir="ltr" className="max-h-40 flex-1 overflow-auto rounded-lg bg-muted p-2 text-left text-[11px] leading-relaxed">
          <code>{content}</code>
        </pre>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copy}>
            <Copy className="ml-1 h-3.5 w-3.5" />
            העתקה
          </Button>
          <Button variant="outline" size="sm" onClick={download}>
            <Download className="ml-1 h-3.5 w-3.5" />
            הורדה
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
