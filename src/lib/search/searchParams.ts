import {
    ARRAY_FILTER_KEYS as ARRAY_KEYS,
    BOOL_FILTER_KEYS as BOOL_KEYS,
    STRING_FILTER_KEYS as STRING_KEYS,
    type searchFilters,
} from '$lib/search/filterSpec';

export type ParsedSearch = {
    query: string,
    sort: 'top' | 'latest',
    filters: searchFilters,
};

function parseBool(value: string): boolean | undefined {
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return undefined;
}

export function parseSearchParams(searchParams: URLSearchParams): ParsedSearch {
    const filters: searchFilters = {};

    for (const key of ARRAY_KEYS) {
        const values = searchParams.getAll(key).filter(v => v !== '');
        if (values.length) (filters as any)[key] = values;
    }

    for (const key of BOOL_KEYS) {
        const raw = searchParams.get(key);
        if (raw !== null) {
            const b = parseBool(raw);
            if (b !== undefined) (filters as any)[key] = b;
        }
    }

    for (const key of STRING_KEYS) {
        const raw = searchParams.get(key);
        if (raw) (filters as any)[key] = raw;
    }

    let query = (searchParams.get('q') || '').trim();

    const langMatches = [...query.matchAll(/\blang:(\S+)/g)].map(m => m[1]);
    if (langMatches.length) {
        const langs = new Set([...(filters.languages || []), ...langMatches]);
        filters.languages = [...langs];
        query = query.replace(/\blang:\S+/g, '').trim();
    }

    const fromMatches = [...query.matchAll(/\bfrom:(\S+)/g)].map(m => m[1]);
    if (fromMatches.length) {
        const authors = new Set([...(filters.authors || []), ...fromMatches]);
        filters.authors = [...authors];
        query = query.replace(/\bfrom:\S+/g, '').trim();
    }

    query = query.replace(/\s{2,}/g, ' ').trim();

    const sort: 'top' | 'latest' = searchParams.get('sort') === 'top' ? 'top' : 'latest';

    return { query, sort, filters };
}

function serialize(query: string, sort: 'top' | 'latest', filters: searchFilters, sortArrays: boolean): string {
    const params = new URLSearchParams();
    const q = (query || '').trim();
    if (q) params.set('q', q);
    if (sort === 'top') params.set('sort', 'top');

    for (const key of ARRAY_KEYS) {
        const values = (filters as any)[key] as string[] | undefined;
        if (values?.length) {
            const list = sortArrays ? [...values].sort() : values;
            for (const v of list) {
                if (v) params.append(key, v);
            }
        }
    }

    for (const key of BOOL_KEYS) {
        const value = (filters as any)[key] as boolean | undefined;
        if (value === true || value === false) params.set(key, value ? 'true' : 'false');
    }

    for (const key of STRING_KEYS) {
        const value = (filters as any)[key] as string | undefined;
        if (value) params.set(key, value);
    }

    return params.toString();
}

export function buildSearchQuery(input: ParsedSearch): string {
    return serialize(input.query, input.sort, input.filters, false);
}

export function searchColumnId(input: ParsedSearch): string {
    const canonical = serialize(input.query, input.sort, input.filters, true);
    return canonical ? 'search_' + canonical : 'search_empty';
}

export function isEmptySearch(input: ParsedSearch): boolean {
    return serialize(input.query, 'latest', input.filters, true) === '';
}

export function countActiveFilters(filters: searchFilters): number {
    let count = 0;
    for (const key of ARRAY_KEYS) {
        if (((filters as any)[key] as string[] | undefined)?.length) count++;
    }
    for (const key of BOOL_KEYS) {
        if ((filters as any)[key] === true || (key === 'allTime' && (filters as any)[key] === false)) count++;
    }
    for (const key of STRING_KEYS) {
        if ((filters as any)[key]) count++;
    }
    return count;
}
