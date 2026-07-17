<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';

  type SheetMode = 'bar' | 'peek' | 'expanded';

  let {
    mode = $bindable('peek'),
    onreservedheightchange,
    peek,
    children
  }: {
    mode?: SheetMode;
    onreservedheightchange?: (px: number) => void;
    peek?: Snippet;
    children?: Snippet;
  } = $props();

  let sheetHeight = $state(0);
  let headerHeight = $state(0);
  let stableHeaderHeight = $state(0);
  let gripHeight = $state(0);
  let dragging = $state(false);
  let dragOffset = $state(0);
  let pointerId: number | null = null;
  let startY = 0;
  let moved = false;

  $effect(() => {
    if (mode !== 'expanded' && headerHeight > 0) {
      stableHeaderHeight = headerHeight;
    }
  });

  const barVisible = $derived(gripHeight + 8);
  const snapOffsets = $derived({
    expanded: 0,
    peek: Math.max(0, sheetHeight - stableHeaderHeight),
    bar: Math.max(0, sheetHeight - barVisible)
  });
  const baseOffset = $derived(snapOffsets[mode]);
  const currentOffset = $derived(
    Math.min(snapOffsets.bar, Math.max(0, baseOffset + dragOffset))
  );
  const reservedHeight = $derived(mode === 'bar' ? barVisible : stableHeaderHeight);

  $effect(() => {
    onreservedheightchange?.(reservedHeight);
  });

  function handlePointerDown(event: PointerEvent) {
    pointerId = event.pointerId;
    startY = event.clientY;
    moved = false;
  }

  function handlePointerMove(event: PointerEvent) {
    if (pointerId !== event.pointerId) return;
    const delta = event.clientY - startY;
    if (!moved && Math.abs(delta) > 10) {
      moved = true;
      dragging = true;
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }
    if (dragging) {
      dragOffset = delta;
    }
  }

  function settleDrag() {
    const position = currentOffset;
    let best: SheetMode = mode;
    let bestDistance = Infinity;
    for (const candidate of ['expanded', 'peek', 'bar'] as const) {
      const distance = Math.abs(snapOffsets[candidate] - position);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }
    mode = best;
    dragging = false;
    dragOffset = 0;
  }

  function handlePointerUp(event: PointerEvent) {
    if (pointerId !== event.pointerId) return;
    pointerId = null;
    if (dragging) settleDrag();
  }

  const bodyPullDown: Attachment<HTMLElement> = (node) => {
    let touchStartY = 0;
    let active = false;
    let decided = false;

    function hasScrolledAncestor(target: EventTarget | null): boolean {
      let el = target instanceof Element ? target : null;
      while (el && el !== node) {
        if (el.scrollTop > 0) return true;
        el = el.parentElement;
      }
      return false;
    }

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) return;
      touchStartY = event.touches[0].clientY;
      active = false;
      decided = false;
    }

    function onTouchMove(event: TouchEvent) {
      if (event.touches.length !== 1) return;
      const delta = event.touches[0].clientY - touchStartY;
      if (!decided) {
        if (Math.abs(delta) < 10) return;
        decided = true;
        active = mode === 'expanded' && delta > 0 && !hasScrolledAncestor(event.target);
        if (active) dragging = true;
      }
      if (active) {
        event.preventDefault();
        dragOffset = delta;
      }
    }

    function onTouchEnd() {
      if (active) settleDrag();
      active = false;
      decided = false;
    }

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd);
    node.addEventListener('touchcancel', onTouchEnd);
    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchEnd);
    };
  };

  function handleToggle() {
    if (moved) return;
    mode = mode === 'expanded' ? 'peek' : mode === 'peek' ? 'expanded' : 'peek';
  }
</script>

<div
  class="bottom-sheet"
  class:bottom-sheet--expanded={mode === 'expanded'}
  class:bottom-sheet--dragging={dragging}
  bind:clientHeight={sheetHeight}
  style:transform={sheetHeight === 0 ? 'translateY(100%)' : `translateY(${dragging ? currentOffset : baseOffset}px)`}
>
  <div
    class="bottom-sheet__header"
    role="presentation"
    bind:clientHeight={headerHeight}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
  >
    <div class="bottom-sheet__grip-area" bind:clientHeight={gripHeight}>
      <button
        type="button"
        class="bottom-sheet__grip"
        aria-expanded={mode === 'expanded'}
        aria-label="Toggle details"
        onclick={handleToggle}
      ></button>
    </div>

    {#if peek}
      <div class="bottom-sheet__peek">
        {@render peek()}
      </div>
    {/if}
  </div>

  <div class="bottom-sheet__body" {@attach bodyPullDown}>
    {@render children?.()}
  </div>
</div>

<style lang="postcss">
  .bottom-sheet {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: min(72dvh, calc(100% - 56px));
      display: flex;
      flex-direction: column;
      background-color: var(--bg-color-1);
      color: var(--text-color-1);
      border-radius: 16px 16px 0 0;
      box-shadow: 0 -8px 30px rgba(0, 0, 0, .25);
      transition: transform .25s ease;
      z-index: 5;

      &--dragging {
          transition: none;
      }
  }

  .bottom-sheet__header {
      flex-shrink: 0;
      touch-action: none;
      cursor: grab;
      padding-bottom: 8px;
  }

  .bottom-sheet__grip-area {
      display: block;
  }

  .bottom-sheet__grip {
      display: block;
      width: 100%;
      padding: 10px 0 6px;

      &::before {
          content: '';
          display: block;
          margin: 0 auto;
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background-color: var(--border-color-1);
      }
  }

  .bottom-sheet--expanded .bottom-sheet__peek {
      display: none;
  }

  .bottom-sheet__body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      padding-bottom: var(--safe-area-bottom, 0px);
  }
</style>
