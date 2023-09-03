<script lang="ts">
    import {_} from 'svelte-i18n'
    import {
        agent,
        isDataSaving,
        quotePost,
        settings,
        timelines,
        isPreventEvent,
        reportModal,
        columns, sideState, isPublishInstantFloat
    } from '$lib/stores';
    import {format, formatDistanceToNow, isMatch, parse, parseISO} from 'date-fns';
    import isWithinInterval from 'date-fns/isWithinInterval'
    import ja from 'date-fns/locale/ja/index';
    import en from 'date-fns/locale/en-US/index';
    import pt from 'date-fns/locale/pt-BR/index';
    import ko from 'date-fns/locale/ko/index';
    import fa from 'date-fns/locale/fa-IR/index';
    import Images from "./Images.svelte";
    import {
        AppBskyEmbedExternal,
        AppBskyEmbedImages,
        AppBskyEmbedRecord,
        AppBskyEmbedRecordWithMedia,
        AppBskyFeedDefs,
        AppBskyFeedGetLikes,
        AppBskyFeedPost,
        RichText,
        RichTextSegment
    } from '@atproto/api'
    import toast from "svelte-french-toast";
    import Avatar from "./Avatar.svelte";
    import ProfileCardWrapper from "./ProfileCardWrapper.svelte";
    import Like from "$lib/components/post/Like.svelte";
    import Repost from "$lib/components/post/Repost.svelte";
    import Reply, {replyFunc} from "$lib/components/post/Reply.svelte";
    import {onMount} from "svelte";
    import Bookmark from "../../lib/components/post/Bookmark.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import Menu from "$lib/components/ui/Menu.svelte";
    import {getTextArray, isUriLocal} from '$lib/richtext';
    import {goto} from "$app/navigation";
    import EmbedRecord from "$lib/components/post/EmbedRecord.svelte";

    export let _agent = $agent;
    export let data: AppBskyFeedDefs.FeedViewPost;
    export let isPrivate = false;
    export let isSingle: boolean = false;
    export let isMedia: boolean = false;

    let selectionText = '';

    export let column = undefined;
    export let index = 0;

    let textArray: RichTextSegment[] = [];
    let isMenuOpen = false;
    /* const embedServices = [
        {
            'service': Spotify,
            'hostname': 'open.spotify.com'
        },
    ]; */
    let dateFnsLocale: Locale;

    let isShortCutNumberShown = false;
    let isTranslated = false;

    const keycodeNumbers = [
        49,
        50,
        51,
        52,
        53,
        54,
        55,
        56,
        57
    ];

    const isReasonRepost = (reason: any): reason is AppBskyFeedDefs.ReasonRepost => {
      return !!(reason as AppBskyFeedDefs.ReasonRepost)?.by;
    }

    let voteFunc;
    let repostFunc;

    if ($settings.general.language === 'ja' || window.navigator.language === 'ja-JP') {
        dateFnsLocale = ja;
    } else if ($settings.general.language === 'pt-BR' || window.navigator.language === 'pt-BR') {
        dateFnsLocale = pt;
    } else if ($settings.general.language === 'ko' || window.navigator.language === 'ko-KR') {
        dateFnsLocale = ko;
    } else if ($settings.general.language === 'fa' || window.navigator.language === 'fa-IR') {
        dateFnsLocale = fa;
    } else {
        dateFnsLocale = en;
    }

    if (AppBskyFeedPost.isRecord(data.post?.record)) {
        const rt: RichText = new RichText({
            text: data.post.record.text,
            facets: data.post.record.facets,
        });
        for (const segment of rt.segments()) {
            textArray.push(segment);
        }
        textArray = textArray;
    }

    let labels = $settings?.moderation.contentLabels || {
        gore: 'warn',
        hate: 'warn',
        impersonation: 'warn',
        nsfw: 'warn',
        nudity: 'warn',
        spam: 'warn',
        suggestive: 'warn',
    };
    labels['!warn'] = 'warn';
    labels.spoiler = 'warn';

    let isHide = false;
    let isWarn = false;
    let isMute = false;
    let isWarnOpened = false;
    let warnLabels = [];

    let hideReply = column && column.settings?.timeline.hideReply
                  ? column.settings?.timeline.hideReply
                  : $settings.timeline?.hideReply || 'all';

    let hideRepost = column && column.settings?.timeline.hideRepost
            ? column.settings?.timeline.hideRepost
            : $settings.timeline?.hideRepost || 'all';

    function probability(n) {
      return Math.random() < n / 100;
    }

    onMount(() => {
        if (labels) {
            data.post.labels?.forEach(label => {
                if (labels[label.val] === 'hide') {
                    console.log('should hide: ' + label.val)
                    isHide = true;
                }

                if (labels[label.val] === 'warn') {
                    console.log('should warn: ' + label.val)
                    warnLabels = [...warnLabels, label.val];
                    isWarn = true;
                }
            })
        }

        if ($settings?.keywordMutes) {
            $settings.keywordMutes.forEach(keyword => {
                const timeIsValid = isMatch(keyword.period.start, 'HH:mm') && isMatch(keyword.period.end, 'HH:mm');
                if (!timeIsValid || keyword.word === '') {
                    return false;
                }

                const start = keyword.period.start;
                const end = keyword.period.end;

                const isIntervalWithin = start < end
                    ? isWithinInterval(parseISO(data.post.indexedAt), {
                        start: parse(start, 'HH:mm', new Date),
                        end: parse(end + ':59', 'HH:mm:ss', new Date),
                    })
                    : isWithinInterval(parseISO(data.post.indexedAt), {
                        start: parse('00:00', 'HH:mm', new Date),
                        end: parse(end + ':59', 'HH:mm:ss', new Date),
                      }) ||
                      isWithinInterval(parseISO(data.post.indexedAt), {
                          start: parse(start, 'HH:mm', new Date),
                          end: parse('23:59:59', 'HH:mm:ss', new Date),
                      });

                if (isIntervalWithin && data.post.record.text.includes(keyword.word)) {
                    isHide = true;
                }
            })
        }

        if (data.post.author.did !== _agent.did()) {
          switch (hideReply) {
            case 'all':
              break;
            case 'following':
              if (data.reply && (data.reply.parent.author.did !== _agent.did() && !data.reply?.parent.author.viewer.following)) {
                isHide = true;
              }
              break;
            case 'me':
              if (data.reply && data.reply.parent.author.did !== _agent.did()) {
                isHide = true;
              }
              break;
            default:
          }
        }

        if (isReasonRepost(data.reason)) {
          switch (hideRepost) {
            case 'all':
              break;
            case 'many':
              if (probability(25)) {
                isHide = true;
              }
              break;
            case 'soso':
              if (probability(50)) {
                isHide = true;
              }
              break;
            case 'less':
              if (probability(75)) {
                isHide = true;
              }
              break;
            case 'none':
              isHide = true;
              break;
            default:
          }
        }

        const langFilter = column && column.settings?.langFilterEnabled ? column.settings.langFilter : $settings.langFilter;
        if (langFilter && langFilter.length && data.post.record.langs) {
            const isLangMatched = langFilter.some(lang => data.post.record.langs.includes(lang));

            if (!isLangMatched) {
                isHide = true;
            }
        }

        if (data.post.author.viewer?.muted) {
            isHide = true;
        }
    })

    async function translation() {
        for (const item of textArray) {
            const res = await fetch(`/api/translator`, {
                method: 'post',
                body: JSON.stringify({
                    text: item.text,
                    to: $settings.general.language || window.navigator.language,
                })
            });
            const translation = await res.json();
            item.text = await translation[0].translations[0].text;
        }
        textArray = textArray;
        isMenuOpen = false;
        isTranslated = true;
    }

    function copyThreadUrl() {
        const url = 'https://bsky.app/profile/' + data.post.author.handle + '/post/' + data.post.uri.split('/').slice(-1)[0];

        navigator.clipboard.writeText(url)
            .then(() => {
                toast.success($_('success_copy_url'));
            }, () => {
                toast.error($_('failed_copy'));
            });

        isMenuOpen = false;
    }

    function copyHandle() {
        const handle = '@' + data.post.author.handle;

        navigator.clipboard.writeText(handle)
            .then(() => {
                toast.success($_('success_copy_handle'));
            }, () => {
                toast.success($_('failed_copy'));
            });

        isMenuOpen = false;
    }

    async function deletePost(uri: string) {
        const rkey = uri.split('/').slice(-1)[0];
        isMenuOpen = false;

        try {
            await _agent.agent.api.app.bsky.feed.post.delete(
                {repo: _agent.did(), rkey: rkey}
            );

            timelines.update(function (tls) {
                return tls.map(tl => {
                    return tl.filter(data => data.post.uri !== uri);
                });
            });

            toast.success($_('post_delete_success'));
        } catch (e) {
            toast.error($_('post_delete_failed') + ': ' + e);
        }
    }

    async function getHandleByDid(handle: string) {
        try {
            const res = await _agent.agent.api.com.atproto.repo.describeRepo(
                {repo: handle}
            );

            return res.data.handle;
        } catch (e) {
            console.log(e)
            return null;
        }
    }

    let keys = [];

    function handleKeydown(event) {
        isShortCutNumberShown = !!(event.ctrlKey && event.altKey);
        keys.push(event.keyCode);
    }

    function handleKeyup(event) {
        isShortCutNumberShown = !!(event.ctrlKey && event.altKey);
        const likeKey = 76;
        const repostKey = 83;
        const replyKey = 77;
        const keysString = keys.sort((a, b) => a - b).toString();

        const likeKeysString = [17, 18, likeKey, keycodeNumbers[index]].sort((a, b) => a - b).toString();
        const repostKeysString = [17, 18, repostKey, keycodeNumbers[index]].sort((a, b) => a - b).toString();
        const replyKeysString = [17, 18, replyKey, keycodeNumbers[index]].sort((a, b) => a - b).toString();

        if (keysString === likeKeysString) {
            voteFunc(data.post.cid, data.post.uri, data.post.viewer?.like);
        }

        if (keysString === repostKeysString) {
            repostFunc(data.post.cid, data.post.uri, data.post.viewer?.repost)
        }

        if (keysString === replyKeysString) {
            replyFunc(data.post, data.post.record.reply);
        }

        keys = [];
    }

    function handleClick(event) {
        if (event.target.closest('button') || event.target.closest('.profile-card') || event.target.closest('a') || event.target.closest('.timeline-external') || event.target.closest('.likes-wrap')) {
            return false;
        }

        if (selectionText) {
            return false;
        }

        if ($isPreventEvent) {
            isPreventEvent.set(false);
            return false;
        }

        const uri = '/profile/' + data.post.author.handle + '/post/' + data.post.uri.split('/').slice(-1)[0];
        const isColumn = column ? column.algorithm?.algorithm : undefined;

        if ($settings.design.layout === 'decks' && column) {
            if (data.post.uri !== isColumn) {
                addThreadColumn();
                setTimeout(() => {
                    document.querySelector('.deck').scrollLeft = 9999;
                }, 0);
            }
        } else {
            if (uri !== location.pathname) {
                goto('/profile/' + data.post.author.handle + '/post/' + data.post.uri.split('/').slice(-1)[0]);
            }
        }
    }

    function handleSelectStart(event) {
        selectionText = document.getSelection().toString();
    }

    async function addThreadColumn() {
        const uri = data.post.uri;
        $columns = [...$columns, {
            id: self.crypto.randomUUID(),
            algorithm: {
                type: 'thread',
                algorithm: uri,
                name: 'Thread',
            },
            style: 'default',
            did: _agent.did(),
            handle: _agent.handle(),
        }]
    }

    function report() {
      $reportModal = {
        open: true,
        data: {
          uri: data.post.uri,
          cid: data.post.cid,
        }
      }
    }
