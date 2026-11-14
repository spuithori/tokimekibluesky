import { describe, it, expect } from 'vitest';
import {CARD_GAP, CARD_SERVICES, PROFILE_CARD_DEFS, detectProfileCards, matchIndexedServices, otherServiceCandidates, otherServicesCard, packPages, type CardContext } from './profileCards';
import type { AtmosphereIndexedService } from './registry';

function ids(collections: string[]) {
    return detectProfileCards(collections).map((def) => def.id);
}

function contextWith(responses: Record<string, unknown>, collections: string[] = [], now = Date.parse('2026-11-13T12:00:00Z')): CardContext & { urls: string[] } {
    const urls: string[] = [];
    const fetcher = (async (input: RequestInfo | URL) => {
        const url = String(input);
        urls.push(url);
        const key = Object.keys(responses).find((part) => url.includes(part));
        if (!key) {
            return new Response('{}', { status: 404 });
        }
        return new Response(JSON.stringify(responses[key]), { status: 200 });
    }) as typeof fetch;
    return { did: 'did:plc:them', handle: 'them.test', pds: 'https://pds.test', collections, fetcher, now, urls };
}

const def = (id: string) => PROFILE_CARD_DEFS.find((d) => d.id === id)!;

describe('detectProfileCards', () => {
    it('shows a card only for someone who has the content collection, not just an account on the service', () => {
        expect(ids(['site.mochott.profile', 'site.mochott.like'])).toEqual([]);
        expect(ids(['tech.tokimeki.kaku.preference', 'tech.tokimeki.poll.vote'])).toEqual([]);
        expect(ids(['site.mochott.article'])).toEqual(['mochott']);
    });

    it('does not match a collection that merely starts with a known one', () => {
        expect(ids(['site.mochott.articleDraft', 'tech.tokimeki.poll.pollResult'])).toEqual([]);
    });

    it('keeps the catalog order whatever order the repo lists its collections in', () => {
        expect(ids(['sh.tangled.repo', 'tech.tokimeki.kaku.post', 'app.bsky.feed.post', 'app.studynext.socialProfile', 'tech.tokimeki.poll.poll', 'site.mochott.article'])).toEqual(['mochott', 'poll', 'kaku', 'studynext', 'tangled']);
    });
});

describe('packPages', () => {
    it('never lets a page exceed the height of the profile card', () => {
        const heights = [100, 132, 124, 132, 100];
        for (const available of [140, 200, 251, 300, 420, 900]) {
            for (const page of packPages(heights, available)) {
                const used = page.reduce((sum, index) => sum + heights[index], 0) + CARD_GAP * (page.length - 1);
                expect(page.length === 1 || used <= available, `available=${available}`).toBe(true);
            }
        }
    });

    it('keeps every card exactly once', () => {
        const heights = [100, 132, 124, 132, 100];
        expect(packPages(heights, 251).flat().sort()).toEqual([0, 1, 2, 3, 4]);
    });

    it('opens each page with the earliest card left, then pulls in a later card that fits instead of leaving the page half empty', () => {
        expect(packPages([178, 222, 132, 104, 132, 178], 320)).toEqual([[0, 2], [1], [3, 4], [5]]);
    });

    it('fits two cards on a page only when the gap fits too', () => {
        expect(packPages([100, 132], 100 + CARD_GAP + 132)).toEqual([[0, 1]]);
        expect(packPages([100, 132], 100 + CARD_GAP + 131)).toEqual([[0], [1]]);
    });

    it('still gives a page to a card taller than the space, instead of dropping it', () => {
        expect(packPages([132, 132], 90)).toEqual([[0], [1]]);
    });

    it('returns no pages when there are no cards', () => {
        expect(packPages([], 300)).toEqual([]);
    });
});

