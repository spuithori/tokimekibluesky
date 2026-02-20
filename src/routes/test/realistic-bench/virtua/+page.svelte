<script lang="ts">
  import { WindowVirtualizer } from 'virtua/svelte';
  import { generateMockFeed } from '$lib/test/mockFeedGenerator';
  import type { MockFeedViewPost } from '$lib/test/mockFeedGenerator';
  import { onMount, tick, flushSync } from 'svelte';

  let items = $state.raw<MockFeedViewPost[]>([]);
  let virtualizerRef: ReturnType<typeof WindowVirtualizer> | undefined = $state();

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

  function formatNumber(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  onMount(() => {
    (window as any).__realisticBench = {
      loadFeed(count: number, seed = 42) {
        flushSync(() => {
          items = generateMockFeed({ count, seed });
        });
      },

      clearFeed() {
        flushSync(() => {
          items = [];
        });
      },

      getFeedCount() {
        return items.length;
      },

      getRenderedItemCount() {
        return document.querySelectorAll('[data-testid="timeline-item"]').length;
      },

      scrollToIndex(index: number) {
        virtualizerRef?.scrollToIndex(index);
      },

      getScrollTop() {
        return window.scrollY;
      },

      async waitForRender() {
        await tick();
        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => requestAnimationFrame(r));
      },

      getLibraryName() {
        return 'virtua';
      },
    };

    return () => {
      delete (window as any).__realisticBench;
    };
  });
</script>

<div class="timeline" data-testid="timeline-content">
  <WindowVirtualizer
    data={items}
    getKey={(item) => item.post.uri}
    bind:this={virtualizerRef}
  >
    {#snippet children(item: MockFeedViewPost, index: number)}
      <article class="timeline-item" data-testid="timeline-item" data-index={index} data-uri={item.post.uri}>
        {#if item.reason}
          <div class="repost-indicator">
            <span>{item.reason.by.displayName} reposted</span>
          </div>
        {/if}

        {#if item.reply}
          <div class="reply-context">
            <span>{item.reply.parent.author.displayName}</span>
            <span>{item.reply.parent.record.text.slice(0, 80)}</span>
          </div>
        {/if}

        <div class="post-layout">
          <div class="avatar-column">
            <div class="avatar" style="width:42px;height:42px;border-radius:50%;background:#ddd;"></div>
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
                <div class="embed" style="background:#e8e8e8;min-height:120px;border-radius:8px;margin-bottom:8px;">
                  {#if item.post.embed.images}
                    {#each item.post.embed.images as img, i (img.fullsize)}
                      <div style="height:80px;background:#ddd;">{img.alt || `Image ${i + 1}`}</div>
                    {/each}
                  {/if}
                </div>
              {:else if embedType === 'external'}
                <div class="embed" style="background:#e8e8e8;height:80px;border-radius:8px;margin-bottom:8px;">
                  <span>{item.post.embed.external.title}</span>
                </div>
              {:else if embedType === 'video'}
                <div class="embed" style="background:#1a1a1a;aspect-ratio:16/9;border-radius:8px;margin-bottom:8px;"></div>
              {:else if embedType === 'quote'}
                <div class="embed" style="padding:10px;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:8px;">
                  <span>{item.post.embed.record.author.displayName}</span>
                  <div>{item.post.embed.record.value.text.slice(0, 120)}</div>
                </div>
              {/if}
            {/if}

            <div class="post-actions">
              <span>{formatNumber(item.post.replyCount)}</span>
              <span>{formatNumber(item.post.repostCount)}</span>
              <span>{formatNumber(item.post.likeCount)}</span>
            </div>
          </div>
        </div>
      </article>
    {/snippet}
  </WindowVirtualizer>
</div>

<style>
  .timeline-item { border-bottom: 1px solid #e0e0e0; font-family: sans-serif; font-size: 14px; }
  .repost-indicator { padding: 4px 12px 0 56px; color: #666; font-size: 12px; }
  .reply-context { padding: 8px 12px 0 56px; font-size: 12px; color: #666; }
  .post-layout { display: flex; padding: 10px 12px; gap: 10px; }
  .avatar-column { flex-shrink: 0; }
  .content-column { flex: 1; min-width: 0; }
  .post-header { display: flex; gap: 4px; margin-bottom: 2px; }
  .display-name { font-weight: 700; }
  .handle { color: #666; font-size: 13px; }
  .post-text { line-height: 1.5; margin-bottom: 8px; }
  .post-actions { display: flex; gap: 16px; color: #666; font-size: 12px; }
</style>
