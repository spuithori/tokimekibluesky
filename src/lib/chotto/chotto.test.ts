import { describe, expect, it } from 'vitest';
import {
    announcementText,
    appendChottoLink,
    buildAnnouncement,
    bskyRecordUrl,
    chottoAttachments,
    stripChottoLink,
    withoutPostEmbeds,
    autoTitle,
    buildChottoArticle,
    buildDescription,
    extractTags,
    chottoBodyToEditorHtml,
    chottoBodyToPlainText,
    longPostDeleteTargets,
    findCidMismatches,
    groupChottoBody,
    parseChottoBody,
    readChottoRef,
    type BlobRef,
    type ChottoInput,
} from '$lib/chotto/chotto';
import { computeCid } from '$lib/components/editor/postUtil';

const DID = 'did:plc:abcdefghijklmnopqrstuvwx';
const POST = { uri: `at://${DID}/app.bsky.feed.post/3m4post000022`, cid: 'bafyreipost' };
const PROFILE = `at://${DID}/site.mochott.profile/self`;
const STD = `at://${DID}/site.standard.publication/3kexisting222`;
const CID_A = 'bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const CID_B = 'bafkreibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function blob(cid: string, mimeType = 'image/webp', size = 200_000): BlobRef {
    return { $type: 'blob', ref: { $link: cid }, mimeType, size };
}

function input(extra: Partial<ChottoInput> = {}): ChottoInput {
    return {
        did: DID,
        handle: 'alice.test',
        publication: { uri: PROFILE, standardPublication: STD },
        articleRkey: '3m4abcdefgh22',
        now: '2026-11-04T01:00:00.000Z',
        title: '',
        text: '今日は晴れ。\n@bob.test と https://example.com/ #日記',
        json: {
            type: 'doc',
            content: [
                { type: 'paragraph', content: [{ type: 'text', text: '今日は晴れ。' }] },
                {
                    type: 'paragraph',
                    content: [
                        { type: 'mention', attrs: { id: 'bob.test', label: null } },
                        { type: 'text', text: ' と ' },
                        { type: 'text', text: 'https://example.com/', marks: [{ type: 'link', attrs: { href: 'https://example.com/', target: '_blank', rel: 'noopener', class: null } }] },
                        { type: 'text', text: ' #日記' },
                    ],
                },
                { type: 'paragraph' },
            ],
        },
        images: [],
        labels: [],
        ...extra,
    };
}