describe('card loaders', () => {
    it('mochott: features the latest article with its cover and counts, and lists the next ones', async () => {
        const ctx = contextWith({
            'publication.getPublication': { publication: { name: 'しおりの文具帖' } },
            'article.getAuthorArticles': { articles: [
                { uri: 'at://did:plc:them/site.mochott.article/3abc', title: 'インク5色', slug: 'ink', description: '書き比べ', coverImage: JSON.stringify({ ref: { $link: 'bafycover' } }), likeCount: 24, commentCount: 3, publishedAt: '2026-11-10T00:00:00Z', author: { handle: 'them.test' } },
                { uri: 'at://did:plc:them/site.mochott.article/3def', title: '罫線', slug: null, coverImage: null, publishedAt: '2026-11-02T00:00:00Z', author: { handle: 'them.test' }, minisite: { slug: 'pens', globalSlug: null, customDomain: null } },
            ] },
        });
        const data = await def('mochott').load(ctx);
        expect(data?.title).toBe('しおりの文具帖');
        expect(data?.featured).toEqual({
            href: 'https://mochott.site/them.test/ink',
            external: true,
            title: 'インク5色',
            image: 'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:them/bafycover@jpeg',
            description: '書き比べ',
            date: '2026-11-10T00:00:00Z',
            likes: 24,
            comments: 3,
        });
        expect(data?.items).toEqual([{ href: 'https://mochott.site/them.test/s/pens/3def', external: true, title: '罫線', date: '2026-11-02T00:00:00Z' }]);
        expect(ctx.urls.length).toBe(2);
    });

    it('mochott: yields no card when the author has no articles, even with a publication', async () => {
        const ctx = contextWith({ 'publication.getPublication': { publication: { name: 'x' } }, 'article.getAuthorArticles': { articles: [] } });
        expect(await def('mochott').load(ctx)).toBeNull();
    });

    const pollRecord = (endsAt: string) => ({ records: [{ uri: 'at://did:plc:them/tech.tokimeki.poll.poll/1', value: { options: ['紙', 'デジタル'], endsAt, createdAt: '2026-11-12T00:00:00Z', subject: { uri: 'at://did:plc:them/app.bsky.feed.post/3post1' } } }] });

    it('poll: shows the result bars only once the poll has ended', async () => {
        const result = { isEnded: true, totalVotes: 8, options: [{ index: 0, text: '紙', count: 6 }, { index: 1, text: 'デジタル', count: 2 }] };
        const ended = await def('poll').load(contextWith({ 'listRecords': pollRecord('2026-11-01T00:00:00Z'), 'poll.getPoll': result }));
        expect(ended?.badgeKey).toBe('atmosphere_card_poll_closed');
        expect(ended?.poll?.options).toEqual([{ text: '紙', percent: 75 }, { text: 'デジタル', percent: 25 }]);
        expect(ended?.poll?.total).toBe(8);
        expect(ended?.poll?.href).toBe('/profile/did:plc:them/post/3post1');

        const open = await def('poll').load(contextWith({ 'listRecords': pollRecord('2026-11-20T00:00:00Z'), 'poll.getPoll': { ...result, isEnded: false } }));
        expect(open?.badgeKey).toBe('atmosphere_card_poll_open');
        expect(open?.poll?.options).toEqual([{ text: '紙', percent: undefined }, { text: 'デジタル', percent: undefined }]);
    });

    it('poll: uses the post text as the question without the poll link, and survives a missing result', async () => {
        const ctx = { ...contextWith({ 'listRecords': pollRecord('2026-11-20T00:00:00Z') }), getPostText: async () => '手帳は紙派? https://poll.tokimeki.tech/p/did:plc:them/1?options=2' };
        const data = await def('poll').load(ctx);
        expect(data?.poll?.question).toBe('手帳は紙派?');
        expect(data?.poll?.total).toBeUndefined();
        expect(data?.badgeKey).toBe('atmosphere_card_poll_open');
    });

    it('kaku: turns posts into thumbnails that open the drawing on KAKU', async () => {
        const ctx = contextWith({ 'kaku.getPostsByAuthor': { posts: [
            { uri: 'at://did:plc:them/tech.tokimeki.kaku.post/3k1', image: 'https://img.test/1.webp', createdAt: '2026-11-12T00:00:00Z' },
            { uri: 'at://did:plc:them/tech.tokimeki.kaku.post/3k2', image: 'https://img.test/2.webp', createdAt: '2026-11-11T00:00:00Z' },
        ] } });
        const data = await def('kaku').load(ctx);
        expect(data?.thumbs).toEqual([
            { src: 'https://img.test/1.webp', href: 'https://kaku.tokimeki.tech/post/did:plc:them/3k1' },
            { src: 'https://img.test/2.webp', href: 'https://kaku.tokimeki.tech/post/did:plc:them/3k2' },
        ]);
    });

    it('studynext: shows streak, week and month, and a live badge, only while each is still current', async () => {
        const social = { value: { rankingOptIn: true, updatedAt: '2026-11-13T11:00:00Z', activity: { date: '2026-11-13', streak: 12, weekStart: '2026-11-09', weekMinutes: 380, monthStart: '2026-11-01', monthMinutes: 1500 } } };
        const live = { value: { studying: true, shareStudying: true, openTo: 'invite-only', updatedAt: '2026-11-13T11:30:00Z' } };
        const fresh = await def('studynext').load(contextWith({ 'socialProfile': social, 'studynext.status': live }, ['app.studynext.socialProfile', 'app.studynext.status']));
        expect(fresh?.badgeKey).toBe('atmosphere_card_studying');
        expect(fresh?.stats?.map((stat) => stat.value)).toEqual(['12', '6:20', '25:00']);

        const later = Date.parse('2026-12-25T12:00:00Z');
        const stale = await def('studynext').load(contextWith({ 'socialProfile': social, 'studynext.status': live }, ['app.studynext.socialProfile', 'app.studynext.status'], later));
        expect(stale?.badgeKey).toBeUndefined();
        expect(stale?.stats?.map((stat) => stat.value)).toEqual(['0', '0:00', '0:00']);
    });

    it('studynext: respects the sharing switches', async () => {
        const social = { value: { rankingOptIn: true, activity: { date: '2026-11-13', streak: 3, weekStart: '2026-11-09', weekMinutes: 60 } } };
        const hidden = { value: { studying: true, shareStudying: false, updatedAt: '2026-11-13T11:30:00Z' } };
        const data = await def('studynext').load(contextWith({ 'socialProfile': social, 'studynext.status': hidden }, ['app.studynext.socialProfile', 'app.studynext.status']));
        expect(data?.badgeKey).toBeUndefined();

        const optedOut = { value: { ...social.value, rankingOptIn: false } };
        expect(await def('studynext').load(contextWith({ 'socialProfile': optedOut }, ['app.studynext.socialProfile']))).toBeNull();
    });

    it('tangled: reads the new namespace when the repo has it and falls back to the record key for the name', async () => {
        const next = contextWith({ 'listRecords': { records: [
            { uri: 'at://did:plc:them/org.tangled.repo.declaration/ink-swatch', value: { createdAt: '2026-11-10T00:00:00Z' } },
        ] } }, ['org.tangled.repo.declaration', 'sh.tangled.repo']);
        const data = await def('tangled').load(next);
        expect(next.urls.at(-1)).toContain('collection=org.tangled.repo.declaration');
        expect(data?.items).toEqual([{ title: 'ink-swatch', description: undefined, date: '2026-11-10T00:00:00Z', href: 'https://tangled.org/them.test/ink-swatch', external: true }]);

        const legacy = contextWith({ 'listRecords': { records: [
            { uri: 'at://did:plc:them/sh.tangled.repo/anote', value: { createdAt: '2026-10-01T00:00:00Z', description: 'notes for an agent' } },
            { uri: 'at://did:plc:them/sh.tangled.repo/x', value: { name: 'dotfiles', createdAt: '2026-11-01T00:00:00Z' } },
        ] } }, ['sh.tangled.repo']);
        const old = await def('tangled').load(legacy);
        expect(legacy.urls.at(-1)).toContain('collection=sh.tangled.repo');
        expect(old?.items?.map((item) => [item.title, item.description])).toEqual([['anote', 'notes for an agent'], ['dotfiles', undefined]]);
        expect(old?.updatedAt).toBe('2026-11-01T00:00:00Z');
    });

    const tangledRepo = (did: string, name: string, createdAt: string, description?: string) => ({ uri: `at://${did}/org.tangled.repo.manifest/self`, value: { createdAt, declaration: { name }, description } });

    it('tangled: puts pinned repositories first with their stars, and orders the monthly commits oldest first', async () => {
        const ctx = contextWith({
            'repo.listRepos': { total: 14, items: [
                tangledRepo('did:plc:r1', 'ink-swatch', '2026-11-08T00:00:00Z', '色見本'),
                tangledRepo('did:plc:r2', 'techo-template', '2026-09-01T00:00:00Z'),
                tangledRepo('did:plc:r3', 'dotfiles', '2026-03-01T00:00:00Z'),
            ] },
            'getRecord': { value: { pinnedRepositories: ['did:plc:r3'] } },
            'feed.countStars?subject=did%3Aplc%3Ar3': { count: 128 },
            'feed.countStars?subject=did%3Aplc%3Ar1': { count: 9 },
            'actor.getProfileActivity': { months: [{ start: '2026-11-01T00:00:00Z', commits: 31 }, { start: '2026-10-01T00:00:00Z', commits: 54 }] },
        }, ['org.tangled.repo.declaration', 'org.tangled.actor.profile']);
        const data = await def('tangled').load(ctx);
        expect(data?.repos?.items).toEqual([
            { title: 'dotfiles', description: undefined, date: '2026-03-01T00:00:00Z', stars: 128, href: 'https://tangled.org/them.test/dotfiles', external: true },
            { title: 'ink-swatch', description: '色見本', date: '2026-11-08T00:00:00Z', stars: 9, href: 'https://tangled.org/them.test/ink-swatch', external: true },
        ]);
        expect(data?.repos?.total).toBe(14);
        expect(data?.repos?.activity).toEqual([{ start: '2026-10-01T00:00:00Z', commits: 54 }, { start: '2026-11-01T00:00:00Z', commits: 31 }]);
        expect(data?.updatedAt).toBe('2026-11-08T00:00:00Z');
        expect(data?.items).toBeUndefined();
        expect(ctx.urls.length).toBe(5);
    });

    it('tangled: keeps the repositories when stars and activity are unavailable', async () => {
        const ctx = contextWith({ 'repo.listRepos': { items: [tangledRepo('did:plc:r1', 'ink-swatch', '2026-11-08T00:00:00Z')] } }, ['org.tangled.repo.declaration']);
        const data = await def('tangled').load(ctx);
        expect(data?.repos).toEqual({ items: [{ title: 'ink-swatch', description: undefined, date: '2026-11-08T00:00:00Z', stars: undefined, href: 'https://tangled.org/them.test/ink-swatch', external: true }], total: undefined, activity: [] });
    });

    it('tangled: leaves the chart out when no month has a commit', async () => {
        const ctx = contextWith({
            'repo.listRepos': { items: [tangledRepo('did:plc:r1', 'ink-swatch', '2026-11-08T00:00:00Z')] },
            'actor.getProfileActivity': { months: [{ start: '2026-11-01T00:00:00Z', commits: 0 }, { start: '2026-10-01T00:00:00Z', commits: 0 }] },
        }, ['org.tangled.repo.declaration']);
        expect((await def('tangled').load(ctx))?.repos?.activity).toEqual([]);
    });

    it('poll: hands the viewer and the live result to the card so that voting needs no second request', async () => {
        const result = { poll: { uri: 'at://did:plc:them/tech.tokimeki.poll.poll/1', cid: 'bafypoll' }, options: [{ index: 0, text: '紙', count: 1 }, { index: 1, text: 'デジタル', count: 0 }], totalVotes: 1, isEnded: false, myVote: 0 };
        const ctx = { ...contextWith({ 'listRecords': pollRecord('2026-11-20T00:00:00Z'), 'poll.getPoll': result }), viewerDid: 'did:plc:me' };
        const data = await def('poll').load(ctx);
        expect(ctx.urls.find((url) => url.includes('poll.getPoll'))).toContain('viewer=did%3Aplc%3Ame');
        expect(data?.poll?.viewer).toBe('did:plc:me');
        expect(data?.poll?.result).toEqual(result);
        expect(data?.poll?.uri).toBe('at://did:plc:them/tech.tokimeki.poll.poll/1');
    });

    it('standard.site: links through the publication url and leaves mochott articles to the mochott card', async () => {
        const ctx = contextWith({
            'listRecords': { records: [
                { value: { site: 'at://did:plc:them/site.standard.publication/pub1', title: 'Leaflet の記事', path: '/3abc', description: '旅のメモ', publishedAt: '2026-11-11T00:00:00Z' } },
                { value: { site: 'at://did:plc:them/site.standard.publication/pubm', title: 'mochott の記事', path: '/ink' } },
                { value: { site: 'https://blog.example.com/', title: '直接 URL の記事', path: 'posts/1' } },
                { value: { site: 'at://did:plc:other/site.standard.publication/x', title: '他人のパブリケーション', path: '/y' } },
                { value: { site: 'javascript:alert(1)', title: '不正な URL', path: '/z' } },
            ] },
            'rkey=pub1': { value: { url: 'https://shiori.leaflet.pub', name: 'しおりノート' } },
            'rkey=pubm': { value: { url: 'https://mochott.site/them.test', name: 'しおりの文具帖' } },
        });
        const data = await def('standard').load(ctx);
        expect(data?.featured?.href).toBe('https://shiori.leaflet.pub/3abc');
        expect(data?.featured?.description).toBe('旅のメモ');
        expect(data?.items).toEqual([{ title: '直接 URL の記事', href: 'https://blog.example.com/posts/1', external: true, date: undefined }]);
        expect(data?.title).toBe('しおりノート');
        expect(ctx.urls.filter((url) => url.includes('getRecord')).length).toBe(2);
    });

    it('standard.site: yields no card when every article belongs to mochott', async () => {
        const ctx = contextWith({
            'listRecords': { records: [{ value: { site: 'at://did:plc:them/site.standard.publication/pubm', title: 'mochott の記事', path: '/ink' } }] },
            'rkey=pubm': { value: { url: 'https://mochott.site/them.test' } },
        });
        expect(await def('standard').load(ctx)).toBeNull();
    });

    it('yields no card when the service does not answer', async () => {
        const ctx = contextWith({});
        expect(await def('kaku').load(ctx)).toBeNull();
        expect(await def('poll').load(ctx)).toBeNull();
        expect(await def('mochott').load(ctx)).toBeNull();
    });
});

