// Shared SEO types + client-safe generators. The audit itself runs server-side
// (see seoAudit.ts) because browsers can't fetch other origins (CORS).

export type CheckStatus = "pass" | "warn" | "fail";
export type Severity = "high" | "medium" | "low";
export type CheckGroup = "indexing" | "onpage" | "ai" | "links" | "content";

export interface SeoCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  group: CheckGroup;
}

// An actionable item derived from a failing/warning check. Nothing is applied
// automatically — the user chooses. `action` links to a generator when relevant.
export interface Recommendation {
  id: string;
  title: string;
  severity: Severity;
  why: string;
  action: "robots" | "sitemap" | "llms" | null;
}

export interface SeoAudit {
  domain: string;
  url: string;
  ok: boolean; // homepage reachable
  checks: SeoCheck[];
  recommendations: Recommendation[];
  internalLinks: string[]; // same-origin URLs discovered on the homepage
  pagesScanned: number;
  score: number; // 0-100
  error?: string;
}

const AI_BOTS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"];

// robots.txt that allows normal + AI crawlers and points to the sitemap
// (per the AI SEO playbook: make the site readable to AI).
export function generateRobotsTxt(domain: string): string {
  const base = `https://${domain}`;
  const aiAllow = AI_BOTS.map((b) => `User-agent: ${b}\nAllow: /`).join("\n\n");
  return `User-agent: *
Allow: /

${aiAllow}

Sitemap: ${base}/sitemap.xml
`;
}

// XML sitemap from the list of discovered URLs (homepage always included).
export function generateSitemapXml(domain: string, urls: string[]): string {
  const base = `https://${domain}`;
  const all = Array.from(new Set([base + "/", ...urls])).slice(0, 500);
  const body = all
    .map((u) => `  <url>\n    <loc>${escapeXml(u)}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

// llms.txt — a plain-text pitch for AI models (ChatGPT/Claude/Perplexity).
export function generateLlmsTxt(input: { name: string; domain: string }): string {
  return `# ${input.name}

> One-sentence description of what ${input.name} does. [ערכו את השורה הזו]

אתר: https://${input.domain}

## מה אנחנו עושים
[תיאור קצר של השירות/המוצר]

## שירותים
- [שירות 1]
- [שירות 2]
- [שירות 3]

## אזור שירות / מיקום
[ערים / אזורים]

## יצירת קשר
[טלפון · אימייל]

## מה מייחד אותנו
[2-3 משפטים על היתרון שלכם]
`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
