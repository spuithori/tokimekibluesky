<script lang="ts">
  import {_} from 'svelte-i18n'
  import {agents, labelDefs, labelerSettings, settings, workerTimer} from "$lib/stores";
  import {format, formatDistanceToNow, parseISO} from "date-fns";
  import Avatar from "../../../routes/(app)/Avatar.svelte";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import {contentLabelling, keywordFilter} from "$lib/timelineFilter";
  import {
      AppBskyEmbedExternal,
      AppBskyEmbedImages,
      AppBskyEmbedRecord,
      AppBskyEmbedRecordWithMedia, AppBskyEmbedVideo, AppBskyFeedDefs,
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
  import EmbedRecordDetached from "$lib/components/post/EmbedRecordDetached.svelte";
  import {getAllAgentDids, getDidFromUri} from "$lib/util";
  import EmbedVideo from "$lib/components/post/EmbedVideo.svelte";
  import ReactionButtons from "$lib/components/post/ReactionButtons.svelte";
  import {keywordMuteState} from "$lib/classes/keywordMuteState.svelte";
  import {onDestroy} from "svelte";

  interface Props {
      post: any;
      _agent: any;
      isMedia?: boolean;
      isTranslated?: boolean;
      isSingle?: boolean;
      isProfile?: boolean;
      pulseTranslate?: boolean;
      isHide?: any;
      children?: import('svelte').Snippet;
  }

  let {
      post,
      _agent,
      isMedia = false,
      isTranslated = $bindable(false),
      isSingle = false,
      isProfile = false,
      pulseTranslate = $bindable(false),
      isHide = $bindable(),
      children
  }: Props = $props();

  $effect(() => {
      translation(pulseTranslate);
  })

  let translatedRecord: undefined | AppBskyFeedPost.Record = $state();
  let warnLabels = $state([]);
  let warnBehavior: 'cover' | 'inform' = $state('cover');
  let timeDistanceToNow = $state(formatDistanceToNow(parseISO(post.indexedAt)));

  const moderateData = contentLabelling(post, _agent.did(), $settings, $labelDefs, $labelerSettings);
  const contentContext = isSingle || isProfile
      ? 'contentView'
      : 'contentList';

  let isWarn: 'content' | 'media' | null = detectWarn(moderateData) || null;
  isHide = detectHide(moderateData);
  detectKeywordFilter();

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

      if (keywordFilter(keywordMuteState.formattedKeywords, text, post.indexedAt)) {
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

  function handleTimer(e) {
      if (e.data % 5 === 0) {
          timeDistanceToNow = formatDistanceToNow(parseISO(post.indexedAt));
      }
  }

  $workerTimer.addEventListener('message', handleTimer);

  onDestroy(() => {
      $workerTimer.removeEventListener('message', handleTimer);
  })
</script>

<div class="timeline__image">
  {#if $settings?.design.postsLayout !== 'minimum'}
    <Avatar href="/profile/{ post.author.handle !== 'handle.invalid' ? post.author.handle : post.author.did }" avatar={post.author.avatar}
            handle={post.author.handle} {_agent}></Avatar>
  {/if}
</div>

<div class="timeline__content">
  <div class="timeline__meta">
    <p class="timeline__user">
      <Tooltip>
        {#snippet ref()}
          <span >{ post.author.displayName || post.author.handle }</span>
        {/snippet}
        {#snippet content()}
          <span  aria-hidden="true">@{ post.author.handle }</span>
        {/snippet}
      </Tooltip></p>

    <p class="timeline__date">
      {#if $settings?.design.absoluteTime}
        <Tooltip>
          {#snippet ref()}
            <span>{format(parseISO(post.indexedAt), $settings.design?.datetimeFormat || 'yyyy-MM-dd HH:mm')}</span>
          {/snippet}
          {#snippet content()}
            <span aria-hidden="true" class="timeline-tooltip">{format(parseISO(post.indexedAt), 'yyyy-MM-dd HH:mm:ss')}</span>
          {/snippet}
        </Tooltip>
      {:else}
        <Tooltip>
          {#snippet ref()}
            <span>{timeDistanceToNow}</span>
          {/snippet}
          {#snippet content()}
            <span aria-hidden="true" class="timeline-tooltip">{format(parseISO(post.indexedAt), 'yyyy-MM-dd HH:mm:ss')}</span>
          {/snippet}
        </Tooltip>
      {/if}
    </p>

    {#if (post.record.langs && !post.record.langs.includes($settings.general.userLanguage))}
      <button
          class="timeline-translate-button"
          disabled={isTranslated}
          onclick={translation}>{$_(isTranslated ? 'already_translated' : 'translation')}</button>
    {/if}
  </div>

  {#if $settings.design?.displayHandle}
    <p class="timeline__handle">@{post.author.handle}</p>
  {/if}

  <div class="timeline-warn-wrap" class:timeline-warn-wrap--warned={isWarn === 'content' && warnBehavior !== 'inform'}>
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

      {#if AppBskyEmbedVideo.isView(post.embed?.media)}
        <EmbedVideo video={post.embed.media}></EmbedVideo>
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

    {#if (AppBskyEmbedRecord.isViewDetached(post?.embed?.record) || AppBskyEmbedRecord.isViewDetached(post?.embed?.record?.record)) && getAllAgentDids($agents).includes(getDidFromUri(post?.embed?.record?.uri || post?.embed?.record?.record?.uri))}
      <EmbedRecordDetached></EmbedRecordDetached>
    {/if}

    {#if AppBskyEmbedVideo.isView(post?.embed)}
      <div class="timeline-images-wrap">
        {#if (isWarn === 'media')}
          <TimelineWarn labels={warnLabels}></TimelineWarn>
        {/if}

        <EmbedVideo video={post.embed}></EmbedVideo>
      </div>
    {/if}
  </div>

  <ReactionButtons {_agent} {post}></ReactionButtons>

  {@render children?.()}
</div>