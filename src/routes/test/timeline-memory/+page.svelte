<script lang="ts">
  import VirtualList from '$lib/components/virtual/VirtualList.svelte';
  import { generateMockFeed, estimateFeedMemory } from '$lib/test/mockFeedGenerator';
  import type { MockFeedViewPost } from '$lib/test/mockFeedGenerator';
  import { onMount, tick } from 'svelte';

  const TOP_MARGIN = 52;

  let items = $state<MockFeedViewPost[]>([]);
  let scrollContainer = $state<HTMLElement | null>(null);
  let virtualList: ReturnType<typeof VirtualList> | undefined = $state();
  let currentSeed = 42;

  function getKey(item: MockFeedViewPost): string {
    return item.post.uri;
  }

  function formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function getEmbedType(item: MockFeedViewPost): string | null {
    const embed = item.post.embed;
    if (!embed) return null;
    if (embed.$type === 'app.bsky.embed.images#view') return 'images';
    if (embed.$type === 'app.bsky.embed.external#view') return 'external';
    if (embed.$type === 'app.bsky.embed.video#view') return 'video';
    if (embed.$type === 'app.bsky.embed.record#view') return 'quote';
    if (embed.$type === 'app.bsky.embed.recordWithMedia#view') return 'record-with-media';
    return null;
  }

  onMount(() => {
    scrollContainer = document.querySelector('.modal-page-content') as HTMLElement;

    (window as any).__memoryTest = {
      loadFeed(count: number, seed: number = 42) {
        currentSeed = seed;
        items = generateMockFeed({ count, seed });
      },

      appendFeed(count: number) {
        const newItems = generateMockFeed({
          count,
          seed: currentSeed + items.length,
          startTimeOffset: 60000 + items.length * 30000,
        });
        items = [...items, ...newItems];
      },

      prependFeed(count: number) {
        const newItems = generateMockFeed({
          count,
          seed: currentSeed + Date.now() % 100000,
          startTimeOffset: 1000,
          intervalMs: 5000,
        });
        items = [...newItems, ...items];
      },

      clearFeed() {
        items = [];
      },

      getFeedCount() {
        return items.length;
      },

      getRenderedItemCount() {
        return document.querySelectorAll('[data-testid="timeline-item"]').length;
      },

      getMemoryEstimate() {
        if (items.length === 0) return { jsonBytes: 0, itemCount: 0, avgBytesPerItem: 0 };
        return estimateFeedMemory(items);
      },

      scrollToBottom() {
        if (virtualList && items.length > 0) {
          virtualList.scrollToIndex(items.length - 1, { align: 'end' });
        }
      },

      scrollToTop() {
        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
        }
      },

      scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start') {
        virtualList?.scrollToIndex(index, { align });
      },

      trimOldPosts(keep: number) {
        if (items.length > keep) {
          items = items.slice(0, keep);
        }
      },

      getTreeDiagnostics() {
        return virtualList?.getTreeDiagnostics() ?? null;
      },

      getScrollInfo() {
        return virtualList?.getScrollInfo() ?? null;
      },

      async waitForRender() {
        await tick();
        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => requestAnimationFrame(r));
      },
    };

    return () => {
      delete (window as any).__memoryTest;
    };
  });
</script>

