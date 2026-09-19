// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { AI_FEATURES, AI_POLICY_VERSION } from '$lib/ai-policy';
import { AVATAR_ICON } from '$lib/columnAvatar';
import { defaultDeckSettings } from '$lib/components/deck/defaultDeckSettings';
import type { Column } from '$lib/types/column';

const { store } = vi.hoisted(() => ({
    store: {
        design: { defaultColumnIcon: 'icon' as 'icon' | 'avatar' },
        general: { autoColumnIcon: false, aiPolicyConsent: '' },
    },
}));

vi.mock('$lib/settings/settings.svelte', () => ({ settingsStore: store }));

import * as addColumnModule from './addColumnWithIcon';
import { addColumnWithIcon } from './addColumnWithIcon';

const AVATAR = 'https://cdn.bsky.app/img/avatar/plain/did:plc:test/bafkrei@jpeg';

function makeState() {
    const map = new Map<string, Column>();
    const lookups = { count: 0 };
    return {
        lookups,
        add: vi.fn((column: Column) => { map.set(column.id, column); }),
        get columnById() {
            lookups.count++;
            return map;
        },
        peek: (id: string) => map.get(id)!,
    };
}

function column(algorithm: Column['algorithm'], settings: Column['settings'] = defaultDeckSettings): Column {
    return { id: 'c1', algorithm, style: 'default', settings, did: 'did:plc:test', data: { feed: [], cursor: '' } };
}

const feed = (avatar?: string, name = 'ねこ') => column({ type: 'custom', algorithm: 'at://x', name, avatar });

function consent(enabled: boolean, version = AI_POLICY_VERSION) {
    store.general.autoColumnIcon = enabled;
    store.general.aiPolicyConsent = version;
}

