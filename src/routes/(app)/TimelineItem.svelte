<script>
    import { agent } from '$lib/stores';
    import { timeline, cursor, notificationCount } from "$lib/stores";
    import Reply from './Reply.svelte';
    import {format, formatDistanceToNow, parseISO} from 'date-fns';
    import {afterUpdate, onMount} from "svelte";
    import ja from 'date-fns/locale/ja/index';
    import Images from "./Images.svelte";
    import {postRecordFormatter} from '$lib/postRecordFormatter';
    import { clickOutside } from '$lib/clickOutSide';
    import { fade, fly } from 'svelte/transition';

    export let data = {};
    export let isPrivate = false;

    let votes = 0;
    let voteCount = 0;
    let isReplyOpen = false;
    let isMenuOpen = false;
    let myVoteCheck = false;
    let textArray = [];

    onMount(async () => {
        async function test () {
            return await $agent.myVoteCheck(data.post.uri) !== undefined;
        }
        myVoteCheck = await test();
    })

    afterUpdate(async() => {
        textArray = postRecordFormatter(data.post.record);
    })

    async function vote(cid, uri) {
        myVoteCheck = !myVoteCheck
        await $agent.setVote(cid, uri);

        [myVoteCheck, votes] = await Promise.all([
            $agent.myVoteCheck(uri),
            $agent.getVotes(uri)
        ])
        voteCount = votes.length
        data.post.upvoteCount = votes.length
    }

    async function repost(cid, uri) {
        await $agent.setRepost(cid, uri);

        if (!isPrivate) {
            const data = await $agent.getTimeline();
            timeline.set(data.feed);
            cursor.set(data.cursor);
        }

        notificationCount.set(await $agent.getNotificationCount());
    }

    function replyOpen() {
        isReplyOpen = isReplyOpen !== true;
    }

    function menuOpen() {
        isMenuOpen = isMenuOpen !== true;
    }

    async function deletePost (uri) {
        const rkey = uri.split('/').slice(-1)[0]
        await $agent.agent.api.app.bsky.feed.post.delete(
            { did: $agent.did(), rkey: rkey }
        );

        if (!isPrivate) {
            const data = await $agent.getTimeline();
            timeline.set(data.feed);
            cursor.set(data.cursor);
        }
    }
</script>

