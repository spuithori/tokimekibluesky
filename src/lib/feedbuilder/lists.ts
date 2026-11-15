import { t as tr } from 'tokimeki-i18n';
import { xrpcQuery } from './api';

export async function toListAtUri(s: string): Promise<string> {
  const t = s.trim();
  if (t.startsWith('at://')) {
    if (!/^at:\/\/did:[^/]+\/app\.bsky\.graph\.list\/[^/]+$/.test(t)) {
      throw new Error(tr('tfeeds_err_list_aturi'));
    }
    return t;
  }
  const m = t.match(/^https?:\/\/[^/]+\/profile\/([^/]+)\/lists\/([^/?#]+)/);
  if (!m) throw new Error(tr('tfeeds_err_list_url'));
  let actor = decodeURIComponent(m[1]);
  if (!actor.startsWith('did:')) {
    const res = await xrpcQuery<{ did: string }>('com.atproto.identity.resolveHandle', { handle: actor });
    actor = res.did;
  }
  return `at://${actor}/app.bsky.graph.list/${m[2]}`;
}

const names = new Map<string, Promise<string | null>>();

export function listName(uri: string): Promise<string | null> {
  let p = names.get(uri);
  if (!p) {
    p = xrpcQuery<{ list: { name: string } }>('app.bsky.graph.getList', { list: uri, limit: 1 })
      .then((r) => r.list.name)
      .catch(() => null);
    names.set(uri, p);
  }
  return p;
}
