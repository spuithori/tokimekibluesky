import type { Draft } from './draft';
import { THEME_LINK_PREFIX } from './link';

export type BuilderSource =
    | { kind: 'draft'; id: string }
    | { kind: 'default' }
    | { kind: 'installed'; id: string }
    | { kind: 'own'; uri: string }
    | { kind: 'link'; hash: string };

export function sourceFromParams(params: URLSearchParams): BuilderSource {
    const draft = params.get('draft');
    if (draft) return { kind: 'draft', id: draft };
    const from = params.get('from');
    const id = params.get('id');
    const uri = params.get('uri');
    if (from === 'installed' && id) return { kind: 'installed', id };
    if (from === 'own' && uri) return { kind: 'own', uri };
    return { kind: 'default' };
}

export function sourceFromUrl(url: URL): BuilderSource {
    if (url.hash.startsWith(THEME_LINK_PREFIX)) return { kind: 'link', hash: url.hash };
    return sourceFromParams(url.searchParams);
}

export function builderHref(source: BuilderSource): string {
    if (source.kind === 'link') return `/theme-store/builder${source.hash}`;
    const params = new URLSearchParams();
    if (source.kind === 'draft') params.set('draft', source.id);
    else if (source.kind === 'installed') params.set('from', 'installed'), params.set('id', source.id);
    else if (source.kind === 'own') params.set('from', 'own'), params.set('uri', source.uri);
    else params.set('from', 'default');
    return `/theme-store/builder?${params}`;
}

export function editDraftId(uri: string): string {
    return `edit:${uri}`;
}

const blobIds = new WeakMap<Blob, number>();
let nextBlobId = 0;

function blobId(blob: Blob): number {
    let id = blobIds.get(blob);
    if (id === undefined) {
        id = nextBlobId++;
        blobIds.set(blob, id);
    }
    return id;
}

export function draftSignature(draft: Draft): string {
    return JSON.stringify([
        draft.name,
        draft.description,
        draft.version,
        draft.tokens,
        draft.dark,
        draft.variants,
        draft.seeds,
        draft.overrides,
        draft.darkOverrides,
        draft.images.map((image) => [image.key, blobId(image.blob)]),
        draft.icon ? blobId(draft.icon) : null,
        draft.cover ? blobId(draft.cover) : null,
    ]);
}
