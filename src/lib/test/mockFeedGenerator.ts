/**
 * Bluesky FeedViewPost モックジェネレーター
 *
 * 実際の AT Protocol 構造に準拠したリアルなフィードデータを生成する。
 * メモリプロファイリングやバーチャルスクロールのテストに利用可能。
 */

// --- Seeded Random ---

class SeededRandom {
  private seed: number;

  constructor(seed: number = 42) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

// --- Constants ---

const DISPLAY_NAMES = [
  '青空太郎', 'Sky Walker', 'ブルースカイ花子', 'Atproto Dev',
  '猫好きエンジニア', 'Coffee Lover ☕', 'デザイナーyuki', 'OpenSource Fan',
  '写真撮る人', 'Music Nerd 🎵', 'SvelteKit Builder', 'Rust Enthusiast',
  '日本語学習中', 'Frontend Wizard', 'データサイエンティスト', 'Indie Hacker',
  '旅する開発者', 'TypeScript信者', 'UX研究者', 'ゲーム実況者',
];

const HANDLES = [
  'aozora.bsky.social', 'skywalker.bsky.social', 'hanako-blue.bsky.social',
  'atproto-dev.bsky.social', 'neko-engineer.bsky.social', 'coffeelover.bsky.social',
  'yuki-design.bsky.social', 'opensource.bsky.social', 'photo-taker.bsky.social',
  'music-nerd.bsky.social', 'sveltekit.bsky.social', 'rust-fan.bsky.social',
  'nihongo-study.bsky.social', 'frontend-wiz.bsky.social', 'data-sci.bsky.social',
  'indie-hack.bsky.social', 'tabi-dev.bsky.social', 'ts-believer.bsky.social',
  'ux-researcher.bsky.social', 'game-streamer.bsky.social',
];

const POST_TEXTS_JA = [
  '今日はSvelteKitの新しいバージョンを試してみたけど、パフォーマンスがかなり改善されてる感じがする。特にSSRの部分が速くなった。',
  'Blueskyのタイムラインが流れるのが速すぎて追いつけない笑 みんな活発だなぁ',
  '朝からコーヒー飲みながらコーディング。至福の時間。',
  'TypeScript 5.xの新機能がやばい。decoratorがstableになったの嬉しすぎる。',
  'ATプロトコルの仕様書読んでるけど、分散型SNSの未来が見えてきた気がする。',
  '今週末は技術書典に行く予定。何かおすすめの本ありますか？',
  'Rustの所有権システム、最初は難しかったけど慣れると他の言語に戻れなくなる...',
  'デザインシステムの構築、地道だけど大事な仕事。コンポーネントライブラリを育てる感じが好き。',
  'AIの進化が速すぎて、毎週新しいモデルが出てくる。キャッチアップが大変。',
  'バーチャルスクロールの実装で詰まってる。高さが動的な場合の計算が難しい...。',
  'React vs Svelte vs Vue、結局プロジェクトに合ったものを選ぶのが一番。宗教戦争はやめよう。',
  '新しいキーボード届いた！打鍵感が最高。これでコーディングが捗る。',
  'PostgreSQLのパフォーマンスチューニング、インデックスの張り方一つで劇的に変わる。',
  'OSSにコントリビュートしたPRがマージされた！小さな修正だけど嬉しい。',
  'リモートワーク3年目。もう通勤に戻れる気がしない...',
  '週末のハッカソンで作ったアプリ、意外と反響があって嬉しい。',
  'WebAssemblyの可能性にワクワクしてる。ブラウザでネイティブ並みの速度が出るの凄い。',
  'git rebase vs git merge、チームの方針に合わせるのが大事。どっちが正解とかない。',
  'テスト書くの面倒だけど、バグを事前に防げると思うと書かずにはいられない。',
  'Docker Composeでローカル環境構築、毎回「なんで動かないんだ」から始まる。',
];

const POST_TEXTS_EN = [
  'Just deployed my new project to production. Fingers crossed everything works smoothly!',
  'The AT Protocol documentation is incredibly well-written. Kudos to the Bluesky team.',
  'Hot take: CSS-in-JS is not as bad as people make it out to be. Fight me.',
  'Learning Rust this weekend. The compiler errors are actually helpful once you get used to them.',
  'Anyone else spending their weekend refactoring code that nobody asked you to refactor? Just me?',
  'The future of social media is decentralized. I genuinely believe that.',
  'TypeScript generics are like a puzzle game. Frustrating but satisfying when they click.',
  'Shipped a feature today that I\'ve been working on for two weeks. Time to celebrate! 🎉',
  'Reading "Designing Data-Intensive Applications" for the third time. Still learning new things.',
  'My terminal setup is finally perfect. I will not change it again. (narrator: they changed it next week)',
];

const AVATAR_URLS = [
  'https://cdn.bsky.app/img/avatar/plain/did:plc:mock1/bafkrei001@jpeg',
  'https://cdn.bsky.app/img/avatar/plain/did:plc:mock2/bafkrei002@jpeg',
  'https://cdn.bsky.app/img/avatar/plain/did:plc:mock3/bafkrei003@jpeg',
  'https://cdn.bsky.app/img/avatar/plain/did:plc:mock4/bafkrei004@jpeg',
  'https://cdn.bsky.app/img/avatar/plain/did:plc:mock5/bafkrei005@jpeg',
];

const IMAGE_URLS = [
  'https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:mock1/bafkrei101@jpeg',
  'https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:mock2/bafkrei102@jpeg',
  'https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:mock3/bafkrei103@jpeg',
  'https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:mock4/bafkrei104@jpeg',
];

const THUMB_URLS = [
  'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:mock1/bafkrei201@jpeg',
  'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:mock2/bafkrei202@jpeg',
  'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:mock3/bafkrei203@jpeg',
];

const EXTERNAL_URIS = [
  'https://example.com/article/sveltekit-performance',
  'https://example.com/blog/atproto-deep-dive',
  'https://example.com/news/web-standards-2025',
  'https://example.com/tutorial/rust-wasm',
];

const EXTERNAL_TITLES = [
  'SvelteKitのパフォーマンス最適化ガイド',
  'AT Protocolの深掘り解説',
  'Web Standards Update 2025',
  'RustとWebAssemblyで始めるフロントエンド',
];

const LANGS = ['ja', 'en', 'ja', 'ja', 'en']; // 日本語が多め

// --- Generator ---

function makeDid(rng: SeededRandom, index: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz234567';
  let id = '';
  for (let i = 0; i < 24; i++) {
    id += chars[rng.int(0, chars.length - 1)];
  }
  return `did:plc:${id}`;
}

function makeRkey(rng: SeededRandom): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz234567';
  let id = '';
  for (let i = 0; i < 13; i++) {
    id += chars[rng.int(0, chars.length - 1)];
  }
  return id;
}

