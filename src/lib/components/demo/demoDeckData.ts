import { defaultDeckSettings } from '$lib/components/deck/defaultDeckSettings';

export interface DemoColumn {
    id: string;
    type: 'default' | 'custom' | 'officialList';
    name: string;
    handle: string;
    feed: any[];
}

type Author = { did: string; handle: string; displayName: string; avatar: string };

function svg(body: string, w: number, h: number): string {
    return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`)}`;
}

function avatar(a: string, b: string, letter: string): string {
    return svg(`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><text x="32" y="41" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="700" fill="rgba(255,255,255,.92)">${letter}</text>`, 64, 64);
}

function picture(a: string, b: string, c: string, seed: number): string {
    const cx = 120 + (seed * 137) % 240;
    const cy = 80 + (seed * 89) % 120;
    return svg(`<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="480" height="360" fill="url(#g)"/><circle cx="${cx}" cy="${cy}" r="46" fill="${c}" opacity=".85"/><path d="M0 300 Q120 240 240 290 T480 270 V360 H0Z" fill="${c}" opacity=".35"/><path d="M0 330 Q160 280 320 330 T480 320 V360 H0Z" fill="${b}" opacity=".6"/>`, 480, 360);
}

const authors: Record<string, Author> = {
    minori: { did: 'did:plc:demo0001', handle: 'minori.bsky.social', displayName: '佐藤みのり', avatar: avatar('#ffa3b2', '#ec86d6', 'み') },
    takumi: { did: 'did:plc:demo0002', handle: 'takumi.dev', displayName: 'Takumi', avatar: avatar('#75c0e5', '#2a14b4', 'T') },
    yuu: { did: 'did:plc:demo0003', handle: 'yuu.bsky.social', displayName: '高橋ゆう', avatar: avatar('#94c74c', '#16b286', 'ゆ') },
    nakamura: { did: 'did:plc:demo0004', handle: 'nakamura.photo', displayName: 'nakamura', avatar: avatar('#ffd166', '#ff5800', 'N') },
    koharu: { did: 'did:plc:demo0005', handle: 'koharu.bsky.social', displayName: 'こはる', avatar: avatar('#caecee', '#8c56d3', 'こ') },
    suzuki: { did: 'did:plc:demo0006', handle: 'suzuki.bsky.social', displayName: '鈴木', avatar: avatar('#9c5edf', '#ed7d95', '鈴') },
    tanaka: { did: 'did:plc:demo0007', handle: 'tanaka.bsky.social', displayName: '田中', avatar: avatar('#01b7ed', '#94c74c', '田') },
    rin: { did: 'did:plc:demo0008', handle: 'rin.bsky.social', displayName: 'りん', avatar: avatar('#ed958e', '#e7d600', 'り') },
    mia: { did: 'did:plc:demo0011', handle: 'mia.bsky.social', displayName: 'Mia', avatar: avatar('#ffa3b2', '#ec86d6', 'M') },
    leo: { did: 'did:plc:demo0012', handle: 'leo.dev', displayName: 'Leo', avatar: avatar('#75c0e5', '#2a14b4', 'L') },
    hana: { did: 'did:plc:demo0013', handle: 'hana.bsky.social', displayName: 'Hana', avatar: avatar('#94c74c', '#16b286', 'H') },
    sam: { did: 'did:plc:demo0014', handle: 'sam.photo', displayName: 'sam', avatar: avatar('#ffd166', '#ff5800', 'S') },
    noa: { did: 'did:plc:demo0015', handle: 'noa.bsky.social', displayName: 'Noa', avatar: avatar('#caecee', '#8c56d3', 'N') },
    kai: { did: 'did:plc:demo0016', handle: 'kai.bsky.social', displayName: 'Kai', avatar: avatar('#9c5edf', '#ed7d95', 'K') },
    eli: { did: 'did:plc:demo0017', handle: 'eli.bsky.social', displayName: 'Eli', avatar: avatar('#01b7ed', '#94c74c', 'E') },
    rui: { did: 'did:plc:demo0018', handle: 'rui.bsky.social', displayName: 'Rui', avatar: avatar('#ed958e', '#e7d600', 'R') },
};

