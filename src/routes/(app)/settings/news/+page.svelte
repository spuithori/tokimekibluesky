<script lang="ts">
    import {_} from 'svelte-i18n';
    import { onMount } from 'svelte';
    import {agent, settings} from "$lib/stores";
    import {BskyAgent} from "@atproto/api";
    import {format, parseISO} from "date-fns";

    const _agent = new BskyAgent({service: 'https://puffball.us-east.host.bsky.network'});
    let posts = [];
    let cursor = '';

    onMount(async () => {
        const res = await _agent.api.com.atproto.repo.listRecords({collection: 'com.whtwnd.blog.entry', repo: 'did:plc:4tr5dqti7nmu6g2czpthntak', limit: 50, cursor: cursor});

        posts = res.data.records;
    })
</script>

<svelte:head>
  <title>{$_('settings_about')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" on:click={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_news')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <p class="settings-description">{$_('settings_about_description')}<br>
      <a href="https://whtwnd.com/" target="_blank" rel="noopener noreferrer">https://whtwnd.com/</a></p>

    <div class="news-list">
      {#each posts as post}
        <article class="post">
          <h2 class="post__title">{post.value.title}</h2>
          <div class="post__meta">
            <time class="post__date">{format(parseISO(post.value.createdAt), $settings.design?.datetimeFormat || 'yyyy-MM-dd HH:mm')}</time>
          </div>

          <div class="post__content">
            {post.value.content}
          </div>
        </article>
      {/each}
    </div>
  </div>
</div>

<style lang="postcss">
  .post {
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-color-1);
      margin-bottom: 32px;

      &__title {
          font-size: 20px;
          margin-bottom: 8px;
      }

      &__meta {
          margin-bottom: 16px;
      }

      &__date {
          color: var(--text-color-3);
      }

      &__content {
          white-space: pre-line;
      }
  }
</style>