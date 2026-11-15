import { fetchDidDocument, identityFromDocument, isHandle } from './identity';
import { getRecord } from './pds';
import { isDid, isNsid } from './values';

export interface LexiconSchema {
    type: string;
    description?: string;
    ref?: string;
    refs?: string[];
    closed?: boolean;
    items?: LexiconSchema;
    properties?: Record<string, LexiconSchema>;
    required?: string[];
    nullable?: string[];
    format?: string;
    enum?: Array<string | number>;
    const?: string | number | boolean;
    knownValues?: string[];
    minLength?: number;
    maxLength?: number;
    minGraphemes?: number;
    maxGraphemes?: number;
    minimum?: number;
    maximum?: number;
    accept?: string[];
    maxSize?: number;
    key?: string;
    record?: LexiconSchema;
    parameters?: LexiconSchema;
    input?: { encoding?: string; schema?: LexiconSchema };
    output?: { encoding?: string; schema?: LexiconSchema };
    message?: { schema?: LexiconSchema };
    errors?: Array<{ name: string; description?: string }>;
    default?: unknown;
}

export interface LexiconDoc {
    lexicon: number;
    id: string;
    description?: string;
    defs: Record<string, LexiconSchema>;
}

export interface ResolvedLexicon {
    doc: LexiconDoc;
    authority: string;
    uri: string;
}

export interface ValidationIssue {
    path: string;
    code: 'required' | 'type' | 'max-length' | 'min-length' | 'max-graphemes' | 'min-graphemes' | 'enum' | 'const' | 'format' | 'range' | 'union' | 'mime' | 'size';
    detail?: string;
}

export type Lexicons = Map<string, LexiconDoc>;

export function lexiconAuthorityDomain(nsid: string): string {
    return nsid.split('#')[0].split('.').slice(0, -1).reverse().join('.');
}

