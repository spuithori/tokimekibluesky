<script lang="ts">
  import { setLastReadUri } from '$lib/lastReadClient';

  interface Props {
    did: string;
    columnId: string;
    scrollContainer: HTMLElement | null;
  }

  let { did, columnId, scrollContainer }: Props = $props();

  let observer: IntersectionObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  let currentTopUri: string | null = null;

  function handleIntersection(entries: IntersectionObserverEntry[]) {
    // Find topmost visible item
    const visibleEntries = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

    const topEntry = visibleEntries[0];
    if (topEntry) {
      const uri = (topEntry.target as HTMLElement).dataset.uri;
      if (uri && uri !== currentTopUri) {
        currentTopUri = uri;
        setLastReadUri(did, columnId, uri); // Debounced internally
      }
    }
  }

  function setupObserver() {
    if (!scrollContainer) return;

    observer = new IntersectionObserver(handleIntersection, {
      root: scrollContainer,
      rootMargin: '-52px 0px -70% 0px', // Top 30% of viewport (below header)
      threshold: 0.1
    });

    // Observe existing items
    const items = scrollContainer.querySelectorAll('[data-uri]');
    items.forEach(item => observer!.observe(item));

    // Watch for new items via MutationObserver
    mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) {
            if (node.dataset?.uri) {
              observer?.observe(node);
            }
            const items = node.querySelectorAll?.('[data-uri]');
            items?.forEach(item => observer?.observe(item));
          }
        });
      });
    });

    mutationObserver.observe(scrollContainer, { childList: true, subtree: true });
  }

  function cleanup() {
    observer?.disconnect();
    mutationObserver?.disconnect();
    observer = null;
    mutationObserver = null;
  }

  $effect(() => {
    if (scrollContainer) {
      setupObserver();
      return cleanup;
    }
  });
</script>
