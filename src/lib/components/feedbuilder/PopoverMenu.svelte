<script lang="ts">
  import { tick, untrack, type Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import {
    computePosition,
    offset,
    flip,
    shift,
    autoUpdate,
    type Placement
  } from 'svelte-floating-ui/dom';
  import { popover } from '$lib/feedbuilder/popover.svelte';

  interface TriggerCtx {
    ref: Attachment<HTMLElement>;
    toggle: () => void;
    open: boolean;
  }
  interface MenuCtx {
    content: Attachment<HTMLElement>;
    close: () => void;
  }

  interface Props {
    placement?: Placement;
    gap?: number;
    padding?: number;
    trigger: Snippet<[TriggerCtx]>;
    menu: Snippet<[MenuCtx]>;
  }

  let {
    placement = 'bottom-end',
    gap = 6,
    padding = 8,
    trigger,
    menu
  }: Props = $props();

  let open = $state(false);
  let triggerEl = $state<HTMLElement | null>(null);
  let contentEl = $state<HTMLElement | null>(null);
  let dialogEl = $state<HTMLDialogElement | null>(null);

  const initialPlacement = untrack(() => placement);
  const initialGap = untrack(() => gap);
  const initialPadding = untrack(() => padding);

  async function update(): Promise<void> {
    if (!triggerEl || !contentEl) return;
    const { x, y, strategy } = await computePosition(triggerEl, contentEl, {
      strategy: 'fixed',
      placement: initialPlacement,
      middleware: [offset(initialGap), flip(), shift({ padding: initialPadding })]
    });
    if (!contentEl) return;
    contentEl.style.position = strategy;
    contentEl.style.top = `${y}px`;
    contentEl.style.left = `${x}px`;
  }

  const triggerAttach: Attachment<HTMLElement> = (node) => {
    triggerEl = node;
    return () => {
      if (triggerEl === node) triggerEl = null;
    };
  };

  const contentAttach: Attachment<HTMLElement> = (node) => {
    contentEl = node;
    return () => {
      if (contentEl === node) contentEl = null;
    };
  };

  function toggle() {
    open = !open;
  }

  function close() {
    const restore = dialogEl?.contains(document.activeElement) ? triggerEl : null;
    open = false;
    if (restore) {
      void tick().then(() => {
        const active = document.activeElement;
        if ((!active || active === document.body) && restore.isConnected) restore.focus();
      });
    }
  }

  function handleDialogClick(e: MouseEvent) {
    if (e.target === dialogEl) close();
  }

  function handleCancel(e: Event) {
    e.preventDefault();
    close();
  }

  $effect(() => {
    if (!open || !dialogEl || !triggerEl || !contentEl) return;
    const dispose = popover.register(close);
    dialogEl.showModal();
    const cleanup = autoUpdate(triggerEl, contentEl, update);
    return () => {
      cleanup();
      if (dialogEl?.open) dialogEl.close();
      dispose();
    };
  });
</script>

{@render trigger({ ref: triggerAttach, toggle, open })}
{#if open}
  <dialog
    bind:this={dialogEl}
    class="popover-menu-dialog"
    onclick={handleDialogClick}
    oncancel={handleCancel}
  >
    {@render menu({ content: contentAttach, close })}
  </dialog>
{/if}

<style lang="postcss">
  .popover-menu-dialog {
    padding: 0;
    margin: 0;
    border: 0;
    background: transparent;
    outline: 0;
    max-width: none;
    max-height: none;
    overflow: visible;
  }
  .popover-menu-dialog::backdrop {
    background: transparent;
  }
</style>