export async function resolveLexiconAuthority(nsid: string, signal?: AbortSignal): Promise<string | undefined> {
    const name = '_lexicon.' + lexiconAuthorityDomain(nsid);
    try {
        const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`, { signal });
        if (!res.ok) return undefined;
        const data = await res.json();
        for (const answer of data.Answer ?? []) {
            const txt = String(answer.data ?? '').replace(/^"|"$/g, '');
            if (txt.startsWith('did=') && isDid(txt.slice(4))) return txt.slice(4);
        }
    } catch {
        return undefined;
    }
    return undefined;
}

export async function resolveLexicon(nsid: string, signal?: AbortSignal): Promise<ResolvedLexicon | undefined> {
    const id = nsid.split('#')[0];
    if (!isNsid(id)) return undefined;
    const authority = await resolveLexiconAuthority(id, signal);
    if (!authority) return undefined;
    try {
        const { pds } = identityFromDocument(await fetchDidDocument(authority, signal));
        if (!pds) return undefined;
        const record = await getRecord(pds, { repo: authority, collection: 'com.atproto.lexicon.schema', rkey: id }, signal);
        const doc = record.value as unknown as LexiconDoc;
        if (!doc?.defs || doc.id !== id) return undefined;
        return { doc, authority, uri: record.uri };
    } catch {
        return undefined;
    }
}

function collectRefs(schema: unknown, base: string, out: Set<string>): void {
    if (!schema || typeof schema !== 'object') return;
    if (Array.isArray(schema)) {
        for (const item of schema) collectRefs(item, base, out);
        return;
    }
    const node = schema as LexiconSchema;
    const refs = node.type === 'ref' && node.ref ? [node.ref] : node.type === 'union' ? node.refs ?? [] : [];
    for (const ref of refs) {
        const id = ref.startsWith('#') ? base : ref.split('#')[0];
        if (id !== base) out.add(id);
    }
    for (const value of Object.values(node)) collectRefs(value, base, out);
}

export async function loadLexicons(
    nsid: string,
    resolve: (id: string) => Promise<ResolvedLexicon | undefined> = resolveLexicon,
    limit = 24,
): Promise<Lexicons> {
    const lexicons: Lexicons = new Map();
    const requested = new Set<string>();
    let frontier = [nsid.split('#')[0]];

    while (frontier.length && requested.size < limit) {
        const batch = frontier.filter((id) => !requested.has(id)).slice(0, limit - requested.size);
        for (const id of batch) requested.add(id);
        const resolved = await Promise.all(batch.map((id) => resolve(id)));
        const next = new Set<string>();
        for (const item of resolved) {
            if (!item) continue;
            lexicons.set(item.doc.id, item.doc);
            collectRefs(item.doc.defs, item.doc.id, next);
        }
        frontier = [...next];
    }

    return lexicons;
}

export function findDef(lexicons: Lexicons, ref: string, base: string): { schema: LexiconSchema; id: string } | undefined {
    const [idPart, fragment] = ref.split('#');
    const id = idPart || base;
    const schema = lexicons.get(id)?.defs?.[fragment || 'main'];
    return schema ? { schema, id } : undefined;
}

const FORMATS: Record<string, (value: string) => boolean> = {
    datetime: (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value)),
    uri: (value) => /^[a-zA-Z][a-zA-Z0-9+.-]*:\S+$/.test(value),
    'at-uri': (value) => /^at:\/\/[^/\s]+(\/[^/\s]+(\/[^/\s]+)?)?$/.test(value),
    did: isDid,
    handle: isHandle,
    'at-identifier': (value) => isDid(value) || isHandle(value),
    nsid: isNsid,
    cid: (value) => /^[a-zA-Z0-9+=]{8,256}$/.test(value),
    language: (value) => /^[a-zA-Z]{2,3}(-[a-zA-Z0-9-]+)?$|^i-[a-zA-Z0-9-]+$/.test(value),
    tid: (value) => /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/.test(value),
    'record-key': (value) => /^[a-zA-Z0-9._:~-]{1,512}$/.test(value) && value !== '.' && value !== '..',
};

let segmenter: Intl.Segmenter | undefined;

function graphemes(value: string): number {
    segmenter ??= new Intl.Segmenter();
    let count = 0;
    for (const _ of segmenter.segment(value)) count++;
    return count;
}

function utf8Length(value: string): number {
    return new TextEncoder().encode(value).length;
}

function typeOf(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

function check(value: unknown, schema: LexiconSchema, base: string, path: string, lexicons: Lexicons, issues: ValidationIssue[], depth: number): void {
    if (depth > 32 || issues.length >= 50) return;
    const fail = (code: ValidationIssue['code'], detail?: string): void => {
        issues.push({ path: path || '.', code, detail });
    };

    switch (schema.type) {
        case 'ref': {
            const target = schema.ref ? findDef(lexicons, schema.ref, base) : undefined;
            if (target) check(value, target.schema, target.id, path, lexicons, issues, depth + 1);
            return;
        }
        case 'union': {
            if (typeOf(value) !== 'object') return fail('type', 'object');
            const type = (value as Record<string, unknown>).$type;
            if (typeof type !== 'string') return fail('required', '$type');
            const refs = (schema.refs ?? []).map((ref) => {
                const [idPart, fragment] = ref.split('#');
                const id = idPart || base;
                return { ref, full: fragment && fragment !== 'main' ? `${id}#${fragment}` : id };
            });
            const match = refs.find((candidate) => candidate.full === type.replace(/#main$/, ''));
            if (!match) {
                if (schema.closed) fail('union', type);
                return;
            }
            const target = findDef(lexicons, match.ref, base);
            if (target) check(value, target.schema, target.id, path, lexicons, issues, depth + 1);
            return;
        }
        case 'record':
            if (schema.record) check(value, schema.record, base, path, lexicons, issues, depth + 1);
            return;
        case 'object': {
            if (typeOf(value) !== 'object') return fail('type', 'object');
            const object = value as Record<string, unknown>;
            for (const key of schema.required ?? []) {
                if (object[key] === undefined) issues.push({ path: path ? `${path}.${key}` : key, code: 'required' });
            }
            for (const [key, property] of Object.entries(schema.properties ?? {})) {
                const child = object[key];
                if (child === undefined) continue;
                if (child === null && schema.nullable?.includes(key)) continue;
                check(child, property, base, path ? `${path}.${key}` : key, lexicons, issues, depth + 1);
            }
            return;
        }
        case 'array': {
            if (!Array.isArray(value)) return fail('type', 'array');
            if (schema.maxLength !== undefined && value.length > schema.maxLength) fail('max-length', String(schema.maxLength));
            if (schema.minLength !== undefined && value.length < schema.minLength) fail('min-length', String(schema.minLength));
            if (schema.items) value.forEach((item, index) => check(item, schema.items!, base, `${path}[${index}]`, lexicons, issues, depth + 1));
            return;
        }
        case 'string': {
            if (typeof value !== 'string') return fail('type', 'string');
            if (schema.const !== undefined && value !== schema.const) fail('const', String(schema.const));
            if (schema.enum && !schema.enum.includes(value)) fail('enum', schema.enum.join(' | '));
            if (schema.maxLength !== undefined && utf8Length(value) > schema.maxLength) fail('max-length', String(schema.maxLength));
            if (schema.minLength !== undefined && utf8Length(value) < schema.minLength) fail('min-length', String(schema.minLength));
            if (schema.maxGraphemes !== undefined && value.length > schema.maxGraphemes && graphemes(value) > schema.maxGraphemes) fail('max-graphemes', String(schema.maxGraphemes));
            if (schema.minGraphemes !== undefined && graphemes(value) < schema.minGraphemes) fail('min-graphemes', String(schema.minGraphemes));
            if (schema.format && FORMATS[schema.format] && !FORMATS[schema.format](value)) fail('format', schema.format);
            return;
        }
        case 'integer': {
            if (typeof value !== 'number' || !Number.isInteger(value)) return fail('type', 'integer');
            if (schema.const !== undefined && value !== schema.const) fail('const', String(schema.const));
            if (schema.enum && !schema.enum.includes(value)) fail('enum', schema.enum.join(' | '));
            if (schema.minimum !== undefined && value < schema.minimum) fail('range', `>= ${schema.minimum}`);
            if (schema.maximum !== undefined && value > schema.maximum) fail('range', `<= ${schema.maximum}`);
            return;
        }
        case 'boolean':
            if (typeof value !== 'boolean') fail('type', 'boolean');
            return;
        case 'blob': {
            const blob = value as Record<string, any>;
            if (typeOf(value) !== 'object' || (blob.$type !== 'blob' && typeof blob.cid !== 'string')) return fail('type', 'blob');
            const mime = String(blob.mimeType ?? '');
            if (schema.accept?.length && !schema.accept.some((pattern) => pattern === '*/*' || pattern === mime || (pattern.endsWith('/*') && mime.startsWith(pattern.slice(0, -1))))) fail('mime', schema.accept.join(', '));
            if (schema.maxSize !== undefined && typeof blob.size === 'number' && blob.size > schema.maxSize) fail('size', String(schema.maxSize));
            return;
        }
        case 'bytes':
            if (typeOf(value) !== 'object' || typeof (value as Record<string, unknown>).$bytes !== 'string') fail('type', 'bytes');
            return;
        case 'cid-link':
            if (typeOf(value) !== 'object' || typeof (value as Record<string, unknown>).$link !== 'string') fail('type', 'cid-link');
            return;
        default:
            return;
    }
}