describe('buildChottoArticle', () => {
    it('article は getPublication の profile を指し、document は投稿への参照つきで後から作る', () => {
        const article = buildChottoArticle(input());
        expect(article.write.$type).toBe('com.atproto.repo.applyWrites#create');
        expect(article.write.collection).toBe('site.mochott.article');
        expect(article.write.rkey).toBe('3m4abcdefgh22');
        expect(article.record.profile).toBe(PROFILE);
        expect(article.url).toBe('https://mochott.site/alice.test/3m4abcdefgh22');

        const doc = article.document!(POST);
        expect(doc.$type).toBe('com.atproto.repo.applyWrites#create');
        expect(doc.collection).toBe('site.standard.document');
        expect(doc.rkey).toBe('3m4abcdefgh22');
        expect(doc.value.site).toBe(STD);
        expect(doc.value.path).toBe('/3m4abcdefgh22');
        expect(doc.value.bskyPostRef).toEqual(POST);
    });

    it('standard の publication が無い、または本人のものでなければ document は書かない', () => {
        expect(buildChottoArticle(input({ publication: { uri: PROFILE } })).document).toBeUndefined();
        const other = 'at://did:plc:someoneelse0000000000000/site.standard.publication/3kexisting222';
        expect(buildChottoArticle(input({ publication: { uri: PROFILE, standardPublication: other } })).document).toBeUndefined();
    });

    it('本人の profile でない publication では組み立てない', () => {
        expect(() => buildChottoArticle(input({ publication: { uri: 'at://did:plc:someoneelse0000000000000/site.mochott.profile/self' } }))).toThrow();
    });

    it('article は mochott が受け付けるキーと形だけで組み立てる', () => {
        const article = buildChottoArticle(input({
            images: [{ blob: blob(CID_A), alt: '空', width: 1200.4, height: 800 }, { blob: blob(CID_B, 'image/gif'), alt: '' }],
            cover: blob(CID_A),
            labels: ['nudity'],
        }));
        const allowed = ['$type', 'profile', 'title', 'createdAt', 'path', 'textContent', 'description', 'tags', 'category', 'content', 'blobs', 'coverImage', 'updatedAt', 'labels', 'via'];
        expect(Object.keys(article.record).every(k => allowed.includes(k))).toBe(true);
        expect(article.record).toMatchObject({
            $type: 'site.mochott.article',
            title: '今日は晴れ。',
            path: '/3m4abcdefgh22',
            category: 'chotto',
            via: 'tech.tokimeki',
            tags: ['日記'],
            coverImage: blob(CID_A),
            labels: { $type: 'com.atproto.label.defs#selfLabels', values: [{ val: 'nudity' }] },
            blobs: [{ blobref: blob(CID_A) }, { blobref: blob(CID_B, 'image/gif') }],
        });
        expect((article.record.content as any).content).toEqual([
            { type: 'paragraph', content: [{ type: 'text', text: '今日は晴れ。' }] },
            {
                type: 'paragraph',
                content: [
                    { type: 'text', text: '@bob.test', marks: [{ type: 'link', attrs: { href: 'https://bsky.app/profile/bob.test' } }] },
                    { type: 'text', text: ' と ' },
                    { type: 'text', text: 'https://example.com/', marks: [{ type: 'link', attrs: { href: 'https://example.com/' } }] },
                    { type: 'text', text: ' #日記' },
                ],
            },
            { type: 'paragraph' },
            { type: 'image', attrs: { src: `/api/image/${DID}/${CID_A}`, alt: '空', width: 1200, height: 800 } },
            { type: 'image', attrs: { src: `/api/image/${DID}/${CID_B}` } },
        ]);
        expect(JSON.stringify(article.record)).not.toContain('null');
    });

    it('1MB を超える、または GIF の表紙は付けない', () => {
        expect(buildChottoArticle(input({ cover: blob(CID_A, 'image/webp', 1_000_001) })).record.coverImage).toBeUndefined();
        expect(buildChottoArticle(input({ cover: blob(CID_A, 'image/gif') })).record.coverImage).toBeUndefined();
    });

    it('入力したタイトルを優先する', () => {
        expect(buildChottoArticle(input({ title: '  題  ' })).record.title).toBe('題');
    });

    it('手元で計算した CID は JSON を経由しても変わらない', async () => {
        const article = buildChottoArticle(input({ images: [{ blob: blob(CID_A), alt: '' }], cover: blob(CID_A) }));
        const cid = await computeCid(article.record);
        expect(await computeCid(JSON.parse(JSON.stringify(article.record)))).toBe(cid);
    });

    it('エディターの JSON が無い下書きは本文から段落を作る', () => {
        const article = buildChottoArticle(input({ json: '', text: '一行目\n\n三行目' }));
        expect((article.record.content as any).content).toEqual([
            { type: 'paragraph', content: [{ type: 'text', text: '一行目' }] },
            { type: 'paragraph' },
            { type: 'paragraph', content: [{ type: 'text', text: '三行目' }] },
        ]);
    });
});

describe('タイトル・説明・タグ', () => {
    it('自動のタイトルは最初の空でない行を60字で切る', () => {
        expect(autoTitle('\n  \n  見出し  \n本文')).toBe('見出し');
        expect(autoTitle('あ'.repeat(61))).toBe('あ'.repeat(60) + '…');
    });

    it('説明は改行をつめて120字で切る', () => {
        expect(buildDescription('a\n\nb')).toBe('a b');
        expect(buildDescription('い'.repeat(130))).toBe('い'.repeat(120) + '…');
    });

    it('タグは重複と $ 始まりを除いて最大8個', () => {
        const text = Array.from({ length: 10 }, (_, i) => `#t${i}`).join(' ') + ' #t0 $USD';
        expect(extractTags(text)).toEqual(['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7']);
    });
});

describe('announcementText', () => {
    it('300字以内はそのまま', () => {
        expect(announcementText('短い本文')).toBe('短い本文');
    });

    it('300字に収まるように切って … を付ける', () => {
        const text = announcementText('あ'.repeat(400));
        expect([...new Intl.Segmenter().segment(text)].length).toBe(300);
        expect(text.endsWith('…')).toBe(true);
    });

    it('URL やタグの途中では切らない', () => {
        const head = 'あ'.repeat(290) + ' ';
        expect(announcementText(head + 'https://example.com/long/path')).toBe('あ'.repeat(290) + '…');
        expect(announcementText(head + '#ながいタグの名前です')).toBe('あ'.repeat(290) + '…');
    });
});

