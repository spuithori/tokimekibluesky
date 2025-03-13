<script lang="ts">
  import Modal from "$lib/components/ui/Modal.svelte";

  let { pswp, images, index } = $props();
  let isModalOpen = $state(false);
</script>

{#if (images[index]?.alt)}
  <div class="image-alt">
    <p class="image-alt-text" onclick={() => {isModalOpen = true}}>{images[index].alt}</p>
  </div>
{/if}

{#if (isModalOpen)}
  <Modal title="ALT" onclose={() => {isModalOpen = false}}>
    <p class="image-alt-modal-text">
      {images[index].alt}
    </p>
  </Modal>
{/if}

<style lang="postcss">
  .image-alt {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 16px;
      color: #fff;
      font-size: 14px;
      background-color: rgba(0, 0, 0, .5);
      line-height: 1.5;
  }

  .image-alt-text {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
  }

  .image-alt-modal-text {
      white-space: pre-wrap;
      color: var(--text-color-1);
  }
</style>