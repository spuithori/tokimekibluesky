export function getFeedKey(data: any, index: number): string {
  if (!data?.post?.uri) return `__divider_${index}`;
  return `${data.post.uri}|${data.reason?.indexedAt || ''}`;
}

export function makeFeedKeys(feed: any[]): string[] {
  const seen = new Map<string, number>();
  return feed.map((data, i) => {
    const base = getFeedKey(data, i);
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    return n > 0 ? `${base}#${n}` : base;
  });
}