const RESERVE = 5;

function graphemes(text: string): number {
    return [...new Intl.Segmenter().segment(text)].length;
}

function doc(...paragraphs: unknown[][]) {
    return { type: 'doc', content: paragraphs.map(content => content.length ? { type: 'paragraph', content } : { type: 'paragraph' }) };
}

function link(text: string, href: string) {
    return { type: 'text', text, marks: [{ type: 'link', attrs: { href, target: '_blank', rel: 'noopener', class: null } }] };
}

function facetsOf(announcement: { text: string; json: unknown }) {
    const bytes = new TextEncoder().encode(announcement.text);
    const out: { text: string; uri: string }[] = [];
    let offset = 0;
    for (const block of (announcement.json as any).content) {
        if (offset > 0 || block !== (announcement.json as any).content[0]) offset += 1;
        for (const item of block.content ?? []) {
            const piece = item.type === 'hardBreak' ? '\n' : item.type === 'mention' ? '@' + item.attrs.id : item.text;
            const length = new TextEncoder().encode(piece).length;
            const href = item.marks?.find((m: any) => m.type === 'link')?.attrs.href;
            if (href) out.push({ text: new TextDecoder().decode(bytes.slice(offset, offset + length)), uri: href });
            offset += length;
        }
    }
    return out;
}

describe('buildAnnouncement(エディターの JSON から冒頭を切り出す)', () => {
    const budget = 300 - 1 - RESERVE;

    it('文字列に付けたリンクは、冒頭に収まればリンクのまま残す', () => {
        const json = doc([{ type: 'text', text: 'あ'.repeat(200) }, link('お店のサイト', 'https://example.com/shop'), { type: 'text', text: 'い'.repeat(200) }]);
        const a = buildAnnouncement(json, 'あ'.repeat(200) + 'お店のサイト' + 'い'.repeat(200), RESERVE);
        expect(graphemes(a.text)).toBe(budget + 1);
        expect(a.text.endsWith('い…')).toBe(true);
        expect(facetsOf(a)).toEqual([{ text: 'お店のサイト', uri: 'https://example.com/shop' }]);
    });

    it('リンクが切れ目にかかるときは、リンクの手前で切る(リンクの一部だけを残さない)', () => {
        const json = doc([{ type: 'text', text: 'あ'.repeat(budget - 3) }, link('https://example.com/very/long/path', 'https://example.com/very/long/path'), { type: 'text', text: '続き' }]);
        const a = buildAnnouncement(json, '', RESERVE);
        expect(a.text).toBe('あ'.repeat(budget - 3) + '…');
        expect(facetsOf(a)).toEqual([]);
    });

    it('リンクで終わるときも、… はリンクに含めない', () => {
        const url = 'https://example.com/a';
        const json = doc([{ type: 'text', text: 'あ'.repeat(budget - url.length - 1) + ' ' }, link(url, url), { type: 'text', text: ' ' + 'い'.repeat(100) }]);
        const a = buildAnnouncement(json, '', RESERVE);
        expect(a.text).toBe('あ'.repeat(budget - url.length - 1) + ' ' + url + '…');
        expect(facetsOf(a)).toEqual([{ text: url, uri: url }]);
    });

    it('メンションは途中で切らない', () => {
        const json = doc([{ type: 'text', text: 'あ'.repeat(budget - 4) }, { type: 'mention', attrs: { id: 'bob.test', label: null } }, { type: 'text', text: 'い'.repeat(50) }]);
        expect(buildAnnouncement(json, '', RESERVE).text).toBe('あ'.repeat(budget - 4) + '…');
    });

    it('段落と改行を保ち、切れ目の前の空行と空白は落とす', () => {
        const json = doc([], [{ type: 'text', text: '  一行目' }], [{ type: 'text', text: 'あ'.repeat(budget - 5) }, { type: 'hardBreak' }], [], [{ type: 'text', text: 'い'.repeat(100) }]);
        const a = buildAnnouncement(json, '', RESERVE);
        expect(a.text).toBe('一行目\n' + 'あ'.repeat(budget - 5) + '…');
        expect(a.json.content).toHaveLength(2);
    });

    it('最初のリンクだけで上限を超えるなら、リンクを外した文字列として切る', () => {
        const url = 'https://example.com/' + 'x'.repeat(400);
        const a = buildAnnouncement(doc([link(url, url)]), '', RESERVE);
        expect(graphemes(a.text)).toBe(budget + 1);
        expect(facetsOf(a)).toEqual([]);
    });

    it('text は JSON から作り直したものと一致する(publish の facet の位置がずれない)', () => {
        const json = doc([{ type: 'text', text: '😀'.repeat(150) }, link('リンク', 'https://example.com/'), { type: 'hardBreak' }, { type: 'text', text: '👨‍👩‍👧'.repeat(200) }]);
        const a = buildAnnouncement(json, '', RESERVE);
        expect(graphemes(a.text)).toBe(budget + 1);
        expect(facetsOf(a)).toEqual([{ text: 'リンク', uri: 'https://example.com/' }]);
    });

    it('JSON が無い下書きは本文の URL をリンクとして扱い、途中で切らない', () => {
        const a = buildAnnouncement(undefined, 'あ'.repeat(budget - 5) + ' https://example.com/long ' + 'い'.repeat(50), RESERVE);
        expect(a.text).toBe('あ'.repeat(budget - 5) + '…');
    });
});