const pictures = [
    picture('#9ad4f5', '#2c8fd0', '#fff6cf', 1),
    picture('#ffb36b', '#c94f6b', '#ffe6a3', 2),
    picture('#b7e4c7', '#2d6a4f', '#f1faee', 3),
    picture('#cdb4db', '#5a189a', '#ffc8dd', 4),
    picture('#a2d2ff', '#023e8a', '#ffffff', 5),
    picture('#ffd6a5', '#9d4edd', '#fdffb6', 6),
];

interface Seed {
    author: string;
    text: string;
    minutesAgo: number;
    image?: number;
    likes?: number;
    replies?: number;
    reposts?: number;
    repostedBy?: string;
}

let counter = 0;

function post(seed: Seed, lang: string, now: number) {
    const author = authors[seed.author];
    const createdAt = new Date(now - seed.minutesAgo * 60000).toISOString();
    const n = ++counter;
    const embed = seed.image !== undefined ? {
        $type: 'app.bsky.embed.images#view',
        images: [{
            thumb: pictures[seed.image % pictures.length],
            fullsize: pictures[seed.image % pictures.length],
            alt: '',
            aspectRatio: { width: 4, height: 3 },
        }],
    } : undefined;
    return {
        post: {
            uri: `at://${author.did}/app.bsky.feed.post/demo${n}`,
            cid: `bafydemo${n}`,
            author: { ...author, labels: [], viewer: {} },
            record: { $type: 'app.bsky.feed.post', text: seed.text, createdAt, langs: [lang] },
            ...(embed ? { embed } : {}),
            replyCount: seed.replies ?? 0,
            repostCount: seed.reposts ?? 0,
            likeCount: seed.likes ?? 0,
            quoteCount: 0,
            indexedAt: createdAt,
            viewer: {},
            labels: [],
        },
        ...(seed.repostedBy ? { reason: { $type: 'app.bsky.feed.defs#reasonRepost', by: { ...authors[seed.repostedBy], labels: [], viewer: {} }, indexedAt: createdAt } } : {}),
    };
}

