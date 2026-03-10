<script lang="ts">
  import VirtualList from '$lib/components/virtual/VirtualList.svelte';
  import { generateImageFeed, prependImageFeed } from '$lib/test/mockImageFeedGenerator';
  import type { MockFeedViewPost } from '$lib/test/mockFeedGenerator';
  import { onMount, tick } from 'svelte';

  const TOP_MARGIN = 52;

  let items = $state<MockFeedViewPost[]>([]);
  let scrollContainer = $state<HTMLElement | null>(null);
  let virtualList: ReturnType<typeof VirtualList> | undefined = $state();
  let mode = $state<'virtual' | 'plain'>('virtual');
  let currentSeed = 42;

  function getKey(item: MockFeedViewPost, _index?: number): string {
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
    if (embed.$type === 'app.bsky.embed.external#view') {
      if (embed._isXEmbed) return 'x-embed';
      if (embed._isYouTube) return 'youtube';
      return 'external';
    }
    if (embed.$type === 'app.bsky.embed.video#view') return 'video';
    if (embed.$type === 'app.bsky.embed.record#view') return 'quote';
    if (embed.$type === 'app.bsky.embed.recordWithMedia#view') return 'record-with-media';
    return null;
  }

  function getEmbedImages(item: MockFeedViewPost): Array<{ thumb: string; fullsize: string; alt: string; aspectRatio: { width: number; height: number } }> {
    const embed = item.post.embed;
    if (!embed) return [];
    if (embed.$type === 'app.bsky.embed.images#view') return embed.images ?? [];
    if (embed.$type === 'app.bsky.embed.recordWithMedia#view' && embed.media?.$type === 'app.bsky.embed.images#view') {
      return embed.media.images ?? [];
    }
    return [];
  }

  onMount(() => {
    scrollContainer = document.querySelector('.modal-page-content') as HTMLElement;

    (window as any).__memoryComparisonTest = {
      setMode(newMode: 'virtual' | 'plain') {
        items = [];
        mode = newMode;
      },

      loadFeed(count: number, seed: number = 42) {
        currentSeed = seed;
        items = generateImageFeed({ count, seed });
      },

      prependFeed(count: number) {
        items = prependImageFeed(items, count, currentSeed + Date.now() % 100000);
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

      getMode() {
        return mode;
      },

      async waitForRender() {
        await tick();
        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => requestAnimationFrame(r));
      },

      async waitForImages() {
        const imgs = document.querySelectorAll<HTMLImageElement>('[data-testid="timeline-item"] img');
        const promises: Promise<void>[] = [];
        for (const img of imgs) {
          if (!img.complete) {
            promises.push(new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            }));
          }
        }
        if (promises.length > 0) {
          await Promise.race([
            Promise.all(promises),
            new Promise(r => setTimeout(r, 3000)),
          ]);
        }
      },

      scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start') {
        if (mode === 'virtual') {
          virtualList?.scrollToIndex(index, { align });
        } else {
          const el = document.querySelectorAll('[data-testid="timeline-item"]')[index];
          el?.scrollIntoView({ block: align === 'center' ? 'center' : align === 'end' ? 'end' : 'start' });
        }
      },

      scrollToTop() {
        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
        }
      },

      getScrollTop() {
        return scrollContainer?.scrollTop ?? 0;
      },

      /**
       * アンカー要素の現在のvisualY（コンテナ上端からの相対位置）とscrollTopを返す。
       * anchorUri: data-uri属性で特定するアンカー要素のURI
       */
      getAnchorPosition(anchorUri: string) {
        if (!scrollContainer) return null;
        const el = document.querySelector(`[data-uri="${anchorUri}"]`) as HTMLElement | null;
        if (!el) return null;
        const containerTop = scrollContainer.getBoundingClientRect().top;
        return {
          visualY: el.getBoundingClientRect().top - containerTop,
          scrollTop: scrollContainer.scrollTop,
        };
      },

      /**
       * 現在ビューポートに見えている最初のtimeline-itemのdata-uriを返す。
       */
      getVisibleAnchorUri() {
        if (!scrollContainer) return null;
        const containerTop = scrollContainer.getBoundingClientRect().top;
        const items = document.querySelectorAll('[data-testid="timeline-item"]');
        for (const item of items) {
          const rect = item.getBoundingClientRect();
          // アイテムの下端がコンテナ上端+topMarginより下にある = 見えている
          if (rect.bottom > containerTop + 52) {
            return (item as HTMLElement).dataset.uri ?? null;
          }
        }
        return null;
      },

      getTreeDiagnostics() {
        return virtualList?.getTreeDiagnostics() ?? null;
      },

      getScrollInfo() {
        return virtualList?.getScrollInfo() ?? null;
      },

      enableDebug() {
        virtualList?.enableDebug();
      },

      getDebugLog() {
        return virtualList?.getDebugLog() ?? [];
      },

      /**
       * 画像ロードをシミュレート: バッファ内のアイテムに遅延的に高さを追加する。
       * 実アプリの ImageLoader (プレースホルダー→デコード→フェードイン) を模擬。
       *
       * startDelayMs: 最初の展開までの遅延 (ms)
       * intervalMs: 展開チェック間隔 (ms)
       * extraHeightRange: [min, max] 追加する高さの範囲 (px)
       *
       * 返値: { stop(), expandedCount } を持つコントローラ
       */
      startAsyncHeightSimulation(opts?: {
        startDelayMs?: number;
        intervalMs?: number;
        extraHeightRange?: [number, number];
        expandDelayMs?: number;
      }) {
        const startDelayMs = opts?.startDelayMs ?? 50;
        const intervalMs = opts?.intervalMs ?? 80;
        const extraHeightRange = opts?.extraHeightRange ?? [80, 200];
        const expandedSet = new Set<string>();
        let expandedCount = 0;
        let stopped = false;

        let _debugLog: string[] = [];
        // 遅延展開: バッファに入ったアイテムを記録し、一定時間後に展開する
        // 実アプリでは「バッファ描画→画像リクエスト→デコード→表示」と遅延がある
        const pendingExpansions = new Map<string, number>(); // uri → scheduledTime
        const expandDelayMs = opts?.expandDelayMs ?? 120; // 画像ロード遅延をシミュレート

        const scan = () => {
          if (stopped || !scrollContainer) return;
          const containerTop = scrollContainer.getBoundingClientRect().top;
          const visibleAreaTop = containerTop + TOP_MARGIN;
          const elems = document.querySelectorAll('[data-testid="timeline-item"]');
          const now = performance.now();

          for (const el of elems) {
            const htmlEl = el as HTMLElement;
            const uri = htmlEl.dataset.uri;
            if (!uri || expandedSet.has(uri)) continue;

            const rect = el.getBoundingClientRect();

            // まだスケジュールされていないアイテムを発見→遅延展開をスケジュール
            // バッファゾーン（ビューポート上方 or 近辺）にあるアイテムが対象
            if (!pendingExpansions.has(uri) && rect.bottom < visibleAreaTop + 300 && rect.bottom > containerTop - 3000) {
              pendingExpansions.set(uri, now + expandDelayMs + Math.random() * expandDelayMs);
            }

            // スケジュール済みで時間が来たアイテムを展開（ビューポート上方にいる場合のみ）
            const scheduledTime = pendingExpansions.get(uri);
            if (scheduledTime && now >= scheduledTime) {
              pendingExpansions.delete(uri);
              // ビューポート上方にいる場合のみ展開（可視アイテムの高さ変化は正常なリフロー）
              if (rect.bottom < visibleAreaTop && rect.bottom > containerTop - 3000) {
                expandedSet.add(uri);
                const extraH = extraHeightRange[0] + Math.random() * (extraHeightRange[1] - extraHeightRange[0]);
                const div = document.createElement('div');
                div.style.height = extraH + 'px';
                div.style.background = '#e8e8e8';
                div.className = 'simulated-image-expansion';
                htmlEl.querySelector('.content-column')?.appendChild(div);
                expandedCount++;
              }
            }
          }
        };

        const intervalId = setInterval(scan, intervalMs);
        const timeoutId = setTimeout(scan, startDelayMs);

        const controller = {
          stop() {
            stopped = true;
            clearInterval(intervalId);
            clearTimeout(timeoutId);
          },
          get expandedCount() { return expandedCount; },
          get pendingCount() { return pendingExpansions.size; },
        };
        (window as any).__heightSimController = controller;
        return controller;
      },

      startEmbedSimulation(opts?: {
        xEmbedDelayRange?: [number, number],
        linkCardDelayRange?: [number, number],
        youtubeDelayRange?: [number, number],
      }) {
        const xRange = opts?.xEmbedDelayRange ?? [300, 1000];
        const linkRange = opts?.linkCardDelayRange ?? [100, 400];
        const ytRange = opts?.youtubeDelayRange ?? [200, 600];
        const expandedX = new Set<Element>();
        const expandedLinks = new Set<Element>();
        const expandedYT = new Set<Element>();
        const pendingTimers = new Set<number>();
        let stopped = false;
        let xCount = 0;
        let linkCount = 0;
        let ytCount = 0;

        function randomDelay(range: [number, number]): number {
          return range[0] + Math.random() * (range[1] - range[0]);
        }

        const scan = () => {
          if (stopped || !scrollContainer) return;
          // X embeds
          const xEmbeds = document.querySelectorAll('[data-x-embed]');
          for (const el of xEmbeds) {
            if (expandedX.has(el)) continue;
            expandedX.add(el);
            const delay = randomDelay(xRange);
            const timer = window.setTimeout(() => {
              if (stopped) return;
              pendingTimers.delete(timer);
              // Expand from ~60px blockquote to ~400px with content
              const container = document.createElement('div');
              container.className = 'x-embed-expanded';
              container.style.height = '340px';
              container.style.background = '#f5f5f5';
              container.style.borderTop = '1px solid #e0e0e0';
              container.style.padding = '12px';
              container.innerHTML = '<div style="height:200px;background:#e0e0e0;border-radius:8px;margin-bottom:8px"></div><div style="height:80px;background:#eee;border-radius:4px"></div>';
              el.appendChild(container);
              xCount++;
            }, delay);
            pendingTimers.add(timer);
          }
          // Link cards
          const linkCards = document.querySelectorAll('[data-link-card]');
          for (const el of linkCards) {
            if (expandedLinks.has(el)) continue;
            expandedLinks.add(el);
            const delay = randomDelay(linkRange);
            const timer = window.setTimeout(() => {
              if (stopped) return;
              pendingTimers.delete(timer);
              // Expand thumbnail placeholder from 0 to 120px
              const thumb = el.querySelector('.link-card-thumb-placeholder') as HTMLElement;
              if (thumb) {
                thumb.style.height = '120px';
                thumb.style.background = '#e0e0e0';
              }
              linkCount++;
            }, delay);
            pendingTimers.add(timer);
          }
          // YouTube embeds
          const ytEmbeds = document.querySelectorAll('[data-youtube-embed]');
          for (const el of ytEmbeds) {
            if (expandedYT.has(el)) continue;
            expandedYT.add(el);
            const delay = randomDelay(ytRange);
            const timer = window.setTimeout(() => {
              if (stopped) return;
              pendingTimers.delete(timer);
              // Expand from ~50px placeholder to 16:9 iframe container (~280px)
              const htmlEl = el as HTMLElement;
              const iframe = document.createElement('div');
              iframe.className = 'youtube-iframe-sim';
              iframe.style.width = '100%';
              iframe.style.aspectRatio = '16/9';
              iframe.style.background = '#1a1a1a';
              iframe.style.borderRadius = '0 0 8px 8px';
              htmlEl.appendChild(iframe);
              // Remove placeholder
              const placeholder = htmlEl.querySelector('.youtube-placeholder') as HTMLElement;
              if (placeholder) placeholder.style.display = 'none';
              ytCount++;
            }, delay);
            pendingTimers.add(timer);
          }
        };

        const intervalId = setInterval(scan, 100);
        scan(); // initial scan

        const controller = {
          stop() {
            stopped = true;
            clearInterval(intervalId);
            for (const timer of pendingTimers) clearTimeout(timer);
            pendingTimers.clear();
            return { xExpanded: xCount, linksExpanded: linkCount, youtubeExpanded: ytCount };
          },
          get xExpanded() { return xCount; },
          get linksExpanded() { return linkCount; },
          get youtubeExpanded() { return ytCount; },
        };
        (window as any).__embedSimController = controller;
        return controller;
      },

      stopEmbedSimulation() {
        const c = (window as any).__embedSimController;
        if (c) {
          const result = c.stop();
          delete (window as any).__embedSimController;
          return result;
        }
        return { xExpanded: 0, linksExpanded: 0, youtubeExpanded: 0 };
      },

      stopAsyncHeightSimulation() {
        const c = (window as any).__heightSimController;
        if (c) {
          c.stop();
          const count = c.expandedCount;
          const pending = c.pendingCount ?? 0;
          delete (window as any).__heightSimController;
          return { count, pending };
        }
        return { count: 0, pending: 0 };
      },
    };

    return () => {
      delete (window as any).__memoryComparisonTest;
    };
  });
