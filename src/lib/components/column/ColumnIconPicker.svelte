<script lang="ts">
  import { settings } from '$lib/stores';
  import { iconMap } from '$lib/columnIcons';
  import { fly, fade } from 'svelte/transition';

  let { current, onchange, onclose } = $props();
</script>

<div class="column-icon-picker" class:column-icon-picker--mobileV2={$settings?.design?.mobileNewUi} transition:fly={{ duration:250, y: -30 }}>
  <ul class="icon-picker-list">
    {#each iconMap as [key, icon]}
      {@const SvelteComponent = icon}
      <button
          class="icon-picker-list__button"
          class:icon-picker-list__button--current={key === current}
          onclick={() => {onchange(key)}}
      >
        <SvelteComponent color="var(--text-color-1)"></SvelteComponent>
      </button>
    {/each}
  </ul>
</div>

<button class="column-icon-picker-bg" transition:fade={{ duration: 150 }} onclick={onclose} aria-label="Close"></button>

<style lang="postcss">
  .column-icon-picker {
      position: absolute;
      background-color: var(--bg-color-1);
      padding: 16px;
      top: 60px;
      left: 16px;
      right: 16px;
      box-shadow: 0 0 10px var(--box-shadow-color-1);
      border-radius: 6px;
      z-index: 1;

      &--mobileV2 {
          top: auto;
          bottom: 118px;
      }
  }

  .icon-picker-list {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;

      &__button {
          aspect-ratio: 1 / 1;
          display: grid;
          place-content: center;
          width: 36px;
          border-radius: 4px;

          &--current {
              border: 2px solid var(--primary-color);
          }

          &:hover {
              background-color: var(--bg-color-3);
          }
      }
  }

  .column-icon-picker-bg {
      outline: none;
      position: absolute;
      top: 52px;
      left: 0;
      right: 0;
      height: calc(100dvh - 52px);
  }
</style>