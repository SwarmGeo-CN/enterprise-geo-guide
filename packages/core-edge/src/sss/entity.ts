import type { SemanticSection } from '../types.js';

export interface ExtractedPage {
  title: string;
  description: string;
  jsonLdBlocks: Record<string, unknown>[];
  sections: SemanticSection[];
  visibleText: string;
}

export function extractPageFromHtml(html: string, pageUrl: string): ExtractedPage {
  const title = extractTitle(html) || new URL(pageUrl).hostname;
  const description = extractMeta(html, 'description');
  const jsonLdBlocks = extractJsonLd(html);
  const sections = extractSections(html, title);
  const visibleText = extractVisibleText(html);

  return {
    title,
    description,
    jsonLdBlocks,
    sections,
    visibleText,
  };
}

export function buildMinimalEntityGraph(
  pageUrl: string,
  extracted: ExtractedPage,
): Record<string, unknown> {
  const origin = new URL(pageUrl).origin;
  const orgId = `${origin}/#organization`;
  const siteId = `${origin}/#website`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: extracted.title,
        url: origin,
        description: extracted.description || extracted.title,
      },
      {
        '@type': 'WebSite',
        '@id': siteId,
        url: origin,
        name: extracted.title,
        publisher: { '@id': orgId },
      },
    ],
  };
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeEntities(match?.[1]?.trim() ?? '');
}

function extractMeta(html: string, name: string): string {
  const byName =
    html.match(
      new RegExp(
        `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`,
        'i',
      ),
    ) ??
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`,
        'i',
      ),
    );
  return decodeEntities(byName?.[1]?.trim() ?? '');
}

function extractJsonLd(html: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(match[1].trim()) as Record<string, unknown>);
    } catch {
      // ignore invalid JSON-LD
    }
  }
  return blocks;
}

function extractSections(html: string, fallbackTitle: string): SemanticSection[] {
  const sections: SemanticSection[] = [];
  const re = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const level = Number(tag.slice(1));
    const heading = stripTags(match[2]).trim();
    if (!heading) continue;
    const start = match.index + match[0].length;
    const next = html.slice(start, start + 2000);
    const body = stripTags(next).trim().slice(0, 1200);
    sections.push({ heading, level, body: body || heading });
  }

  if (sections.length === 0) {
    const body = extractVisibleText(html).slice(0, 2000);
    if (body) {
      sections.push({ heading: fallbackTitle, level: 1, body });
    }
  }
  return sections;
}

function extractVisibleText(html: string): string {
  return stripTags(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ' '));
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function mergeEntityGraphs(
  autoGraph: Record<string, unknown>,
  override?: Record<string, unknown>,
  jsonLdBlocks: Record<string, unknown>[] = [],
): Record<string, unknown> | undefined {
  if (override) {
    return override;
  }
  if (jsonLdBlocks.length === 1) {
    return jsonLdBlocks[0];
  }
  if (jsonLdBlocks.length > 1) {
    return {
      '@context': 'https://schema.org',
      '@graph': jsonLdBlocks.flatMap((block) =>
        Array.isArray(block['@graph']) ? block['@graph'] : [block],
      ),
    };
  }
  return autoGraph;
}

export function isEmptyCsrShell(extracted: ExtractedPage): boolean {
  return extracted.visibleText.length < 200;
}