describe('chottoAttachments(投稿の embed から記事の末尾の添付を作る)', () => {
    const image = (cid: string) => ({ image: blob(cid), alt: '空', aspectRatio: { width: 4, height: 3 } });
    const quoted = `at://did:plc:quoted0000000000000000000/app.bsky.feed.post/3m4quote00022`;

    it('画像は4枚までの images も、10枚までの gallery も記事の画像にする', () => {
        expect(chottoAttachments({ $type: 'app.bsky.embed.images', images: [image(CID_A), image(CID_B)] }).images)
            .toEqual([{ blob: blob(CID_A), alt: '空', width: 4, height: 3 }, { blob: blob(CID_B), alt: '空', width: 4, height: 3 }]);
        const gallery = { $type: 'app.bsky.embed.gallery', items: Array.from({ length: 10 }, () => ({ $type: 'app.bsky.embed.gallery#image', ...image(CID_A) })) };
        expect(chottoAttachments(gallery).images).toHaveLength(10);
    });

    it('リンクカードは linkCard、投稿の引用は Bluesky の埋め込みにする', () => {
        const external = { $type: 'app.bsky.embed.external', external: { uri: 'https://example.com/page', title: 'ページ', description: '説明', thumb: blob(CID_B, 'image/jpeg') } };
        expect(chottoAttachments(external).cards).toEqual([{ kind: 'link', url: 'https://example.com/page', title: 'ページ', description: '説明', thumb: blob(CID_B, 'image/jpeg') }]);
        expect(chottoAttachments({ $type: 'app.bsky.embed.record', record: { uri: quoted, cid: 'bafy' } }).cards).toEqual([{ kind: 'post', uri: quoted }]);
    });

    it('画像つきの引用は、画像のあとに引用を添える', () => {
        const embed = { $type: 'app.bsky.embed.recordWithMedia', media: { $type: 'app.bsky.embed.images', images: [image(CID_A)] }, record: { $type: 'app.bsky.embed.record', record: { uri: quoted, cid: 'bafy' } } };
        const { images, cards } = chottoAttachments(embed);
        expect(images).toHaveLength(1);
        expect(cards).toEqual([{ kind: 'post', uri: quoted }]);
    });

    it('フィードやリストの引用は bsky.app へのリンクカードにする', () => {
        const feed = `at://did:plc:quoted0000000000000000000/app.bsky.feed.generator/whats-hot`;
        expect(chottoAttachments({ $type: 'app.bsky.embed.record', record: { uri: feed, cid: 'bafy' } }, { title: '人気', description: 'よく見られている投稿' }).cards)
            .toEqual([{ kind: 'link', url: 'https://bsky.app/profile/did:plc:quoted0000000000000000000/feed/whats-hot', title: '人気', description: 'よく見られている投稿' }]);
    });

    it('記事では画像・リンクカード・引用の順に、本文の最後へまとめて置く', () => {
        const embed = {
            $type: 'app.bsky.embed.recordWithMedia',
            media: { $type: 'app.bsky.embed.external', external: { uri: 'https://example.com/page', title: 'ページ', description: '', thumb: blob(CID_B, 'image/jpeg') } },
            record: { $type: 'app.bsky.embed.record', record: { uri: quoted, cid: 'bafy' } },
        };
        const { images, cards } = chottoAttachments(embed);
        const { record } = buildChottoArticle(input({ images, cards }));
        const content = (record.content as any).content;
        expect(content.slice(-2)).toEqual([
            { type: 'linkCard', attrs: { url: 'https://example.com/page', title: 'ページ', image: `/api/image/${DID}/${CID_B}` } },
            { type: 'embed', attrs: { src: 'https://bsky.app/profile/did:plc:quoted0000000000000000000/post/3m4quote00022', service: 'bluesky', embedUrl: 'https://embed.bsky.app/embed/did:plc:quoted0000000000000000000/app.bsky.feed.post/3m4quote00022' } },
        ]);
        expect(content.slice(0, -2).every((block: any) => block.type === 'paragraph')).toBe(true);
        expect(record.blobs).toEqual([{ blobref: blob(CID_B, 'image/jpeg') }]);
    });

    it('bsky.app の URL にできない記録は添付しない', () => {
        expect(bskyRecordUrl('at://did:plc:x/app.bsky.actor.profile/self')).toBeUndefined();
        expect(chottoAttachments({ $type: 'app.bsky.embed.record', record: { uri: 'at://did:plc:x/app.bsky.actor.profile/self', cid: 'bafy' } }).cards).toEqual([]);
    });
});

