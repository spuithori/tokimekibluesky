<script lang="ts">
  import {onMount} from "svelte";
  import {comicReaderState} from "$lib/classes/comicReaderState.svelte";

  const pages = comicReaderState.pages;
  let currentIndex = $state(0);
  let isSingle = $state(false);
  let isStartOnRight = $state(true);
  let el = $state<HTMLDialogElement>();
  let lastStartIndex = $state<number | null>(null);
  let lastPagesRef = $state<any[] | null>(null);

  function spreadCount() {
    if (!pages.length) {
      return 0;
    }

    if (isSingle) {
      return pages.length;
    }

    return isStartOnRight ? Math.ceil(pages.length / 2) : Math.ceil((pages.length + 1) / 2);
  }

  function clampIndex(value: number) {
    const maxIndex = Math.max(spreadCount() - 1, 0);
    return Math.min(Math.max(value, 0), maxIndex);
  }

  function normalizeIndex(value: number) {
    return clampIndex(value);
  }

  function spreadIndexFromPageIndex(pageIndex: number, startOnRight: boolean, singleMode: boolean) {
    if (singleMode) {
      return pageIndex;
    }

    if (startOnRight) {
      return Math.floor(pageIndex / 2);
    }

    if (pageIndex <= 0) {
      return 0;
    }

    return Math.ceil(pageIndex / 2);
  }

  function getSpreadPageIndices(spreadIndex: number, startOnRight: boolean, singleMode: boolean) {
    if (singleMode) {
      return { rightIndex: spreadIndex, leftIndex: undefined };
    }

    if (startOnRight) {
      const rightIndex = spreadIndex * 2;
      return { rightIndex, leftIndex: rightIndex + 1 };
    }

    const rightIndex = spreadIndex * 2 - 1;
    const leftIndex = spreadIndex * 2;
    return { rightIndex, leftIndex };
  }

  function goNext() {
    currentIndex = normalizeIndex(currentIndex + 1);
  }

  function goPrev() {
    currentIndex = normalizeIndex(currentIndex - 1);
  }

  function handleClose() {
    if (el?.open) {
      el.close();
    }
  }

  function handleDialogClose() {
    comicReaderState.close();
  }

  function toggleStartSide() {
    const focusIndex = getFocusIndex();
    isStartOnRight = !isStartOnRight;
    const nextIndex = spreadIndexFromPageIndex(focusIndex, isStartOnRight, isSingle);
    currentIndex = normalizeIndex(nextIndex);
  }

  function getPage(index?: number) {
    if (index === undefined || index < 0 || index >= pages.length) {
      return undefined;
    }

    return pages[index];
  }

  function getFocusIndex() {
    const rightIndexValid = typeof rightPageIndex === 'number' && rightPageIndex >= 0 && rightPageIndex < pages.length;
    const leftIndexValid = typeof leftPageIndex === 'number' && leftPageIndex >= 0 && leftPageIndex < pages.length;

    if (isStartOnRight) {
      if (rightIndexValid) {
        return rightPageIndex;
      }

      if (leftIndexValid) {
        return leftPageIndex;
      }
    } else {
      if (leftIndexValid) {
        return leftPageIndex;
      }

      if (rightIndexValid) {
        return rightPageIndex;
      }
    }

    return 0;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!pages.length) {
      return;
    }

    if (event.key === 'Escape') {
      handleClose();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goNext();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goPrev();
    }
  }

  const spreadIndices = $derived.by(() => getSpreadPageIndices(currentIndex, isStartOnRight, isSingle));
  const rightPageIndex = $derived.by(() => spreadIndices.rightIndex);
  const leftPageIndex = $derived.by(() => spreadIndices.leftIndex);
  const rightPage = $derived.by(() => getPage(rightPageIndex));
  const leftPage = $derived.by(() => getPage(leftPageIndex));
  const pageLabel = $derived.by(() => {
    if (!pages.length) {
      return '';
    }

    const indices = [rightPageIndex, leftPageIndex].filter(
      (index): index is number => typeof index === 'number' && index >= 0 && index < pages.length
    );

    if (!indices.length) {
      return '';
    }

    const minIndex = Math.min(...indices);
    const maxIndex = Math.max(...indices);

    if (minIndex === maxIndex) {
      return `${minIndex + 1} / ${pages.length}`;
    }

    return `${minIndex + 1}-${maxIndex + 1} / ${pages.length}`;
  });
  const maxSpreadIndex = $derived.by(() => Math.max(spreadCount() - 1, 0));
  const disablePrev = $derived.by(() => currentIndex <= 0);
  const disableNext = $derived.by(() => currentIndex >= maxSpreadIndex);

  onMount(() => {
    if (el && !el.open) {
      el.showModal();
    }

    const media = window.matchMedia('(max-width: 900px)');
    const updateLayout = () => {
      const focusIndex = getFocusIndex();
      const nextIsSingle = media.matches;
      isSingle = nextIsSingle;
      const nextIndex = spreadIndexFromPageIndex(focusIndex, isStartOnRight, nextIsSingle);
      currentIndex = normalizeIndex(nextIndex);
    };

    updateLayout();
    media.addEventListener('change', updateLayout);

    return () => {
      media.removeEventListener('change', updateLayout);
      if (el?.open) {
        el.close();
      }
    };
  });

  $effect(() => {
    if (!pages.length) {
      lastStartIndex = null;
      lastPagesRef = null;
      return;
    }

    if (pages !== lastPagesRef || comicReaderState.startIndex !== lastStartIndex) {
      const nextIndex = spreadIndexFromPageIndex(comicReaderState.startIndex, isStartOnRight, isSingle);
      currentIndex = normalizeIndex(nextIndex);
      lastStartIndex = comicReaderState.startIndex;
      lastPagesRef = pages;
    }
  });
