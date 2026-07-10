const AT_URI_RE = /^at:\/\/([^/\s]+)\/app\.bsky\.feed\.post\/([^/?#\s]+)$/;
const BSKY_URL_RE = /^https?:\/\/bsky\.app\/profile\/([^/\s]+)\/post\/([^/?#\s]+)/;

export type ParsedPostInput = { authority: string, rkey: string };

export function parsePostInput(input: string): ParsedPostInput | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const at = trimmed.match(AT_URI_RE);
    if (at) return { authority: at[1], rkey: at[2] };

    const url = trimmed.match(BSKY_URL_RE);
    if (url) return { authority: decodeURIComponent(url[1]), rkey: url[2] };

    return null;
}

export async function toPostAtUri(input: string, resolveDid: (handle: string) => Promise<string>): Promise<string | null> {
    const parsed = parsePostInput(input);
    if (!parsed) return null;

    const did = parsed.authority.startsWith('did:') ? parsed.authority : await resolveDid(parsed.authority);
    if (!did) return null;

    return `at://${did}/app.bsky.feed.post/${parsed.rkey}`;
}

export function shortPostLabel(uriOrInput: string): string {
    const parsed = parsePostInput(uriOrInput);
    if (!parsed) return uriOrInput;

    const authority = parsed.authority.startsWith('did:') && parsed.authority.length > 16
        ? parsed.authority.slice(0, 16) + '…'
        : parsed.authority;
    return `${authority}/${parsed.rkey}`;
}