describe('addColumnWithIcon', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        store.design.defaultColumnIcon = 'icon';
        consent(false, '');
        fetchMock = vi.fn(async (_input: string) => ({ ok: true, json: async () => ({ icon: 'cat' }) }));
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    async function added(state: ReturnType<typeof makeState>) {
        await vi.waitFor(() => expect(fetchMock.mock.results.length === 0 || state.peek('c1').settings.icon !== undefined).toBe(true));
        await new Promise(resolve => setTimeout(resolve, 0));
        return state.peek('c1').settings.icon ?? null;
    }

    describe('優先順位', () => {
        it('アイコン設定・自動無効: 種別アイコンのまま、通信しない', async () => {
            const state = makeState();
            addColumnWithIcon(state, feed(AVATAR), '猫');
            expect(await added(state)).toBeNull();
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('アイコン設定・自動有効: アバターの有無に関係なく判定が入る', async () => {
            consent(true);
            const state = makeState();
            addColumnWithIcon(state, feed(AVATAR), '猫');
            expect(await added(state)).toBe('cat');
        });

        it('アバター設定・アバター有: 自動が有効でもアバターにして通信しない', async () => {
            store.design.defaultColumnIcon = 'avatar';
            consent(true);
            const state = makeState();
            addColumnWithIcon(state, feed(AVATAR), '猫');
            expect(await added(state)).toBe(AVATAR_ICON);
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('アバター設定・アバター無・自動無効: 種別アイコンのまま', async () => {
            store.design.defaultColumnIcon = 'avatar';
            const state = makeState();
            addColumnWithIcon(state, feed(), '猫');
            expect(await added(state)).toBeNull();
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('アバター設定・アバター無・自動有効: 判定が入る', async () => {
            store.design.defaultColumnIcon = 'avatar';
            consent(true);
            const state = makeState();
            addColumnWithIcon(state, feed(), '猫');
            expect(await added(state)).toBe('cat');
        });
    });

    describe('同意ゲート', () => {
        it('トグル ON でも未同意なら通信しない', () => {
            consent(true, '');
            addColumnWithIcon(makeState(), feed(), '猫');
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('旧版への同意では通信しない', () => {
            consent(true, '2000-01-01.v1');
            addColumnWithIcon(makeState(), feed(), '猫');
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('同意済みでもトグル OFF なら通信しない', () => {
            consent(false);
            addColumnWithIcon(makeState(), feed(), '猫');
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('無効時は columnById を読まない(既定状態のカラム追加に余計な計算を足さない)', () => {
            const state = makeState();
            addColumnWithIcon(state, feed(), '猫');
            expect(state.lookups.count).toBe(0);
        });
    });

    describe('送信内容と結果の扱い', () => {
        beforeEach(() => consent(true));

        it('送るのはフィード名・説明文・同意した文書の版だけ', async () => {
            const state = makeState();
            addColumnWithIcon(state, feed(undefined, 'ねこ部'), '猫の写真');
            await added(state);
            const params = new URL(fetchMock.mock.calls[0][0] as string, 'http://localhost').searchParams;
            expect([...params.keys()]).toEqual(['name', 'description', 'policy']);
            expect(params.get('policy')).toBe(AI_POLICY_VERSION);
            expect(params.get('name')).toBe('ねこ部');
            expect(params.get('description')).toBe('猫の写真');
        });

        it('名前は 100 字・説明文は 300 字に切り詰める', async () => {
            const state = makeState();
            addColumnWithIcon(state, feed(undefined, 'n'.repeat(150)), 'd'.repeat(500));
            await added(state);
            const params = new URL(fetchMock.mock.calls[0][0] as string, 'http://localhost').searchParams;
            expect(params.get('name')).toHaveLength(100);
            expect(params.get('description')).toHaveLength(300);
        });

        it('カスタムフィード以外・アイコン設定済みは通信しない', () => {
            addColumnWithIcon(makeState(), column({ type: 'officialList', algorithm: 'at://x' }));
            addColumnWithIcon(makeState(), column({ type: 'custom', algorithm: 'at://x' }, { icon: 'dog' }));
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('判定保留・HTTP エラー・例外では何も変えない', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            for (const impl of [
                async () => ({ ok: true, json: async () => ({ icon: null }) }),
                async () => ({ ok: false, json: async () => ({ icon: 'cat' }) }),
                async () => { throw new Error('offline'); },
            ]) {
                fetchMock.mockImplementationOnce(impl as any);
                const state = makeState();
                addColumnWithIcon(state, feed(), '猫');
                await new Promise(resolve => setTimeout(resolve, 0));
                expect(state.peek('c1').settings).toBe(defaultDeckSettings);
            }
        });

        it('待機中にユーザーが手動でアイコンを選んだら上書きしない', async () => {
            const state = makeState();
            fetchMock.mockImplementationOnce(async () => {
                const target = state.peek('c1');
                target.settings = { ...target.settings, icon: 'dog' };
                return { ok: true, json: async () => ({ icon: 'cat' }) };
            });
            addColumnWithIcon(state, feed(), '猫');
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(state.peek('c1').settings.icon).toBe('dog');
        });

        it('共有の defaultDeckSettings を破壊しない', async () => {
            const state = makeState();
            addColumnWithIcon(state, feed(), '猫');
            await added(state);
            expect(defaultDeckSettings.icon).toBeNull();
        });
    });
});

describe('AI 送信経路の不変条件', () => {
    const root = join(process.cwd(), 'src');

    function sourceFiles(dir: string): string[] {
        return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) {
                return sourceFiles(path);
            }
            return /\.(ts|js|svelte)$/.test(entry.name) && !/\.(test|spec)\.(ts|js)$/.test(entry.name) ? [path] : [];
        });
    }

    const files = sourceFiles(root).map(path => ({ path: relative(root, path).split(sep).join('/'), text: readFileSync(path, 'utf8') }));
    const containing = (needle: string | RegExp) => files.filter(file => typeof needle === 'string' ? file.text.includes(needle) : needle.test(file.text)).map(file => file.path).sort();

    it('AI エンドポイントのパスを書けるのはレジストリだけ', () => {
        expect(containing('/api/ai/')).toEqual(['lib/ai-policy.ts']);
    });

    it('エンドポイント URL を組み立てて送信できるのは ai/client.ts だけ', () => {
        expect(containing('aiEndpoint(')).toEqual(['lib/ai-policy.ts', 'lib/ai/client.ts']);
    });

    it('レジストリの機能とサーバールートが一致する', () => {
        const routes = readdirSync(join(root, 'routes/(app)/api/ai'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => `/api/ai/${entry.name}`).sort();
        expect(routes).toEqual(AI_FEATURES.map(feature => feature.endpoint).sort());
    });

    it('全 AI ルートが同意した版を検証する', () => {
        for (const feature of AI_FEATURES) {
            const route = files.find(file => file.path === `routes/(app)${feature.endpoint}/+server.ts`);
            expect(route?.text).toContain('rejectStalePolicy(url)');
        }
    });

    it('AI SDK を import できるのは lib/server だけ、全呼び出しが ZDR と学習利用禁止を指定する', () => {
        const importing = containing(/from 'ai'/);
        expect(importing.every(path => path.startsWith('lib/server/'))).toBe(true);
        for (const path of importing) {
            const text = files.find(file => file.path === path)!.text;
            expect(text).toContain('zeroDataRetention: true');
            expect(text).toContain('disallowPromptTraining: true');
        }
    });

    it('addColumnWithIcon モジュールが公開するのは入口だけ', () => {
        expect(Object.keys(addColumnModule)).toEqual(['addColumnWithIcon']);
    });
});