</script>

<dialog class="comic-reader-modal" bind:this={el} onclose={handleDialogClose}>
  <div class="comic-reader">
    <header class="comic-reader-header">
      <div class="comic-reader-count">{pageLabel}</div>
      <div class="comic-reader-header__actions">
        <button class="comic-reader-start-toggle" onclick={toggleStartSide} aria-label="Toggle first page side" title="First page side">
          {isStartOnRight ? 'P1:R' : 'P1:L'}
        </button>
        <button class="comic-reader-action" onclick={handleClose} aria-label="Close comic reader" title="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </header>

    <div class="comic-reader-pages-wrap">
      <button class="comic-reader-nav comic-reader-nav--left" onclick={goNext} disabled={disableNext} aria-label="Next spread" title="Next">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      <div class="comic-reader-pages" class:comic-reader-pages--single={isSingle}>
        {#if (isSingle)}
          {#if rightPage}
            <figure class="comic-reader-page comic-reader-page--single">
              <img src={rightPage.src} alt={rightPage.alt || ''} loading="eager" decoding="async">
            </figure>
          {/if}
        {:else}
          <figure class="comic-reader-page comic-reader-page--left">
            {#if leftPage}
              <img src={leftPage.src} alt={leftPage.alt || ''} loading="lazy" decoding="async">
            {/if}
          </figure>
          <figure class="comic-reader-page comic-reader-page--right">
            {#if rightPage}
              <img src={rightPage.src} alt={rightPage.alt || ''} loading="eager" decoding="async">
            {/if}
          </figure>
        {/if}
      </div>

      <button class="comic-reader-nav comic-reader-nav--right" onclick={goPrev} disabled={disablePrev} aria-label="Previous spread" title="Previous">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>

  </div>
</dialog>

<svelte:window onkeydown={handleKeydown}></svelte:window>

<style lang="postcss">
  .comic-reader-modal {
      margin: 0;
      padding: 0;
      border: none;
      background-color: #000;
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
      -webkit-user-select: none;
      user-select: none;
      width: 100%;
      height: 100%;
      max-width: none;
      max-height: none;
      color: #fff;
  }

  .comic-reader-modal::backdrop {
      background-color: rgba(0, 0, 0, 0.9);
  }

  .comic-reader {
      width: 100%;
      height: 100%;
      position: relative;
  }

  .comic-reader,
  .comic-reader * {
      -webkit-user-select: none;
      user-select: none;
  }

  .comic-reader-header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 60px;
      padding: 0 6px 0 0;
      z-index: 2;
      pointer-events: none;
  }

  .comic-reader-header__actions {
      display: flex;
      align-items: center;
      gap: 4px;
      pointer-events: auto;
  }

  .comic-reader-start-toggle {
      pointer-events: auto;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      opacity: 0.85;
      padding: 0 12px;
      height: 30px;
      border: 0;
      background: none;
      touch-action: manipulation;
      color: #fff;
      text-shadow: 1px 1px 3px rgba(79, 79, 79, 0.4);
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
  }

  .comic-reader-action {
      width: 50px;
      height: 60px;
      border: 0;
      background: none;
      color: #fff;
      display: grid;
      place-items: center;
      opacity: 0.85;
      pointer-events: auto;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
      touch-action: manipulation;
  }

  .comic-reader-pages {
      display: flex;
      flex-direction: row;
      align-items: stretch;
      justify-content: center;
      gap: 0;
      width: 100%;
      height: 100%;
      min-height: 0;
  }

  .comic-reader-pages-wrap {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0;
      width: 100%;
      height: 100%;
      min-height: 0;
  }

  .comic-reader-page {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 1 50%;
      max-width: 50%;
      height: 100%;
      margin: 0;
  }

  .comic-reader-page img {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      background-color: transparent;
  }

  .comic-reader-page--right {
      justify-content: flex-start;
  }

  .comic-reader-page--left {
      justify-content: flex-end;
  }

  .comic-reader-page--right img {
      object-position: left center;
  }

  .comic-reader-page--left img {
      object-position: right center;
  }

  .comic-reader-pages--single .comic-reader-page {
      flex-basis: 100%;
      max-width: 100%;
      justify-content: center;
  }

  .comic-reader-count {
      height: 30px;
      margin-top: 15px;
      margin-inline-start: 20px;
      font-size: 14px;
      line-height: 30px;
      color: #fff;
      text-shadow: 1px 1px 3px rgba(79, 79, 79, 0.4);
      opacity: 0.85;
      pointer-events: auto;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
  }

  .comic-reader-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 75px;
      height: 100px;
      border: 0;
      background: none;
      touch-action: manipulation;
      color: #fff;
      display: grid;
      place-items: center;
      opacity: 0.85;
      transition: opacity 0.2s ease-in-out;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
  }

  .comic-reader-nav:disabled {
      opacity: 0.3;
      cursor: auto;
  }

  .comic-reader-nav--left {
      left: 0;
  }

  .comic-reader-nav--right {
      right: 0;
  }

  @media (max-width: 900px) {
      .comic-reader-nav {
          width: 56px;
          height: 72px;
      }

      .comic-reader-page {
          max-width: 100%;
      }

      .comic-reader-page img {
          max-width: 100%;
      }
  }
</style>
