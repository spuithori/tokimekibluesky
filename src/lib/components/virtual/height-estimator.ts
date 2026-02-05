const LEARNING_THRESHOLD = 20;

type Category = 'text-only' | 'text-image' | 'text-external' | 'text-quote' | 'text-quote-media' | 'text-video' | 'other';

interface CategoryStats {
  total: number;
  count: number;
}

const categoryStats = new Map<Category, CategoryStats>();

function classifyItem(item: any): Category {
  if (!item?.post) return 'other';
  const embed = item.post.embed;
  if (!embed) return 'text-only';
  const t = embed.$type;
  if (t === 'app.bsky.embed.images#view') return 'text-image';
  if (t === 'app.bsky.embed.external#view') return 'text-external';
  if (t === 'app.bsky.embed.record#view') return 'text-quote';
  if (t === 'app.bsky.embed.recordWithMedia#view') return 'text-quote-media';
  if (t === 'app.bsky.embed.video#view') return 'text-video';
  return 'other';
}

function staticEstimate(item: any): number {
  if (!item?.post) return 100;

  let h = 60;

  const text = item.post.record?.text as string | undefined;
  if (text) {
    h += Math.min(Math.ceil(text.length / 45), 20) * 20;
  }

  const embed = item.post.embed;
  if (embed) {
    const t = embed.$type;
    if (t === 'app.bsky.embed.images#view') h += 300;
    else if (t === 'app.bsky.embed.external#view') h += 120;
    else if (t === 'app.bsky.embed.record#view') h += 100;
    else if (t === 'app.bsky.embed.recordWithMedia#view') h += 380;
    else if (t === 'app.bsky.embed.video#view') h += 300;
    else h += 80;
  }

  if (item.reply?.parent) h += 24;
  if (item.reason) h += 20;

  h += 36;

  return h;
}

export function estimateFeedItemHeight(item: any): number {
  const category = classifyItem(item);
  const stats = categoryStats.get(category);

  if (stats && stats.count >= LEARNING_THRESHOLD) {
    return stats.total / stats.count;
  }

  return staticEstimate(item);
}

export function recordMeasuredHeight(item: any, height: number): void {
  const category = classifyItem(item);
  let stats = categoryStats.get(category);
  if (!stats) {
    stats = { total: 0, count: 0 };
    categoryStats.set(category, stats);
  }
  stats.total += height;
  stats.count++;
}

export function resetEstimatorStats(): void {
  categoryStats.clear();
}
