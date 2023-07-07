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
      columns
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
    let likes: Promise<Like[]>;
    if (isSingle) {
        likes = getLikes();
    }

    async function getLikes() {
        const res = await $agent.agent.api.app.bsky.feed.getLikes({uri: data.post.uri});
        return res.data.likes;
    }

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

    if (AppBskyFeedPost.isRecord(data.post.record)) {
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
        gore: 'show',
        hate: 'show',
        impersonation: 'show',
        nsfw: 'show',
        nudity: 'show',
        spam: 'show',
        suggestive: 'show',
    };

    let isHide = false;
    let isWarn = false;
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

        if (data.post.author.did !== $agent.did()) {
          switch (hideReply) {
            case 'all':
              break;
            case 'following':
              if (data.reply && (data.reply.parent.author.did !== $agent.did() && !data.reply?.parent.author.viewer.following)) {
                isHide = true;
              }
              break;
            case 'me':
              if (data.reply && data.reply.parent.author.did !== $agent.did()) {
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
            await $agent.agent.api.app.bsky.feed.post.delete(
                {repo: $agent.did(), rkey: rkey}
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
            const res = await $agent.agent.api.com.atproto.repo.describeRepo(
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

        if (uri !== location.pathname) {
            goto('/profile/' + data.post.author.handle + '/post/' + data.post.uri.split('/').slice(-1)[0]);
        }
    }

    function handleSelectStart(event) {
        selectionText = document.getSelection().toString();
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
           class:timeline__item--reply={data.reply && data.reply.parent.author.did !== $agent.did()}
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
          <ProfileCardWrapper handle="{data.reason.by.handle}">
            <a href="/profile/{data.reason.by.handle}"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat-2"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>{$_('reposted_by', {values: {name: data.reason.by.displayName || data.reason.by.handle}})}</a>
          </ProfileCardWrapper>
        </p>
      {/if}
    </div>

    {#if (data.post.author.did === $agent.did())}
      <button class="timeline__delete" on:click={() => {deletePost(data.post.uri)}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30">
          <path id="trash" d="M70,3l3-3h6l3,3h6V6H64V3ZM65.5,9h21L85,30H67ZM73,12V27h1.5V12Zm4.5,0V27H79V12Z"
                transform="translate(-64)" fill="#d81c2f"/>
        </svg>
      </button>
    {/if}

    {#if (data.reply && !isSingle)}
      <div class="timeline__column timeline__column--reply">
        {#if (data.reply.parent.uri !== data.reply.root.uri)}
          <span class="timeline-reply-bar"></span>
        {/if}

        <div class="timeline__image">
          {#if $settings?.design.postsLayout !== 'minimum'}
            <Avatar href="/profile/{ data.reply.parent.author.handle }" avatar={data.reply.parent.author.avatar}
                  handle={data.reply.parent.author.handle}></Avatar>
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

          <div class="timeline__warn-wrap">
            {#if (isWarn)}
              <div class="timeline-warn">
                <div class="timeline-warn-heading">
                  <p class="timeline-warn-title">{$_('this_content_warn')}: </p>
                  <ul class="timeline-warn-list">
                    {#each warnLabels as label}
                      <li>{$_(label)}</li>
                    {/each}
                  </ul>
                </div>

                <div class="timeline-warn-button">
                  <button class="button button--sm" on:click={() => {isWarn = false}}>{$_('show_button')}</button>
                </div>
              </div>
            {/if}

            <p class="timeline__text" dir="auto">
              {#each getTextArray(data.reply.parent.record) as item}
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

            {#if (AppBskyEmbedImages.isView(data.reply.parent.embed) && !isMedia)}
              <div class="timeline-images-wrap">
                <Images images={data.reply.parent.embed.images}></Images>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <div class="timeline__column">
      <div class="timeline__image">
        {#if $settings?.design.postsLayout !== 'minimum'}
          <Avatar href="/profile/{ data.post.author.handle }" avatar={data.post.author.avatar}
                handle={data.post.author.handle}></Avatar>
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

        <div class="timeline__warn-wrap">
          {#if (isWarn)}
            <div class="timeline-warn">
              <div class="timeline-warn-heading">
                <p class="timeline-warn-title">{$_('this_content_warn')}: </p>
                <ul class="timeline-warn-list">
                  {#each warnLabels as label}
                    <li>{$_(label)}</li>
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
        </div>

        {#if (AppBskyEmbedExternal.isView(data.post.embed))}
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
          <div class="timeline-external timeline-external--record">
            {#if $settings?.design.postsLayout !== 'minimum'}
              <Avatar href="/profile/{ data.post.embed.record.author.handle }"
                    avatar={data.post.embed.record.author.avatar}
                    handle={data.post.embed.record.author.handle}></Avatar>
            {/if}

            <div class="timeline-external__content">
              <div class="timeline__meta">
                <p class="timeline__user"
                   title="{data.post.embed.record.author.handle}">{ data.post.embed.record.author.displayName || data.post.embed.record.author.handle }</p>
                <p class="timeline__date">
                  <time datetime="{format(parseISO(data.post.embed.record.indexedAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}"
                        title="{format(parseISO(data.post.embed.record.indexedAt), 'yyyy-MM-dd HH:mm:ss')}">{formatDistanceToNow(parseISO(data.post.embed.record.indexedAt), {locale: dateFnsLocale})}</time>
                </p>
              </div>

              {#if (AppBskyFeedPost.isRecord(data.post.embed.record.value))}
                <p class="timeline-external__description">
                  {data.post.embed.record.value.text}
                </p>
              {/if}

              {#if (AppBskyEmbedImages.isView(data.post.embed.record?.embeds[0]))}
                <div class="timeline-images-wrap timeline-images-wrap--record">
                  <Images images={data.post.embed.record.embeds[0].images}></Images>
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

            <a class="timeline-external-link" href="/profile/{data.post.embed.record.author.handle}/post/{data.post.embed.record.uri.split('/').slice(-1)[0]}" aria-label="{$_('show_thread')}"></a>
          </div>
        {/if}

        {#if (AppBskyEmbedRecordWithMedia.isView(data.post.embed) && AppBskyEmbedRecord.isViewRecord(data.post.embed.record.record)) }
          {#if (AppBskyEmbedImages.isView(data.post.embed.media))}
            <div class="timeline-images-wrap">
              <Images images={data.post.embed.media.images}></Images>
            </div>
          {/if}

          <div class="timeline-external timeline-external--record">
            {#if $settings?.design.postsLayout !== 'minimum'}
              <Avatar href="/profile/{ data.post.embed.record.record.author.handle }"
                      avatar={data.post.embed.record.record.author.avatar}
                      handle={data.post.embed.record.record.author.handle}></Avatar>
            {/if}

            <div class="timeline-external__content">
              <div class="timeline__meta">
                <p class="timeline__user"
                   title="{data.post.embed.record.record.author.handle}">{ data.post.embed.record.record.author.displayName || data.post.embed.record.record.author.handle }</p>
                <p class="timeline__date">
                  <time
                      datetime="{format(parseISO(data.post.embed.record.record.indexedAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}"
                      title="{format(parseISO(data.post.embed.record.record.indexedAt), 'yyyy-MM-dd HH:mm:ss')}">{formatDistanceToNow(parseISO(data.post.embed.record.record.indexedAt), {locale: dateFnsLocale})}</time>
                </p>
              </div>

              {#if (AppBskyFeedPost.isRecord(data.post.embed.record.record.value))}
                <p class="timeline-external__description">
                  {data.post.embed.record.record.value.text}
                </p>
              {/if}
            </div>

            <span class="timeline-external__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28.705" height="25.467" viewBox="0 0 28.705 25.467">
              <path id="パス_3" data-name="パス 3"
                    d="M-21.352-46.169H-9.525v6.82A26.369,26.369,0,0,1-16.777-20.7h-5.266A26.721,26.721,0,0,0-15.7-34.342h-5.655Zm16.273,0H6.662v6.82A26.079,26.079,0,0,1-.59-20.7H-5.77A25.477,25.477,0,0,0,.489-34.342H-5.079Z"
                    transform="translate(22.043 46.169)" fill="var(--primary-color)"/>
            </svg>
            </span>

            <a class="timeline-external-link" href="/profile/{data.post.embed.record.record.author.handle}/post/{data.post.embed.record.record.uri.split('/').slice(-1)[0]}" aria-label="{$_('show_thread')}"></a>
          </div>
        {/if}

        <div class="timeline-reaction" class:timeline-reaction--media={isMedia}>
          <Reply
              post={data.post}
              reply={data.post.record.reply}
              count={data.post.replyCount}
          ></Reply>

          <Repost
              cid={data.post.cid}
              uri={data.post.uri}
              repostViewer={data.post.viewer?.repost}
              count={data.post.repostCount}
              on:repost
              bind:repost={repostFunc}
          ></Repost>

          <Like
              cid={data.post.cid}
              uri={data.post.uri}
              likeViewer={data.post.viewer?.like}
              count={data.post.likeCount}
              on:like
              bind:vote={voteFunc}
          ></Like>

          <Bookmark post={data.post} bookmarkId={data?.bookmarkId}></Bookmark>
        </div>

        {#if (isSingle)}
          {#await likes}
            <slot name="likes" likes={[]}></slot>
          {:then likes}
            <slot name="likes" {likes}></slot>
          {/await}
        {/if}
      </div>
    </div>

    <Menu bind:isMenuOpen={isMenuOpen}>
      <ul class="timeline-menu-list" slot="content">
        {#if (data.post.author.did === $agent.did())}
          <li class="timeline-menu-list__item timeline-menu-list__item--delete">
            <button class="timeline-menu-list__button" on:click={() => {deletePost(data.post.uri)}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15.2" height="19" viewBox="0 0 15.2 19">
                <path id="trash"
                      d="M67.8,1.9,69.7,0h3.8l1.9,1.9h3.8V3.8H64V1.9ZM64.95,5.7h13.3L77.3,19H65.9ZM69.7,7.6v9.5h.95V7.6Zm2.85,0v9.5h.95V7.6Z"
                      transform="translate(-64)" fill="var(--danger-color)"/>
              </svg>
              <span class="text-danger">{$_('delete_post')}</span>
            </button>
          </li>
        {/if}

        <li class="timeline-menu-list__item timeline-menu-list__item--quote">
          <button class="timeline-menu-list__button" on:click={() => {$quotePost = data.post}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18.16" height="16.112" viewBox="0 0 18.16 16.112">
              <path id="パス_4" data-name="パス 4"
                    d="M-21.606-46.169h7.482v4.315a16.682,16.682,0,0,1-4.588,11.8h-3.332a16.9,16.9,0,0,0,4.014-8.629h-3.577Zm10.3,0h7.428v4.315a16.5,16.5,0,0,1-4.588,11.8h-3.277a16.118,16.118,0,0,0,3.96-8.629h-3.523Z"
                    transform="translate(22.043 46.169)" fill="var(--primary-color)"/>
            </svg>
            {$_('quote_post')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--translate">
          <button class="timeline-menu-list__button" on:click={translation}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
              <path id="translate"
                    d="M6.669,8.1l2.016,2.016-.747,1.8L5.4,9.36,2.43,12.33,1.17,11.052,4.122,8.1,3.33,7.308A5.387,5.387,0,0,1,2.16,5.4H4.14a2.533,2.533,0,0,0,.459.63l.8.81.792-.792A4.173,4.173,0,0,0,7.2,3.6H0V1.8H4.5V0H6.3V1.8h4.5V3.6H9A5.906,5.906,0,0,1,7.47,7.308L6.66,8.1Zm3.456,7.2L9,18H7.2L11.7,7.2h1.8L18,18H16.2l-1.125-2.7Zm.747-1.8h3.456L12.6,9.36Z"
                    fill="var(--text-color-1)"/>
            </svg>
            {$_('translation')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--copy-url">
          <button class="timeline-menu-list__button" on:click={copyThreadUrl}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14.417" height="18" viewBox="0 0 14.417 18">
              <path id="clipboard"
                    d="M6.532,2.345a2.7,2.7,0,0,1,5.352,0l1.829.36v.9h.9a1.8,1.8,0,0,1,1.8,1.8V16.221a1.8,1.8,0,0,1-1.8,1.8H3.8a1.8,1.8,0,0,1-1.8-1.8V5.409a1.807,1.807,0,0,1,1.8-1.8h.9v-.9l1.829-.36ZM4.7,5.409H3.8V16.221H14.615V5.409h-.9v.9H4.7Zm4.505-1.8a.9.9,0,1,0-.9-.9A.9.9,0,0,0,9.208,3.606Z"
                    transform="translate(-2 -0.023)" fill="var(--text-color-3)"/>
            </svg>
            {$_('copy_url')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--copy-handle">
          <button class="timeline-menu-list__button" on:click={copyHandle}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18.001" viewBox="0 0 18 18.001">
              <path id="at-symbol"
                    d="M12.24,12.124A4.5,4.5,0,1,1,11.7,5.4V4.5h1.8v5.85a1.35,1.35,0,1,0,2.7,0V9a7.2,7.2,0,1,0-3.978,6.444l.81,1.611A9,9,0,1,1,18,9h-.009v1.35a3.15,3.15,0,0,1-5.76,1.773ZM9,11.7A2.7,2.7,0,1,0,6.3,9,2.7,2.7,0,0,0,9,11.7Z"
                    transform="translate(0 -0.009)" fill="var(--text-color-3)"/>
            </svg>
            {$_('copy_handle')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--report">
          <button class="timeline-menu-list__button" on:click={report}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flag"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
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