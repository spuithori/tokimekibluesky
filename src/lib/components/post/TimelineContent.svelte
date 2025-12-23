<script lang="ts">
  import {_} from 'svelte-i18n'
  import {agents, labelerSettings, settings} from "$lib/stores";
  import {format, parseISO} from "date-fns";
  import Avatar from "../../../routes/(app)/Avatar.svelte";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import {contentLabelling, detectHide} from "$lib/timelineFilter";
  import { AppBskyEmbedExternal, AppBskyEmbedImages, AppBskyEmbedRecord, AppBskyEmbedRecordWithMedia, AppBskyEmbedVideo, AppBskyFeedDefs, AppBskyFeedPost, BskyAgent } from "@atproto/api";
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
  import {onDestroy, untrack} from "svelte";
  import {BadgeCheck, CircleCheck, CircleDashed, Eye, Handshake} from "lucide-svelte";
  import {intlRelativeTimeFormatState} from "$lib/classes/intlRelativeTimeFormatState.svelte";
  import {appState} from "$lib/classes/appState.svelte";
  import {getNextUpdateDelay} from "$lib/components/post/timelineUtil";

  interface Props {
      post: any;
      reason?: any;
      _agent: any;
      isMedia?: boolean;
      isTranslated?: boolean;
      isSingle?: boolean;
      pulseTranslate?: boolean;
      isHide?: any;
      threadContext?: {
        feed?: any[];
        postUri?: string;
        authorDid?: string;
      };
      children?: import('svelte').Snippet;
  }

  let {
      post,
      reason,
      _agent,
      isMedia = false,
      isTranslated = $bindable(false),
      isSingle = false,
      pulseTranslate = $bindable(false),
      isHide = $bindable(),
      threadContext,
      children
  }: Props = $props();

  $effect(() => {
      translation(pulseTranslate);
  })

  let translatedRecord: undefined | AppBskyFeedPost.Record = $state();
  let warnLabels = $state([]);
  let warnBehavior: 'cover' | 'inform' = $state('cover');
  let timeDistanceToNow = $state(intlRelativeTimeFormatState.format({ laterDate: parseISO(post.indexedAt) }));
  let skyblurText = $state('');
  let isSkyblurAdditional = $state(false);
  let timerId: ReturnType<typeof setTimeout>;

  const whisperExpiredAt = (() => {
      const raw = post?.record?.['tech.tokimeki.whisper.expiredAt'];
      if (typeof raw !== 'string') return null;
      const date = new Date(raw);
      if (isNaN(date.getTime())) return null;
      const postCreated = new Date(post?.record?.createdAt || 0).getTime();
      const maxExpiry = postCreated + 25 * 60 * 60 * 1000;
      if (date.getTime() > maxExpiry) return null;
      return raw;
  })();

  const whisperRemainingTime = (() => {
      if (!whisperExpiredAt) return '';
      const remaining = new Date(whisperExpiredAt).getTime() - Date.now();
      if (remaining <= 0) return '';
      const totalMinutes = Math.floor(remaining / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const formatter = new Intl.DurationFormat($settings?.general?.userLanguage || navigator.language, { style: 'short' });
      return formatter.format(hours > 0 ? { hours, minutes } : { minutes });
  })();

  const moderateData = contentLabelling(post, _agent.did(), $settings, appState.labelDefs.current, $labelerSettings);
  const contentContext = isSingle
      ? 'contentView'
      : 'contentList';

  let isWarn: 'content' | 'media' | null = detectWarn(moderateData) || null;
  isHide = detectHide(moderateData, contentContext, isHide, post);

  function detectWarn(moderateData) {
      if (!moderateData) {
          return null;
      }

      try {
          const contentUi = moderateData.ui(contentContext);
          const mediaUi = moderateData.ui('contentMedia');

          if (contentUi.blur) {
              warnLabels = [...contentUi.blurs, ...mediaUi.blurs];
              return 'content';
          }

          if (mediaUi.blur) {
              warnLabels = mediaUi.blurs;
              return 'media';
          }

          if (contentUi.inform) {
              warnLabels = contentUi.informs;
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

  async function translation(pulse = true) {
      if (!pulse) {
          return false;
      }

      await untrack(async () => {
          try {
              translatedRecord = await formatTranslateRecord(post.record.text, $settings.general?.userLanguage, _agent, post.record);
          } catch (e) {
              toast.error('Translate error.')
          }

          isTranslated = true;
          pulseTranslate = false;
      })
  }

  async function handleSkyblurShow() {
      try {
          const __agent = new BskyAgent({service: _agent.service()});
          const rkey = post?.record?.['uk.skyblur.post.uri'].split('/').slice(-1)[0];
          const res = await __agent.api.com.atproto.repo.getRecord({
              collection: "uk.skyblur.post",
              repo: post.author.did,
              rkey: rkey,
          });

          if (res?.data?.value?.text) {
              skyblurText = res.data.value.text.replace(/[\[\]]/g, '');

              if (res?.data?.value?.additional) {
                  isSkyblurAdditional = true;
              }
          } else {
              throw new Error('Skyblur text not found.');
          }
      } catch (e) {
          console.error(e);
      }
  }

  function update() {
      timeDistanceToNow = intlRelativeTimeFormatState.format({ laterDate: parseISO(post.indexedAt) });

      const delay = getNextUpdateDelay(parseISO(post.indexedAt));

      if (delay !== null) {
          timerId = setTimeout(update, delay);
      }
  }
  update();

  onDestroy(() => {
      if (timerId) {
          clearTimeout(timerId);
      }
  })
</script>

<div class="timeline__image">
  {#if $settings?.design.postsLayout !== 'minimum'}
    <Avatar href="/profile/{ post.author.did }" avatar={post.author.avatar} profile={post.author} handle={post.author.handle} {_agent}></Avatar>

    {#if (post.author?.viewer?.followedBy && $settings?.design?.mutualDisplay)}
      <div class="avatar-mutual-badge">
        <Handshake size="16" color="var(--primary-color)"></Handshake>
      </div>
    {/if}
  {/if}
</div>

<div class="timeline__content" data-aturi={post.uri}>
  <div class="timeline__meta">
    <p class="timeline__user">
      { post.author.displayName || post.author.handle }
    </p>

    {#if post?.author?.verification?.trustedVerifierStatus === 'valid'}
        <span class="timeline__verified" aria-label="(Trusted verifier)">
            <BadgeCheck size="16" color="var(--primary-color)" strokeWidth="2.25"></BadgeCheck>
        </span>
    {/if}

    {#if post?.author?.verification?.verifiedStatus === 'valid'}
        <span class="timeline__verified" aria-label="(Verified)">
           <CircleCheck size="16" color="var(--primary-color)" strokeWidth="2.25"></CircleCheck>
        </span>
    {/if}

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
      <button class="timeline-translate-button" disabled={isTranslated} onclick={translation}>{$_(isTranslated ? 'already_translated' : 'translation')}</button>
    {/if}
  </div>

  {#if $settings.design?.displayHandle}
    <p class="timeline__handle">@{post.author.handle}</p>
  {/if}

  <div class="timeline-warn-wrap" class:timeline-warn-wrap--warned={isWarn === 'content' && warnBehavior !== 'inform'}>
    {#if (isWarn === 'content')}
      <TimelineWarn labels={warnLabels} behavior={warnBehavior}></TimelineWarn>
    {/if}

    {#if (!skyblurText)}
      <p class="timeline__text" dir="auto">
        <TimelineText record={post.record} {_agent} handle={post?.author?.handle}></TimelineText>
      </p>

      {#if (post?.record?.['uk.skyblur.post.uri'])}
        <button class="skyblur-show" onclick={handleSkyblurShow}>
          <Eye size="18" color="var(--primary-color)"></Eye>
          {$_('show_skyblur_text')}
        </button>
      {/if}
    {:else}
      <p class="timeline__text" dir="auto">
        <TimelineText record={{
          ...post.record,
          text: skyblurText,
      }} {_agent} handle={post?.author?.handle}></TimelineText>
      </p>
    {/if}

    {#if (isSkyblurAdditional)}
      <a class="skyblur-show" href="https://skyblur.uk/post/{post.author.did}/{post.uri.split('/').slice(-1)[0]}" target="_blank" rel="noopener nofollow noreferrer">
        <Eye size="18" color="var(--primary-color)"></Eye>
        {$_('open_skyblur_additional')}
      </a>
    {/if}

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

        <Images images={post.embed.images} blobs={post.record.embed.images} did={post.author.did} {threadContext}></Images>
      </div>
    {/if}

    {#if (AppBskyEmbedExternal.isView(post.embed))}
      <div class="timeline-external-wrap">
        {#if (isWarn === 'media')}
          <TimelineWarn labels={warnLabels}></TimelineWarn>
        {/if}

        <EmbedExternal external={post.embed.external}></EmbedExternal>
      </div>
    {/if}

    {#if (AppBskyEmbedRecord.isView(post.embed) && AppBskyEmbedRecord.isViewRecord(post.embed.record) && !whisperExpiredAt) }
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

          <Images images={post.embed.media.images} blobs={post.record.embed.media.images} did={post.author.did} {threadContext}></Images>
        </div>
      {/if}

      {#if AppBskyEmbedVideo.isView(post.embed?.media)}
        <EmbedVideo video={post.embed.media}></EmbedVideo>
      {/if}

      {#if AppBskyEmbedExternal.isView(post.embed.media)}
        <EmbedExternal external={post.embed.media.external}></EmbedExternal>
      {/if}

      {#if AppBskyEmbedRecord.isViewRecord(post.embed.record.record) && !whisperExpiredAt}
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

  {#if whisperExpiredAt}
    <div class="whisper-indicator">
      <CircleDashed size="14"></CircleDashed>
      <span>{$_('whisper_remaining')}: {whisperRemainingTime || 'soon...'}</span>
    </div>
  {/if}

  <ReactionButtons {_agent} {post} {reason}></ReactionButtons>

  {@render children?.()}
</div>