function makeCid(rng: SeededRandom): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz234567';
  let id = 'bafyrei';
  for (let i = 0; i < 46; i++) {
    id += chars[rng.int(0, chars.length - 1)];
  }
  return id;
}

interface MockAuthor {
  did: string;
  handle: string;
  displayName: string;
  avatar: string;
  viewer: {
    muted: boolean;
    blockedBy: boolean;
    following?: string;
    followedBy?: string;
  };
  labels: any[];
  createdAt: string;
}

function makeAuthor(rng: SeededRandom, index: number): MockAuthor {
  const did = makeDid(rng, index);
  return {
    did,
    handle: rng.pick(HANDLES),
    displayName: rng.pick(DISPLAY_NAMES),
    avatar: rng.pick(AVATAR_URLS),
    viewer: {
      muted: false,
      blockedBy: false,
      following: rng.bool(0.4)
        ? `at://${did}/app.bsky.graph.follow/${makeRkey(rng)}`
        : undefined,
      followedBy: rng.bool(0.3)
        ? `at://${did}/app.bsky.graph.follow/${makeRkey(rng)}`
        : undefined,
    },
    labels: [],
    createdAt: new Date(
      Date.now() - rng.int(86400000, 86400000 * 365 * 2)
    ).toISOString(),
  };
}

