<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from "svelte";
  import { sharedText } from '$lib/stores';
  import { goto } from '$app/navigation';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const params = data.url.searchParams;
  const isNomove = params.get('nomove') === 'true';
  const title = params.get('title') || '';
  const text = params.get('text') ? '<br>' + params.get('text') : '';
  const url = params.get('url') ? '<br><a href="' + params.get('url') + '">' + params.get('url') : '</a>';

  onMount(async () => {
      sharedText.set(decodeURIComponent(title) + decodeURIComponent(text) + decodeURIComponent(url));

      if (!isNomove) {
          await goto('/');
      }
  })
</script>
