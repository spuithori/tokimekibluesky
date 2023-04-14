<script lang="ts">
    import { _ } from 'svelte-i18n'
    import { agent } from '$lib/stores';
    import { timeline, cursor, notificationCount, quotePost, replyRef } from '$lib/stores';
    import { format, formatDistanceToNow, parseISO } from 'date-fns';
    import { afterUpdate, onMount } from 'svelte';
    import ja from 'date-fns/locale/ja/index';
    import en from 'date-fns/locale/en-US/index';
    import pt from 'date-fns/locale/pt-BR/index';
    import ko from 'date-fns/locale/ko/index';
    import Images from "./Images.svelte";
    import { clickOutside } from '$lib/clickOutSide';
    import { fade, fly } from 'svelte/transition';
    import Spotify from './Spotify.svelte';
    import { AppBskyEmbedExternal, AppBskyEmbedRecord, AppBskyEmbedImages, AppBskyFeedPost, AppBskyFeedDefs, RichText, RichTextSegment, AppBskyEmbedRecordWithMedia, AppBskyFeedGetLikes } from '@atproto/api'
    import toast from "svelte-french-toast";

    export let data: AppBskyFeedDefs.FeedViewPost;
    export let isPrivate = false;
    export let isSingle: boolean = false;
    export let isMedia: boolean = false;
    if (isSingle) {
      getLikes();
    }

    let textArray: RichTextSegment[] = [];
    let votes;
    let voteCount: number = 0;
    let isReplyOpen = false;
    let isMenuOpen = false;
    let myVoteCheck: boolean = typeof data.post.viewer?.like === 'string';
    let isLikeProcessed: boolean = false;
    /* const embedServices = [
        {
            'service': Spotify,
            'hostname': 'open.spotify.com'
        },
    ]; */
    let dateFnsLocale: Locale;
    let likes: AppBskyFeedGetLikes.OutputSchema;

    if (window.navigator.language === 'ja' || window.navigator.language === 'ja-JP') {
        dateFnsLocale = ja;
    } else if (window.navigator.language === 'pt' || window.navigator.language === 'pt-BR') {
        dateFnsLocale = pt;
    } else if (window.navigator.language === 'ko' || window.navigator.language === 'ko-KR') {
        dateFnsLocale = ko;
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
    
    const isReasonRepost = (reason: any): reason is AppBskyFeedDefs.ReasonRepost => {
      return !!(reason as AppBskyFeedDefs.ReasonRepost)?.by;
    }

    async function vote(cid: string, uri: string) {
        myVoteCheck = !myVoteCheck;
        isLikeProcessed = true;

        if (myVoteCheck) {
            data.post.likeCount = data.post.likeCount + 1;
        } else {
            data.post.likeCount = data.post.likeCount - 1;
        }

        try {
            const like = await $agent.setVote(cid, uri, data.post.viewer?.like || '');

            try {
                [myVoteCheck, votes] = await Promise.all([
                    $agent.myVoteCheck(uri),
                    $agent.getVotes(uri)
                ]);

                isLikeProcessed = false;
                voteCount = votes.length;
                data.post.likeCount = votes.length;
                data.post.viewer!.like = like?.uri || undefined;
            } catch(e) {
                toast.error($_('failed_to_like_after_reload'));
                isLikeProcessed = false;
            }
        } catch (e) {
            toast.error($_('failed_to_like'));
            console.error(e);
            myVoteCheck = !myVoteCheck;
            isLikeProcessed = false;

            if (myVoteCheck) {
                data.post.likeCount = data.post.likeCount - 1;
            } else {
                data.post.likeCount = data.post.likeCount + 1;
            }
        }
    }

    async function repost(cid: string, uri: string) {
        await $agent.setRepost(cid, uri, data.post.viewer?.repost || '');

        if (!isPrivate) {
            const data = await $agent.getTimeline();
            timeline.set(data.feed);
            cursor.set(data.cursor);
        } else {
            toast.success('ページをリロードしてリポスト操作を確認してください。')
        }

        notificationCount.set(await $agent.getNotificationCount());
    }

    async function translation() {
        for (const item of textArray) {
          const res = await fetch(`/api/translator`, {
              method: 'post',
              body: JSON.stringify({
                  text: item.text,
                  to: window.navigator.language,
              })
          });
          const translation = await res.json();
          item.text = await translation[0].translations[0].text;
        }
        textArray = textArray;
        isMenuOpen = false;
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

    function replyOpen() {
        isReplyOpen = isReplyOpen !== true;
    }

    function menuOpen() {
        isMenuOpen = isMenuOpen !== true;
    }

    async function deletePost (uri: string) {
        const rkey = uri.split('/').slice(-1)[0]
        await $agent.agent.api.app.bsky.feed.post.delete(
            { repo: $agent.did(), rkey: rkey }
        );

        if (!isPrivate) {
            const data = await $agent.getTimeline();
            timeline.set(data.feed);
            cursor.set(data.cursor);
        }
    }

    async function getHandleByDid(handle: string) {
        try {
            const res = await $agent.agent.api.com.atproto.repo.describeRepo(
                { repo: handle }
            );

            return res.data.handle;
        } catch(e) {
            console.log(e)
            return null;
        }
    }

    async function getLikes() {
      const res = await $agent.agent.api.app.bsky.feed.getLikes({uri: data.post.uri});
      likes = res.data;
    }

    function isUriLocal(uri: string) {
        try {
            return new URL(uri).hostname === 'bsky.app' || new URL(uri).hostname === 'staging.bsky.app';
        } catch (e) {
            console.log(e);
            return false;
        }
    }
</script>

<article class="timeline__item"
         class:timeline__item--repost={isReasonRepost(data.reason)}
         class:timeline__item--reply={data.reply && data.reply.parent.author.did !== $agent.did()}>
  <div class="timeline-repost-messages">
    {#if (isReasonRepost(data.reason))}
      <p class="timeline-repost-message"><a href="/profile/{data.reason.by.handle}">{$_('reposted_by', {values: {name: data.reason.by.displayName || data.reason.by.handle }})}</a></p>
    {/if}

    {#if (data.reply)}
      <p class="timeline-repost-message">
        <a href="/profile/{data.reply.parent.author.handle}">{$_('reply_to', {values: {name: data.reply.parent.author.displayName || data.reply.parent.author.handle }})}</a>

        {#if (data.reply.parent.author.did === $agent.did())}
          <span class="timeline-repost-message__you">{$_('you')}</span>
        {/if}
      </p>
    {/if}
  </div>

  {#if (data.post.author.did === $agent.did())}
    <button class="timeline__delete" on:click={() => {deletePost(data.post.uri)}}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30">
      <path id="trash" d="M70,3l3-3h6l3,3h6V6H64V3ZM65.5,9h21L85,30H67ZM73,12V27h1.5V12Zm4.5,0V27H79V12Z" transform="translate(-64)" fill="#d81c2f"/>
    </svg></button>
  {/if}

  <div class="timeline__column">
    <div class="timeline__image">
      <a href="/profile/{ data.post.author.handle }">
        {#if (data.post.author.avatar)}
          <img src="{ data.post.author.avatar }" alt="" loading="lazy">
        {/if}
      </a>
    </div>

    <div class="timeline__content">
      <div class="timeline__meta">
        <p class="timeline__user" title="{data.post.author.handle}">{ data.post.author.displayName || data.post.author.handle }</p>
        <p class="timeline__date"><time datetime="{format(parseISO(data.post.indexedAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}" title="{format(parseISO(data.post.indexedAt), 'yyyy-MM-dd HH:mm:ss')}">{formatDistanceToNow(parseISO(data.post.indexedAt), {locale: dateFnsLocale})}</time></p>
        <p class="timeline__thread-link">
          <a href="/profile/{data.post.author.handle}/post/{data.post.uri.split('/').slice(-1)[0]}">{$_('show_thread')}</a>
        </p>
      </div>

      <p class="timeline__text" dir="auto">
        {#each textArray as item}
          {#if (item.isLink() && item.link)}
            {#if (isUriLocal(item.link.uri))}
              <a href="{new URL(item.link.uri).pathname}">{item.text}</a>
            {:else}
              <a href="{item.link.uri}" target="_blank" rel="noopener nofollow noreferrer">{item.text}</a>
            {/if}
          {:else if (item.isMention() && item.mention)}
            {#await getHandleByDid(item.mention.did)}
              <span>{item.text}</span>
            {:then handle}
              {#if handle}
                <a href="/profile/{handle}">{item.text}</a>
              {:else}
                {item.text}
              {/if}
            {/await}
          {:else}
            <span>{item.text}</span>
          {/if}
        {/each}
      </p>

      <div class="timeline-reaction">
        <div class="timeline-reaction__item timeline-reaction__item--reply">
          <button class="timeline-reaction__icon" on:click={() => {$replyRef = { parent: data.post, root: (data.reply ? data.reply.root : data.post) }}} aria-label="返信"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="14" viewBox="0 0 15 14">
            <path id="reply" d="M77,110v-2.99s0-.006,0-.01a4,4,0,0,0-4-4H70v5l-6-6,6-6v5h3a6,6,0,0,1,6,6h0v3Z" transform="translate(-64 -96)" fill="var(--border-color-1)"/>
          </svg>
          </button>

          { data.post.replyCount }
        </div>

        <div class="timeline-reaction__item timeline-reaction__item--like">
          <button class="timeline-reaction__icon" disabled="{isLikeProcessed}" on:click="{() => vote(data.post.cid, data.post.uri)}" aria-label="いいね">
            {#if (myVoteCheck)}
              <svg xmlns="http://www.w3.org/2000/svg" width="15.78" height="14.101" viewBox="0 0 15.78 14.101">
                <path id="heart" d="M8,2.792l-.487-.479a4.388,4.388,0,0,0-6.206,6.2l0,0L8,15.206,14.7,8.5a4.388,4.388,0,0,0-6.21-6.2l0,0L8,2.792Z" transform="translate(-0.111 -1.105)" fill="var(--primary-color)"/>
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="15.78" height="14.101" viewBox="0 0 15.78 14.101">
                <path id="heart" d="M8,2.792l-.487-.479a4.388,4.388,0,0,0-6.206,6.2l0,0L8,15.206,14.7,8.5a4.388,4.388,0,0,0-6.21-6.2l0,0L8,2.792Z" transform="translate(-0.111 -1.105)" fill="var(--border-color-1)"/>
              </svg>
            {/if}
          </button>

          { data.post.likeCount }
        </div>

        <div class="timeline-reaction__item timeline-reaction__item--repost">
          <button class="timeline-reaction__icon" on:click="{() => repost(data.post.cid, data.post.uri)}" aria-label="リポスト">
            {#if (data.post.viewer?.repost)}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="12" viewBox="0 0 20 12">
            <path id="retweet" d="M13.333,17.667A.342.342,0,0,1,13,18H3c-.385,0-.333-.406-.333-.667v-6h-2A.671.671,0,0,1,0,10.667a.638.638,0,0,1,.156-.427l3.333-4a.683.683,0,0,1,1.021,0l3.333,4A.636.636,0,0,1,8,10.667a.671.671,0,0,1-.667.667h-2v4h6a.356.356,0,0,1,.261.115l1.667,2A.42.42,0,0,1,13.333,17.667ZM20,13.333a.638.638,0,0,1-.156.427l-3.333,4a.664.664,0,0,1-1.021,0l-3.333-4A.636.636,0,0,1,12,13.333a.671.671,0,0,1,.667-.667h2v-4h-6a.332.332,0,0,1-.261-.125l-1.667-2a.357.357,0,0,1-.073-.209A.342.342,0,0,1,7,6H17c.385,0,.333.406.333.667v6h2A.671.671,0,0,1,20,13.333Z" transform="translate(0 -6)" fill="var(--primary-color)"/></svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="12" viewBox="0 0 20 12">
                <path id="retweet" d="M13.333,17.667A.342.342,0,0,1,13,18H3c-.385,0-.333-.406-.333-.667v-6h-2A.671.671,0,0,1,0,10.667a.638.638,0,0,1,.156-.427l3.333-4a.683.683,0,0,1,1.021,0l3.333,4A.636.636,0,0,1,8,10.667a.671.671,0,0,1-.667.667h-2v4h6a.356.356,0,0,1,.261.115l1.667,2A.42.42,0,0,1,13.333,17.667ZM20,13.333a.638.638,0,0,1-.156.427l-3.333,4a.664.664,0,0,1-1.021,0l-3.333-4A.636.636,0,0,1,12,13.333a.671.671,0,0,1,.667-.667h2v-4h-6a.332.332,0,0,1-.261-.125l-1.667-2a.357.357,0,0,1-.073-.209A.342.342,0,0,1,7,6H17c.385,0,.333.406.333.667v6h2A.671.671,0,0,1,20,13.333Z" transform="translate(0 -6)" fill="var(--border-color-1)"/></svg>
            {/if}
          </button>

          { data.post.repostCount }
        </div>
      </div>

      {#if (AppBskyEmbedImages.isView(data.post.embed) && !isMedia)}
        <div class="timeline-images-wrap">
          <Images images={data.post.embed.images}></Images>
        </div>
      {/if}

      {#if (AppBskyEmbedExternal.isView(data.post.embed))}
        <div class="timeline-external">
            <div class="timeline-external__image">
              {#if (data.post.embed.external.thumb)}
                <img src="{data.post.embed.external.thumb}" alt="">
              {/if}
            </div>

          <div class="timeline-external__content">
            <p class="timeline-external__title"><a href="{data.post.embed.external.uri}" target="_blank" rel="noopener nofollow noreferrer">{data.post.embed.external.title}</a></p>
            <p class="timeline-external__description">{data.post.embed.external.description}</p>
            <p class="timeline-external__url">{data.post.embed.external.uri}</p>
          </div>
        </div>
      {/if}

      {#if (AppBskyEmbedRecord.isView(data.post.embed) && AppBskyEmbedRecord.isViewRecord(data.post.embed.record)) }
        <div class="timeline-external timeline-external--record">
          <div class="timeline-external__image timeline-external__image--round">
            {#if (data.post.embed.record.author.avatar)}
              <img src="{data.post.embed.record.author.avatar}" alt="">
            {/if}
          </div>

          <div class="timeline-external__content">
            <div class="timeline__meta">
              <p class="timeline__user" title="{data.post.embed.record.author.handle}">{ data.post.embed.record.author.displayName || data.post.embed.record.author.handle }</p>
              <p class="timeline__date"><time datetime="{format(parseISO(data.post.embed.record.indexedAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}" title="{format(parseISO(data.post.embed.record.indexedAt), 'yyyy-MM-dd HH:mm:ss')}">{formatDistanceToNow(parseISO(data.post.embed.record.indexedAt), {locale: dateFnsLocale})}</time></p>
              <p class="timeline__thread-link">
                <a href="/profile/{data.post.embed.record.author.handle}/post/{data.post.embed.record.uri.split('/').slice(-1)[0]}">{$_('show_thread')}</a>
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
              <path id="パス_3" data-name="パス 3" d="M-21.352-46.169H-9.525v6.82A26.369,26.369,0,0,1-16.777-20.7h-5.266A26.721,26.721,0,0,0-15.7-34.342h-5.655Zm16.273,0H6.662v6.82A26.079,26.079,0,0,1-.59-20.7H-5.77A25.477,25.477,0,0,0,.489-34.342H-5.079Z" transform="translate(22.043 46.169)" fill="var(--primary-color)"/>
            </svg>
            </span>
        </div>
      {/if}

      {#if (AppBskyEmbedRecordWithMedia.isView(data.post.embed) && AppBskyEmbedRecord.isViewRecord(data.post.embed.record.record)) }
        {#if (AppBskyEmbedImages.isView(data.post.embed.media))}
          <div class="timeline-images-wrap">
            <Images images={data.post.embed.media.images}></Images>
          </div>
        {/if}

        <div class="timeline-external timeline-external--record">
          <div class="timeline-external__image timeline-external__image--round">
            {#if (data.post.embed.record.record.author.avatar)}
              <img src="{data.post.embed.record.record.author.avatar}" alt="">
            {/if}
          </div>

          <div class="timeline-external__content">
            <div class="timeline__meta">
              <p class="timeline__user" title="{data.post.embed.record.record.author.handle}">{ data.post.embed.record.record.author.displayName || data.post.embed.record.record.author.handle }</p>
              <p class="timeline__date"><time datetime="{format(parseISO(data.post.embed.record.record.indexedAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}" title="{format(parseISO(data.post.embed.record.record.indexedAt), 'yyyy-MM-dd HH:mm:ss')}">{formatDistanceToNow(parseISO(data.post.embed.record.record.indexedAt), {locale: dateFnsLocale})}</time></p>
              <p class="timeline__thread-link">
                <a href="/profile/{data.post.embed.record.record.author.handle}/post/{data.post.embed.record.record.uri.split('/').slice(-1)[0]}">{$_('show_thread')}</a>
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
              <path id="パス_3" data-name="パス 3" d="M-21.352-46.169H-9.525v6.82A26.369,26.369,0,0,1-16.777-20.7h-5.266A26.721,26.721,0,0,0-15.7-34.342h-5.655Zm16.273,0H6.662v6.82A26.079,26.079,0,0,1-.59-20.7H-5.77A25.477,25.477,0,0,0,.489-34.342H-5.079Z" transform="translate(22.043 46.169)" fill="var(--primary-color)"/>
            </svg>
            </span>
        </div>
      {/if}

      {#if (isSingle && likes?.likes.length)}
        <div class="likes-wrap">
          <h3 class="likes-heading">いいねした人</h3>

          <div class="likes">
            {#each likes.likes as like }
              {#if (!like.actor.viewer?.muted)}
                <div class="likes__item">
                  <div class="likes__avatar">
                    {#if (like.actor.avatar)}
                      <img src="{ like.actor.avatar }" alt="">
                    {/if}
                  </div>

                  <p class="likes__text"><a href="/profile/{ like.actor.handle }">{ like.actor.displayName || like.actor.handle }</a></p>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <button class="timeline-menu-toggle timeline-menu-toggle--{data.post.cid}" on:click={menuOpen} aria-label="メニューを開く">
    <svg xmlns="http://www.w3.org/2000/svg" width="3" height="12" viewBox="0 0 3 12">
      <path id="dots-horizontal-triple" d="M9.5,9.5A1.5,1.5,0,1,1,11,8,1.5,1.5,0,0,1,9.5,9.5ZM9.5,5A1.5,1.5,0,1,1,11,3.5,1.5,1.5,0,0,1,9.5,5Zm0,9A1.5,1.5,0,1,1,11,12.5,1.5,1.5,0,0,1,9.5,14Z" transform="translate(-8 -2)" fill="var(--text-color-3)"/>
    </svg>
  </button>

  {#if isMenuOpen}
    <nav
        class="timeline-menu"
        class:timeline-menu--shown={isMenuOpen}
        use:clickOutside={{ignoreElement: '.timeline-menu-toggle--' + data.post.cid}}
        on:outclick={() => (isMenuOpen = false)}
        transition:fly="{{ y: 30, duration: 250 }}"
    >
      <ul class="timeline-menu-list">
        {#if (data.post.author.did === $agent.did())}
          <li class="timeline-menu-list__item timeline-menu-list__item--delete">
            <button class="timeline-menu-list__button" on:click={() => {deletePost(data.post.uri)}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15.2" height="19" viewBox="0 0 15.2 19">
                <path id="trash" d="M67.8,1.9,69.7,0h3.8l1.9,1.9h3.8V3.8H64V1.9ZM64.95,5.7h13.3L77.3,19H65.9ZM69.7,7.6v9.5h.95V7.6Zm2.85,0v9.5h.95V7.6Z" transform="translate(-64)" fill="var(--danger-color)"/>
              </svg>
              <span class="text-danger">{$_('delete_post')}</span>
            </button>
          </li>
        {/if}

        <li class="timeline-menu-list__item timeline-menu-list__item--quote">
          <button class="timeline-menu-list__button" on:click={() => {$quotePost = data.post}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18.16" height="16.112" viewBox="0 0 18.16 16.112">
              <path id="パス_4" data-name="パス 4" d="M-21.606-46.169h7.482v4.315a16.682,16.682,0,0,1-4.588,11.8h-3.332a16.9,16.9,0,0,0,4.014-8.629h-3.577Zm10.3,0h7.428v4.315a16.5,16.5,0,0,1-4.588,11.8h-3.277a16.118,16.118,0,0,0,3.96-8.629h-3.523Z" transform="translate(22.043 46.169)" fill="var(--primary-color)"/>
            </svg>
            {$_('quote_post')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--thread">
          <a href="/profile/{data.post.author.handle}/post/{data.post.uri.split('/').slice(-1)[0]}" class="timeline-menu-list__button">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
              <path id="conversation" d="M15.3,9.9v2.7L12.6,9.9H7.2A1.8,1.8,0,0,1,5.4,8.1h0V1.8A1.805,1.805,0,0,1,7.2,0h9A1.8,1.8,0,0,1,18,1.8h0V8.1a1.8,1.8,0,0,1-1.8,1.8h-.9Zm-2.7,1.8v1.8a1.8,1.8,0,0,1-1.8,1.8H5.4L2.7,18V15.3H1.8A1.8,1.8,0,0,1,0,13.5H0V7.2A1.805,1.805,0,0,1,1.8,5.4H3.6V8.1a3.6,3.6,0,0,0,3.6,3.6h5.4Z" fill="var(--primary-color)"/>
            </svg>
            {$_('show_thread')}
          </a>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--translate">
          <button class="timeline-menu-list__button" on:click={translation}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
              <path id="translate" d="M6.669,8.1l2.016,2.016-.747,1.8L5.4,9.36,2.43,12.33,1.17,11.052,4.122,8.1,3.33,7.308A5.387,5.387,0,0,1,2.16,5.4H4.14a2.533,2.533,0,0,0,.459.63l.8.81.792-.792A4.173,4.173,0,0,0,7.2,3.6H0V1.8H4.5V0H6.3V1.8h4.5V3.6H9A5.906,5.906,0,0,1,7.47,7.308L6.66,8.1Zm3.456,7.2L9,18H7.2L11.7,7.2h1.8L18,18H16.2l-1.125-2.7Zm.747-1.8h3.456L12.6,9.36Z" fill="var(--text-color-1)"/>
            </svg>
            {$_('translation')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--copy-url">
          <button class="timeline-menu-list__button" on:click={copyThreadUrl}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14.417" height="18" viewBox="0 0 14.417 18">
              <path id="clipboard" d="M6.532,2.345a2.7,2.7,0,0,1,5.352,0l1.829.36v.9h.9a1.8,1.8,0,0,1,1.8,1.8V16.221a1.8,1.8,0,0,1-1.8,1.8H3.8a1.8,1.8,0,0,1-1.8-1.8V5.409a1.807,1.807,0,0,1,1.8-1.8h.9v-.9l1.829-.36ZM4.7,5.409H3.8V16.221H14.615V5.409h-.9v.9H4.7Zm4.505-1.8a.9.9,0,1,0-.9-.9A.9.9,0,0,0,9.208,3.606Z" transform="translate(-2 -0.023)" fill="var(--text-color-3)"/>
            </svg>
            {$_('copy_url')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--copy-handle">
          <button class="timeline-menu-list__button" on:click={copyHandle}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18.001" viewBox="0 0 18 18.001">
              <path id="at-symbol" d="M12.24,12.124A4.5,4.5,0,1,1,11.7,5.4V4.5h1.8v5.85a1.35,1.35,0,1,0,2.7,0V9a7.2,7.2,0,1,0-3.978,6.444l.81,1.611A9,9,0,1,1,18,9h-.009v1.35a3.15,3.15,0,0,1-5.76,1.773ZM9,11.7A2.7,2.7,0,1,0,6.3,9,2.7,2.7,0,0,0,9,11.7Z" transform="translate(0 -0.009)" fill="var(--text-color-3)"/>
            </svg>
            {$_('copy_handle')}
          </button>
        </li>
      </ul>
    </nav>
  {/if}
</article>

<style lang="postcss">

</style>