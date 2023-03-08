<script>
    import { agent } from '$lib/stores';
    import { timeline, cursor, notificationCount } from "$lib/stores";
    import Reply from "./Reply.svelte";
    import {format, formatDistanceToNow, parseISO} from 'date-fns';
    import {afterUpdate, onMount} from "svelte";
    import ja from 'date-fns/locale/ja/index';
    import Images from "./Images.svelte";
    import {postRecordFormatter} from "$lib/postRecordFormatter";

    export let data = {};
    export let isPrivate = false;

    let votes = 0;
    let voteCount = 0;
    let isReplyOpen = false;
    let myVoteCheck = false;
    let uriId = '';
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

    function getUriId() {
        return encodeURIComponent(data.post.uri)
    }
    uriId = getUriId();

    function replyOpen() {
        isReplyOpen = isReplyOpen !== true;
    }
</script>

<article class="timeline__item">
  {#if (data.reason)}
    <p class="timeline-repost-message">{ data.reason.by.displayName } がリポスト</p>
  {/if}

  {#if (data.reply)}
    <p class="timeline-repost-message">{ data.reply.parent.author.displayName } に返信</p>
  {/if}

  <a class="timeline__conv" href="/thread/{uriId}" data-sveltekit-reload><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <path id="conversation" d="M25.5,16.5V21L21,16.5H12a3,3,0,0,1-3-3H9V3a3.009,3.009,0,0,1,3-3H27a3,3,0,0,1,3,3h0V13.5a3,3,0,0,1-3,3H25.5Zm-4.5,3v3a3,3,0,0,1-3,3H9L4.5,30V25.5H3a3,3,0,0,1-3-3H0V12A3.009,3.009,0,0,1,3,9H6v4.5a6,6,0,0,0,6,6h9Z" fill="#90BAF0"/>
  </svg>
  </a>

  <div class="timeline__column">
    <div class="timeline__image">
      <a href="/profile/{ data.post.author.handle }" data-sveltekit-reload>
        <img src="{ data.post.author.avatar }" alt="">
      </a>
    </div>

    <div class="timeline__content">
      <div class="timeline__meta">
        <p class="timeline__user" title="{data.post.author.handle}">{ data.post.author.displayName }</p>
        <p class="timeline__date"><time datetime="{format(parseISO(data.post.record.createdAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}" title="{format(parseISO(data.post.record.createdAt), 'yyyy-MM-dd HH:mm:ss')}">{formatDistanceToNow(parseISO(data.post.record.createdAt), {locale: ja})}</time></p>
      </div>

      <p class="timeline__text">
        {#each textArray as item}
          {#if (item.type === 'link')}
            <a href="{item.url}" target="_blank" rel="noopener nofollow noreferrer">{item.content}</a><br>
          {:else}
            {item.content}<br>
          {/if}
        {/each}
      </p>

      <div class="timeline-reaction">
        <div class="timeline-reaction__item timeline-reaction__item--reply">
          <button class="timeline-reaction__icon" on:click={replyOpen}><svg xmlns="http://www.w3.org/2000/svg" width="21.292" height="25.277" viewBox="0 0 21.292 25.277">
            <path id="reply" d="M10.9,17.974V23.73L2,14.831l8.9-8.9v5.882c10.353.242,9.909-7.04,7.273-11.815C24.677,7.032,23.3,18.3,10.9,17.974Z" transform="translate(-1.293 0.34)" fill="#fff" stroke="#bbb" stroke-width="1"/>
          </svg>
          </button>

          { data.post.replyCount }
        </div>

        <div class="timeline-reaction__item timeline-reaction__item--like">
          <button class="timeline-reaction__icon" on:click="{() => vote(data.post.cid, data.post.uri)}">
            {#await myVoteCheck}
            {:then found}
              {#if (found)}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="17.872" viewBox="0 0 20 17.872">
                  <path id="heart" d="M10.111,3.244l-.617-.607A5.562,5.562,0,0,0,1.629,10.5l0,0,8.484,8.484L18.6,10.483a5.562,5.562,0,0,0-7.87-7.855l0,0-.617.617Z" transform="translate(-0.111 -1.105)" fill="var(--color-theme-12)"/>
                </svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="21" height="19.08" viewBox="0 0 21 19.08">
                  <path id="heart" d="M10.111,3.244l-.617-.607A5.562,5.562,0,0,0,1.629,10.5l0,0,8.484,8.484L18.6,10.483a5.562,5.562,0,0,0-7.87-7.855l0,0-.617.617Z" transform="translate(0.389 -0.605)" fill="#fff" stroke="#bbb" stroke-width="1"/>
                </svg>
              {/if}
            {/await}
          </button>

          { data.post.upvoteCount }
        </div>

        <div class="timeline-reaction__item timeline-reaction__item--repost">
          <button class="timeline-reaction__icon" on:click="{() => repost(data.post.cid, data.post.uri)}"><svg xmlns="http://www.w3.org/2000/svg" width="21" height="13" viewBox="0 0 21 13">
            <path id="retweet" d="M13.333,17.667A.342.342,0,0,1,13,18H3c-.385,0-.333-.406-.333-.667v-6h-2A.671.671,0,0,1,0,10.667a.638.638,0,0,1,.156-.427l3.333-4a.683.683,0,0,1,1.021,0l3.333,4A.636.636,0,0,1,8,10.667a.671.671,0,0,1-.667.667h-2v4h6a.356.356,0,0,1,.261.115l1.667,2A.42.42,0,0,1,13.333,17.667ZM20,13.333a.638.638,0,0,1-.156.427l-3.333,4a.664.664,0,0,1-1.021,0l-3.333-4A.636.636,0,0,1,12,13.333a.671.671,0,0,1,.667-.667h2v-4h-6a.332.332,0,0,1-.261-.125l-1.667-2a.357.357,0,0,1-.073-.209A.342.342,0,0,1,7,6H17c.385,0,.333.406.333.667v6h2A.671.671,0,0,1,20,13.333Z" transform="translate(0.5 -5.5)" fill="#fff" stroke="#bbb" stroke-width="1"/>
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
            <p class="timeline-external__title"><a href="{data.post.embed.external.uri}" target="_blank" rel="noopener">{data.post.embed.external.title}</a></p>
            <p class="timeline-external__description">
              {data.post.embed.external.description}<br>
              {data.post.embed.external.uri}
            </p>
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
            <p class="timeline-external__title">{data.post.embed.record.author.displayName}</p>
            <p class="timeline-external__description">
              {data.post.embed.record.record.text}
            </p>
          </div>
        </div>
      {/if}

      {#if (isReplyOpen)}
        <Reply post={data.post} replyRef={data.reply || undefined}></Reply>
      {/if}
    </div>
  </div>
</article>

<style>
    .timeline__item {
        background-color: #FAFCFF;
        margin-bottom: 20px;
        padding: 10px 50px 10px 20px;
        position: relative;
    }

    .timeline-repost-message {
        font-weight: bold;
        margin-bottom: 5px;
    }

    .timeline-repost-message::before {
        content: '';
        display: block;
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background-color: var(--primary-color);
    }

    .timeline__date {
        color: var(--color-theme-you);
        font-size: 15px;
    }

    .timeline__meta {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 10px;
    }

    .timeline__image {
        border-radius: 30px;
        overflow: hidden;
    }

    .timeline__column {
        display: grid;
        grid-template-columns: 60px 1fr;
        align-items: flex-start;
        gap: 20px;
    }

    .timeline__conv {
        position: absolute;
        top: 10px;
        right: 10px;
    }

    .timeline__text {
        white-space: pre-wrap;
    }

    .timeline__image img {
        width: 100%;
        height: auto;
        vertical-align: middle;
    }

    .timeline-reaction {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 10px;
    }

    .timeline-reaction__item {
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .timeline-external {
        display: grid;
        grid-template-columns: 80px 1fr;
        gap: 10px;
        align-items: flex-start;
        background-color: #fff;
        padding: 10px;
        border: 1px solid #ccc;
        position: relative;
        margin-top: 10px;
    }

    .timeline-external--record {
        grid-template-columns: 60px 1fr;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='17.534' height='15.557' viewBox='0 0 17.534 15.557'%3E%3Cpath id='パス_3' data-name='パス 3' d='M-21.621-46.169H-14.4V-42a16.107,16.107,0,0,1-4.43,11.391h-3.217a16.322,16.322,0,0,0,3.876-8.332h-3.454Zm9.94,0h7.172V-42a15.93,15.93,0,0,1-4.43,11.391H-12.1a15.562,15.562,0,0,0,3.823-8.332h-3.4Z' transform='translate(22.043 46.169)' fill='%23c9c9c9'/%3E%3C/svg%3E%0A");
        background-position: right 10px top 10px;
    }

    .timeline-external__image {
        background-color: #fafafa;
        aspect-ratio: 1 / 1;
    }

    .timeline-external__image--round {
        display: flex;
        border-radius: 50%;
        overflow: hidden;
    }

    .timeline-external__title {
        margin-bottom: 5px;
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
        font-size: 14px;
    }

    .timeline-external img {
        width: 100%;
    }
</style>