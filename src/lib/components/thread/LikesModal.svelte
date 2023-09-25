<script>
    import {_} from "svelte-i18n";
    import { fly } from 'svelte/transition';
    import {createEventDispatcher, onMount} from 'svelte';
    import { agent } from "$lib/stores";
    const dispatch = createEventDispatcher();
    import InfiniteLoading from 'svelte-infinite-loading';
    import UserItem from "../../../routes/(app)/profile/[handle]/UserItem.svelte";

    export let uri;
    let el;
    let likes = [];
    let cursor;

    async function getLikes() {
        const res = await $agent.agent.api.app.bsky.feed.getLikes({uri: uri});
        return res.data.likes;
    }

    async function handleLoadMore({ detail: { loaded, complete } }) {
        const res = await $agent.agent.api.app.bsky.feed.getLikes({uri: uri, cursor: cursor});
        cursor = res.data.cursor;
        console.log(cursor)

        if (cursor) {
            likes = [...likes, ...res.data.likes];


            loaded();
        } else {
            complete();
        }
    }

    function close() {
        el.close();
        dispatch('close');
    }

    onMount(() => {
        el.showModal();
    })
</script>

<dialog class="likes-modal" transition:fly="{{ y: 30, duration: 250 }}" bind:this={el} on:close={close}>
  <div class="likes-modal-contents">
    <h2 class="likes-modal-title">{$_('liked_users')}</h2>

    <div class="likes">
      {#each likes as like }
        {#if (!like.actor.viewer?.muted)}
          <UserItem user={like.actor}></UserItem>
        {/if}
      {/each}
    </div>

    <InfiniteLoading on:infinite={handleLoadMore}>
      <p slot="noMore" class="infinite-nomore">もうないよ</p>
    </InfiniteLoading>

    <div class="likes-modal-close">
      <button class="button button--sm" on:click={close}>{$_('close_button')}</button>
    </div>
  </div>

  <button class="modal-background-close" aria-hidden="true" on:click={close}></button>
</dialog>

<style lang="postcss">
    .likes-modal {
        border: none;
        background-color: transparent;
        margin: auto;

        &::backdrop {
            background-color: rgba(0, 0, 0, .6);
        }
    }

    .likes-modal-contents {
        padding: 30px;
        border-radius: 10px;
        background-color: var(--bg-color-1);
        width: 740px;
        max-width: 100%;
        position: relative;
        z-index: 2;
        cursor: default;

        @media (max-width: 767px) {
            width: 100%;
        }
    }

    .likes-modal-close {
        text-align: center;
        margin-top: 30px;
    }

    .likes-modal-title {
        font-weight: 900;
        font-size: 20px;
        line-height: 1.5;
        margin-bottom: 10px;
    }
</style>