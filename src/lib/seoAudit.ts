import { createServerFn } from "@tanstack/react-start";
import type { SeoAudit, SeoCheck, Recommendation, CheckGroup, Severity } from "./seo";

// Runs on the server (nitro/Cloudflare) so it can fetch arbitrary origins.
export const runSeoAudit = createServerFn({ method: "POST" })
  .inputValidator((data: { domain: string }) => data)
  .handler(async ({ data }): Promise<SeoAudit> => {
    const host = normalizeHost(data.domain);
    const base = `https://${host}`;
    const checks: SeoCheck[] = [];
    const internalLinks: string[] = [];

    let html = "";
    try {
      const res = await fetchWithTimeout(base + "/", 9000);
      if (!res.ok) throw new Error(`status ${res.status}`);
      html = await res.text();
    } catch (e) {
      return {
        domain: host,
        url: base,
        ok: false,
        checks: [{ id: "reachable", label: "דף הבית נטען", status: "fail", detail: "לא ניתן לגשת לאתר", group: "indexing" }],
        recommendations: [],
        internalLinks: [],
        pagesScanned: 0,
        score: 0,
        error: e instanceof Error ? e.message : "fetch failed",
      };
    }

    // ---------------- On-page (indexing / crawlability) ----------------
    const noindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
    push(checks, "noindex", "אינדוקס מותר (ללא noindex)", !noindex, "onpage",
      "העמוד פתוח לאינדוקס", "העמוד חסום מאינדוקס (noindex) — לא יופיע בגוגל!");

    push(checks, "lang", "תג שפה (lang)", /<html[^>]+lang=/i.test(html), "onpage",
      "מוגדר", "חסר lang ב-<html> — פוגע בנגישות ובזיהוי שפה");

    push(checks, "viewport", "תג viewport (מובייל)", /<meta[^>]+name=["']viewport["']/i.test(html), "onpage");
    push(checks, "canonical", "קישור canonical", /<link[^>]+rel=["']canonical["']/i.test(html), "onpage");

    // ---------------- On-page (content quality) ----------------
    const title = match(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    checks.push(titleCheck(title));

    const desc = matchMeta(html, "description");
    checks.push(descCheck(desc));

    push(checks, "og", "תגי Open Graph (שיתוף)", /<meta[^>]+property=["']og:(title|image)["']/i.test(html), "onpage");

    const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
    checks.push({
      id: "h1", label: "כותרת H1", group: "content",
      status: h1Count === 1 ? "pass" : h1Count === 0 ? "fail" : "warn",
      detail: h1Count === 1 ? "כותרת אחת (מומלץ)" : `${h1Count} כותרות H1`,
    });

    const imgs = html.match(/<img\b[^>]*>/gi) || [];
    const imgsNoAlt = imgs.filter((t) => !/\balt\s*=/.test(t)).length;
    checks.push({
      id: "img-alt", label: "טקסט חלופי לתמונות (alt)", group: "content",
      status: imgs.length === 0 ? "pass" : imgsNoAlt === 0 ? "pass" : imgsNoAlt <= imgs.length / 2 ? "warn" : "fail",
      detail: imgs.length === 0 ? "אין תמונות" : `${imgsNoAlt} מתוך ${imgs.length} תמונות ללא alt`,
    });

    const words = countWords(html);
    checks.push({
      id: "content-length", label: "כמות תוכן", group: "content",
      status: words >= 300 ? "pass" : words >= 120 ? "warn" : "fail",
      detail: `כ-${words} מילים בעמוד הבית`,
    });

    // ---------------- AI visibility ----------------
    const hasSchema = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
    push(checks, "schema", "Schema (JSON-LD)", hasSchema, "ai",
      "נמצא schema מובנה", "אין schema מובנה — מומלץ להוסיף");

    // ---------------- Discover internal links (anchors only, not assets) ----------------
    for (const m of html.matchAll(/<a\b[^>]*\shref=["']([^"'#]+)["']/gi)) {
      const u = toAbsolute(m[1], base);
      if (u && u.startsWith(base) && isPageUrl(u) && !internalLinks.includes(u)) internalLinks.push(u);
      if (internalLinks.length >= 200) break;
    }

    // ---------------- Sibling files ----------------
    const robots = await fetchText(base + "/robots.txt");
    checks.push(
      robots.ok
        ? {
            id: "robots", label: "robots.txt", group: "indexing",
            status: /sitemap:/i.test(robots.body) ? "pass" : "warn",
            detail: /sitemap:/i.test(robots.body) ? "קיים ומצביע ל-sitemap" : "קיים אך לא מפנה ל-sitemap",
          }
        : { id: "robots", label: "robots.txt", status: "fail", detail: "לא קיים", group: "indexing" },
    );

    const sitemap = await fetchText(base + "/sitemap.xml");
    push(checks, "sitemap", "sitemap.xml",
      sitemap.ok && /<(urlset|sitemapindex)/i.test(sitemap.body), "indexing",
      "קיים ותקין", "לא קיים — אפשר ליצור למטה");

    const llms = await fetchText(base + "/llms.txt");
    push(checks, "llms", "llms.txt (נראוּת ל-AI)", llms.ok, "ai",
      "קיים", "לא קיים — מומלץ ליצור (נראוּת ב-ChatGPT/Claude)");

    // ---------------- Broken links (bounded parallel HEAD) ----------------
    const toProbe = internalLinks.filter((u) => u !== base + "/").slice(0, 12);
    let pagesScanned = 1;
    if (toProbe.length) {
      const results = await Promise.all(toProbe.map((u) => probe(u)));
      pagesScanned += results.length;
      const broken = results.filter((r) => !r.ok);
      checks.push({
        id: "broken-links", label: "קישורים שבורים", group: "links",
        status: broken.length === 0 ? "pass" : broken.length <= 1 ? "warn" : "fail",
        detail: broken.length === 0
          ? `נבדקו ${results.length} קישורים — כולם תקינים`
          : `${broken.length} שבורים מתוך ${results.length}: ${broken.slice(0, 3).map((b) => stripBase(b.url, base)).join(", ")}`,
      });
    }

    const recommendations = deriveRecommendations(checks);
    const score = computeScore(checks);

    return { domain: host, url: base, ok: true, checks, recommendations, internalLinks, pagesScanned, score };
  });

// ---------------- check builders ----------------
function titleCheck(title: string | null): SeoCheck {
  if (!title) return { id: "title", label: "תג כותרת (title)", status: "fail", detail: "חסר", group: "onpage" };
  const len = title.length;
  return {
    id: "title", label: "תג כותרת (title)", group: "onpage",
    status: len >= 10 && len <= 65 ? "pass" : "warn",
    detail: `${len} תווים${len > 65 ? " (ארוך מדי)" : len < 10 ? " (קצר מדי)" : ""}: "${truncate(title, 55)}"`,
  };
}
function descCheck(desc: string | null): SeoCheck {
  if (!desc) return { id: "description", label: "מטא תיאור (description)", status: "fail", detail: "חסר", group: "onpage" };
  const len = desc.length;
  return {
    id: "description", label: "מטא תיאור (description)", group: "onpage",
    status: len >= 50 && len <= 160 ? "pass" : "warn",
    detail: `${len} תווים${len > 160 ? " (ארוך מדי)" : len < 50 ? " (קצר מדי)" : ""}`,
  };
}

// ---------------- recommendations + score ----------------
const REC_TABLE: Record<string, { title: string; severity: Severity; why: string; action: Recommendation["action"] }> = {
  noindex: { title: "הסירו את חסימת האינדוקס (noindex)", severity: "high", why: "העמוד לא יופיע בגוגל כלל.", action: null },
  title: { title: "הוסיפו/תקנו תג כותרת (title)", severity: "high", why: "הכותרת היא הגורם הראשון בדירוג ובקליקים.", action: null },
  description: { title: "הוסיפו מטא תיאור", severity: "medium", why: "משפר שיעור הקלקה מתוצאות החיפוש.", action: null },
  h1: { title: "הגדירו כותרת H1 אחת ברורה", severity: "medium", why: "עוזר לגוגל להבין את נושא העמוד.", action: null },
  sitemap: { title: "צרו sitemap.xml", severity: "medium", why: "מזרז אינדוקס של כל העמודים.", action: "sitemap" },
  robots: { title: "צרו/תקנו robots.txt עם הפניה ל-sitemap", severity: "medium", why: "מכוון את הזחלנים ומקשר ל-sitemap.", action: "robots" },
  llms: { title: "צרו llms.txt", severity: "low", why: "נראוּת ב-ChatGPT/Claude/Perplexity.", action: "llms" },
  schema: { title: "הוסיפו Schema (JSON-LD)", severity: "medium", why: "מאפשר תוצאות עשירות בגוגל.", action: null },
  "broken-links": { title: "תקנו קישורים שבורים", severity: "high", why: "פוגע בחוויית משתמש ובזחילה.", action: null },
  "img-alt": { title: "הוסיפו טקסט alt לתמונות", severity: "low", why: "נגישות + SEO של תמונות.", action: null },
  canonical: { title: "הוסיפו קישור canonical", severity: "low", why: "מונע תוכן כפול.", action: null },
  "content-length": { title: "הרחיבו את תוכן העמוד", severity: "medium", why: "עמודים דלי-תוכן מדורגים נמוך.", action: null },
  lang: { title: "הוסיפו תג שפה (lang) ל-<html>", severity: "low", why: "זיהוי שפה ונגישות.", action: null },
  viewport: { title: "הוסיפו תג viewport", severity: "medium", why: "נדרש לתצוגה תקינה במובייל.", action: null },
  og: { title: "הוסיפו תגי Open Graph", severity: "low", why: "תצוגה טובה בשיתוף ברשתות.", action: null },
};

function deriveRecommendations(checks: SeoCheck[]): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const c of checks) {
    if (c.status === "pass") continue;
    const t = REC_TABLE[c.id];
    if (!t) continue;
    recs.push({
      id: c.id,
      title: t.title,
      severity: c.status === "fail" ? t.severity : downgrade(t.severity),
      why: t.why,
      action: t.action,
    });
  }
  const order: Severity[] = ["high", "medium", "low"];
  return recs.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
}
function downgrade(s: Severity): Severity {
  return s === "high" ? "medium" : "low";
}
function computeScore(checks: SeoCheck[]): number {
  const weight: Record<CheckGroup, number> = { indexing: 3, onpage: 2, ai: 1, links: 3, content: 2 };
  let total = 0;
  let earned = 0;
  for (const c of checks) {
    const w = weight[c.group] ?? 1;
    total += w;
    earned += c.status === "pass" ? w : c.status === "warn" ? w * 0.5 : 0;
  }
  return total === 0 ? 0 : Math.round((earned / total) * 100);
}

// ---------------- fetch + parse helpers ----------------
function normalizeHost(input: string): string {
  return input.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./i, "");
}
async function fetchWithTimeout(url: string, ms: number, method: "GET" | "HEAD" = "GET"): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      method,
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "MaestroSEO/1.0 (+https://maestro.app)" },
    });
  } finally {
    clearTimeout(t);
  }
}
async function fetchText(url: string): Promise<{ ok: boolean; body: string }> {
  try {
    const res = await fetchWithTimeout(url, 6000);
    return res.ok ? { ok: true, body: await res.text() } : { ok: false, body: "" };
  } catch {
    return { ok: false, body: "" };
  }
}
async function probe(url: string): Promise<{ url: string; ok: boolean }> {
  try {
    let res = await fetchWithTimeout(url, 6000, "HEAD");
    if (res.status === 405 || res.status === 501) res = await fetchWithTimeout(url, 6000, "GET");
    return { url, ok: res.status < 400 };
  } catch {
    return { url, ok: false };
  }
}
function push(
  checks: SeoCheck[],
  id: string,
  label: string,
  ok: boolean,
  group: CheckGroup,
  passDetail = "קיים",
  failDetail = "חסר",
): void {
  checks.push({ id, label, group, status: ok ? "pass" : "fail", detail: ok ? passDetail : failDetail });
}
function match(s: string, re: RegExp): string | null {
  const m = s.match(re);
  return m ? m[1].trim() : null;
}
function matchMeta(html: string, name: string): string | null {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (new RegExp(`name=["']${name}["']`, "i").test(m[0])) {
      const c = m[0].match(/content=["']([\s\S]*?)["']/i);
      if (c) return c[1].trim();
    }
  }
  return null;
}
function toAbsolute(href: string, base: string): string | null {
  if (href.startsWith("http")) return href.split("?")[0];
  if (href.startsWith("/")) return base + href.split("?")[0];
  return null;
}
// Skip asset/resource URLs — we only want crawlable HTML pages.
function isPageUrl(u: string): boolean {
  return !/\.(css|js|mjs|json|xml|txt|png|jpe?g|gif|svg|webp|ico|pdf|zip|mp4|webm|mp3|woff2?|ttf|eot)(\?|$)/i.test(u);
}
function countWords(html: string): number {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(" ").length : 0;
}
function stripBase(u: string, base: string): string {
  return u.replace(base, "") || "/";
}
function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
