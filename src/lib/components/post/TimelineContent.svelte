<script lang="ts">
  import {_} from 'svelte-i18n'
  import {settings} from "$lib/stores";
  import {format, formatDistanceToNow, parseISO} from "date-fns";
  import {getTextArray, isUriLocal} from "$lib/richtext";
  import Avatar from "../../../routes/(app)/Avatar.svelte";
  import ProfileCardWrapper from "../../../routes/(app)/ProfileCardWrapper.svelte";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import {contentLabelling, keywordFilter} from "$lib/timelineFilter";
  import {AppBskyEmbedExternal, AppBskyEmbedImages, AppBskyEmbedRecord, AppBskyEmbedRecordWithMedia} from "@atproto/api";
  import Images from "../../../routes/(app)/Images.svelte";
  import EmbedRecord from "$lib/components/post/EmbedRecord.svelte";
  import {translate} from "$lib/translate";
  import TimelineWarn from "$lib/components/post/TimelineWarn.svelte";
  import EmbedExternal from "$lib/components/post/EmbedExternal.svelte";

  export let post;
  export let _agent;
  export let isMedia = false;
  export let isTranslated = false;
  export let isSingle = false;
  export let isProfile = false;

  let warnReason = '';

  const moderateData = contentLabelling(post, _agent.did(), $settings);

  export let isHide = detectHide(moderateData);
  let isWarn = detectWarn(moderateData) || false;
  detectKeywordFilter();

  function detectHide(moderateData) {
      if (!moderateData) {
          return false;
      }

      if (moderateData.content.filter) {
          console.log('should hide.');

          if (moderateData.content.cause.type === 'muted' && (isProfile || isSingle || isMedia)) {
              return false;
          }

          return true;
      }

      return false;
  }

  function detectWarn(moderateData) {
      // console.log(moderateData)

      if (!moderateData) {
          return false;
      }

      if (moderateData.content.filter) {
          return false;
      }

      if (isMedia) {
          return false;
      }

      if (moderateData.content.blur || moderateData.content.alert) {
          if (moderateData.content?.cause.setting === 'show') {
              return  false;
          }

          warnReason = moderateData?.content.cause.label.val;
          return true;
      }

      if (moderateData.embed.blur) {
          if (moderateData.embed?.cause.setting === 'show') {
              return false;
          }

          warnReason = moderateData?.embed.cause.label.val;
          return true;
      }

      return false;
  }

  function detectKeywordFilter() {
      let text = post.record.text;

      if (keywordFilter($settings.keywordMutes, text, post.indexedAt)) {
          isHide = true;
      }
  }

  async function translation() {
      ({ text: post.record.text, facets: post.record.facets } = await translate(post.record.text, $settings.general?.userLanguage, _agent));
      isTranslated = true;
  }
</script>

<div class="timeline__image">
  {#if $settings?.design.postsLayout !== 'minimum'}
    <Avatar href="/profile/{ post.author.handle }" avatar={post.author.avatar}
            handle={post.author.handle} {_agent}></Avatar>
  {/if}
</div>

<div class="timeline__content">
  <div class="timeline__meta">
    <p class="timeline__user">
      <Tooltip>
        <span slot="ref">{ post.author.displayName || post.author.handle }</span>
        <span slot="content" aria-hidden="true">@{ post.author.handle }</span>
      </Tooltip></p>

    <p class="timeline__date">
      {#if $settings?.design.absoluteTime}
        <Tooltip>
          <time slot="ref"
                datetime="{format(parseISO(post.indexedAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}">{format(parseISO(post.indexedAt), $settings.design?.datetimeFormat || 'yyyy-MM-dd HH:mm')}</time>
          <span slot="content" aria-hidden="true"
                class="timeline-tooltip">{format(parseISO(post.indexedAt), 'yyyy-MM-dd HH:mm:ss')}</span>
        </Tooltip>
      {:else}
        <Tooltip>
          <time slot="ref"
                datetime="{format(parseISO(post.indexedAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}">{formatDistanceToNow(parseISO(post.indexedAt))}</time>
          <span slot="content" aria-hidden="true"
                class="timeline-tooltip">{format(parseISO(post.indexedAt), 'yyyy-MM-dd HH:mm:ss')}</span>
        </Tooltip>
      {/if}
    </p>

    {#if (post.record.langs && !post.record.langs.includes($settings.general.userLanguage))}
      <button
          class="timeline-translate-button"
          class:timeline-translate-button--hidden={isTranslated}
          on:click={translation}>{$_('translation')}</button>
    {/if}
  </div>

  <div class="timeline-warn-wrap" class:timeline-warn-wrap--warned={isWarn}>
    {#if (isWarn)}
      <TimelineWarn reason={warnReason} on:visible={() => {isWarn = false}}></TimelineWarn>
    {/if}

    <p class="timeline__text" dir="auto">
      {#each getTextArray(post.record) as item}
        {#if (item.isLink() && item.link)}
          {#if (isUriLocal(item.link.uri))}
            <a href="{new URL(item.link.uri).pathname}">{item.text}</a>
          {:else}
            <a href="{item.link.uri}" target="_blank" rel="noopener nofollow noreferrer">{item.text}</a>
          {/if}
        {:else if (item.isMention() && item.mention)}
          <ProfileCardWrapper handle="{item.text.slice(1)}" {_agent}>
            <a href="/profile/{item.text.slice(1)}">{item.text}</a>
          </ProfileCardWrapper>
        {:else if (item.isTag() && item.tag)}
          <a href="/search/hashtags?q={encodeURIComponent(item.tag?.tag)}">{item.text}</a>
        {:else}
          <span>{item.text}</span>
        {/if}
      {/each}
    </p>

    {#if (AppBskyEmbedImages.isView(post.embed) && !isMedia && post.embed)}
      <div class="timeline-images-wrap">
        <Images images={post.embed.images}></Images>
      </div>
    {/if}

    {#if (AppBskyEmbedExternal.isView(post.embed))}
      <EmbedExternal external={post.embed.external}></EmbedExternal>
    {/if}

    {#if (AppBskyEmbedRecord.isView(post.embed) && AppBskyEmbedRecord.isViewRecord(post.embed.record)) }
      <EmbedRecord record={post.embed.record} {moderateData}></EmbedRecord>
    {/if}

    {#if (AppBskyEmbedRecordWithMedia.isView(post.embed))}
      {#if (AppBskyEmbedImages.isView(post.embed.media))}
        <div class="timeline-images-wrap">
          <Images images={post.embed.media.images}></Images>
        </div>
      {/if}

      {#if AppBskyEmbedExternal.isView(post.embed.media)}
        <EmbedExternal external={post.embed.media.external}></EmbedExternal>
      {/if}

      {#if AppBskyEmbedRecord.isViewRecord(post.embed.record.record)}
        <EmbedRecord record={post.embed.record.record} {moderateData}></EmbedRecord>
      {/if}
    {/if}
  </div>

  <slot></slot>
</div>