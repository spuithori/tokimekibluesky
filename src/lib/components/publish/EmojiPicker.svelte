<script lang="ts">
  import data from '@emoji-mart/data';
  import { Picker } from 'emoji-mart'
  import {onMount} from 'svelte';
  import {locale} from 'svelte-i18n';
  import { clickOutside } from '$lib/clickOutSide';
  import {settings} from "$lib/stores";
  import {publishState} from "$lib/classes/publishState.svelte";

  let { onoutclick, onpick } = $props();
  let theme = $settings?.design.darkmode === true ? 'dark' : 'light';
  let el = $state();

  function handleEmojiPick(data) {
      onpick(data);
  }

  onMount(async () => {
      const pickerOptions = {
          onEmojiSelect: handleEmojiPick,
          data: data,
          locale: $locale,
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