export function validateRecord(value: unknown, nsid: string, lexicons: Lexicons): ValidationIssue[] | undefined {
    const main = lexicons.get(nsid)?.defs?.main;
    if (!main || main.type !== 'record') return undefined;
    const issues: ValidationIssue[] = [];
    if (typeOf(value) === 'object' && (value as Record<string, unknown>).$type !== nsid) {
        issues.push({ path: '$type', code: 'const', detail: nsid });
    }
    check(value, main, nsid, '', lexicons, issues, 0);
    return issues;
}

export function fieldSchema(lexicons: Lexicons, nsid: string, path: Array<string | number>, root: unknown): LexiconSchema | undefined {
    let found = findDef(lexicons, nsid, nsid);
    let value: unknown = root;
    if (found?.schema.type === 'record' && found.schema.record) found = { schema: found.schema.record, id: found.id };

    const settle = () => {
        for (let guard = 0; found && guard < 8; guard++) {
            const { schema, id } = found;
            if (schema.type === 'ref' && schema.ref) {
                found = findDef(lexicons, schema.ref, id);
            } else if (schema.type === 'union') {
                const type = typeof value === 'object' && value ? (value as Record<string, unknown>).$type : undefined;
                found = typeof type === 'string' ? findDef(lexicons, type, id) : undefined;
            } else {
                return;
            }
        }
    };

    for (const segment of path) {
        settle();
        if (!found) return undefined;
        const { schema, id }: { schema: LexiconSchema; id: string } = found;
        value = value && typeof value === 'object' ? (value as any)[segment] : undefined;
        if (typeof segment === 'number') {
            found = schema.type === 'array' && schema.items ? { schema: schema.items, id } : undefined;
        } else {
            const property = schema.properties?.[segment];
            found = property ? { schema: property, id } : undefined;
        }
    }

    return found?.schema;
}