function makeImageEmbed(rng: SeededRandom) {
  const count = rng.int(1, 4);
  const images = [];
  for (let i = 0; i < count; i++) {
    images.push({
      thumb: rng.pick(THUMB_URLS) + `?img=${i}`,
      fullsize: rng.pick(IMAGE_URLS) + `?img=${i}`,
      alt: rng.bool(0.6) ? `画像の説明 ${i + 1}` : '',
      aspectRatio: {
        width: rng.pick([1200, 1600, 800, 1080]),
        height: rng.pick([800, 900, 1200, 1080]),
      },
    });
  }
  return {
    $type: 'app.bsky.embed.images#view',
    images,
  };
}

function makeExternalEmbed(rng: SeededRandom) {
  const idx = rng.int(0, EXTERNAL_URIS.length - 1);
  return {
    $type: 'app.bsky.embed.external#view',
    external: {
      uri: EXTERNAL_URIS[idx],
      title: EXTERNAL_TITLES[idx],
      description: '記事の概要がここに表示されます。クリックして続きを読む。',
      thumb: rng.pick(THUMB_URLS),
    },
  };
}

function makeVideoEmbed(rng: SeededRandom) {
  return {
    $type: 'app.bsky.embed.video#view',
    cid: makeCid(rng),
    playlist: `https://video.bsky.app/watch/did:plc:mock/bafkrei${makeRkey(rng)}/playlist.m3u8`,
    thumbnail: rng.pick(THUMB_URLS),
    alt: rng.bool(0.3) ? '動画の説明' : '',
    aspectRatio: { width: 1920, height: 1080 },
  };
}

const X_EMBED_TEXTS = [
  'Breaking: Major update to the AT Protocol specification released today. Decentralized social media takes a big step forward.',
  'Just shipped a new feature that I\'ve been working on for months. Check it out! The performance improvements are incredible.',
  'This thread explains everything you need to know about the latest web standards proposals for 2025.',
];

function makeXEmbed(rng: SeededRandom) {
  return {
    $type: 'app.bsky.embed.external#view',
    external: {
      uri: 'https://x.com/user/status/' + rng.int(1000000, 9999999),
      title: 'Post on X',
      description: rng.pick(X_EMBED_TEXTS),
      thumb: rng.pick(THUMB_URLS),
    },
    _isXEmbed: true,
    _xEmbedText: rng.pick(X_EMBED_TEXTS),
  };
}

function makeYouTubeEmbed(rng: SeededRandom) {
  const videoIds = ['dQw4w9WgXcQ', 'jNQXAC9IVRw', '9bZkp7q19f0', 'kJQP7kiw5Fk'];
  const videoId = rng.pick(videoIds);
  return {
    $type: 'app.bsky.embed.external#view',
    external: {
      uri: `https://www.youtube.com/watch?v=${videoId}`,
      title: rng.pick(['Amazing Tech Talk', 'Web Dev Tutorial', 'Music Video', 'Conference Keynote']),
      description: 'Watch this video on YouTube.',
      thumb: rng.pick(THUMB_URLS),
    },
    _isYouTube: true,
  };
}

function makeQuoteEmbed(rng: SeededRandom, authors: MockAuthor[]) {
  const quotedAuthor = rng.pick(authors);
  const rkey = makeRkey(rng);
  const uri = `at://${quotedAuthor.did}/app.bsky.feed.post/${rkey}`;
  return {
    $type: 'app.bsky.embed.record#view',
    record: {
      $type: 'app.bsky.embed.record#viewRecord',
      uri,
      cid: makeCid(rng),
      author: quotedAuthor,
      value: {
        $type: 'app.bsky.feed.post',
        text: rng.pick([...POST_TEXTS_JA, ...POST_TEXTS_EN]),
        langs: [rng.pick(LANGS)],
        createdAt: new Date(
          Date.now() - rng.int(3600000, 86400000 * 7)
        ).toISOString(),
      },
      labels: [],
      likeCount: rng.int(0, 200),
      replyCount: rng.int(0, 30),
      repostCount: rng.int(0, 50),
      quoteCount: rng.int(0, 10),
      indexedAt: new Date(
        Date.now() - rng.int(3600000, 86400000 * 7)
      ).toISOString(),
      embeds: [],
    },
  };
}

