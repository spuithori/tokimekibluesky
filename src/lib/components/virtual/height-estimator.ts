const LEARNING_THRESHOLD = 20;
const DEFAULT_CONTENT_WIDTH = 500;
const MAX_IMAGE_HEIGHT = 600;
const MIN_IMAGE_HEIGHT = 100;
const STORAGE_KEY = 'tokimeki_height_estimator_stats';
const SAVE_DEBOUNCE_MS = 5000;

type Category = 'text-only' | 'text-image' | 'text-external' | 'text-quote' | 'text-quote-media' | 'text-video' | 'other';

interface CategoryStats {
  total: number;
  count: number;
}

const categoryStats = new Map<Category, CategoryStats>();
let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;

function loadStats(): void {
  if (isInitialized) return;
  isInitialized = true;

  if (typeof localStorage === 'undefined') return;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    const parsed = JSON.parse(saved) as Record<string, CategoryStats>;
    for (const [key, value] of Object.entries(parsed)) {
      if (value && typeof value.total === 'number' && typeof value.count === 'number' && value.count > 0) {
        categoryStats.set(key as Category, { total: value.total, count: value.count });
      }
    }
  } catch {
  }
}

function scheduleSave(): void {
  if (saveTimeoutId !== null) return;

  saveTimeoutId = setTimeout(() => {
    saveTimeoutId = null;
    saveStats();
  }, SAVE_DEBOUNCE_MS);
}

function saveStats(): void {
  if (typeof localStorage === 'undefined') return;

  try {
    const obj: Record<string, CategoryStats> = {};
    for (const [key, value] of categoryStats) {
      obj[key] = value;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
  }
}

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

function estimateImageHeight(embed: any): number {
  const images = embed?.images;
  if (!images || !Array.isArray(images) || images.length === 0) {
    return 300;
  }

  const imageCount = images.length;

  if (imageCount === 1) {
    const img = images[0];
    const aspectRatio = img?.aspectRatio;
    if (aspectRatio?.width && aspectRatio?.height && aspectRatio.width > 0) {
      const ratio = aspectRatio.height / aspectRatio.width;
      const calculatedHeight = Math.round(DEFAULT_CONTENT_WIDTH * ratio);
      return Math.max(MIN_IMAGE_HEIGHT, Math.min(MAX_IMAGE_HEIGHT, calculatedHeight));
    }
    return 300;
  }

  if (imageCount === 2) {
    let maxHeight = 0;
    for (const img of images) {
      const aspectRatio = img?.aspectRatio;
      if (aspectRatio?.width && aspectRatio?.height && aspectRatio.width > 0) {
        const ratio = aspectRatio.height / aspectRatio.width;
        const halfWidth = (DEFAULT_CONTENT_WIDTH - 4) / 2;
        const calculatedHeight = Math.round(halfWidth * ratio);
        maxHeight = Math.max(maxHeight, calculatedHeight);
      } else {
        maxHeight = Math.max(maxHeight, 200);
      }
    }
    return Math.max(MIN_IMAGE_HEIGHT, Math.min(MAX_IMAGE_HEIGHT, maxHeight));
  }

  if (imageCount === 3) {
    return Math.min(MAX_IMAGE_HEIGHT, 300);
  }

  return Math.min(MAX_IMAGE_HEIGHT, 350);
}

function estimateVideoHeight(embed: any): number {
  const aspectRatio = embed?.aspectRatio;
  if (aspectRatio?.width && aspectRatio?.height && aspectRatio.width > 0) {
    const ratio = aspectRatio.height / aspectRatio.width;
    const calculatedHeight = Math.round(DEFAULT_CONTENT_WIDTH * ratio);
    return Math.max(MIN_IMAGE_HEIGHT, Math.min(MAX_IMAGE_HEIGHT, calculatedHeight));
  }
  return 300;
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
    if (t === 'app.bsky.embed.images#view') {
      h += estimateImageHeight(embed);
    } else if (t === 'app.bsky.embed.external#view') {
      const externalEmbed = embed?.external;
      if (externalEmbed?.thumb) {
        h += 120;
      } else {
        h += 80;
      }
    } else if (t === 'app.bsky.embed.record#view') {
      h += 100;
    } else if (t === 'app.bsky.embed.recordWithMedia#view') {
      const media = embed?.media;
      if (media?.$type === 'app.bsky.embed.images#view') {
        h += estimateImageHeight(media) + 80;
      } else if (media?.$type === 'app.bsky.embed.video#view') {
        h += estimateVideoHeight(media) + 80;
      } else {
        h += 380;
      }
    } else if (t === 'app.bsky.embed.video#view') {
      h += estimateVideoHeight(embed);
    } else {
      h += 80;
    }
  }

  if (item.reply?.parent) h += 24;
  if (item.reason) h += 20;

  h += 36;

  return h;
}

export function estimateFeedItemHeight(item: any): number {
  loadStats();

  const category = classifyItem(item);
  const stats = categoryStats.get(category);

  if (stats && stats.count >= LEARNING_THRESHOLD) {
    return stats.total / stats.count;
  }

  return staticEstimate(item);
}

export function recordMeasuredHeight(item: any, height: number): void {
  loadStats();

  const category = classifyItem(item);
  let stats = categoryStats.get(category);
  if (!stats) {
    stats = { total: 0, count: 0 };
    categoryStats.set(category, stats);
  }
  stats.total += height;
  stats.count++;

  scheduleSave();
}

export function resetEstimatorStats(): void {
  categoryStats.clear();
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
    }
  }
}
