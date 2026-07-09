<script lang="ts">
  import { Picker } from 'emoji-mart'
  import {onMount} from 'svelte';
  import {locale} from 'tokimeki-i18n';
  import { clickOutside } from '$lib/clickOutSide';
  import {settings} from "$lib/stores";

  let { onoutclick = undefined, onpick, bare = false } = $props();

  let theme = $settings?.design.darkmode === true ? 'dark' : 'light';
  let el = $state();

  function handleEmojiPick(data) {
      onpick(data);
  }

  onMount(async () => {
      const pickerOptions = {
          onEmojiSelect: handleEmojiPick,
          data: async () => {
            const response = await fetch(
                'https://cdn.jsdelivr.net/npm/@emoji-mart/data',
            );
            return response.json();
          },
          locale: $locale,
          theme: theme,
          dynamicWidth: true,
      };
      const picker = new Picker(pickerOptions);

      el.appendChild(picker);
  })
</script>

{#if bare}
  <div class="emoji-picker-bare" bind:this={el}></div>
{:else}
  <div class="emoji-picker-wrap emoji-picker-wrap--popup"
       {onoutclick}
       use:clickOutside={{ignoreElement: '.publish-form-emoji-picker-button'}}
  >
    <div bind:this={el}></div>
  </div>
{/if}