</script>

<svelte:window on:keydown={handleKeydown} on:keyup={handleKeyup} />
<svelte:document on:selectionchange={handleSelectStart} />

{#if (!isHide)}
  <article class="timeline__item"
           class:timeline__item--repost={isReasonRepost(data.reason)}
           class:timeline__item--reply={data.reply && data.reply.parent.author.did !== _agent.did()}
           class:timeline__item--compact={$settings?.design.postsLayout === 'compact' || $settings?.design.postsLayout === 'minimum'}
           class:timeline__item--minimum={$settings?.design.postsLayout === 'minimum'}
           on:click={handleClick}
  >
    {#if (isShortCutNumberShown && index < 9)}
      <p class="timeline-shortcut-number">{index + 1}</p>
    {/if}

    <div class="timeline-repost-messages">
      {#if (isReasonRepost(data.reason))}
        <p class="timeline-repost-message">
          <ProfileCardWrapper handle="{data.reason.by.handle}" {_agent}>
            <a href="/profile/{data.reason.by.handle}"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat-2"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>{$_('reposted_by', {values: {name: data.reason.by.displayName || data.reason.by.handle}})}</a>
          </ProfileCardWrapper>
        </p>
      {/if}
    </div>

    {#if (data.reply && !isSingle)}
      <div class="timeline__column timeline__column--reply">
        {#if (data.reply.parent.uri !== data.reply.root.uri)}
          <span class="timeline-reply-bar"></span>
        {/if}

        <div class="timeline__image">
          {#if $settings?.design.postsLayout !== 'minimum'}
            <Avatar href="/profile/{ data.reply.parent.author.handle }" avatar={data.reply.parent.author.avatar}
                    handle={data.reply.parent.author.handle} {_agent}></Avatar>
          {/if}
        </div>

        <div class="timeline__content">
          <div class="timeline__meta">
            <p class="timeline__user">
              <Tooltip>
                <span slot="ref">{ data.reply.parent.author.displayName || data.reply.parent.author.handle }</span>
                <span slot="content" aria-hidden="true">@{ data.reply.parent.author.handle }</span>
              </Tooltip></p>

            <p class="timeline__date timeline__date--noafter">
              {#if $settings?.design.absoluteTime}
                <Tooltip>
                  <time slot="ref"
                        datetime="{format(parseISO(data.reply.parent.indexedAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}">{format(parseISO(data.reply.parent.indexedAt), 'yy/MM/dd HH:mm')}</time>
                  <span slot="content" aria-hidden="true"
                        class="timeline-tooltip">{format(parseISO(data.reply.parent.indexedAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                </Tooltip>
              {:else}
                <Tooltip>
                  <time slot="ref"
                        datetime="{format(parseISO(data.reply.parent.indexedAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}">{formatDistanceToNow(parseISO(data.reply.parent.indexedAt), {locale: dateFnsLocale})}</time>
                  <span slot="content" aria-hidden="true"
                        class="timeline-tooltip">{format(parseISO(data.reply.parent.indexedAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                </Tooltip>
              {/if}
            </p>
          </div>

          <p class="timeline__text" dir="auto">
            {#each getTextArray(data.reply.parent.record) as item}
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
              {:else}
                <span>{item.text}</span>
              {/if}
            {/each}
          </p>

          {#if (AppBskyEmbedImages.isView(data.reply?.parent.embed) && !isMedia && data.reply?.parent.embed)}
            <div class="timeline-images-wrap">
              <Images images={data.reply.parent.embed.images}></Images>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <div class="timeline__column">
      <div class="timeline__image">
        {#if $settings?.design.postsLayout !== 'minimum'}
          <Avatar href="/profile/{ data.post.author.handle }" avatar={data.post.author.avatar}
                  handle={data.post.author.handle} {_agent}></Avatar>
        {/if}
      </div>

      <div class="timeline__content">
        <div class="timeline__meta">
          <p class="timeline__user">
            <Tooltip>
              <span slot="ref">{ data.post.author.displayName || data.post.author.handle }</span>
              <span slot="content" aria-hidden="true">@{ data.post.author.handle }</span>
            </Tooltip></p>

          <p class="timeline__date">
            {#if $settings?.design.absoluteTime}
              <Tooltip>
                <time slot="ref"
                      datetime="{format(parseISO(data.post.indexedAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}">{format(parseISO(data.post.indexedAt), 'yy/MM/dd HH:mm')}</time>
                <span slot="content" aria-hidden="true"
                      class="timeline-tooltip">{format(parseISO(data.post.indexedAt), 'yyyy-MM-dd HH:mm:ss')}</span>
              </Tooltip>
            {:else}
              <Tooltip>
                <time slot="ref"
                      datetime="{format(parseISO(data.post.indexedAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}">{formatDistanceToNow(parseISO(data.post.indexedAt), {locale: dateFnsLocale})}</time>
                <span slot="content" aria-hidden="true"
                      class="timeline-tooltip">{format(parseISO(data.post.indexedAt), 'yyyy-MM-dd HH:mm:ss')}</span>
              </Tooltip>
            {/if}
          </p>

          {#if (data.post.record.langs && !data.post.record.langs.includes($settings.general.language))}
            <button
                class="timeline-translate-button"
                class:timeline-translate-button--hidden={isTranslated}
                on:click={translation}>{$_('translation')}</button>
          {/if}
        </div>

        <div class="timeline-warn-wrap" class:timeline-warn-wrap--warned={isWarn}>
          {#if (isWarn)}
            <div class="timeline-warn">
              <div class="timeline-warn-heading">
                <p class="timeline-warn-title"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></p>
                <ul class="timeline-warn-list">
                  {#each warnLabels as label}
                    <li>{$_('labeling_' + label)}</li>
                  {/each}
                </ul>
              </div>

              <div class="timeline-warn-button">
                <button class="button button--sm" on:click={() => {isWarn = false}}>{$_('show_button')}</button>
              </div>
            </div>
          {/if}

          <p class="timeline__text" dir="auto">
            {#each textArray as item}
              {#if (item.isLink() && item.link)}
                {#if (isUriLocal(item.link.uri))}
                  <a href="{new URL(item.link.uri).pathname}">{item.text}</a>
                {:else}
                  <a href="{item.link.uri}" target="_blank" rel="noopener nofollow noreferrer">{item.text}</a>
                {/if}
              {:else if (item.isMention() && item.mention)}
                <ProfileCardWrapper handle="{item.text.slice(1)}">
                  <a href="/profile/{item.text.slice(1)}">{item.text}</a>
                </ProfileCardWrapper>
              {:else}
                <span>{item.text}</span>
              {/if}
            {/each}
          </p>

          {#if (AppBskyEmbedImages.isView(data.post.embed) && !isMedia)}
            <div class="timeline-images-wrap">
              <Images images={data.post.embed.images}></Images>
            </div>
          {/if}

          {#if (AppBskyEmbedExternal.isView(data.post?.embed))}
            <div class="timeline-external">
              <div class="timeline-external__image">
                {#if (data.post.embed.external.thumb && $settings?.design.postsLayout !== 'minimum')}
                  <img src="{data.post.embed.external.thumb}" alt="">
                {/if}
              </div>

              <div class="timeline-external__content">
                <p class="timeline-external__title"><a href="{data.post.embed.external.uri}" target="_blank" rel="noopener nofollow noreferrer">{data.post.embed.external.title}</a>
                </p>
                <p class="timeline-external__description">{data.post.embed.external.description}</p>
                <p class="timeline-external__url">{data.post.embed.external.uri}</p>
              </div>
            </div>
          {/if}

          {#if (AppBskyEmbedRecord.isView(data.post.embed) && AppBskyEmbedRecord.isViewRecord(data.post.embed.record)) }
            <EmbedRecord record={data.post.embed.record} locale={dateFnsLocale}></EmbedRecord>
          {/if}

          {#if (AppBskyEmbedRecordWithMedia.isView(data.post.embed) && AppBskyEmbedRecord.isViewRecord(data.post.embed.record.record)) }
            {#if (AppBskyEmbedImages.isView(data.post.embed.media))}
              <div class="timeline-images-wrap">
                <Images images={data.post.embed.media.images}></Images>
              </div>
            {/if}

            <EmbedRecord record={data.post.embed.record.record} locale={dateFnsLocale}></EmbedRecord>
          {/if}
        </div>

        <div class="timeline-reaction" class:timeline-reaction--media={isMedia}>
          <Reply
              post={data.post}
              reply={data.post.record.reply}
              count={data.post.replyCount}
              {_agent}
          ></Reply>

          <Repost
              cid={data.post.cid}
              uri={data.post.uri}
              repostViewer={data.post.viewer?.repost}
              count={data.post.repostCount}
              on:repost
              bind:repost={repostFunc}
              {_agent}
          ></Repost>

          <Like
              cid={data.post.cid}
              uri={data.post.uri}
              likeViewer={data.post.viewer?.like}
              count={data.post.likeCount}
              on:like
              bind:vote={voteFunc}
              {_agent}
          ></Like>

          <Bookmark post={data.post} bookmarkId={data?.bookmarkId} {_agent}></Bookmark>
        </div>

        <slot></slot>
      </div>
    </div>

    <Menu bind:isMenuOpen={isMenuOpen}>
      <ul class="timeline-menu-list" slot="content">
        {#if (data.post.author.did === _agent.did())}
          <li class="timeline-menu-list__item timeline-menu-list__item--delete">
            <button class="timeline-menu-list__button" on:click={() => {deletePost(data.post.uri)}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              <span class="text-danger">{$_('delete_post')}</span>
            </button>
          </li>
        {/if}

        <li class="timeline-menu-list__item timeline-menu-list__item--quote">
          <button class="timeline-menu-list__button" on:click={() => {$quotePost = data.post; $sideState = 'publish'; $isPublishInstantFloat = true;}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-quote"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
            {$_('quote_post')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--translate">
          <button class="timeline-menu-list__button" on:click={translation}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-languages"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
            {$_('translation')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--copy-url">
          <button class="timeline-menu-list__button" on:click={copyThreadUrl}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            {$_('copy_url')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--copy-handle">
          <button class="timeline-menu-list__button" on:click={copyHandle}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-at-sign"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>
            {$_('copy_handle')}
          </button>
        </li>

        {#if ($settings.design?.layout === 'decks')}
          <li class="timeline-menu-list__item timeline-menu-list__item--report">
            <a href="/profile/{data.post.author.handle}/post/{data.post.uri.split('/').slice(-1)[0]}" class="timeline-menu-list__button">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-plus"><path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/></svg>
              {$_('show_thread')}
            </a>
          </li>
        {/if}

        <li class="timeline-menu-list__item timeline-menu-list__item--report">
          <button class="timeline-menu-list__button" on:click={report}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flag"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
            {$_('report')}
          </button>
        </li>
      </ul>
    </Menu>

    {#if ($settings?.general.devMode)}
      <div class="timeline-dev">
        <p>langs: {data.post.record?.langs ?? ' '}</p>
        <p>via: {data.post.record?.via ?? ' '}</p>

        {#if data.post.labels && data.post.labels.length}
          <div class="timeline-dev__group">
            <p>labels: </p>
            {#each data.post.labels as label}
              <p>{label.val}</p>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </article>
{/if}

<style lang="postcss">

</style>