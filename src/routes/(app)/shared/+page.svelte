<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from "svelte";
  import { goto } from '$app/navigation';
  import {getPostState} from "$lib/classes/postState.svelte";
  import {escapeHtml} from "$lib/components/editor/richtext";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const postState = getPostState();
  const params = data.url.searchParams;
  const isNomove = params.get('nomove') === 'true';
  const toHtml = (value: string) => escapeHtml(value).replace(/\r\n?|\n/g, '<br>');
  const title = toHtml(params.get('title') || '');
  const sharedText = params.get('text');
  const sharedUrl = params.get('url');
  const text = sharedText ? '<br>' + toHtml(sharedText) : '';
  const url = sharedUrl ? '<br><a href="' + escapeHtml(sharedUrl) + '">' + escapeHtml(sharedUrl) + '</a>' : '';

  onMount(async () => {
      postState.replaceText(title + text + url);

      if (!isNomove) {
          await goto('/');
      }
  })
</script>
