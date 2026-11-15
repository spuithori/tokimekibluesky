import { t } from 'tokimeki-i18n';

export function excerpt(text: string | undefined, n = 280): string {
  if (!text) return '';
  return text.length > n ? `${text.slice(0, n)}…` : text;
}

export function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(diff)) return '';
  if (diff < 60) return t('tfeeds_rel_seconds', { n: Math.max(0, Math.floor(diff)) });
  if (diff < 3600) return t('tfeeds_rel_minutes', { n: Math.floor(diff / 60) });
  if (diff < 86400) return t('tfeeds_rel_hours', { n: Math.floor(diff / 3600) });
  return t('tfeeds_rel_days', { n: Math.floor(diff / 86400) });
}

export function postWebUrl(uri: string): string {
  const m = uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/);
  return m ? `https://bsky.app/profile/${m[1]}/post/${m[2]}` : uri;
}

export function postAuthorDid(uri: string): string | null {
  const m = uri.match(/^at:\/\/(did:[^/]+)\/app\.bsky\.feed\.post\/[^/]+$/);
  return m ? m[1] : null;
}

export interface EmbedSummary {
  thumbs: string[];
  video: boolean;
  external: string | null;
  quote: boolean;
}

export function summarizeEmbed(embed: unknown): EmbedSummary {
  const out: EmbedSummary = { thumbs: [], video: false, external: null, quote: false };
  const visit = (e: unknown) => {
    if (!e || typeof e !== 'object') return;
    const o = e as Record<string, unknown>;
    const type = typeof o.$type === 'string' ? o.$type : '';
    if (type.endsWith('images#view') && Array.isArray(o.images)) {
      for (const img of o.images as { thumb?: string }[]) if (img.thumb) out.thumbs.push(img.thumb);
    } else if (type.endsWith('video#view')) {
      out.video = true;
      if (typeof o.thumbnail === 'string') out.thumbs.push(o.thumbnail);
    } else if (type.endsWith('external#view')) {
      const ext = o.external as { uri?: string } | undefined;
      try {
        out.external = ext?.uri ? new URL(ext.uri).hostname.replace(/^www\./, '') : null;
      } catch {
        out.external = null;
      }
    } else if (type.endsWith('recordWithMedia#view')) {
      out.quote = true;
      visit(o.media);
    } else if (type.endsWith('record#view')) {
      out.quote = true;
    }
  };
  visit(embed);
  return out;
}
