import { t as tr } from 'tokimeki-i18n';

import { xrpcQuery } from './api';
import { customFeeds } from './customFeeds.svelte';

const FEED_URI_RE = /^at:\/\/(did:[^/]+)\/(app\.bsky\.feed\.generator|tech\.tokimeki\.feeds\.definition)\/([^/]+)$/;

export async function toFeedAtUri(s: string): Promise<string> {
  const t = s.trim();
  if (t.startsWith('at://')) {
    if (!FEED_URI_RE.test(t)) {
      throw new Error(tr('tfeeds_err_feed_aturi'));
    }
    return t;
  }
  const m = t.match(/^https?:\/\/[^/]+\/profile\/([^/]+)\/feed\/([^/?#]+)/);
  if (!m) throw new Error(tr('tfeeds_err_feed_url'));
  let actor = decodeURIComponent(m[1]);
  if (!actor.startsWith('did:')) {
    const res = await xrpcQuery<{ did: string }>('com.atproto.identity.resolveHandle', { handle: actor });
    actor = res.did;
  }
  return `at://${actor}/app.bsky.feed.generator/${m[2]}`;
}

export function feedKey(uri: string): { did: string; rkey: string } | null {
  const m = uri.match(FEED_URI_RE);
  return m ? { did: m[1], rkey: m[3] } : null;
}

const names = new Map<string, Promise<string | null>>();

export function feedName(uri: string): Promise<string | null> {
  const k = feedKey(uri);
  if (!k) return Promise.resolve(null);
  const mine = customFeeds.items.find((f) => f.rkey === k.rkey && f.uri.startsWith(`at://${k.did}/`));
  if (mine) return Promise.resolve(mine.record.name);
  let p = names.get(uri);
  if (!p) {
    const gen = `at://${k.did}/app.bsky.feed.generator/${k.rkey}`;
    p = xrpcQuery<{ view: { displayName: string } }>('app.bsky.feed.getFeedGenerator', { feed: gen })
      .then((r) => r.view.displayName)
      .catch(() => null);
    names.set(uri, p);
  }
  return p;
}
