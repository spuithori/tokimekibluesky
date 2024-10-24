<script lang="ts">
    import { preventDefault } from 'svelte/legacy';
    import {_} from "svelte-i18n";
    import {Heart, Repeat2, Star} from "lucide-svelte";
    import Avatar from "../../../routes/(app)/Avatar.svelte";
    import ProfileCardWrapper from "../../../routes/(app)/ProfileCardWrapper.svelte";
    import {getReasonText, removeNotificationsDuplication} from "$lib/components/notification/notificationUtil";
    import {AppBskyEmbedImages} from "@atproto/api";
    import Images from "../../../routes/(app)/Images.svelte";
    import LikesModal from "$lib/components/thread/LikesModal.svelte";
    import RepostsModal from "$lib/components/thread/RepostsModal.svelte";
    import {didHint, settings} from "$lib/stores";
    import FeedEmbed from "$lib/components/feeds/FeedEmbed.svelte";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import {goto} from "$app/navigation";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    let { item = $bindable(), _agent } = $props();

    const junkColumnState = getColumnState(true);

    let isLikesOpen = $state(false);
    let isRepostsOpen = $state(false);

    function handleClick() {
        if (item.reason === 'like') {
            isLikesOpen = true;
        }

        if (item.reason === 'repost') {
            isRepostsOpen = true;
        }
    }

    function handlePostClick() {
        const rkey = item.feed.uri.split('/').slice(-1)[0];
        const uri = '/profile/' + item.feed.author.handle + '/post/' + rkey;

        if (uri === location.pathname) {
            return false;
        }

        if (!junkColumnState.hasColumn('thread_' + rkey)) {
            junkColumnState.add({
                id: 'thread_' + rkey,
                algorithm: {
                    algorithm: 'at://' + item.feed.author.did + '/app.bsky.feed.post/' + rkey,
                    type: 'thread',
                    name: 'Thread',
                },
                style: 'default',
                settings: defaultDeckSettings,
                did: _agent.did(),
                handle: _agent.handle(),
                data: {
                    feed: [{
                        post: item.feed,
                    }],
                    cursor: '',
                }
            });
        }

        didHint.set(item.feed.author.did);
        goto(uri);
    }

    item.notifications = removeNotificationsDuplication(item.notifications);
</script>

<article class="notifications-item notifications-item--reaction notifications-item--{item.reason}">
    <div class="notification-column">
        <div class="notification-column__icons">
            {#if (item.reason === 'repost')}
                <button class="notification-icon notification-icon--repost" onclick={handleClick}>
                    <Repeat2 color="var(--bg-color-1)" size="18"></Repeat2>
                </button>

            {/if}

            {#if (item.reason === 'like')}
                <button class="notification-icon notification-icon--like" onclick={handleClick}>
                    {#if ($settings?.design?.reactionMode === 'superstar')}
                        <Star color="var(--bg-color-1)" size="18"></Star>
                    {:else}
                        <Heart color="var(--bg-color-1)" size="18"></Heart>
                    {/if}
                </button>
            {/if}
        </div>

        <div class="notification-column__content">
            <div class="notification-authors">
                {#each item.notifications as notification (notification)}
                    <div class="notification-author">
                        <Avatar href="/profile/{ notification.author.handle }" avatar={notification.author.avatar}
                                handle={notification.author.handle} {_agent}></Avatar>
                    </div>
                {/each}
            </div>

            <h2 class="notifications-item__title">
                <span class="notifications-item__name">
                  <ProfileCardWrapper handle="{item.notifications[0].author.handle}" {_agent}>
                    <a class="notifications-item__link" href="/profile/{item.notifications[0].author.handle}">{item.notifications[0].author.displayName || item.notifications[0].author.handle}</a>
                  </ProfileCardWrapper>
                </span> {$_(getReasonText(item.notifications.length === 1 ? item.reason : item.reason + '_multiple'))}
            </h2>

            {#if (item.feed)}
                <div class="notifications-item__content">
                    <p><a href="{'/profile/' + item.feed.author.handle + '/post/' + item.feed.uri.split('/').slice(-1)[0]}" onclick={preventDefault(handlePostClick)}>{item.feed.record.text}</a></p>

                    {#if (AppBskyEmbedImages.isView(item.feed?.embed) && item.feed?.embed)}
                        <div class="notifications-item-images">
                            <Images images={item.feed.embed.images} blobs={item.feed.record.embed.images} did={item.feed.author.did} folding={true}></Images>
                        </div>
                    {/if}
                </div>
            {:else}
                {#if item.notifications[0].reasonSubject.includes('app.bsky.feed.generator')}
                    <div class="notification-item__feed">
                        <FeedEmbed {_agent} feedUri={item.notifications[0].reasonSubject}></FeedEmbed>
                    </div>
                {/if}
            {/if}
        </div>
    </div>
</article>

{#if isLikesOpen}
    <LikesModal uri={item.feed.uri} on:close={() => {isLikesOpen = false}}></LikesModal>
{/if}

{#if isRepostsOpen}
    <RepostsModal uri={item.feed.uri} on:close={() => {isRepostsOpen = false}}></RepostsModal>
{/if}

<style lang="postcss">
    .notification-authors {
        display: grid;
        grid-template-columns: repeat(auto-fill, 30px);
        gap: 4px;
        margin-bottom: 8px;
    }

    .notification-icon {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: grid;
        place-content: center;
        transition: opacity .25s ease-in-out;

        &:hover {
            opacity: .8;
        }

        &--repost {
            background-color: var(--timeline-reaction-reposted-icon-color);
        }

        &--like {
            background-color: var(--timeline-reaction-liked-icon-color);
            padding-top: 1px;
        }
    }

    .notifications-item-images {
        margin-top: 8px;
    }
</style>