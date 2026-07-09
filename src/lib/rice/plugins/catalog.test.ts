import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PLUGIN_APPVIEW, getPlugins, getUpdates, searchPlugins, updatedPluginIds } from './catalog';
import { RicePluginError } from './types';

const at = (uri: string, entryCid: string) => ({ source: { kind: 'at' as const, uri, entryCid } });
const url = (manifestUrl: string) => ({ source: { kind: 'url' as const, manifestUrl } });

describe('updatedPluginIds', () => {
    it('ピン留めした CID と違うときだけ更新とみなす', () => {
        const installed = { aurora: at('at://a/c/aurora', 'bafkrei-old') };
        expect(updatedPluginIds(installed, [{ uri: 'at://a/c/aurora', latestVersion: '2.0.0', latestCid: 'bafkrei-new' }])).toEqual(['aurora']);
        expect(updatedPluginIds(installed, [{ uri: 'at://a/c/aurora', latestVersion: '2.0.0', latestCid: 'bafkrei-old' }])).toEqual([]);
    });

    it('カタログが新しい version を主張しても CID が同じなら更新ではない', () => {
        const installed = { aurora: at('at://a/c/aurora', 'bafkrei-same') };
        const updates = [{ uri: 'at://a/c/aurora', latestVersion: '99.0.0', latestCid: 'bafkrei-same' }];
        expect(updatedPluginIds(installed, updates)).toEqual([]);
    });

    it('sideload(URL)のプラグインはカタログの対象外', () => {
        const installed = { local: url('https://example.com/manifest.json') };
        expect(updatedPluginIds(installed, [{ uri: 'at://a/c/local', latestVersion: '2', latestCid: 'x' }])).toEqual([]);
    });

    it('カタログに載っていないプラグインは更新なし扱い', () => {
        expect(updatedPluginIds({ aurora: at('at://a/c/aurora', 'x') }, [])).toEqual([]);
    });
});

describe('catalog client', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function ok(body: unknown) {
        return Promise.resolve({ ok: true, status: 200, json: async () => body } as Response);
    }

    it('getPlugins は AppView の XRPC を叩く', async () => {
        fetchMock.mockReturnValue(ok({ plugins: [], cursor: '50' }));
        const page = await getPlugins({ limit: 10, sort: 'recent', verifiedOnly: true });

        expect(page.cursor).toBe('50');
        const called = new URL(fetchMock.mock.calls[0][0]);
        expect(called.origin + called.pathname).toBe(`${PLUGIN_APPVIEW}/xrpc/tech.tokimeki.plugin.getPlugins`);
        expect(called.searchParams.get('limit')).toBe('10');
        expect(called.searchParams.get('sort')).toBe('recent');
        expect(called.searchParams.get('verifiedOnly')).toBe('true');
    });

    it('未指定のパラメータは送らない', async () => {
        fetchMock.mockReturnValue(ok({ plugins: [] }));
        await getPlugins();
        const called = new URL(fetchMock.mock.calls[0][0]);
        expect([...called.searchParams.keys()]).toEqual([]);
    });

    it('searchPlugins は q を必須で送る', async () => {
        fetchMock.mockReturnValue(ok({ plugins: [] }));
        await searchPlugins('aurora');
        expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('q')).toBe('aurora');
    });

    it('getUpdates は 100 件ずつに分割する', async () => {
        fetchMock.mockReturnValue(ok({ updates: [] }));
        const uris = Array.from({ length: 250 }, (_, i) => `at://did:plc:a/c/p${i}`);
        await getUpdates(uris);

        expect(fetchMock).toHaveBeenCalledTimes(3);
        const counts = fetchMock.mock.calls.map((call) => new URL(call[0]).searchParams.getAll('uris').length);
        expect(counts).toEqual([100, 100, 50]);
    });

    it('getUpdates は空配列ならネットワークを叩かない', async () => {
        expect(await getUpdates([])).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('HTTP エラーを RicePluginError にする', async () => {
        fetchMock.mockReturnValue(Promise.resolve({ ok: false, status: 503 } as Response));
        await expect(getPlugins()).rejects.toThrow(RicePluginError);
        await expect(getPlugins()).rejects.toThrow(/HTTP 503/);
    });

    it('ネットワーク断も RicePluginError にする', async () => {
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
        await expect(getPlugins()).rejects.toThrow(/カタログに接続できません/);
    });
});
