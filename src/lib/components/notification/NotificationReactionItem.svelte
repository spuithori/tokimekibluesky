<script lang="ts">
    import {_} from "svelte-i18n";
    import {Heart, Repeat2} from "lucide-svelte";
    import Avatar from "../../../routes/(app)/Avatar.svelte";
    import ProfileCardWrapper from "../../../routes/(app)/ProfileCardWrapper.svelte";
    import {getReasonText, removeNotificationsDuplication} from "$lib/components/notification/notificationUtil";
    import {AppBskyEmbedImages} from "@atproto/api";
    import Images from "../../../routes/(app)/Images.svelte";
    import LikesModal from "$lib/components/thread/LikesModal.svelte";
    import RepostsModal from "$lib/components/thread/RepostsModal.svelte";

    export let item;
    export let _agent;
    let isLikesOpen = false;
    let isRepostsOpen = false;

    function handleClick() {
        if (item.reason === 'like') {
            isLikesOpen = true;
        }

        if (item.reason === 'repost') {
            isRepostsOpen = true;
        }
    }

    item.notifications = removeNotificationsDuplication(item.notifications);
</script>

<article class="notifications-item notifications-item--reaction notifications-item--{item.reason}">
    <div class="notification-column">
        <div class="notification-column__icons">
            {#if (item.reason === 'repost')}
                <button class="notification-icon notification-icon--repost" on:click={handleClick}>
                    <Repeat2 color="var(--bg-color-1)" size="18"></Repeat2>
                </button>

            {/if}

            {#if (item.reason === 'like')}
                <button class="notification-icon notification-icon--like" on:click={handleClick}>
                    <Heart color="var(--bg-color-1)" size="18"></Heart>
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
                    <p><a href="{'/profile/' + item.feed.author.handle + '/post/' + item.feed.uri.split('/').slice(-1)[0]}">{item.feed.record.text}</a></p>

                    {#if (AppBskyEmbedImages.isView(item.feed?.embed) && item.feed?.embed)}
                        <div class="notifications-item-images">
                            <Images images={item.feed.embed.images} blobs={item.feed.record.embed.images} {_agent} did={item.feed.author.did} folding={true}></Images>
                        </div>
                    {/if}
                </div>
            {:else}
                <p class="notifications-item__content"></p>
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