<script lang="ts">
  import {formattedKeywordMutes, settings} from "$lib/stores";
  import {format, formatDistanceToNow, parseISO} from "date-fns";
  import {AppBskyEmbedImages, AppBskyFeedPost} from "@atproto/api";
  import {_} from "svelte-i18n";
  import Avatar from "../../../routes/(app)/Avatar.svelte";
  import Images from "../../../routes/(app)/Images.svelte";
  import {keywordFilter} from "$lib/timelineFilter";
  import TimelineWarn from "$lib/components/post/TimelineWarn.svelte";

  export let record;
  export let moderateData = undefined;

  let warnReason = '';
  let isWarn = detectWarn(moderateData);

  let isMuteDisplay = false;
  let isMuted = record.author.viewer.muted;

  if (keywordFilter($formattedKeywordMutes, record.value.text, record.indexedAt)) {
      isMuted = true;
  }

  function detectWarn(moderateData) {
      if (!moderateData) {
          return false;
      }

      if (moderateData.content.filter) {
          return false;
      }

      if (moderateData.embed?.blur) {
          try {
              warnReason = moderateData.embed?.cause.label.val || '';
          } catch (e) {
              console.log(moderateData);
          }

          return true;
      }

      return false;
  }
</script>

<div class="timeline-external timeline-external--record">
  {#if (isMuted && !isMuteDisplay)}
    <div class="thread-notice thread-notice--quote" class:thread-notice--shown={isMuteDisplay}>
      <p class="thread-notice__text">{$_('muted_user_embed')}<br>
        <button class="text-button" on:click={() => {isMuteDisplay = true}}>{$_('show_button')}</button></p>
    </div>
  {/if}

  {#if isWarn}
    <!-- <TimelineWarn reason={warnReason} on:visible={() => {isWarn = false}}></TimelineWarn> -->
  {/if}

  {#if $settings?.design.postsLayout !== 'minimum'}
    <Avatar href="/profile/{ record.author.handle }"
            avatar={ record.author.avatar }
            handle={ record.author.handle }></Avatar>
  {/if}

  <div class="timeline-external__content">
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
        <Images images={record.embeds[0].images}></Images>
      </div>
    {/if}
  </div>

  <span class="timeline-external__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28.705" height="25.467" viewBox="0 0 28.705 25.467">
              <path id="パス_3" data-name="パス 3"
                    d="M-21.352-46.169H-9.525v6.82A26.369,26.369,0,0,1-16.777-20.7h-5.266A26.721,26.721,0,0,0-15.7-34.342h-5.655Zm16.273,0H6.662v6.82A26.079,26.079,0,0,1-.59-20.7H-5.77A25.477,25.477,0,0,0,.489-34.342H-5.079Z"
                    transform="translate(22.043 46.169)" fill="var(--primary-color)"/>
            </svg>
            </span>

  <a class="timeline-external-link" href="/profile/{record.author.handle}/post/{record.uri.split('/').slice(-1)[0]}" aria-label="{$_('show_thread')}"></a>
</div>