import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$app/navigation', () => ({ goto: vi.fn(async () => {}) }));
vi.mock('$lib/resumeAccountsSession', () => ({
    startAccountsResume: vi.fn(() => ({ perAccount: new Map(), all: Promise.resolve(new Map()) })),
}));
vi.mock('$lib/stores', async () => {
    const { writable } = await import('svelte/store');
    return { agent: writable(undefined), agents: writable(new Map()) };
});
vi.mock('$lib/db', () => ({
    accountsDb: {
        profiles: {
            get: vi.fn(async () => null),
            update: vi.fn(async () => 1),
            put: vi.fn(async () => 1),
        },
    },
}));
vi.mock('$lib/classes/settingsState.svelte', () => ({
    settingsState: { settings: { markedUnread: false } },
}));

import { appState } from '$lib/classes/appState.svelte';
import { createRealColumnState } from '$lib/classes/columnState.perf.harness.svelte';

type MockAgent = { did: () => string; label: string };

function makeAgent(did: string, label: string): MockAgent {
    return { did: () => did, label };
}

function buildAgentsByDid(agentList: MockAgent[]): Map<string, MockAgent> {
    const m = new Map<string, MockAgent>();
    for (const a of agentList) {
        const d = a.did();
        if (d) m.set(d, a);
    }
    return m;
}

function resolveColumnAgentLikeDeckRow(
    agentsByDid: Map<string, MockAgent>,
    columnDid: string,
    primaryAgent: MockAgent,
    agentProp: MockAgent | undefined = undefined,
): MockAgent {
    return agentProp ?? (agentsByDid.get(columnDid) || primaryAgent);
}

const HON = makeAgent('did:plc:hon', 'HONACCOUNT');
const SUB = makeAgent('did:plc:sub', 'SUBACCOUNT');

const ACCOUNT_B = makeAgent('did:plc:b', 'ACCOUNT_B');

function status(phase: string) {
    return { phase, attempt: 0, handle: 'x', accountId: 0 } as any;
}

beforeEach(() => {
    appState.resumeStatus = {};
});

describe('通常フロー: 本垢もサブ垢もログイン維持したままカラムを行き来する', () => {
    it('サブ垢カラムは gate=mount かつサブ垢agentへ解決し、本垢へフォールバックしない(残留は構造的に起きない)', () => {
        const agentsByDid = buildAgentsByDid([HON, SUB]);
        appState.resumeStatus = {
            'did:plc:hon': status('resumed'),
            'did:plc:sub': status('resumed'),
        };

        expect(appState.getColumnResumeGate(agentsByDid, 'did:plc:sub')).toBe('mount');

        const driver = resolveColumnAgentLikeDeckRow(agentsByDid, 'did:plc:sub', HON);
        expect(driver).toBe(SUB);
        expect(driver.label).toBe('SUBACCOUNT');
    });

    it('本垢カラムも本垢agentへ解決する(相互に独立)', () => {
        const agentsByDid = buildAgentsByDid([HON, SUB]);
        expect(appState.getColumnResumeGate(agentsByDid, 'did:plc:hon')).toBe('mount');
        expect(resolveColumnAgentLikeDeckRow(agentsByDid, 'did:plc:hon', SUB)).toBe(HON);
    });
});

describe('③孤児カラム(除去済み垢): 修正後は gate=missing でDeckRowをマウントさせない', () => {
    it('handleDeleteAccount相当でresumeStatusを落とす(phase未定義化)と、gate は missing を返す', () => {
        const agentsByDid = buildAgentsByDid([HON]);
        appState.resumeStatus = {
            'did:plc:hon': status('resumed'),
            'did:plc:sub': status('resumed'),
        };

        appState.dropResumeStatus('did:plc:sub');

        expect(appState.getResumePhase('did:plc:sub')).toBeUndefined();
        expect(appState.getColumnResumeGate(agentsByDid, 'did:plc:sub')).toBe('missing');
    });

    it('一度もtrackされていない did の孤児カラムも missing', () => {
        const agentsByDid = buildAgentsByDid([HON]);
        appState.resumeStatus = { 'did:plc:hon': status('resumed') };

        expect(agentsByDid.has('did:plc:sub')).toBe(false);
        expect(appState.getResumePhase('did:plc:sub')).toBeUndefined();
        expect(appState.getColumnResumeGate(agentsByDid, 'did:plc:sub')).toBe('missing');
    });
});

