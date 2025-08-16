<script lang="ts">
  import { Picker } from 'emoji-mart'
  import {onMount} from 'svelte';
  import { clickOutside } from '$lib/clickOutSide';
  import {settings} from "$lib/stores";
  import {publishState} from "$lib/classes/publishState.svelte";
  import {getLocale} from "$lib/paraglide/runtime";

  let { onoutclick, onpick } = $props();
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
          locale: getLocale(),
          theme: theme,
          dynamicWidth: publishState.layout !== 'bottom',
      };
      const picker = new Picker(pickerOptions);

      el.appendChild(picker);
  })
</script>

<div class="emoji-picker-wrap"
     class:emoji-picker-wrap--sidebar={publishState.layout === 'left'}
     class:emoji-picker-wrap--popup={publishState.layout === 'popup'}
     {onoutclick}
     use:clickOutside={{ignoreElement: '.publish-form-emoji-picker-button'}}
>
  <div bind:this={el}></div>
</div>
