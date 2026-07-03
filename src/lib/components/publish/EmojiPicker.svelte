<script lang="ts">
  import { Picker } from 'emoji-mart'
  import {getContext, onMount} from 'svelte';
  import {locale} from 'svelte-i18n';
  import { clickOutside } from '$lib/clickOutSide';
  import {settings} from "$lib/stores";

  let { onoutclick, onpick } = $props();

  const getPublishVariant = getContext<(() => string) | undefined>('publishVariant');
  const variant = $derived(getPublishVariant?.() ?? 'overlay');
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

<div class="emoji-picker-wrap"
     class:emoji-picker-wrap--sidebar={variant === 'column'}
     class:emoji-picker-wrap--popup={variant === 'overlay'}
     {onoutclick}
     use:clickOutside={{ignoreElement: '.publish-form-emoji-picker-button'}}
>
  <div bind:this={el}></div>
</div>
