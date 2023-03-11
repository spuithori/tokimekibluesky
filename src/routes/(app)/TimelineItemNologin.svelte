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
    export let profile;
    export let handle;
    export let isPrivate = false;

    let votes = 0;
    let isMenuOpen = false;
    let textArray = [];

    afterUpdate(async() => {
        textArray = postRecordFormatter(data.value);
    })

    function menuOpen() {
        isMenuOpen = isMenuOpen !== true;
    }

    console.log(data)
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

  <div class="timeline__column">
    <div class="timeline__image">

    </div>

    <div class="timeline__content">
      <div class="timeline__meta">
        <p class="timeline__user">{ profile.value.displayName }</p>
        <p class="timeline__date"><time datetime="{format(parseISO(data.value.createdAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}" title="{format(parseISO(data.value.createdAt), 'yyyy-MM-dd HH:mm:ss')}">{formatDistanceToNow(parseISO(data.value.createdAt), {locale: ja})}</time></p>
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

      {#if (typeof data.value.embed !== 'undefined' && typeof data.value.embed.images !== 'undefined')}
        <div class="timeline-images-wrap">
          <Images images={data.value.embed.images}></Images>
        </div>
      {/if}

      {#if (typeof data.value.embed !== 'undefined' && typeof data.value.embed.external !== 'undefined')}
        <div class="timeline-external">
          <div class="timeline-external__image">
            {#if (data.value.embed.external.thumb)}
              <img src="{data.value.embed.external.thumb}" alt="">
            {/if}
          </div>

          <div class="timeline-external__content">
            <p class="timeline-external__title"><a href="{data.value.embed.external.uri}" target="_blank" rel="noopener nofollow noreferrer">{data.value.embed.external.title}</a></p>
            <p class="timeline-external__description">{data.value.embed.external.description}</p>
            <p class="timeline-external__url">{data.value.embed.external.uri}</p>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <button class="timeline-menu-toggle timeline-menu-toggle--{data.cid}" on:click={menuOpen} aria-label="メニューを開く">
    <svg xmlns="http://www.w3.org/2000/svg" width="3" height="12" viewBox="0 0 3 12">
      <path id="dots-horizontal-triple" d="M9.5,9.5A1.5,1.5,0,1,1,11,8,1.5,1.5,0,0,1,9.5,9.5ZM9.5,5A1.5,1.5,0,1,1,11,3.5,1.5,1.5,0,0,1,9.5,5Zm0,9A1.5,1.5,0,1,1,11,12.5,1.5,1.5,0,0,1,9.5,14Z" transform="translate(-8 -2)" fill="var(--text-color-3)"/>
    </svg>
  </button>

  {#if isMenuOpen}
    <nav
        class="timeline-menu"
        class:timeline-menu--shown={isMenuOpen}
        use:clickOutside={{ignoreElement: '.timeline-menu-toggle--' + data.cid}}
        on:outclick={() => (isMenuOpen = false)}
        transition:fly="{{ y: 30, duration: 250 }}"
    >
      <ul class="timeline-menu-list">
        <li class="timeline-menu-list__item timeline-menu-list__item--thread">
          <a href="/profile/{handle}/post/{data.uri.split('/').slice(-1)[0]}" class="timeline-menu-list__button">
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