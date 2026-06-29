<script lang="ts">
    import { _ } from "svelte-i18n";
    import { toast } from "svelte-sonner";
    import Menu from "$lib/components/ui/Menu.svelte";
    import ConvoAvatar from "$lib/components/chat/ConvoAvatar.svelte";
    import { CHAT_PROXY } from "$lib/components/chat/chatConst";
    import { chatErrorKey } from "$lib/components/chat/chatErrors";
    import {
        getConvoMemberCount,
        getConvoName,
        isConvoLocked,
        isGroupConvo,
    } from "$lib/components/chat/convoUtil";
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import Lock from '@lucide/svelte/icons/lock';
    import LogOut from '@lucide/svelte/icons/log-out';
    import MessageCircleOff from '@lucide/svelte/icons/message-circle-off';
    import Settings2 from '@lucide/svelte/icons/settings-2';
    import Users from '@lucide/svelte/icons/users';

    let {
        convo,
        _agent,
        onback = undefined,
        onconvoupdate = undefined,
        onleave = undefined,
    } = $props();
    let isMenuOpen = $state(false);
    let isSettingsOpen = $state(false);

    const myDid = $derived(_agent?.did?.());
    const name = $derived(getConvoName(convo, myDid));
    const isGroup = $derived(isGroupConvo(convo));

    async function toggleMute() {
        isMenuOpen = false;

        try {
            const nsid = convo.muted
                ? "chat.bsky.convo.unmuteConvo"
                : "chat.bsky.convo.muteConvo";
            const res = await _agent.xrpc.post(
                nsid,
                { convoId: convo.id },
                {
                    headers: {
                        "atproto-proxy": CHAT_PROXY,
                    },
                },
            );
            toast.success(
                $_(convo.muted ? "success_unmute_chat" : "success_mute_chat"),
            );
            onconvoupdate?.(res.convo);
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }

    async function leaveChat() {
        isMenuOpen = false;

        try {
            await _agent.xrpc.post(
                "chat.bsky.convo.leaveConvo",
                { convoId: convo.id },
                {
                    headers: {
                        "atproto-proxy": CHAT_PROXY,
                    },
                },
            );
            toast.success($_("success_leave_chat"));
            onleave?.();
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }
</script>

<div class="chat-header">
    {#if onback}
        <button
            class="chat-header__back"
            onclick={onback}
            aria-label="Back to list"
        >
            <ArrowLeft size="20" color="var(--text-color-1)"></ArrowLeft>
        </button>
    {/if}

    <div class="chat-header__avatar">
        <ConvoAvatar {convo} {_agent} size={32}></ConvoAvatar>
    </div>

    <div class="chat-header__body">
        <p class="chat-header__name">{name}</p>

        {#if isGroup}
            <p class="chat-header__meta">
                <Users size="12" color="var(--text-color-3)"></Users>
                <span>{getConvoMemberCount(convo)}</span>

                {#if isConvoLocked(convo)}
                    <Lock size="12" color="var(--danger-color)"></Lock>
                    <span class="chat-header__locked">{$_("chat_locked")}</span>
                {/if}
            </p>
        {/if}
    </div>

    <div class="chat-header__menu">
        <Menu bind:isMenuOpen>
            {#snippet content()}
                <ul class="timeline-menu-list">
                    {#if isGroup}
                        <li class="timeline-menu-list__item">
                            <button
                                class="timeline-menu-list__button"
                                onclick={() => {
                                    isMenuOpen = false;
                                    isSettingsOpen = true;
                                }}
                            >
                                <Settings2 size="18" color="var(--text-color-1)"
                                ></Settings2>
                                {$_("chat_group_settings")}
                            </button>
                        </li>
                    {/if}

                    <li class="timeline-menu-list__item">
                        <button
                            class="timeline-menu-list__button"
                            onclick={toggleMute}
                        >
                            <MessageCircleOff
                                size="18"
                                color="var(--text-color-1)"
                            ></MessageCircleOff>
                            {$_(
                                convo.muted
                                    ? "chat_menu_unmute"
                                    : "chat_menu_mute",
                            )}
                        </button>
                    </li>

                    <li class="timeline-menu-list__item">
                        <button
                            class="timeline-menu-list__button"
                            onclick={leaveChat}
                        >
                            <LogOut size="18" color="var(--text-color-1)"
                            ></LogOut>
                            {$_("chat_menu_leave")}
                        </button>
                    </li>
                </ul>
            {/snippet}
        </Menu>
    </div>
</div>

{#if isSettingsOpen}
    {#await import("$lib/components/chat/group/GroupSettingsModal.svelte") then { default: GroupSettingsModal }}
        <GroupSettingsModal
            {convo}
            {_agent}
            {onconvoupdate}
            {onleave}
            onclose={() => {
                isSettingsOpen = false;
            }}
        ></GroupSettingsModal>
    {/await}
{/if}

<style lang="postcss">
    .chat-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-bottom: 1px solid var(--border-color-2);
        background-color: var(--bg-color-1);
        flex-shrink: 0;

        &__back {
            width: 32px;
            height: 32px;
            flex-shrink: 0;
            display: grid;
            place-content: center;
            border-radius: var(--border-radius-2);

            &:hover {
                background-color: var(--bg-color-2);
            }
        }

        &__avatar {
            flex-shrink: 0;
        }

        &__body {
            min-width: 0;
        }

        &__name {
            font-weight: bold;
            font-size: 14px;
            line-height: 1.3;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        &__meta {
            display: flex;
            align-items: center;
            gap: 4px;
            color: var(--text-color-3);
            font-size: 12px;
            line-height: 1.3;
        }

        &__locked {
            color: var(--danger-color);
        }

        &__menu {
            margin-left: auto;
            flex-shrink: 0;

            & :global(.timeline-menu-toggle) {
                top: 10px;
            }
        }
    }
</style>
