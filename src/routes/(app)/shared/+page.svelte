<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from "svelte";
  import { sharedText } from '$lib/stores';
  import { goto } from '$app/navigation';

  export let data: PageData;

  const params = data.url.searchParams;
  const isNomove = params.get('nomove') === 'true';
  const title = params.get('title') || '';
  const text = params.get('text') ? '\n' + params.get('text') : '';
  const url = params.get('url') ? '\n' + params.get('url') : '';

  onMount(async () => {
      sharedText.set(title + text + url);

      if (!isNomove) {
          await goto('/');
      }
  })
</script>

<div class="target-share timeline">
  <h1 class="target-share-title">Share</h1>
</div>

<style>
  .target-share-title {
      text-align: center;
  }
</style>