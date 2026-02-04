export function estimateFeedItemHeight(item: any): number {
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
