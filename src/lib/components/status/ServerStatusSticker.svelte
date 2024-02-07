<script lang="ts">
  import {onMount} from "svelte";
  import Sticker from "$lib/components/ui/Sticker.svelte";
  import {_} from "svelte-i18n";
  let serverStatus = undefined;

  onMount(async () => {
      try {
          const res = await fetch('https://status.bsky.app/api/v2/status.json');
          const status = await res.json();

          if (status?.status?.indicator === 'minor') {
              serverStatus = 'minor';
          } else if(status?.status?.indicator === 'major') {
              serverStatus = 'major';
          }
      } catch (e) {
          console.error(e);
      }
  })
</script>

{#if serverStatus}
  <Sticker color={serverStatus}>
    {$_('server_status_' + serverStatus)} <a href="https://status.bsky.app/" target="_blank" rel="noopener">{$_('server_status_page_link')}</a>
  </Sticker>
{/if}

<style lang="postcss">
    a {
        color: inherit;
        text-decoration: underline;
    }
</style>