const ja = {
    home: [
        { author: 'takumi', text: '週末はコード書きながらラジオ聴くのが一番落ち着く', minutesAgo: 3, likes: 5 },
        { author: 'minori', text: '駅前のパン屋、朝7時からやってた。クロワッサンが最高', minutesAgo: 9, image: 1, likes: 12, replies: 2 },
        { author: 'yuu', text: '紫陽花が咲きはじめた', minutesAgo: 14, likes: 31, reposts: 4 },
        { author: 'nakamura', text: 'レンズを買い替えた。週末に試し撮りに行きたい', minutesAgo: 22, likes: 8, replies: 1, repostedBy: 'minori' },
        { author: 'koharu', text: '今日のごはん、麻婆豆腐にした。辛さ控えめ', minutesAgo: 35, likes: 6 },
        { author: 'suzuki', text: '電車で読む本、次はSFにしようかな。おすすめあれば教えて', minutesAgo: 48, likes: 3, replies: 5 },
        { author: 'tanaka', text: '新しいカフェ見つけた。窓際の席が広くて作業しやすい', minutesAgo: 61, image: 0, likes: 19 },
        { author: 'rin', text: '雨あがりの空、すごくきれいだった', minutesAgo: 75, image: 4, likes: 44, reposts: 7 },
        { author: 'takumi', text: 'デプロイ完了。今日はここまで', minutesAgo: 90, likes: 2 },
        { author: 'minori', text: '明日は早起きして海まで散歩する', minutesAgo: 110, likes: 9 },
    ],
    photos: [
        { author: 'nakamura', text: '夕方の港', minutesAgo: 6, image: 1, likes: 58, reposts: 9 },
        { author: 'rin', text: '路地裏の猫', minutesAgo: 18, image: 5, likes: 120, reposts: 22, replies: 4 },
        { author: 'yuu', text: '朝の光', minutesAgo: 27, image: 2, likes: 36 },
        { author: 'tanaka', text: '雨の交差点', minutesAgo: 44, image: 4, likes: 71, reposts: 11 },
        { author: 'minori', text: '窓辺の花', minutesAgo: 66, image: 3, likes: 27 },
        { author: 'koharu', text: '海と雲', minutesAgo: 88, image: 0, likes: 93, reposts: 15 },
    ],
    tech: [
        { author: 'takumi', text: 'Svelte 5 のrunes、書き慣れると戻れない', minutesAgo: 5, likes: 24, reposts: 3, replies: 2 },
        { author: 'suzuki', text: 'ノートPCのバッテリー交換した。体感で倍もつ', minutesAgo: 19, likes: 7 },
        { author: 'nakamura', text: 'RAW現像のワークフロー、やっと固まった', minutesAgo: 33, likes: 15, replies: 1 },
        { author: 'tanaka', text: '自作キーボードのファームウェア更新。矢印キーが復活', minutesAgo: 58, image: 2, likes: 41, reposts: 6 },
        { author: 'takumi', text: 'CIが3分短くなった。キャッシュ大事', minutesAgo: 95, likes: 11 },
        { author: 'yuu', text: '新しいエディタのテーマ、目が楽', minutesAgo: 130, likes: 9 },
    ],
    cafe: [
        { author: 'rin', text: '窓際で読書。コーヒーおかわり', minutesAgo: 8, image: 3, likes: 33, replies: 2 },
        { author: 'koharu', text: '今日のラテアートはくま', minutesAgo: 25, image: 5, likes: 88, reposts: 12 },
        { author: 'minori', text: '駅裏の焙煎所、豆を買って帰る', minutesAgo: 47, likes: 14 },
        { author: 'tanaka', text: '午後の光が入る席', minutesAgo: 70, image: 0, likes: 52, reposts: 5 },
        { author: 'suzuki', text: 'チーズケーキが売り切れてた。次は早めに', minutesAgo: 105, likes: 6, replies: 3 },
    ],
    friends: [
        { author: 'koharu', text: '今夜ごはん行く人ー', minutesAgo: 2, replies: 3, likes: 4 },
        { author: 'suzuki', text: '行く。19時なら', minutesAgo: 4, likes: 2 },
        { author: 'rin', text: '駅の近くのお店にしよ', minutesAgo: 7, likes: 3 },
        { author: 'yuu', text: '昨日の写真、あとで送るね', minutesAgo: 30, likes: 5 },
        { author: 'minori', text: '週末の予定、まだ空いてる？', minutesAgo: 52, replies: 2 },
        { author: 'tanaka', text: '空いてるよ。土曜がいい', minutesAgo: 55, likes: 1 },
        { author: 'takumi', text: '新しいキーボード届いた', minutesAgo: 120, image: 2, likes: 8 },
    ],
};

