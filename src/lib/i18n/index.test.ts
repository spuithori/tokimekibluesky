import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const LOCALES = resolve(__dirname, 'locales');

const fetchMock = vi.fn(async (input: string | URL) => {
    const pathname = new URL(String(input), 'http://localhost/').pathname;
    const file = resolve(ROOT, '.' + pathname);
    if (!existsSync(file)) {
        return new Response('not found', { status: 404 });
    }
    return new Response(readFileSync(file), { status: 200, headers: { 'Content-Type': 'application/json' } });
});

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockClear();
});

const FETCHED: Record<string, string[]> = {
    ja: ['ja.json', 'languageMap/ja.json', 'labeling/ja.json', 'labelingInfo/ja.json'],
    en: ['en.json', 'languageMap/en.json', 'labeling/en.json', 'labelingInfo/en.json'],
    pt: ['pt.json'],
    ko: ['ko-kr.json', 'languageMap/ko-kr.json'],
    fa: ['fa.json'],
    ar: ['ar.json'],
    bg: ['bg.json', 'languageMap/bg.json'],
    'zh-CN': ['zh-cn.json', 'languageMap/zh-cn.json'],
    ru: ['ru.json', 'languageMap/ru.json'],
    fr: ['fr-fr.json', 'languageMap/fr-fr.json'],
    it: ['it.json', 'languageMap/it.json'],
};

async function loadAll(sources: any[]): Promise<Record<string, string>[]> {
    return Promise.all(sources.map(async (source) => {
        const mod = typeof source === 'function' ? await source() : source;
        return 'default' in mod && typeof mod.default === 'object' ? mod.default : mod;
    }));
}

describe('i18n dictionary loaders', () => {
    it('yield dictionaries identical to the JSON files for every registered locale', async () => {
        const { localeSources } = await import('./index');

        for (const [tag, files] of Object.entries(FETCHED)) {
            const sources = localeSources[tag];
            expect(Array.isArray(sources), tag).toBe(true);
            const loaded = await loadAll(sources as any[]);
            expect(loaded, tag).toHaveLength(files.length);
            files.forEach((file, i) => {
                const expected = JSON.parse(readFileSync(resolve(LOCALES, file), 'utf8'));
                expect(loaded[i], `${tag}:${file}`).toEqual(expected);
            });
        }

        expect(localeSources['pt-BR']).toBe('pt');
    });

    it('fetches only the large dictionaries and keeps the small ones as module imports', async () => {
        const { localeSources } = await import('./index');

        await loadAll(localeSources.ja as any[]);
        await loadAll(localeSources.en as any[]);
        await loadAll(localeSources.ar as any[]);

        const fetched = fetchMock.mock.calls.map(([input]) => new URL(String(input), 'http://localhost/').pathname);
        expect(fetched).toHaveLength(2);
        expect(fetched.some((p) => p.endsWith('/ja.json'))).toBe(true);
        expect(fetched.some((p) => p.endsWith('/en.json'))).toBe(true);
    });

    it('rejects like a failed module import when the dictionary request fails', async () => {
        const { dictionaryFromUrl } = await import('./index');
        await expect(dictionaryFromUrl('/nope/missing.json')()).rejects.toThrow('failed to load dictionary');
    });

    it('resolves translations through setLocale exactly as before', async () => {
        await import('./index');
        const { setLocale, t } = await import('tokimeki-i18n');
        const ja = JSON.parse(readFileSync(resolve(LOCALES, 'ja.json'), 'utf8'));
        const en = JSON.parse(readFileSync(resolve(LOCALES, 'en.json'), 'utf8'));

        await expect(setLocale('ja')).resolves.toBe('ja');
        expect(t('page_title_home')).toBe(ja.page_title_home);
        expect(t('dir')).toBe(en.dir);
    });
});

describe('completeLocales integration with the installed runtime', () => {
    it('applies ja as soon as the ja dictionaries are ready while en keeps loading in the background', async () => {
        let releaseEn!: () => void;
        const enGate = new Promise<void>((resolve) => { releaseEn = resolve; });
        const gated = vi.fn(async (input: string | URL) => {
            const pathname = new URL(String(input), 'http://localhost/').pathname;
            if (pathname.endsWith('/en.json')) {
                await enGate;
            }
            return fetchMock(input);
        });
        vi.stubGlobal('fetch', gated);

        const { localeSources } = await import('./index');
        const { setupI18n, setLocale, t, getLocale } = await import('tokimeki-i18n');
        setupI18n({ fallback: 'en', completeLocales: ['ja'], locales: localeSources });
        const ja = JSON.parse(readFileSync(resolve(LOCALES, 'ja.json'), 'utf8'));

        await expect(setLocale('ja')).resolves.toBe('ja');
        expect(getLocale()).toBe('ja');
        expect(t('page_title_home')).toBe(ja.page_title_home);
        expect(t('dir')).toBe('ltr');
        expect(gated.mock.calls.some(([input]) => String(input).endsWith('/en.json'))).toBe(true);

        releaseEn();
        await new Promise((r) => setTimeout(r, 0));
        expect(t('page_title_home')).toBe(ja.page_title_home);
    });
});
