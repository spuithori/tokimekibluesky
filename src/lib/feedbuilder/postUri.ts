import { t as tr } from 'tokimeki-i18n';
import { xrpcQuery } from './api';

export async function toPostAtUri(s: string): Promise<string> {
  const t = s.trim();
  if (t.startsWith('at://')) {
    if (!/^at:\/\/did:[^/]+\/app\.bsky\.feed\.post\/[^/]+$/.test(t)) {
      throw new Error(tr('tfeeds_err_post_aturi'));
    }
    return t;
  }
  const m = t.match(/^https?:\/\/[^/]+\/profile\/([^/]+)\/post\/([^/?#]+)/);
  if (!m) throw new Error(tr('tfeeds_err_post_url'));
  let actor = decodeURIComponent(m[1]);
  if (!actor.startsWith('did:')) {
    const res = await xrpcQuery<{ did: string }>('com.atproto.identity.resolveHandle', {
      handle: actor
    });
    actor = res.did;
  }
  return `at://${actor}/app.bsky.feed.post/${m[2]}`;
}
