<script lang="ts">
    import {_} from 'svelte-i18n';
    import { onMount } from 'svelte';
    import {agent, settings} from "$lib/stores";
    import {BskyAgent} from "@atproto/api";
    import {format, parseISO} from "date-fns";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";

    const _agent = new BskyAgent({service: 'https://puffball.us-east.host.bsky.network'});
    let posts = $state([]);
    let cursor = '';

    onMount(async () => {
        const res = await _agent.api.com.atproto.repo.listRecords({collection: 'com.whtwnd.blog.entry', repo: 'did:plc:4tr5dqti7nmu6g2czpthntak', limit: 50, cursor: cursor});

        posts = res.data.records;
    })
</script>

<svelte:head>
  <title>{$_('settings_news')} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {$_('settings_news')}
  </SettingsHeader>

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