<article class="timeline__item">
  <div class="timeline-repost-messages">
    {#if (data.reason)}
      <p class="timeline-repost-message">{ data.reason.by.displayName || data.reason.by.handle } がリポスト</p>
    {/if}

    {#if (data.reply)}
      <p class="timeline-repost-message">{ data.reply.parent.author.displayName || data.reply.parent.author.handle } に返信</p>
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
          <img src="{ data.post.author.avatar }" alt="">
        {/if}
      </a>
    </div>

    <div class="timeline__content">
      <div class="timeline__meta">
        <p class="timeline__user" title="{data.post.author.handle}">{ data.post.author.displayName || data.post.author.handle }</p>
        <p class="timeline__date"><time datetime="{format(parseISO(data.post.record.createdAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}" title="{format(parseISO(data.post.record.createdAt), 'yyyy-MM-dd HH:mm:ss')}">{formatDistanceToNow(parseISO(data.post.record.createdAt), {locale: ja})}</time></p>
        <p class="timeline__thread-link">
          <a href="/profile/{data.post.author.handle}/post/{data.post.uri.split('/').slice(-1)[0]}">スレッドを見る</a>
        </p>
      </div>

      <p class="timeline__text">
        {#each textArray as item}
          {#if (item.type === 'link')}
            <a href="{item.url}" target="_blank" rel="noopener nofollow noreferrer">{item.content}</a>
          {:else}
            <span>{item.content}</span>
          {/if}
        {/each}
      </p>

      <div class="timeline-reaction">
        <div class="timeline-reaction__item timeline-reaction__item--reply">
          <button class="timeline-reaction__icon" on:click={replyOpen}><svg xmlns="http://www.w3.org/2000/svg" width="15" height="14" viewBox="0 0 15 14">
            <path id="reply" d="M77,110v-2.99s0-.006,0-.01a4,4,0,0,0-4-4H70v5l-6-6,6-6v5h3a6,6,0,0,1,6,6h0v3Z" transform="translate(-64 -96)" fill="var(--border-color-1)"/>
          </svg>
          </button>

          { data.post.replyCount }
        </div>

        <div class="timeline-reaction__item timeline-reaction__item--like">
          <button class="timeline-reaction__icon" on:click="{() => vote(data.post.cid, data.post.uri)}">
            {#await myVoteCheck}
            {:then found}
              {#if (found)}
                <svg xmlns="http://www.w3.org/2000/svg" width="15.78" height="14.101" viewBox="0 0 15.78 14.101">
                  <path id="heart" d="M8,2.792l-.487-.479a4.388,4.388,0,0,0-6.206,6.2l0,0L8,15.206,14.7,8.5a4.388,4.388,0,0,0-6.21-6.2l0,0L8,2.792Z" transform="translate(-0.111 -1.105)" fill="var(--primary-color)"/>
                </svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="15.78" height="14.101" viewBox="0 0 15.78 14.101">
                  <path id="heart" d="M8,2.792l-.487-.479a4.388,4.388,0,0,0-6.206,6.2l0,0L8,15.206,14.7,8.5a4.388,4.388,0,0,0-6.21-6.2l0,0L8,2.792Z" transform="translate(-0.111 -1.105)" fill="var(--border-color-1)"/>
                </svg>
              {/if}
            {/await}
          </button>

          { data.post.upvoteCount }
        </div>

        <div class="timeline-reaction__item timeline-reaction__item--repost">
          <button class="timeline-reaction__icon" on:click="{() => repost(data.post.cid, data.post.uri)}"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="12" viewBox="0 0 20 12">
            <path id="retweet" d="M13.333,17.667A.342.342,0,0,1,13,18H3c-.385,0-.333-.406-.333-.667v-6h-2A.671.671,0,0,1,0,10.667a.638.638,0,0,1,.156-.427l3.333-4a.683.683,0,0,1,1.021,0l3.333,4A.636.636,0,0,1,8,10.667a.671.671,0,0,1-.667.667h-2v4h6a.356.356,0,0,1,.261.115l1.667,2A.42.42,0,0,1,13.333,17.667ZM20,13.333a.638.638,0,0,1-.156.427l-3.333,4a.664.664,0,0,1-1.021,0l-3.333-4A.636.636,0,0,1,12,13.333a.671.671,0,0,1,.667-.667h2v-4h-6a.332.332,0,0,1-.261-.125l-1.667-2a.357.357,0,0,1-.073-.209A.342.342,0,0,1,7,6H17c.385,0,.333.406.333.667v6h2A.671.671,0,0,1,20,13.333Z" transform="translate(0 -6)" fill="var(--border-color-1)"/>
          </svg>
          </button>

          { data.post.repostCount }
        </div>
      </div>

      {#if (typeof data.post.embed !== 'undefined' && typeof data.post.embed.images !== 'undefined')}
        <div class="timeline-images-wrap">
          <Images images={data.post.embed.images}></Images>
        </div>
      {/if}

      {#if (typeof data.post.embed !== 'undefined' && typeof data.post.embed.external !== 'undefined')}
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

      {#if (typeof data.post.embed !== 'undefined' && typeof data.post.embed.record !== 'undefined')}
        <div class="timeline-external timeline-external--record">
          <div class="timeline-external__image timeline-external__image--round">
            {#if (data.post.embed.record.author.avatar)}
              <img src="{data.post.embed.record.author.avatar}" alt="">
            {/if}
          </div>

          <div class="timeline-external__content">
            <div class="timeline__meta">
              <p class="timeline__user" title="{data.post.embed.record.author.handle}">{ data.post.embed.record.author.displayName || data.post.embed.record.author.handle }</p>
              <p class="timeline__date"><time datetime="{format(parseISO(data.post.embed.record.record.createdAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}" title="{format(parseISO(data.post.embed.record.record.createdAt), 'yyyy-MM-dd HH:mm:ss')}">{formatDistanceToNow(parseISO(data.post.embed.record.record.createdAt), {locale: ja})}</time></p>
              <p class="timeline__thread-link">
                <a href="/profile/{data.post.embed.record.author.handle}/post/{data.post.embed.record.uri.split('/').slice(-1)[0]}">スレッドを見る</a>
              </p>
            </div>

            <p class="timeline-external__description">
              {data.post.embed.record.record.text}
            </p>
          </div>

          <span class="timeline-external__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28.705" height="25.467" viewBox="0 0 28.705 25.467">
              <path id="パス_3" data-name="パス 3" d="M-21.352-46.169H-9.525v6.82A26.369,26.369,0,0,1-16.777-20.7h-5.266A26.721,26.721,0,0,0-15.7-34.342h-5.655Zm16.273,0H6.662v6.82A26.079,26.079,0,0,1-.59-20.7H-5.77A25.477,25.477,0,0,0,.489-34.342H-5.079Z" transform="translate(22.043 46.169)" fill="var(--primary-color)"/>
            </svg>
            </span>
        </div>
      {/if}

      {#if (isReplyOpen)}
        <Reply post={data.post} replyRef={data.reply || undefined}></Reply>
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
              <span class="text-danger">ポストを削除</span>
            </button>
          </li>
        {/if}

        <li class="timeline-menu-list__item timeline-menu-list__item--quote">
          <button class="timeline-menu-list__button">
            <svg xmlns="http://www.w3.org/2000/svg" width="18.16" height="16.112" viewBox="0 0 18.16 16.112">
              <path id="パス_4" data-name="パス 4" d="M-21.606-46.169h7.482v4.315a16.682,16.682,0,0,1-4.588,11.8h-3.332a16.9,16.9,0,0,0,4.014-8.629h-3.577Zm10.3,0h7.428v4.315a16.5,16.5,0,0,1-4.588,11.8h-3.277a16.118,16.118,0,0,0,3.96-8.629h-3.523Z" transform="translate(22.043 46.169)" fill="var(--primary-color)"/>
            </svg>
            工事中
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--thread">
          <a href="/profile/{data.post.author.handle}/post/{data.post.uri.split('/').slice(-1)[0]}" class="timeline-menu-list__button">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
              <path id="conversation" d="M15.3,9.9v2.7L12.6,9.9H7.2A1.8,1.8,0,0,1,5.4,8.1h0V1.8A1.805,1.805,0,0,1,7.2,0h9A1.8,1.8,0,0,1,18,1.8h0V8.1a1.8,1.8,0,0,1-1.8,1.8h-.9Zm-2.7,1.8v1.8a1.8,1.8,0,0,1-1.8,1.8H5.4L2.7,18V15.3H1.8A1.8,1.8,0,0,1,0,13.5H0V7.2A1.805,1.805,0,0,1,1.8,5.4H3.6V8.1a3.6,3.6,0,0,0,3.6,3.6h5.4Z" fill="var(--primary-color)"/>
            </svg>
            スレッドを見る
          </a>
        </li>
      </ul>
    </nav>
  {/if}
</article>

<style lang="postcss">
    .timeline__item {
        padding: 20px 0;
        border-bottom: 1px solid var(--border-color-1);
        position: relative;
    }

    .timeline-repost-message {
        font-weight: 600;
        font-size: 14px;
        letter-spacing: .025em;
        line-height: 1.5;
        margin-left: 12px;
    }

    .timeline-repost-message:last-child {
        margin-bottom: 15px;
    }

    .timeline-repost-message::before {
        content: '';
        display: block;
        position: absolute;
        left: -20px;
        top: 20px;
        bottom: 20px;
        width: 4px;
        background-color: var(--primary-color);
    }

    .timeline__date {
        color: var(--text-color-3);
        letter-spacing: .05em;
    }

    .timeline__thread-link {
        letter-spacing: .05em;

        @media (max-width: 767px) {
           display: none;
        }
    }

    .timeline__date::before,
    .timeline__date::after {
        content: '・';
    }

    .timeline__date::after {
        @media (max-width: 767px) {
            content: none;
        }
    }

    .timeline__meta {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        font-size: 14px;
        margin-bottom: 6px;
        margin-top: 6px;
    }

    .timeline__user {
        font-weight: 600;
        letter-spacing: .025em;
    }

    .timeline__image {
        background-color: var(--primary-color);
        aspect-ratio: 1 / 1;
        border-radius: 50%;
        overflow: hidden;
        position: relative;
    }

    .timeline__image a::before {
        content: '';
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 30px;
    }

    .timeline__column {
        display: grid;
        grid-template-columns: 60px 1fr;
        align-items: flex-start;
        gap: 15px;

        @media (max-width: 767px) {
            grid-template-columns: 50px 1fr;
        }
    }

    .timeline__text {
        white-space: pre-wrap;
        line-height: 1.75;
    }

    .timeline__image img {
        width: 100%;
        height: auto;
        vertical-align: middle;
    }

    .timeline__delete {
        position: absolute;
        top: 50px;
        right: 10px;
        display: none;
    }

    .timeline-reaction {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-top: 16px;
        color: var(--text-color-3);
    }

    .timeline-reaction__item {
        display: flex;
        align-items: center;
        padding: 0 13px;
        gap: 6px;
        min-width: 70px;
        height: 28px;
        position: relative;
        border: 1px solid var(--border-color-1);
        border-radius: 14px;
        font-size: 14px;
        transition: background-color .2s ease-in-out;

        &:hover {
            background-color: var(--border-color-1);
            color: var(--bg-color-1);

            path {
                fill: var(--bg-color-1);
            }
        }
    }

    .timeline-reaction__icon::before {
        content: '';
        display: block;
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
    }

    .timeline-external {
        display: grid;
        grid-template-columns: 78px 1fr;
        gap: 10px;
        align-items: flex-start;
        background-color: var(--bg-color-1);
        padding: 10px 10px 15px;
        position: relative;
        margin-top: 20px;
        box-shadow: 0 0 14px rgba(0, 0, 0, .12);
        border-radius: 6px;
        font-size: 14px;

        @media (max-width: 767px) {
            grid-template-columns: 50px 1fr;
        }
    }

    .timeline-external--record {
        grid-template-columns: 60px 1fr;

        @media (max-width: 767px) {
            grid-template-columns: 40px 1fr;
        }
    }

    .timeline-external__image {
        background-color: var(--border-color-1);
        border-radius: 4px;
        overflow: hidden;
        aspect-ratio: 1 / 1;
    }

    .timeline-external__image--round {
        display: flex;
        border-radius: 50%;
        overflow: hidden;
    }

    .timeline-external__title {
        margin-bottom: 8px;
    }

    .timeline-external__icon {
        position: absolute;
        right: 24px;
        top: -11px;
    }

    .timeline-external__title a::before {
        content: '';
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
    }

    .timeline-external__description {
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--text-color-3);
    }

    .timeline-external__url {
        color: var(--text-color-3);
    }

    .timeline-external img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .timeline-images-wrap {
        margin-top: 20px;
    }

    .timeline-menu-toggle {
        position: absolute;
        right: 5px;
        top: 20px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background-color: var(--bg-color-2);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color .2s ease-in-out;

        @media (max-width: 767px) {
            top: 10px;
        }

        &:hover {
            background-color: var(--border-color-1);
        }
    }

    .timeline-menu {
        position: absolute;
        right: 5px;
        top: 60px;
        padding: 15px 10px 18px;
        box-shadow: 0 3px 6px rgba(0, 0, 0, .16);
        border-radius: 6px;
        width: max-content;
        background-color: var(--bg-color-1);
        z-index: 1;
        visibility: hidden;
        opacity: 0;
        transition: all .2s ease-in-out;

        @media (max-width: 767px) {

        }

        &--shown {
            opacity: 1;
            visibility: visible;
        }
    }

    .timeline-menu-list {
        list-style: none;

        &__item {
            border-bottom: 1px solid var(--border-color-1);
            display: flex;
        }

        &__button {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            padding: 10px;
            margin: 0 -10px;
            flex: 1;
            text-decoration: none;
            color: inherit;

            &:hover {
                background-color: var(--bg-color-2);
            }
        }
    }
</style>