<div class="timeline">
  <VirtualList
    {items}
    {getKey}
    {scrollContainer}
    topMargin={TOP_MARGIN}
    bind:this={virtualList}
  >
    {#snippet children(item: MockFeedViewPost, index: number)}
      <article class="timeline-item" data-testid="timeline-item" data-index={index} data-uri={item.post.uri}>
        {#if item.reason}
          <div class="repost-indicator">
            <svg class="repost-icon" viewBox="0 0 24 24" width="14" height="14">
              <path d="M4.75 3.79l4.603 4.3-1.706 1.82L6 8.38v7.37c0 .97.784 1.75 1.75 1.75H13V19.5H7.75c-2.347 0-4.25-1.9-4.25-4.25V8.38L1.853 9.91.147 8.09l4.603-4.3zm11.5 2.71H11V4.5h5.25c2.347 0 4.25 1.9 4.25 4.25v7.37l1.647-1.53 1.706 1.82-4.603 4.3-4.603-4.3 1.706-1.82L18 16.12V8.75c0-.97-.784-1.75-1.75-1.75z" fill="currentColor"/>
            </svg>
            <span class="repost-author">{item.reason.by.displayName} reposted</span>
          </div>
        {/if}

        {#if item.reply}
          <div class="reply-context">
            <div class="reply-line"></div>
            <div class="reply-parent-preview">
              <img class="avatar avatar--small" src={item.reply.parent.author.avatar} alt="" loading="lazy" />
              <span class="reply-parent-name">{item.reply.parent.author.displayName}</span>
              <span class="reply-parent-text">{item.reply.parent.record.text.slice(0, 80)}...</span>
            </div>
          </div>
        {/if}

        <div class="post-layout">
          <div class="avatar-column">
            <img class="avatar" src={item.post.author.avatar} alt="" loading="lazy" />
          </div>

          <div class="content-column">
            <div class="post-header">
              <span class="display-name">{item.post.author.displayName}</span>
              <span class="handle">@{item.post.author.handle}</span>
              <span class="timestamp">{new Date(item.post.record.createdAt).toLocaleTimeString()}</span>
            </div>

            <div class="post-text">{item.post.record.text}</div>

            {#if item.post.embed}
              {@const embedType = getEmbedType(item)}
              {#if embedType === 'images'}
                <div class="embed embed--images">
                  {#each item.post.embed.images as img, i}
                    <div class="image-placeholder" style:aspect-ratio="{img.aspectRatio.width}/{img.aspectRatio.height}">
                      <span class="image-alt">{img.alt || `Image ${i + 1}`}</span>
                    </div>
                  {/each}
                </div>
              {:else if embedType === 'external'}
                <div class="embed embed--external">
                  <div class="external-thumb"></div>
                  <div class="external-info">
                    <span class="external-title">{item.post.embed.external.title}</span>
                    <span class="external-desc">{item.post.embed.external.description}</span>
                    <span class="external-uri">{item.post.embed.external.uri}</span>
                  </div>
                </div>
              {:else if embedType === 'video'}
                <div class="embed embed--video">
                  <div class="video-placeholder">
                    <svg viewBox="0 0 24 24" width="32" height="32"><path d="M8 5v14l11-7z" fill="white"/></svg>
                  </div>
                </div>
              {:else if embedType === 'quote'}
                <div class="embed embed--quote">
                  <div class="quote-header">
                    <img class="avatar avatar--tiny" src={item.post.embed.record.author.avatar} alt="" loading="lazy" />
                    <span class="quote-name">{item.post.embed.record.author.displayName}</span>
                  </div>
                  <div class="quote-text">{item.post.embed.record.value.text.slice(0, 120)}</div>
                </div>
              {:else if embedType === 'record-with-media'}
                <div class="embed embed--record-media">
                  <div class="image-placeholder" style:aspect-ratio="16/9">
                    <span class="image-alt">Media</span>
                  </div>
                  <div class="quote-header">
                    <span class="quote-name">Quoted post</span>
                  </div>
                </div>
              {/if}
            {/if}

            <div class="post-actions">
              <button class="action-btn">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.25-.893 4.41-2.482 6l-4.451 4.319V24.5l-1.424-.757c-1.1-.585-2.238-1.27-2.71-1.565A8.004 8.004 0 011.75 10z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
                <span>{formatNumber(item.post.replyCount)}</span>
              </button>
              <button class="action-btn">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M4.75 3.79l4.603 4.3-1.706 1.82L6 8.38v7.37c0 .97.784 1.75 1.75 1.75H13V19.5H7.75c-2.347 0-4.25-1.9-4.25-4.25V8.38L1.853 9.91.147 8.09l4.603-4.3zm11.5 2.71H11V4.5h5.25c2.347 0 4.25 1.9 4.25 4.25v7.37l1.647-1.53 1.706 1.82-4.603 4.3-4.603-4.3 1.706-1.82L18 16.12V8.75c0-.97-.784-1.75-1.75-1.75z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
                <span>{formatNumber(item.post.repostCount)}</span>
              </button>
              <button class="action-btn">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.56-1.13-1.666-1.84-2.908-1.91z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
                <span>{formatNumber(item.post.likeCount)}</span>
              </button>
              <button class="action-btn">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
              </button>
            </div>
          </div>
        </div>
      </article>
    {/snippet}
  </VirtualList>
</div>

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

  .repost-icon {
    color: #2a9d43;
  }

  .repost-author {
    font-weight: 600;
  }

  .reply-context {
    padding: 8px 12px 0 56px;
    position: relative;
  }

  .reply-line {
    position: absolute;
    left: 30px;
    top: 0;
    bottom: 0;
    width: 2px;
    background-color: #ccc;
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
    background-color: #ddd;
    object-fit: cover;
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

  .timestamp {
    font-size: 12px;
    color: #999;
    margin-left: auto;
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
    height: 120px;
    background-color: #e8e8e8;
  }

  .external-info {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .external-title {
    font-weight: 600;
    font-size: 13px;
  }

  .external-desc {
    font-size: 12px;
    color: #666;
  }

  .external-uri {
    font-size: 11px;
    color: #999;
  }

  .embed--video {
    aspect-ratio: 16/9;
    background-color: #1a1a1a;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .video-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: rgba(255,255,255,0.2);
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

  .embed--record-media {
    display: flex;
    flex-direction: column;
  }

  .embed--record-media .quote-header {
    padding: 8px 10px;
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

  .action-btn:hover {
    color: #1a8cd8;
  }

  .action-btn svg {
    flex-shrink: 0;
  }
</style>
