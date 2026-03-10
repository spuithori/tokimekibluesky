<script lang="ts">
  import type { MockFeedViewPost } from '$lib/test/mockFeedGenerator';

  let { item, index }: { item: MockFeedViewPost; index: number } = $props();

  function getEmbedType(post: MockFeedViewPost): string | null {
    const embed = post.post.embed;
    if (!embed) return null;
    if (embed.$type === 'app.bsky.embed.images#view') return 'images';
    if (embed.$type === 'app.bsky.embed.external#view') return 'external';
    if (embed.$type === 'app.bsky.embed.video#view') return 'video';
    if (embed.$type === 'app.bsky.embed.record#view') return 'quote';
    if (embed.$type === 'app.bsky.embed.recordWithMedia#view') return 'record-with-media';
    return null;
  }

  function formatNumber(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function avatarColor(did: string): string {
    let hash = 0;
    for (let i = 0; i < did.length; i++) hash = (hash * 31 + did.charCodeAt(i)) | 0;
    return `hsl(${Math.abs(hash) % 360}, 50%, 70%)`;
  }
</script>

<article class="timeline-item" data-testid="timeline-item" data-index={index} data-uri={item.post.uri}>
  {#if item.reason}
    <div class="repost-indicator">
      <span class="repost-author">{item.reason.by.displayName} reposted</span>
    </div>
  {/if}

  {#if item.reply}
    <div class="reply-context">
      <div class="reply-parent-preview">
        <div class="avatar avatar--small" style:background-color={avatarColor(item.reply.parent.author.did)}></div>
        <span class="reply-parent-name">{item.reply.parent.author.displayName}</span>
        <span class="reply-parent-text">{item.reply.parent.record.text.slice(0, 80)}...</span>
      </div>
    </div>
  {/if}

  <div class="post-layout">
    <div class="avatar-column">
      <div class="avatar" style:background-color={avatarColor(item.post.author.did)}></div>
    </div>

    <div class="content-column">
      <div class="post-header">
        <span class="display-name">{item.post.author.displayName}</span>
        <span class="handle">@{item.post.author.handle}</span>
      </div>

      <div class="post-text">{item.post.record.text}</div>

      {#if item.post.embed}
        {@const embedType = getEmbedType(item)}
        {#if embedType === 'images' || embedType === 'record-with-media'}
          <div class="embed embed--images">
            {#if item.post.embed.images}
              {#each item.post.embed.images as img, i (img.fullsize)}
                <div class="image-placeholder" style:aspect-ratio="{img.aspectRatio.width}/{img.aspectRatio.height}">
                  <span class="image-alt">{img.alt || `Image ${i + 1}`}</span>
                </div>
              {/each}
            {:else}
              <div class="image-placeholder" style:height="160px">
                <span class="image-alt">Media</span>
              </div>
            {/if}
          </div>
        {:else if embedType === 'external'}
          <div class="embed embed--external">
            <div class="external-thumb"></div>
            <div class="external-info">
              <span class="external-title">{item.post.embed.external.title}</span>
            </div>
          </div>
        {:else if embedType === 'video'}
          <div class="embed embed--video">
            <div class="video-placeholder">▶</div>
          </div>
        {:else if embedType === 'quote'}
          <div class="embed embed--quote">
            <div class="quote-header">
              <div class="avatar avatar--tiny" style:background-color={avatarColor(item.post.embed.record.author.did)}></div>
              <span class="quote-name">{item.post.embed.record.author.displayName}</span>
            </div>
            <div class="quote-text">{item.post.embed.record.value.text.slice(0, 120)}</div>
          </div>
        {/if}
      {/if}

      <div class="post-actions">
        <button class="action-btn"><span>{formatNumber(item.post.replyCount)}</span></button>
        <button class="action-btn"><span>{formatNumber(item.post.repostCount)}</span></button>
        <button class="action-btn"><span>{formatNumber(item.post.likeCount)}</span></button>
      </div>
    </div>
  </div>
</article>

<style>
  .timeline-item {
    border-bottom: 1px solid #e0e0e0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    padding: 0;
  }

  .repost-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px 0 56px;
    color: #666;
    font-size: 12px;
  }

  .repost-author {
    font-weight: 600;
  }

  .reply-context {
    padding: 8px 12px 0 56px;
    position: relative;
  }

  .reply-parent-preview {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #666;
    padding-bottom: 4px;
  }

  .reply-parent-name {
    font-weight: 600;
    color: #333;
  }

  .reply-parent-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .post-layout {
    display: flex;
    padding: 10px 12px;
    gap: 10px;
  }

  .avatar-column {
    flex-shrink: 0;
  }

  .avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
  }

  .avatar--small {
    width: 20px;
    height: 20px;
  }

  .avatar--tiny {
    width: 16px;
    height: 16px;
  }

  .content-column {
    flex: 1;
    min-width: 0;
  }

  .post-header {
    display: flex;
    align-items: baseline;
    gap: 4px;
    flex-wrap: wrap;
    margin-bottom: 2px;
  }

  .display-name {
    font-weight: 700;
    font-size: 14px;
    color: #000;
  }

  .handle {
    font-size: 13px;
    color: #666;
  }

  .post-text {
    line-height: 1.5;
    color: #1a1a1a;
    word-break: break-word;
    margin-bottom: 8px;
  }

  .embed {
    margin-bottom: 8px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  }

  .embed--images {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 2px;
  }

  .image-placeholder {
    background-color: #e8e8e8;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
    max-height: 200px;
  }

  .image-alt {
    font-size: 11px;
    color: #999;
  }

  .embed--external {
    display: flex;
    flex-direction: column;
  }

  .external-thumb {
    height: 80px;
    background-color: #e8e8e8;
  }

  .external-info {
    padding: 10px;
  }

  .external-title {
    font-weight: 600;
    font-size: 13px;
  }

  .embed--video {
    aspect-ratio: 16/9;
    background-color: #1a1a1a;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 32px;
  }

  .video-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .embed--quote {
    padding: 10px;
  }

  .quote-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .quote-name {
    font-weight: 600;
    font-size: 13px;
  }

  .quote-text {
    font-size: 13px;
    color: #333;
    line-height: 1.4;
  }

  .post-actions {
    display: flex;
    gap: 0;
    margin-top: 4px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    padding: 4px 12px 4px 0;
    color: #666;
    font-size: 12px;
    cursor: pointer;
  }
</style>
