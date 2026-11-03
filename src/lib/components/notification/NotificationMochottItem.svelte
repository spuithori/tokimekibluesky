<script lang="ts">
    import {_} from "tokimeki-i18n";
    import Heart from '@lucide/svelte/icons/heart';
    import Star from '@lucide/svelte/icons/star';
    import Reply from '@lucide/svelte/icons/reply';
    import UserPlus2 from '@lucide/svelte/icons/user-plus-2';
    import Pencil from '@lucide/svelte/icons/pencil';
    import ChevronUp from '@lucide/svelte/icons/chevron-up';
    import ChevronDown from '@lucide/svelte/icons/chevron-down';
    import Avatar from "../../../routes/(app)/Avatar.svelte";
    import ProfileCardWrapper from "../../../routes/(app)/ProfileCardWrapper.svelte";
    import {getReasonText} from "$lib/components/notification/notificationUtil";
    import {profileHintState} from "$lib/classes/profileHintState.svelte";
    import {settings} from "$lib/stores";
    import type {NotificationGroup} from "$lib/components/notification/notificationPipeline";

    interface Props {
        item: NotificationGroup;
        _agent: any;
        showMark?: boolean;
    }

    let { item, _agent, showMark = false }: Props = $props();

    const AVATAR_LIMIT = 11;

    let isAvatarExpanded = $state(false);
    const first = $derived(item.notifications[0]);
    const detail = $derived(first.mochott);
    const displayedNotifications = $derived(isAvatarExpanded ? item.notifications : item.notifications.slice(0, AVATAR_LIMIT));
    const reasonText = $derived(
        item.reason === 'like'
            ? getReasonText(item.notifications.length === 1 ? 'like' : 'like_multiple')
            : item.reason === 'follow'
                ? 'followed_you'
                : getReasonText(item.reason)
    );
</script>

<article class="notifications-item notifications-item--mochott" data-reason={item.reason} data-mochott-type={detail?.type}>
    <div class="notification-column">
        <div class="notification-column__icons">
            <a class="notification-icon notification-icon--{item.reason}" href={detail?.url} target="_blank" rel="noopener noreferrer" aria-label="mochott">
                {#if item.reason === 'like'}
                    {#if $settings?.design?.reactionMode === 'superstar'}
                        <Star color="var(--timeline-reaction-liked-icon-color)" size="18"></Star>
                    {:else}
                        <Heart color="var(--timeline-reaction-liked-icon-color)" size="18"></Heart>
                    {/if}
                {:else if item.reason === 'reply'}
                    <Reply color="var(--primary-color)" size="18"></Reply>
                {:else if item.reason === 'follow'}
                    <UserPlus2 color="var(--primary-color)" size="18"></UserPlus2>
                {:else}
                    <Pencil color="var(--primary-color)" size="16"></Pencil>
                {/if}

                {#if showMark}
                    <img class="notification-icon__mark" src="/atmosphere/mochott.webp" alt="" width="14" height="14" loading="lazy" decoding="async">
                {/if}
            </a>
        </div>

        <div class="notification-column__content">
            <div class="notification-authors">
                {#each displayedNotifications as notification (notification.uri)}
                    <div class="notification-author">
                        <Avatar href="/profile/{notification.author.did}" avatar={notification.author.avatar} handle={notification.author.handle} {_agent} profile={notification.author}></Avatar>
                    </div>
                {/each}

                {#if item.notifications.length > AVATAR_LIMIT}
                    <button class="notification-author-more" onclick={() => {isAvatarExpanded = !isAvatarExpanded}}>
                        {#if isAvatarExpanded}
                            <ChevronUp size="18" color="var(--text-color-1)"></ChevronUp>
                        {:else}
                            <ChevronDown size="18" color="var(--text-color-1)"></ChevronDown>
                        {/if}
                    </button>
                {/if}
            </div>

            <h2 class="notifications-item__title">
                <span class="notifications-item__name">
                    <ProfileCardWrapper handle={first.author.did} {_agent}>
                        <a class="notifications-item__link" href="/profile/{first.author.did}" onclick={() => {profileHintState.set(first.author)}}>{first.author.displayName || first.author.handle}</a>
                    </ProfileCardWrapper>
                </span> {$_(reasonText)}
            </h2>

            {#if detail?.commentText}
                <div class="notifications-item__content notifications-item__comment">
                    <p><a href={detail.url} target="_blank" rel="noopener noreferrer">{detail.commentText}</a></p>
                </div>
            {/if}

            {#if detail?.documentTitle && item.reason !== 'follow'}
                <p class="notifications-item__document">
                    <a href={detail.url} target="_blank" rel="noopener noreferrer">{detail.documentTitle}</a>
                </p>
            {/if}
        </div>
    </div>
</article>

<style lang="postcss">
    .notification-authors {
        display: grid;
        grid-template-columns: repeat(auto-fill, 30px);
        gap: 4px;
        margin-bottom: 8px;
    }

    .notification-author-more {
        width: 30px;
        height: 30px;
        background-color: var(--border-color-2);
        border-radius: var(--avatar-border-radius, 50%);
        display: grid;
        place-content: center;
    }

    .notification-icon {
        width: 30px;
        height: 30px;
        border-radius: var(--radius-round, 50%);
        display: grid;
        place-content: center;
        transition: opacity .25s ease-in-out;
        position: relative;

        &::before {
            content: '';
            display: block;
            position: absolute;
            inset: 0;
            border-radius: var(--radius-round, 50%);
            background-color: var(--primary-color);
            opacity: .05;
            z-index: 1;
        }

        &--like {
            &::before {
                background-color: var(--timeline-reaction-liked-icon-color);
            }
        }

        &:hover {
            opacity: .8;
        }

        &__mark {
            position: absolute;
            right: -3px;
            bottom: -3px;
            width: 14px;
            height: 14px;
            border-radius: var(--radius-round, 50%);
            z-index: 2;
        }
    }

    .notifications-item__comment p {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    .notifications-item__document {
        font-size: var(--timeline-meta-font-size);
        color: var(--text-color-3);
        margin-top: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        a {
            color: inherit;
        }
    }
</style>