const en = {
    home: [
        { author: 'leo', text: 'Weekend plan: code, radio, coffee. Nothing else.', minutesAgo: 3, likes: 5 },
        { author: 'mia', text: 'The bakery by the station opens at 7. Best croissant in town.', minutesAgo: 9, image: 1, likes: 12, replies: 2 },
        { author: 'hana', text: 'The hydrangeas are starting to bloom', minutesAgo: 14, likes: 31, reposts: 4 },
        { author: 'sam', text: 'New lens arrived. Test shots this weekend.', minutesAgo: 22, likes: 8, replies: 1, repostedBy: 'mia' },
        { author: 'noa', text: 'Dinner tonight: mapo tofu, mild version', minutesAgo: 35, likes: 6 },
        { author: 'kai', text: 'Next train book: something sci-fi. Recommendations welcome.', minutesAgo: 48, likes: 3, replies: 5 },
        { author: 'eli', text: 'Found a new cafe. Wide window seats, good for working.', minutesAgo: 61, image: 0, likes: 19 },
        { author: 'rui', text: 'The sky after the rain was unreal', minutesAgo: 75, image: 4, likes: 44, reposts: 7 },
        { author: 'leo', text: 'Deployed. Calling it a day.', minutesAgo: 90, likes: 2 },
        { author: 'mia', text: 'Early walk to the sea tomorrow', minutesAgo: 110, likes: 9 },
    ],
    photos: [
        { author: 'sam', text: 'Harbor at dusk', minutesAgo: 6, image: 1, likes: 58, reposts: 9 },
        { author: 'rui', text: 'Alley cat', minutesAgo: 18, image: 5, likes: 120, reposts: 22, replies: 4 },
        { author: 'hana', text: 'Morning light', minutesAgo: 27, image: 2, likes: 36 },
        { author: 'eli', text: 'Crossing in the rain', minutesAgo: 44, image: 4, likes: 71, reposts: 11 },
        { author: 'mia', text: 'Flowers by the window', minutesAgo: 66, image: 3, likes: 27 },
        { author: 'noa', text: 'Sea and clouds', minutesAgo: 88, image: 0, likes: 93, reposts: 15 },
    ],
    tech: [
        { author: 'leo', text: 'Svelte 5 runes: once you get used to them there is no going back', minutesAgo: 5, likes: 24, reposts: 3, replies: 2 },
        { author: 'kai', text: 'Swapped the laptop battery. Feels like double the runtime', minutesAgo: 19, likes: 7 },
        { author: 'sam', text: 'RAW workflow finally settled', minutesAgo: 33, likes: 15, replies: 1 },
        { author: 'eli', text: 'Firmware update on the keyboard. Arrow keys are back', minutesAgo: 58, image: 2, likes: 41, reposts: 6 },
        { author: 'leo', text: 'CI is 3 minutes faster. Cache everything', minutesAgo: 95, likes: 11 },
        { author: 'hana', text: 'New editor theme, easier on the eyes', minutesAgo: 130, likes: 9 },
    ],
    cafe: [
        { author: 'rui', text: 'Reading by the window. Second coffee', minutesAgo: 8, image: 3, likes: 33, replies: 2 },
        { author: 'noa', text: "Today's latte art is a bear", minutesAgo: 25, image: 5, likes: 88, reposts: 12 },
        { author: 'mia', text: 'Picked up beans from the roaster behind the station', minutesAgo: 47, likes: 14 },
        { author: 'eli', text: 'The seat that gets the afternoon light', minutesAgo: 70, image: 0, likes: 52, reposts: 5 },
        { author: 'kai', text: 'Cheesecake sold out. Earlier next time', minutesAgo: 105, likes: 6, replies: 3 },
    ],
    friends: [
        { author: 'noa', text: 'Anyone up for dinner tonight?', minutesAgo: 2, replies: 3, likes: 4 },
        { author: 'kai', text: 'In. 7pm works', minutesAgo: 4, likes: 2 },
        { author: 'rui', text: 'The place near the station?', minutesAgo: 7, likes: 3 },
        { author: 'hana', text: "I'll send yesterday's photos later", minutesAgo: 30, likes: 5 },
        { author: 'mia', text: 'Still free this weekend?', minutesAgo: 52, replies: 2 },
        { author: 'eli', text: 'Yes, Saturday is better', minutesAgo: 55, likes: 1 },
        { author: 'leo', text: 'New keyboard arrived', minutesAgo: 120, image: 2, likes: 8 },
    ],
};

export function buildDemoColumns(locale: string, names: { photos: string; friends: string; tech: string; cafe: string }): DemoColumn[] {
    const lang = locale.startsWith('ja') ? 'ja' : 'en';
    const set = lang === 'ja' ? ja : en;
    const handle = lang === 'ja' ? 'minori.bsky.social' : 'mia.bsky.social';
    const now = Date.now();
    counter = 0;
    return [
        { id: 'home', type: 'default', name: 'HOME', handle, feed: set.home.map(seed => post(seed, lang, now)) },
        { id: 'photos', type: 'custom', name: names.photos, handle, feed: set.photos.map(seed => post(seed, lang, now)) },
        { id: 'friends', type: 'officialList', name: names.friends, handle, feed: set.friends.map(seed => post(seed, lang, now)) },
        { id: 'tech', type: 'custom', name: names.tech, handle, feed: set.tech.map(seed => post(seed, lang, now)) },
        { id: 'cafe', type: 'custom', name: names.cafe, handle, feed: set.cafe.map(seed => post(seed, lang, now)) },
    ];
}

export function demoColumnRecord(column: DemoColumn) {
    return {
        id: `demo-${column.id}`,
        algorithm: { type: column.type, name: column.name },
        style: 'default',
        settings: defaultDeckSettings,
        did: 'did:plc:demo0000',
        handle: column.handle,
        data: { feed: [], cursor: '' },
    };
}