describe('readChottoRef', () => {
    const uri = `at://${DID}/site.mochott.article/3m4abcdefgh22`;

    it('投稿者自身の記事への参照だけを読む', () => {
        expect(readChottoRef({ 'site.mochott.longPost': { uri, cid: 'bafy' } }, DID)).toEqual({ uri, cid: 'bafy' });
        expect(readChottoRef({ 'site.mochott.longPost': { uri, cid: 'bafy' } }, 'did:plc:other')).toBeNull();
        expect(readChottoRef({ 'site.mochott.longPost': { uri: `at://${DID}/app.bsky.feed.post/x`, cid: 'bafy' } }, DID)).toBeNull();
        expect(readChottoRef({}, DID)).toBeNull();
    });
});

describe('parseChottoBody', () => {
    it('段落・改行・リンク・画像を描画用に変換する', () => {
        expect(parseChottoBody({
            type: 'doc',
            content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'a' }, { type: 'hardBreak' }, { type: 'text', text: 'b', marks: [{ type: 'link', attrs: { href: 'https://x.test/' } }] }] },
                { type: 'paragraph' },
                { type: 'image', attrs: { src: `/api/image/${DID}/${CID_A}`, alt: '空', width: 10, height: 20 } },
            ],
        }, DID)).toEqual([
            { kind: 'paragraph', inlines: [{ kind: 'text', text: 'a' }, { kind: 'break' }, { kind: 'text', text: 'b', href: 'https://x.test/' }] },
            { kind: 'paragraph', inlines: [] },
            { kind: 'image', src: `https://mochott.site/api/image/${DID}/${CID_A}`, alt: '空', width: 10, height: 20 },
        ]);
    });

    it('想定外のノード・マーク・画像の参照先があれば null', () => {
        expect(parseChottoBody({ type: 'doc', content: [{ type: 'heading', content: [] }] }, DID)).toBeNull();
        expect(parseChottoBody({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a', marks: [{ type: 'bold' }] }] }] }, DID)).toBeNull();
        expect(parseChottoBody({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }] }, DID)).toBeNull();
        expect(parseChottoBody({ type: 'doc', content: [{ type: 'image', attrs: { src: `/api/image/did:plc:other/${CID_A}` } }] }, DID)).toBeNull();
        expect(parseChottoBody(null, DID)).toBeNull();
        expect(parseChottoBody({ type: 'doc', content: [{ type: 'linkCard', attrs: { url: 'javascript:alert(1)' } }] }, DID)).toBeNull();
        expect(parseChottoBody({ type: 'doc', content: [{ type: 'embed', attrs: { service: 'youtube', src: 'https://youtube.com/x' } }] }, DID)).toBeNull();
    });

    it('末尾の添付(リンクカードと Bluesky の埋め込み)を読む', () => {
        expect(parseChottoBody({
            type: 'doc',
            content: [
                { type: 'linkCard', attrs: { url: 'https://example.com/page', title: 'ページ', image: `/api/image/${DID}/${CID_B}` } },
                { type: 'embed', attrs: { src: 'https://bsky.app/profile/did:plc:q/post/3m4q', service: 'bluesky', embedUrl: 'https://embed.bsky.app/embed/did:plc:q/app.bsky.feed.post/3m4q' } },
            ],
        }, DID)).toEqual([
            { kind: 'card', url: 'https://example.com/page', title: 'ページ' },
            { kind: 'card', url: 'https://bsky.app/profile/did:plc:q/post/3m4q' },
        ]);
    });
});

