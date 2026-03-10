/**
 * 画像URL付きモックフィードジェネレーター
 *
 * mockFeedGenerator をラップし、embed 内の画像URL・アバターURLを
 * picsum.photos (CC0ライセンス) のURLに差し替える。
 * ブラウザで実際に画像をデコード・キャッシュさせた状態でのメモリ計測に使用。
 */

import { generateMockFeed, type MockFeedViewPost, type GenerateOptions } from './mockFeedGenerator';

let globalImageId = 0;

function nextImageId(): number {
  return ++globalImageId;
}

function picsumUrl(seed: string, size = 1000): string {
  return `https://picsum.photos/seed/${seed}/${size}/${size}`;
}

function replaceAvatarUrl(author: any, postIndex: number): void {
  const id = nextImageId();
  author.avatar = picsumUrl(`avatar${id}`);
}

function replaceEmbedUrls(embed: any): void {
  if (!embed) return;

  const type = embed.$type;

  if (type === 'app.bsky.embed.images#view' && embed.images) {
    for (const img of embed.images) {
      const id = nextImageId();
      img.thumb = picsumUrl(`thumb${id}`);
      img.fullsize = picsumUrl(`full${id}`);
    }
  } else if (type === 'app.bsky.embed.external#view' && embed.external) {
    const id = nextImageId();
    if (embed.external.thumb) {
      embed.external.thumb = picsumUrl(`ext${id}`);
    }
  } else if (type === 'app.bsky.embed.video#view') {
    const id = nextImageId();
    embed.thumbnail = picsumUrl(`vid${id}`);
  } else if (type === 'app.bsky.embed.record#view' && embed.record) {
    replaceAvatarUrl(embed.record.author, 0);
    if (embed.record.embeds) {
      for (const e of embed.record.embeds) {
        replaceEmbedUrls(e);
      }
    }
  } else if (type === 'app.bsky.embed.recordWithMedia#view') {
    if (embed.record) replaceEmbedUrls(embed.record);
    if (embed.media) replaceEmbedUrls(embed.media);
  }
}

function applyImageUrls(feed: MockFeedViewPost[]): MockFeedViewPost[] {
  for (let i = 0; i < feed.length; i++) {
    const item = feed[i];

    // メインの投稿著者アバター
    replaceAvatarUrl(item.post.author, i);

    // embed内の画像URL
    replaceEmbedUrls(item.post.embed);

    // リポストの場合
    if (item.reason?.by) {
      replaceAvatarUrl(item.reason.by, i);
    }

    // リプライの場合
    if (item.reply) {
      replaceAvatarUrl(item.reply.root.author, i);
      replaceEmbedUrls(item.reply.root.embed);
      replaceAvatarUrl(item.reply.parent.author, i);
      replaceEmbedUrls(item.reply.parent.embed);
    }
  }
  return feed;
}

/**
 * 画像URL付きモックフィードを生成する
 */
export function generateImageFeed(options: GenerateOptions = {}): MockFeedViewPost[] {
  const feed = generateMockFeed(options);
  return applyImageUrls(feed);
}

/**
 * 既存フィードの先頭にcount件追加（画像URL付き）
 */
export function prependImageFeed(
  existingFeed: MockFeedViewPost[],
  count: number,
  seed?: number
): MockFeedViewPost[] {
  const newItems = generateMockFeed({
    count,
    seed: seed ?? Date.now() % 100000,
    startTimeOffset: 1000,
    intervalMs: 5000,
  });
  applyImageUrls(newItems);
  return [...newItems, ...existingFeed];
}
