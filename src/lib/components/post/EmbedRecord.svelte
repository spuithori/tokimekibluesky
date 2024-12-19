<script lang="ts">
  import { agent, didHint, labelDefs, labelerSettings, settings } from "$lib/stores";
  import {format, formatDistanceToNow, parseISO} from "date-fns";
  import {AppBskyEmbedImages, AppBskyEmbedVideo, AppBskyFeedPost} from "@atproto/api";
  import {_} from "svelte-i18n";
  import Avatar from "../../../routes/(app)/Avatar.svelte";
  import Images from "../../../routes/(app)/Images.svelte";
  import {contentLabelling, detectWarn, keywordFilter} from "$lib/timelineFilter";
  import TimelineWarn from "$lib/components/post/TimelineWarn.svelte";
  import EmbedVideo from "$lib/components/post/EmbedVideo.svelte";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import {goto} from "$app/navigation";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {keywordMuteState} from "$lib/classes/keywordMuteState.svelte";

  let { record, _agent = $agent } = $props();
  let moderateData = contentLabelling(record, _agent.did(), $settings, $labelDefs, $labelerSettings);

  let isWarn = detectWarn(moderateData, 'contentView');

  let isMuteDisplay = $state(false);
  let isMuted = $state(record.author.viewer.muted);

  const junkColumnState = getColumnState(true);

  if (keywordFilter(keywordMuteState.formattedKeywords, record.value.text, record.indexedAt)) {
      isMuted = true;
  }

  function handlePostClick(e) {
      e.preventDefault();

      if (!record?.uri) {
          return false;
      }

      const rkey = record.uri.split('/').slice(-1)[0];
      const uri = '/profile/' + record.author.handle + '/post/' + rkey;

      if (uri === location.pathname) {
          return false;
      }

      if (!AppBskyFeedPost.isRecord(record.value)) {
          return false;
      }

      let formattedPost = {
          ...record,
          record: record.value,
          viewer: record.viewer ?? {},
      }

      if (AppBskyEmbedImages.isView(record.embeds[0])) {
          formattedPost.embed = record.embeds[0];
      }

      if (!junkColumnState.hasColumn('thread_' + rkey)) {
          junkColumnState.add({
              id: 'thread_' + rkey,
              algorithm: {
                  algorithm: 'at://' + record.author.did + '/app.bsky.feed.post/' + rkey,
                  type: 'thread',
                  name: 'Thread',
              },
              style: 'default',
              settings: defaultDeckSettings,
              did: _agent.did(),
              handle: _agent.handle(),
              data: {
                  feed: [{
                      post: formattedPost,
                  }],
                  cursor: '',
              }
          });
      }

      didHint.set(record.author.did);
      goto(uri);
  }
</script>

<div class="timeline-external timeline-external--record">
  {#if (isMuted && !isMuteDisplay)}
    <div class="thread-notice thread-notice--quote" class:thread-notice--shown={isMuteDisplay}>
      <p class="thread-notice__text">{$_('muted_user_embed')}<br>
        <button class="text-button" onclick={() => {isMuteDisplay = true}}>{$_('show_button')}</button></p>
    </div>
  {/if}

  <div class="timeline-external__content">
    {#if isWarn && isWarn?.for === 'content'}
      <TimelineWarn labels={isWarn.labels} behavior={isWarn.behavior}></TimelineWarn>
    {/if}

    <div class="timeline-external-heading">
      <div class="timeline-external-avatar">
        <Avatar href="/profile/{ record.author.handle }"
                avatar={ record.author.avatar }
                handle={ record.author.handle }></Avatar>
      </div>

      <div class="timeline__meta">
        <p class="timeline__user">{ record.author.displayName || record.author.handle }</p>
        <p class="timeline__date">
          {#if $settings?.design.absoluteTime}
            <span>{format(parseISO(record.indexedAt), $settings.design?.datetimeFormat || 'yyyy-MM-dd HH:mm')}</span>
          {:else}
            <span>{formatDistanceToNow(parseISO(record.indexedAt))}</span>
          {/if}
        </p>
      </div>
    </div>

    {#if (AppBskyFeedPost.isRecord(record.value))}
      <p class="timeline-external__description">
        {record.value.text}
      </p>
    {/if}

    {#if (AppBskyEmbedImages.isView(record.embeds[0]))}
      <div class="timeline-images-wrap timeline-images-wrap--record">
        {#if isWarn && isWarn?.for === 'media'}
          <TimelineWarn labels={isWarn.labels} behavior={isWarn.behavior}></TimelineWarn>
        {/if}

        <Images images={record.embeds[0].images} blobs={record?.value?.embed.images} did={record.author.did}></Images>
      </div>
    {/if}

    {#if AppBskyEmbedVideo.isView(record?.embeds[0])}
      <EmbedVideo video={record.embeds[0]}></EmbedVideo>
    {/if}
  </div>

  <span class="timeline-external__icon">
    <svg xmlns="http://www.w3.org/2000/svg" width="28.705" height="25.467" viewBox="0 0 28.705 25.467">
      <path id="パス_3" data-name="パス 3"
            d="M-21.352-46.169H-9.525v6.82A26.369,26.369,0,0,1-16.777-20.7h-5.266A26.721,26.721,0,0,0-15.7-34.342h-5.655Zm16.273,0H6.662v6.82A26.079,26.079,0,0,1-.59-20.7H-5.77A25.477,25.477,0,0,0,.489-34.342H-5.079Z"
            transform="translate(22.043 46.169)" fill="var(--primary-color)"/>
    </svg>
  </span>

  <a class="timeline-external-link" href="/profile/{record.author.handle}/post/{record.uri.split('/').slice(-1)[0]}" onclick={handlePostClick} aria-label="{$_('show_thread')}"></a>
</div>

<style lang="postcss">
  .timeline-external {
      grid-template-columns: 1fr;
      padding: 16px 12px;

      &__content {
        --avatar-gap: 0;
        --avatar-width: 0;
      }
  }

  .timeline-external-heading {
      display: grid;
      grid-template-columns: 24px 1fr;
      gap: 8px;
      align-items: flex-start;
  }

  .timeline__meta {
      margin-top: 2px;
      margin-bottom: 0;
      padding-right: 0;
      min-width: 0;
      font-size: 13px;
  }
</style>