describe('other services tile', () => {
    const indexed = (rkey: string, collections: string[]): AtmosphereIndexedService => ({
        uri: `at://did:plc:dev/tech.tokimeki.atmosphere.service/${rkey}`,
        did: 'did:plc:dev',
        rkey,
        pds: 'https://dev.pds.test',
        handle: 'dev.test',
        collections,
    });

    it('asks the index only about collections that neither Bluesky nor a dedicated card already covers', () => {
        expect(otherServiceCandidates([
            'app.bsky.feed.post', 'chat.bsky.actor.declaration', 'com.atproto.lexicon.schema', 'tools.ozone.set.value',
            'site.mochott.article', 'sh.tangled.repo', 'blue.takibi.post',
        ])).toEqual(['blue.takibi.post']);
        expect(otherServiceCandidates(['app.bsky.feed.post', 'site.mochott.article'])).toEqual([]);
    });

    it('matches services by exact collection, keeps the index order and caps the tile', () => {
        const index = [indexed('a', ['blue.takibi.post']), indexed('b', ['com.example.other']), indexed('c', ['com.example.note', 'blue.takibi.post'])];
        expect(matchIndexedServices(index, ['blue.takibi.post']).map((s) => s.rkey)).toEqual(['a', 'c']);
        expect(matchIndexedServices(index, ['blue.takibi'])).toEqual([]);
        const many = Array.from({ length: CARD_SERVICES + 5 }, (_, i) => indexed(`s${i}`, ['blue.takibi.post']));
        expect(matchIndexedServices(many, ['blue.takibi.post'])).toHaveLength(CARD_SERVICES);
    });

    it('links each service to its store page and drops the tile when no record can be read', async () => {
        const card = otherServicesCard([indexed('a', ['blue.takibi.post']), indexed('gone', ['blue.takibi.post'])]);
        const ctx = contextWith({ 'rkey=a': { value: { name: 'takibi', description: 'd', url: 'https://takibi.example/' } } });
        const data = await card.load(ctx);
        expect(data?.services?.map((s) => [s.entry.record.name, s.href])).toEqual([['takibi', '/atmosphere/did:plc:dev/a']]);
        expect(await card.load(contextWith({}))).toBeNull();
    });
});

