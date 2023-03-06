<script>
    import { agent } from '$lib/stores';
    import { timeline } from "$lib/stores";
    import Reply from "./Reply.svelte";
    import { format, parseISO } from 'date-fns';
    import {onMount} from "svelte";

    export let data = {};
    export let index;

    let votes = 0;
    let voteCount = data.post.upvoteCount
    let isReplyOpen = false;
    let myVoteCheck = false;

    onMount(async () => {
        async function test () {
            return await $agent.myVoteCheck(data.post.uri) !== undefined;
        }
        myVoteCheck = await test();
    })

    async function vote(cid, uri) {
        myVoteCheck = !myVoteCheck
        await $agent.setVote(cid, uri);

        [myVoteCheck, votes] = await Promise.all([
            $agent.myVoteCheck(uri),
            $agent.getVotes(uri)
        ])
        voteCount = votes.length
    }

    async function repost(cid, uri) {
        await $agent.setRepost(cid, uri);

        timeline.set(await $agent.getTimeline());
    }

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

  <div class="timeline__column">
    <div class="timeline__image">
      <a href="/profile/{ data.post.author.handle }" data-sveltekit-reload>
        <img src="{ data.post.author.avatar }" alt="">
      </a>
    </div>

    <div class="timeline__content">
      <div class="timeline__meta">
        <p class="timeline__user">{ data.post.author.displayName }</p>
        <p class="timeline__date">{format(parseISO(data.post.record.createdAt), 'yyyy.MM.dd HH:mm:ss')}</p>
      </div>

      <p>{ data.post.record.text }</p>

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
            {#if (myVoteCheck)}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="17.872" viewBox="0 0 20 17.872">
                <path id="heart" d="M10.111,3.244l-.617-.607A5.562,5.562,0,0,0,1.629,10.5l0,0,8.484,8.484L18.6,10.483a5.562,5.562,0,0,0-7.87-7.855l0,0-.617.617Z" transform="translate(-0.111 -1.105)" fill="#1172f0"/>
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="21" height="19.08" viewBox="0 0 21 19.08">
                <path id="heart" d="M10.111,3.244l-.617-.607A5.562,5.562,0,0,0,1.629,10.5l0,0,8.484,8.484L18.6,10.483a5.562,5.562,0,0,0-7.87-7.855l0,0-.617.617Z" transform="translate(0.389 -0.605)" fill="#fff" stroke="#bbb" stroke-width="1"/>
              </svg>
            {/if}
          </button>

          { voteCount }
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

        <div class="timeline-image">
          {#each data.post.embed.images as image}
            <div class="timeline-image__item">
              <img src="{image.fullsize}" alt="" loading="lazy">
            </div>
          {/each}
        </div>

      {/if}

      {#if (isReplyOpen)}
        <Reply post={data.post} replyRef={data.reply}></Reply>
      {/if}
    </div>
  </div>
</article>

<style>
    .timeline__item {
        border: 1px solid #aaa;
        background-color: #fff;
        margin-bottom: 20px;
        padding: 10px;
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
        background-color: #4075a6;
    }

    .timeline__date {
        color: #666;
    }

    .timeline__meta {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 15px;
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
</style>