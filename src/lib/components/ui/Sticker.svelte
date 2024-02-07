<script lang="ts">
  import {createEventDispatcher} from "svelte";
  const dispatch = createEventDispatcher();

  export let color = 'default';
  let isOpen = true;

  function handleClose() {
      isOpen = false;
  }
</script>

{#if isOpen}
  <aside class="sticker sticker--{color}">
    <div class="sticker__text">
      <slot></slot>
    </div>

    <button class="sticker__button" on:click={handleClose}>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
    </button>
  </aside>
{/if}

<style lang="postcss">
  .sticker {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 40px;
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      background-color: var(--success-color);
      padding: 16px;



      &__text {
          font-weight: 600;
          color: #fff;
          font-size: 14px;

          @media (max-width: 767px) {
              font-size: 12px;
          }
      }

      &--minor {
          background-color: #d38432;
      }

      &--major {
          background-color: var(--danger-color);
      }
  }
</style>