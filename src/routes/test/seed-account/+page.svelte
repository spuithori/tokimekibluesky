<script lang="ts">
    import { accountsDb } from '$lib/db';
    import { defaultDeckSettings } from '$lib/components/deck/defaultDeckSettings';

    const DEFAULT_DID = 'did:plc:qualityloop000000000000';
    const DEFAULT_HANDLE = 'quality.test';

    function b64url(obj: Record<string, unknown>): string {
        return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function fakeJwt(did: string): string {
        const header = b64url({ typ: 'JWT', alg: 'HS256' });
        const payload = b64url({ scope: 'com.atproto.appPass', sub: did, iat: 1700000000, exp: 4102444800 });
        return `${header}.${payload}.quality-loop`;
    }

    function homeColumn(did: string, handle: string) {
        return {
            id: 'ql-home',
            algorithm: { type: 'default', name: 'HOME' },
            style: 'default',
            settings: { ...defaultDeckSettings },
            did,
            handle,
            data: { feed: [], cursor: '' },
        };
    }

    if (typeof window !== 'undefined') {
        (window as any).__seedTest = {
            ready: true,
            async seed(opts: { did?: string; handle?: string; columns?: unknown[]; settings?: Record<string, unknown>; appViewProxy?: string; isOAuth?: boolean } = {}) {
                const did = opts.did ?? DEFAULT_DID;
                const handle = opts.handle ?? DEFAULT_HANDLE;
                await accountsDb.accounts.put(opts.isOAuth ? {
                    id: 1,
                    service: 'https://pds.quality.test',
                    did,
                    oauthDid: did,
                    session: null,
                    avatar: '',
                    name: 'Quality Loop',
                    notification: ['reply', 'like', 'repost', 'follow', 'quote', 'mention'],
                    feeds: [],
                    lists: [],
                    isOAuth: true,
                } as any : {
                    id: 1,
                    service: 'https://pds.quality.test',
                    did,
                    session: {
                        did,
                        handle,
                        accessJwt: fakeJwt(did),
                        refreshJwt: fakeJwt(did),
                        active: true,
                    },
                    avatar: '',
                    name: 'Quality Loop',
                    notification: ['reply', 'like', 'repost', 'follow', 'quote', 'mention'],
                    feeds: [],
                    lists: [],
                    isOAuth: false,
                } as any);
                await accountsDb.profiles.put({
                    id: 1,
                    name: 'Quality Loop',
                    createdAt: '',
                    accounts: [1],
                    primary: 1,
                    columns: opts.columns ?? [homeColumn(did, handle)],
                    ...(opts.appViewProxy ? { appViewProxy: opts.appViewProxy } : {}),
                } as any);
                localStorage.setItem('currentProfile', '1');
                localStorage.setItem('isRepeater', 'true');
                if (opts.settings) {
                    localStorage.setItem('settings', JSON.stringify(opts.settings));
                }
                return true;
            },
            async clear() {
                await accountsDb.accounts.clear();
                await accountsDb.profiles.clear();
                localStorage.removeItem('currentProfile');
                localStorage.removeItem('isRepeater');
                localStorage.removeItem('settings');
                localStorage.removeItem('currentTimeline');
                return true;
            },
        };
    }
</script>

<p data-testid="seed-account-ready">seed-account harness</p>