function makeEmbed(
  rng: SeededRandom,
  authors: MockAuthor[]
): any | undefined {
  const roll = rng.next();
  if (roll < 0.30) return undefined; // テキストのみ 30%
  if (roll < 0.45) return makeImageEmbed(rng); // 画像 15%
  if (roll < 0.55) return makeExternalEmbed(rng); // リンクカード 10%
  if (roll < 0.63) return makeVideoEmbed(rng); // 動画 8%
  if (roll < 0.73) return makeQuoteEmbed(rng, authors); // 引用 10%
  if (roll < 0.81) return makeXEmbed(rng); // X/Twitter埋込 8%
  if (roll < 0.88) return makeYouTubeEmbed(rng); // YouTube埋込 7%
  if (roll < 0.93) return { // 引用+メディア 5%
    $type: 'app.bsky.embed.recordWithMedia#view',
    record: makeQuoteEmbed(rng, authors),
    media: makeImageEmbed(rng),
  };
  // テキスト+リンクカード 7%
  return makeExternalEmbed(rng);
}

interface MockPostView {
  uri: string;
  cid: string;
  author: MockAuthor;
  record: {
    $type: string;
    text: string;
    langs: string[];
    createdAt: string;
    reply?: {
      root: { uri: string; cid: string };
      parent: { uri: string; cid: string };
    };
    facets?: any[];
  };
  embed?: any;
  replyCount: number;
  repostCount: number;
  likeCount: number;
  quoteCount: number;
  indexedAt: string;
  viewer: {
    like?: string;
    repost?: string;
    threadMuted?: boolean;
  };
  labels: any[];
}

function makePostView(
  rng: SeededRandom,
  author: MockAuthor,
  authors: MockAuthor[],
  timeOffset: number
): MockPostView {
  const rkey = makeRkey(rng);
  const uri = `at://${author.did}/app.bsky.feed.post/${rkey}`;
  const cid = makeCid(rng);
  const createdAt = new Date(Date.now() - timeOffset).toISOString();
  const lang = rng.pick(LANGS);
  const text =
    lang === 'ja' ? rng.pick(POST_TEXTS_JA) : rng.pick(POST_TEXTS_EN);

  return {
    uri,
    cid,
    author,
    record: {
      $type: 'app.bsky.feed.post',
      text,
      langs: [lang],
      createdAt,
    },
    embed: makeEmbed(rng, authors),
    replyCount: rng.int(0, 50),
    repostCount: rng.int(0, 100),
    likeCount: rng.int(0, 500),
    quoteCount: rng.int(0, 20),
    indexedAt: createdAt,
    viewer: {
      like: rng.bool(0.15)
        ? `at://${author.did}/app.bsky.feed.like/${makeRkey(rng)}`
        : undefined,
      repost: rng.bool(0.05)
        ? `at://${author.did}/app.bsky.feed.repost/${makeRkey(rng)}`
        : undefined,
      threadMuted: rng.bool(0.02),
    },
    labels: [],
  };
}

export interface MockFeedViewPost {
  post: MockPostView;
  reason?: {
    $type: string;
    by: MockAuthor;
    indexedAt: string;
  };
  reply?: {
    root: MockPostView;
    parent: MockPostView;
  };
}

export interface GenerateOptions {
  /** 生成するフィードアイテム数 */
  count?: number;
  /** 乱数シード (再現性のため) */
  seed?: number;
  /** リポストを含める割合 (0-1) */
  repostRatio?: number;
  /** リプライを含める割合 (0-1) */
  replyRatio?: number;
  /** ユニークユーザー数 */
  authorCount?: number;
  /** 先頭投稿の時刻オフセット (ms) */
  startTimeOffset?: number;
  /** 投稿間の平均間隔 (ms) */
  intervalMs?: number;
}

/**
 * リアルな Bluesky FeedViewPost 配列を生成する
 */
