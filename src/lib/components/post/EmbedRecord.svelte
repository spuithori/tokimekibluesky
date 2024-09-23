<script lang="ts">
    import {
        agent,
        didHint,
        formattedKeywordMutes,
        junkColumns,
        labelDefs,
        labelerSettings,
        settings
    } from "$lib/stores";
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

  export let record;
  export let _agent = $agent;
  let moderateData = contentLabelling(record, _agent.did(), $settings, $labelDefs, $labelerSettings);

  let isWarn = detectWarn(moderateData, 'contentView');

  let isMuteDisplay = false;
  let isMuted = record.author.viewer.muted;

  if (keywordFilter($formattedKeywordMutes, record.value.text, record.indexedAt)) {
      isMuted = true;
  }

  function handlePostClick() {
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
      }

      if ($junkColumns.findIndex(_column => _column.id === 'thread_' + rkey) === -1) {
          junkColumns.set([...$junkColumns, {
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
          }]);
      }

      didHint.set(record.author.did);
      goto(uri);
  }
</script>

<div class="timeline-external timeline-external--record">
  {#if (isMuted && !isMuteDisplay)}
    <div class="thread-notice thread-notice--quote" class:thread-notice--shown={isMuteDisplay}>
      <p class="thread-notice__text">{$_('muted_user_embed')}<br>
        <button class="text-button" on:click={() => {isMuteDisplay = true}}>{$_('show_button')}</button></p>
    </div>
  {/if}

  {#if $settings?.design.postsLayout !== 'minimum'}
    <Avatar href="/profile/{ record.author.handle }"
            avatar={ record.author.avatar }
            handle={ record.author.handle }></Avatar>
  {/if}

  <div class="timeline-external__content">
    {#if isWarn && isWarn?.for === 'content'}
      <TimelineWarn labels={isWarn.labels} behavior={isWarn.behavior}></TimelineWarn>
    {/if}

    <div class="timeline__meta">
      <p class="timeline__user"
         title="{record.author.handle}">{ record.author.displayName || record.author.handle }</p>
      <p class="timeline__date">
        {#if $settings?.design.absoluteTime}
          <time datetime="{format(parseISO(record.indexedAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}"
                title="{format(parseISO(record.indexedAt), 'yyyy-MM-dd HH:mm:ss')}">{format(parseISO(record.indexedAt), $settings.design?.datetimeFormat || 'yyyy-MM-dd HH:mm')}</time>
        {:else}
          <time datetime="{format(parseISO(record.indexedAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}"
                title="{format(parseISO(record.indexedAt), 'yyyy-MM-dd HH:mm:ss')}">{formatDistanceToNow(parseISO(record.indexedAt))}</time>
        {/if}
      </p>
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

  <a class="timeline-external-link" href="/profile/{record.author.handle}/post/{record.uri.split('/').slice(-1)[0]}" on:click|preventDefault={handlePostClick} aria-label="{$_('show_thread')}"></a>
</div>