describe('groupChottoBody', () => {
    it('連続する段落を改行でつなぎ、画像で区切り、末尾の空行を落とす', () => {
        expect(groupChottoBody([
            { kind: 'paragraph', inlines: [{ kind: 'text', text: 'a' }, { kind: 'break' }, { kind: 'text', text: 'b', href: 'https://x.test/' }] },
            { kind: 'paragraph', inlines: [] },
            { kind: 'paragraph', inlines: [{ kind: 'text', text: 'c' }] },
            { kind: 'paragraph', inlines: [] },
            { kind: 'image', src: 'https://mochott.site/api/image/x/y', alt: '' },
            { kind: 'paragraph', inlines: [] },
        ])).toEqual([
            { kind: 'text', segments: [{ text: 'a' }, { text: '\n' }, { text: 'b', href: 'https://x.test/' }, { text: '\n' }, { text: '\n' }, { text: 'c' }] },
            { kind: 'image', src: 'https://mochott.site/api/image/x/y', alt: '' },
        ]);
    });
});

describe('告知の末尾の「もっと見る」', () => {
    const url = 'https://mochott.site/alice.test/3m4abcdefgh22';

    it('「…もっと見る」まで含めて300字に収め、ラベルだけにリンクを付ける', () => {
        const head = announcementText('あ'.repeat(400), 5);
        const { text, facets } = appendChottoLink(head, [], 'もっと見る', url);
        expect([...new Intl.Segmenter().segment(text)].length).toBe(300);
        expect(text.endsWith('…もっと見る')).toBe(true);
        const bytes = new TextEncoder().encode(text);
        const facet = facets.at(-1)!;
        expect(new TextDecoder().decode(bytes.slice(facet.index.byteStart, facet.index.byteEnd))).toBe('もっと見る');
        expect(facet.features[0]).toEqual({ $type: 'app.bsky.richtext.facet#link', uri: url });
    });

    it('既存の facets はそのまま残す', () => {
        const before = [{ index: { byteStart: 0, byteEnd: 3 }, features: [{ $type: 'app.bsky.richtext.facet#tag' }] }];
        expect(appendChottoLink('#あ…', before, 'もっと見る', url).facets.slice(0, 1)).toEqual(before);
    });

    it('末尾の mochott リンクだけを外す(ハンドルが変わっても rkey で見分ける)', () => {
        const linked = appendChottoLink('本文…', [], 'もっと見る', 'https://mochott.site/old.handle/3m4abcdefgh22');
        const stripped = stripChottoLink(linked, '3m4abcdefgh22');
        expect(stripped).toEqual({ record: { text: '本文…', facets: [] }, url: 'https://mochott.site/old.handle/3m4abcdefgh22' });
        expect(stripChottoLink(linked, '3m4zzzzzzzz22')).toBeNull();
        expect(stripChottoLink(appendChottoLink('本文…', [], 'もっと見る', 'https://example.com/x/3m4abcdefgh22'), '3m4abcdefgh22')).toBeNull();
        expect(stripChottoLink({ ...linked, text: linked.text + ' ' }, '3m4abcdefgh22')).toBeNull();
    });
});