describe('ユーザー報告手順(1.A+B追加 2.Aのカラム追加 3.Aを除去): 修正後はAカラムが missing でBに取得されない', () => {
    it('A除去+resumeStatus掃除後: gate=missing(DeckRow非マウント=Bで取得しない)、ハンドルはAのまま(カラムは削除しない)', () => {
        const agentsByDidAfterRemoveA = buildAgentsByDid([ACCOUNT_B]);
        appState.resumeStatus = {
            'did:plc:a': status('resumed'),
            'did:plc:b': status('resumed'),
        };
        const columnOwnedByA = { did: 'did:plc:a', handle: 'alice.bsky.social' };

        appState.dropResumeStatus('did:plc:a');

        expect(agentsByDidAfterRemoveA.has('did:plc:a')).toBe(false);
        expect(appState.getColumnResumeGate(agentsByDidAfterRemoveA, columnOwnedByA.did)).toBe('missing');
        expect(columnOwnedByA.handle).toBe('alice.bsky.social');
    });
});

describe('ブート一過性の保護: resume完了直後(phase=resumed・map追加目前)は mount のまま', () => {
    it('phase=resumed かつ agentsByDid未登録 → gate=mount(missingフラッシュ防止・従来挙動維持)', () => {
        const agentsByDidMidBoot = buildAgentsByDid([HON]);
        appState.resumeStatus = {
            'did:plc:hon': status('resumed'),
            'did:plc:sub': status('resumed'),
        };

        expect(agentsByDidMidBoot.has('did:plc:sub')).toBe(false);
        expect(appState.getColumnResumeGate(agentsByDidMidBoot, 'did:plc:sub')).toBe('mount');
    });
});

describe('dropResumeStatus: 該当didのみ除去し他は不変', () => {
    it('指定didのエントリだけ消える', () => {
        appState.resumeStatus = {
            'did:plc:a': status('resumed'),
            'did:plc:b': status('pending'),
        };

        appState.dropResumeStatus('did:plc:a');

        expect(appState.resumeStatus['did:plc:a']).toBeUndefined();
        expect(appState.resumeStatus['did:plc:b']?.phase).toBe('pending');
    });

    it('未知did/undefinedでも安全(no-op)', () => {
        appState.resumeStatus = { 'did:plc:b': status('pending') };

        appState.dropResumeStatus('did:plc:zzz');
        appState.dropResumeStatus(undefined);

        expect(appState.resumeStatus['did:plc:b']?.phase).toBe('pending');
    });
});

describe('門番が守る場合: サブ垢のresume phaseが追跡されていれば誤マウントしない', () => {
    const agentsByDid = buildAgentsByDid([HON]);

    it.each([
        ['pending', 'pending'],
        ['retrying', 'pending'],
        ['auth-required', 'failed'],
        ['unreachable', 'failed'],
    ])('phase=%s のとき gate=%s (=プレースホルダ表示で本垢agentのマウントを阻止)', (phase, expected) => {
        appState.resumeStatus = { 'did:plc:sub': status(phase) };
        expect(appState.getColumnResumeGate(agentsByDid, 'did:plc:sub')).toBe(expected);
    });

    it('サブ垢が resumed 済みなら agentsByDid に載るので gate=mount かつ正しいagentへ解決', () => {
        const withSub = buildAgentsByDid([HON, SUB]);
        appState.resumeStatus = { 'did:plc:sub': status('resumed') };
        expect(appState.getColumnResumeGate(withSub, 'did:plc:sub')).toBe('mount');
        expect(resolveColumnAgentLikeDeckRow(withSub, 'did:plc:sub', HON)).toBe(SUB);
    });
});

describe('居座り機構: カラムのdid/駆動agentが変わってもフィードは自動クリアされない', () => {
    it('孤児期間に書かれた本垢postsは、サブ垢agentが後から利用可能になっても保持され続ける(=居座り)。空になるのは明示clearFeed(強制更新)のみ', () => {
        const { cs, cleanup } = createRealColumnState();
        try {
            const honPosts = [{ post: { uri: 'at://hon/1', author: { did: 'did:plc:hon' } } }];
            cs.setFeed('col-sub', honPosts);
            expect(cs.getFeed('col-sub')).toEqual(honPosts);

            const agentsByDid = buildAgentsByDid([HON, SUB]);
            expect(resolveColumnAgentLikeDeckRow(agentsByDid, 'did:plc:sub', HON)).toBe(SUB);
            expect(cs.getFeed('col-sub')).toEqual(honPosts);

            cs.clearFeed('col-sub');
            expect(cs.getFeed('col-sub')).toEqual([]);
        } finally {
            cleanup();
        }
    });
});
