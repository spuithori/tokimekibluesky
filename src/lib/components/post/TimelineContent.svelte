<script lang="ts">
  import {_} from 'svelte-i18n'
  import {formattedKeywordMutes, labelDefs, labelerSettings, settings} from "$lib/stores";
  import {format, formatDistanceToNow, parseISO} from "date-fns";
  import Avatar from "../../../routes/(app)/Avatar.svelte";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import {contentLabelling, keywordFilter} from "$lib/timelineFilter";
  import {
      AppBskyEmbedExternal,
      AppBskyEmbedImages,
      AppBskyEmbedRecord,
      AppBskyEmbedRecordWithMedia, AppBskyFeedDefs,
      AppBskyFeedPost
  } from "@atproto/api";
  import Images from "../../../routes/(app)/Images.svelte";
  import EmbedRecord from "$lib/components/post/EmbedRecord.svelte";
  import {formatTranslateRecord} from "$lib/translate";
  import TimelineWarn from "$lib/components/post/TimelineWarn.svelte";
  import EmbedExternal from "$lib/components/post/EmbedExternal.svelte";
  import TimelineText from "$lib/components/post/TimelineText.svelte";
  import { toast } from "svelte-sonner";
  import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";

  export let post;
  export let _agent;
  export let isMedia = false;
  export let isTranslated = false;
  export let isSingle = false;
  export let isProfile = false;
  export let pulseTranslate = false;

  let translatedRecord: undefined | AppBskyFeedPost.Record;
  let warnLabels = [];
  let warnBehavior: 'cover' | 'inform' = 'cover';

  const moderateData = contentLabelling(post, _agent.did(), $settings, $labelDefs, $labelerSettings);
  const contentContext = isSingle || isProfile
      ? 'contentView'
      : 'contentList';

  export let isHide = detectHide(moderateData);
  let isWarn: 'content' | 'media' | null = detectWarn(moderateData) || null;
  detectKeywordFilter();

  $: translation(pulseTranslate);

  function detectHide(moderateData) {
      if (!moderateData) {
          return false;
      }

      try {
          if (moderateData.ui(contentContext).filter) {
              return true;
          }
      } catch (e) {
          return false;
      }

      return false;
  }

  function detectWarn(moderateData) {
      if (!moderateData) {
          return null;
      }

      try {
          if (moderateData.ui(contentContext).blur) {
              warnLabels = [...moderateData.ui(contentContext).blurs, ...moderateData.ui('contentMedia').blurs];
              return 'content';
          }

          if (moderateData.ui('contentMedia').blur) {
              warnLabels = moderateData.ui('contentMedia').blurs;
              return 'media';
          }

          if (moderateData.ui(contentContext).inform) {
              warnLabels = moderateData.ui(contentContext).informs;
              warnBehavior = 'inform';

              if (!moderateData.muted && warnLabels.length) {
                  return 'content';
              }
          }
      } catch (e) {
          return null;
      }

      return null;
  }

  function detectKeywordFilter() {
      let text = post.record.text;

      if (keywordFilter($formattedKeywordMutes, text, post.indexedAt)) {
          isHide = true;
      }
  }

  async function translation(pulse = true) {
      if (!pulse) {
          return false;
      }

      try {
        translatedRecord = await formatTranslateRecord(post.record.text, $settings.general?.userLanguage, _agent, post.record);
      } catch (e) {
        toast.error('Translate error.')
      }

      isTranslated = true;
      pulseTranslate = false;
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
          disabled={isTranslated}
          on:click={translation}>{$_(isTranslated ? 'already_translated' : 'translation')}</button>
    {/if}
  </div>

  {#if $settings.design?.displayHandle}
    <p class="timeline__handle">@{post.author.handle}</p>
  {/if}

  <div class="timeline-warn-wrap" class:timeline-warn-wrap--warned={isWarn === 'content'}>
    {#if (isWarn === 'content')}
      <TimelineWarn labels={warnLabels} behavior={warnBehavior}></TimelineWarn>
    {/if}

    <p class="timeline__text" dir="auto">
      <TimelineText record={post.record} {_agent}></TimelineText>
    </p>

    {#if (translatedRecord)}
      <div class="timeline-translated-text" dir="auto">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-languages" aria-label="Translated text: "><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
        <p class="timeline__text">
          <TimelineText record={translatedRecord} {_agent}></TimelineText>
        </p>
      </div>
    {/if}

    {#if (AppBskyEmbedImages.isView(post.embed) && !isMedia && post.embed)}
      <div class="timeline-images-wrap">
        {#if (isWarn === 'media')}
          <TimelineWarn labels={warnLabels}></TimelineWarn>
        {/if}

        <Images images={post.embed.images} blobs={post.record.embed.images} did={post.author.did}></Images>
      </div>
    {/if}

    {#if (AppBskyEmbedExternal.isView(post.embed))}
      <EmbedExternal external={post.embed.external}></EmbedExternal>
    {/if}

    {#if (AppBskyEmbedRecord.isView(post.embed) && AppBskyEmbedRecord.isViewRecord(post.embed.record)) }
      <EmbedRecord record={post.embed.record} {_agent}></EmbedRecord>
    {/if}

    {#if (AppBskyEmbedRecord.isView(post.embed) && AppBskyFeedDefs.isGeneratorView(post.embed.record)) }
      <FeedsItem {_agent} feed={post.embed.record} layout="embed"></FeedsItem>
    {/if}

    {#if (AppBskyEmbedRecordWithMedia.isView(post.embed))}
      {#if (AppBskyEmbedImages.isView(post.embed.media))}
        <div class="timeline-images-wrap">
          {#if (isWarn === 'media')}
            <TimelineWarn labels={warnLabels}></TimelineWarn>
          {/if}

          <Images images={post.embed.media.images} blobs={post.record.embed.media.images} did={post.author.did}></Images>
        </div>
      {/if}

      {#if AppBskyEmbedExternal.isView(post.embed.media)}
        <EmbedExternal external={post.embed.media.external}></EmbedExternal>
      {/if}

      {#if AppBskyEmbedRecord.isViewRecord(post.embed.record.record)}
        <EmbedRecord record={post.embed.record.record} {_agent}></EmbedRecord>
      {/if}

      {#if (AppBskyFeedDefs.isGeneratorView(post.embed.record.record)) }
        <FeedsItem {_agent} feed={post.embed.record.record} layout="embed"></FeedsItem>
      {/if}
    {/if}
  </div>

  <slot></slot>
</div>