</script>

{#snippet timelineItem(item: MockFeedViewPost, index: number)}
  <article class="timeline-item" data-testid="timeline-item" data-index={index} data-uri={item.post.uri}>
    {#if item.reason}
      <div class="repost-indicator">
        <span class="repost-author">{item.reason.by.displayName} reposted</span>
      </div>
    {/if}

    {#if item.reply}
      <div class="reply-context">
        <div class="reply-parent-preview">
          <img class="avatar avatar--small" src={item.reply.parent.author.avatar} alt="" loading="eager" />
          <span class="reply-parent-name">{item.reply.parent.author.displayName}</span>
          <span class="reply-parent-text">{item.reply.parent.record.text.slice(0, 80)}...</span>
        </div>
      </div>
    {/if}

    <div class="post-layout">
      <div class="avatar-column">
        <img class="avatar" src={item.post.author.avatar} alt="" loading="eager" />
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
              {#each getEmbedImages(item) as img, i (img.fullsize)}
                <div class="image-container" style:aspect-ratio="{img.aspectRatio.width}/{img.aspectRatio.height}">
                  <img class="embed-image" src={img.fullsize} alt={img.alt || `Image ${i + 1}`} loading="eager" />
                </div>
              {/each}
            </div>
          {:else if embedType === 'x-embed'}
            <div class="embed embed--x-embed" data-x-embed>
              <blockquote class="x-embed-blockquote">
                <p class="x-embed-text">{item.post.embed._xEmbedText ?? item.post.embed.external.description}</p>
                <span class="x-embed-source">— Post on X</span>
              </blockquote>
            </div>
          {:else if embedType === 'youtube'}
            <div class="embed embed--youtube" data-youtube-embed>
              <div class="youtube-placeholder">
                <span class="youtube-icon">▶</span>
                <span class="youtube-title">{item.post.embed.external.title}</span>
              </div>
            </div>
          {:else if embedType === 'external'}
            <div class="embed embed--external" data-link-card>
              <div class="link-card-thumb-placeholder"></div>
              <div class="external-info">
                <span class="external-title">{item.post.embed.external.title}</span>
              </div>
            </div>
          {:else if embedType === 'video'}
            <div class="embed embed--video">
              {#if item.post.embed.thumbnail}
                <img class="video-thumb" src={item.post.embed.thumbnail} alt="" loading="eager" />
              {/if}
            </div>
          {:else if embedType === 'quote'}
            <div class="embed embed--quote">
              <div class="quote-header">
                <img class="avatar avatar--tiny" src={item.post.embed.record.author.avatar} alt="" loading="eager" />
                <span class="quote-name">{item.post.embed.record.author.displayName}</span>
              </div>
              <div class="quote-text">{item.post.embed.record.value.text.slice(0, 120)}</div>
            </div>
          {/if}
        {/if}

        <div class="post-actions">
          <button class="action-btn">
            <span>{formatNumber(item.post.replyCount)}</span>
          </button>
          <button class="action-btn">
            <span>{formatNumber(item.post.repostCount)}</span>
          </button>
          <button class="action-btn">
            <span>{formatNumber(item.post.likeCount)}</span>
          </button>
        </div>
      </div>
    </div>
  </article>
{/snippet}

<div class="timeline">
  {#if mode === 'virtual'}
    <VirtualList
      {items}
      {getKey}
      {scrollContainer}
      topMargin={TOP_MARGIN}
      bind:this={virtualList}
    >
      {#snippet children(item: MockFeedViewPost, index: number)}
        {@render timelineItem(item, index)}
      {/snippet}
    </VirtualList>
  {:else}
    {#each items as item, index (getKey(item, index))}
      {@render timelineItem(item, index)}
    {/each}
  {/if}
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

  .image-container {
    background-color: #e8e8e8;
    min-height: 80px;
    max-height: 200px;
    overflow: hidden;
  }

  .embed-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .embed--external {
    display: flex;
    flex-direction: column;
  }

  .link-card-thumb-placeholder {
    height: 0;
    width: 100%;
    transition: none;
  }


  .external-info {
    padding: 10px;
  }

  .external-title {
    font-weight: 600;
    font-size: 13px;
  }

  .embed--x-embed {
    padding: 0;
  }

  .x-embed-blockquote {
    margin: 0;
    padding: 12px;
    font-size: 13px;
    line-height: 1.4;
  }

  .x-embed-text {
    margin: 0 0 4px 0;
    color: #333;
  }

  .x-embed-source {
    font-size: 11px;
    color: #999;
  }

  .embed--youtube {
    overflow: hidden;
  }

  .youtube-placeholder {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: #f0f0f0;
    min-height: 50px;
  }

  .youtube-icon {
    font-size: 24px;
    color: #ff0000;
  }

  .youtube-title {
    font-size: 13px;
    font-weight: 600;
    color: #333;
  }

  .embed--video {
    aspect-ratio: 16/9;
    background-color: #1a1a1a;
    overflow: hidden;
  }

  .video-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
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