export function generateMockFeed(options: GenerateOptions = {}): MockFeedViewPost[] {
  const {
    count = 100,
    seed = 42,
    repostRatio = 0.15,
    replyRatio = 0.25,
    authorCount = 20,
    startTimeOffset = 60000, // 1分前
    intervalMs = 30000, // 30秒間隔
  } = options;

  const rng = new SeededRandom(seed);

  // ユニークユーザーを事前生成
  const authors: MockAuthor[] = [];
  for (let i = 0; i < authorCount; i++) {
    authors.push(makeAuthor(rng, i));
  }

  const feed: MockFeedViewPost[] = [];

  for (let i = 0; i < count; i++) {
    const timeOffset =
      startTimeOffset + i * intervalMs + rng.int(0, intervalMs / 2);
    const author = rng.pick(authors);
    const post = makePostView(rng, author, authors, timeOffset);

    const item: MockFeedViewPost = { post };

    // リポスト
    if (rng.bool(repostRatio)) {
      const reposter = rng.pick(authors);
      item.reason = {
        $type: 'app.bsky.feed.defs#reasonRepost',
        by: reposter,
        indexedAt: new Date(
          Date.now() - timeOffset + rng.int(0, 3600000)
        ).toISOString(),
      };
    }
    // リプライ (リポストでない場合のみ)
    else if (rng.bool(replyRatio)) {
      const parentAuthor = rng.pick(authors);
      const rootAuthor = rng.bool(0.5) ? parentAuthor : rng.pick(authors);

      const rootPost = makePostView(
        rng,
        rootAuthor,
        authors,
        timeOffset + rng.int(3600000, 86400000)
      );
      const parentPost = rng.bool(0.6)
        ? rootPost
        : makePostView(
            rng,
            parentAuthor,
            authors,
            timeOffset + rng.int(60000, 3600000)
          );

      item.reply = { root: rootPost, parent: parentPost };

      // 投稿自体にもreply refを付ける
      post.record.reply = {
        root: { uri: rootPost.uri, cid: rootPost.cid },
        parent: { uri: parentPost.uri, cid: parentPost.cid },
      };
    }

    feed.push(item);
  }

  return feed;
}

/**
 * 指定したフィードアイテム数でのおおよそのメモリサイズ(bytes)を推定する。
 * JSON.stringify のサイズベース。
 */
export function estimateFeedMemory(feed: MockFeedViewPost[]): {
  jsonBytes: number;
  itemCount: number;
  avgBytesPerItem: number;
} {
  const json = JSON.stringify(feed);
  const jsonBytes = new TextEncoder().encode(json).length;
  return {
    jsonBytes,
    itemCount: feed.length,
    avgBytesPerItem: Math.round(jsonBytes / feed.length),
  };
}

/**
 * ページネーションをシミュレートする cursor 付きジェネレーター
 */
export function createMockFeedPaginator(options: GenerateOptions & { pageSize?: number } = {}) {
  const { pageSize = 30, ...genOptions } = options;
  const allItems = generateMockFeed({
    ...genOptions,
    count: genOptions.count ?? 500,
  });

  let offset = 0;

  return {
    /** 次ページを取得。feed と cursor を返す。 */
    getNext(): { feed: MockFeedViewPost[]; cursor: string | undefined } {
      const slice = allItems.slice(offset, offset + pageSize);
      offset += pageSize;
      return {
        feed: slice,
        cursor: offset < allItems.length ? String(offset) : undefined,
      };
    },

    /** 先頭に新着をprepend (リアルタイム更新シミュレーション) */
    getNewItems(count: number): MockFeedViewPost[] {
      const rng = new SeededRandom(Date.now());
      const authors = allItems.slice(0, 20).map((item) => item.post.author);
      const newItems: MockFeedViewPost[] = [];
      for (let i = 0; i < count; i++) {
        const author = rng.pick(authors);
        const post = makePostView(rng, author, authors, rng.int(0, 60000));
        newItems.push({ post });
      }
      return newItems;
    },

    /** 全アイテム数 */
    totalCount: allItems.length,

    /** offsetをリセット */
    reset() {
      offset = 0;
    },
  };
}