describe('withoutPostEmbeds', () => {
    it('投稿に添付済みの画像は展開側から除く', () => {
        const runs = [
            { kind: 'text' as const, segments: [{ text: 'a' }] },
            { kind: 'image' as const, src: `https://mochott.site/api/image/${DID}/${CID_A}`, alt: '' },
            { kind: 'image' as const, src: `https://mochott.site/api/image/${DID}/${CID_B}`, alt: '' },
        ];
        const embed = { $type: 'app.bsky.embed.images', images: [{ image: blob(CID_A), alt: '' }] };
        expect(withoutPostEmbeds(runs, embed)).toEqual([runs[0], runs[2]]);
        expect(withoutPostEmbeds(runs, { $type: 'app.bsky.embed.recordWithMedia', media: embed, record: { record: { uri: 'x', cid: 'y' } } })).toEqual([runs[0], runs[2]]);
        expect(withoutPostEmbeds(runs, undefined)).toBe(runs);
    });

    it('投稿に付いているリンクカードと引用は、展開側の添付から除く', () => {
        const runs = [
            { kind: 'text' as const, segments: [{ text: 'a' }] },
            { kind: 'card' as const, url: 'https://example.com/page', title: 'ページ' },
            { kind: 'card' as const, url: 'https://bsky.app/profile/did:plc:q/post/3m4q' },
            { kind: 'card' as const, url: 'https://example.com/other' },
        ];
        const embed = {
            $type: 'app.bsky.embed.recordWithMedia',
            media: { $type: 'app.bsky.embed.external', external: { uri: 'https://example.com/page', title: 'ページ', description: '' } },
            record: { $type: 'app.bsky.embed.record', record: { uri: 'at://did:plc:q/app.bsky.feed.post/3m4q', cid: 'bafy' } },
        };
        expect(withoutPostEmbeds(runs, embed)).toEqual([runs[0], runs[3]]);
    });
});

describe('findCidMismatches', () => {
    it('applyWrites の応答と手元の CID が違うものだけを返す', () => {
        const results = [
            { $type: 'com.atproto.repo.applyWrites#createResult', uri: 'at://a/site.mochott.article/1', cid: 'bafyA' },
            { $type: 'com.atproto.repo.applyWrites#createResult', uri: 'at://a/app.bsky.feed.post/2', cid: 'bafyX' },
        ];
        expect(findCidMismatches(results, [{ uri: 'at://a/site.mochott.article/1', cid: 'bafyA' }, { uri: 'at://a/app.bsky.feed.post/2', cid: 'bafyB' }])).toEqual(['at://a/app.bsky.feed.post/2']);
        expect(findCidMismatches(undefined, [{ uri: 'x', cid: 'y' }])).toEqual([]);
        expect(findCidMismatches([], [{ uri: 'x', cid: 'y' }])).toEqual([]);
    });
});

describe('longPostDeleteTargets', () => {
    it('自分の長文の投稿なら、記事と document を同じ rkey で消す', () => {
        const record = { 'site.mochott.longPost': { uri: `at://${DID}/site.mochott.article/3m4abcdefgh22`, cid: 'bafy' } };
        expect(longPostDeleteTargets(record, DID)).toEqual([
            { collection: 'site.mochott.article', rkey: '3m4abcdefgh22' },
            { collection: 'site.standard.document', rkey: '3m4abcdefgh22' },
        ]);
        expect(longPostDeleteTargets(record, 'did:plc:other')).toEqual([]);
        expect(longPostDeleteTargets({ text: 'ふつうの投稿' }, DID)).toEqual([]);
    });
});

describe('再編集のために記事の本文を戻す', () => {
    const blocks = [
        { kind: 'paragraph' as const, inlines: [{ kind: 'text' as const, text: 'a<b' }, { kind: 'break' as const }, { kind: 'text' as const, text: '@bob.test', href: 'https://bsky.app/profile/bob.test' }] },
        { kind: 'paragraph' as const, inlines: [] },
        { kind: 'image' as const, src: 'x', alt: '' },
        { kind: 'paragraph' as const, inlines: [{ kind: 'text' as const, text: 'site', href: 'https://example.com/?a=1&b=2' }] },
    ];

    it('エディターの HTML にする(メンションは戻し、画像は除く)', () => {
        expect(chottoBodyToEditorHtml(blocks)).toBe(
            'a&lt;b<br><span class="editor-mention" data-type="mention" data-id="bob.test">@bob.test</span><br><br><a href="https://example.com/?a=1&amp;b=2">site</a>'
        );
    });

    it('プレーンテキストにする', () => {
        expect(chottoBodyToPlainText(blocks)).toBe('a<b\n@bob.test\n\nsite');
    });
});
