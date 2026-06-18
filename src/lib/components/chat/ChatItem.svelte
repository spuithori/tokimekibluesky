<script lang="ts">
    import { _ } from "svelte-i18n";
    import TimelineText from "$lib/components/post/TimelineText.svelte";
    import { formatDate } from "$lib/dateFormat";
    import { isEmojiSequenceOrCombination } from "$lib/util";
    import EmbedRecord from "$lib/components/post/EmbedRecord.svelte";
    import { AppBskyEmbedRecord } from "$lib/atproto-guards";
    import { Flag, Laugh, Reply, Trash2 } from "lucide-svelte";
    import { CHAT_PROXY } from "$lib/components/chat/chatConst";
    import { agent, reportModal } from "$lib/stores";
    import { toast } from "svelte-sonner";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
    import { chatErrorKey } from "$lib/components/chat/chatErrors";
    import {
        DELETED_MESSAGE_VIEW_TYPE,
        JOIN_LINK_EMBED_VIEW_TYPE,
    } from "$lib/components/chat/convoUtil";
    import ChatReplyQuote from "$lib/components/chat/ChatReplyQuote.svelte";

    let {
        message,
        _agent,
        convoId,
        convo = undefined,
        members = {},
        showSender = false,
        clusterStart = true,
        clusterEnd = true,
        replaceMessage,
        onreply = undefined,
        onjump = undefined,
        highlightId = null,
        onhighlightend = undefined,
    } = $props();

    function memberOf(did) {
        if (!did) return undefined;
        return (
            members[did] ?? convo?.members?.find((member) => member.did === did)
        );
    }
    const currentAgent = $derived(_agent || $agent);
    const myDid = $derived(currentAgent?.did?.());
    const isMine = $derived(message.sender?.did === myDid);
    let isEmojiPickerOpen = $state(false);
    let isDeleteOpen = $state(false);
    let pickerPos = $state({ x: 0, y: 0 });

    function openEmojiPicker(event: MouseEvent) {
        const rect = (
            event.currentTarget as HTMLElement
        ).getBoundingClientRect();
        const PICKER_WIDTH = 352;
        const PICKER_HEIGHT = Math.min(435, window.innerHeight * 0.6);
        const x = Math.min(
            Math.max(8, rect.left + rect.width / 2 - PICKER_WIDTH / 2),
            Math.max(8, window.innerWidth - PICKER_WIDTH - 8),
        );
        let y = rect.bottom + 8;

        if (y + PICKER_HEIGHT > window.innerHeight - 8) {
            y = Math.max(8, rect.top - PICKER_HEIGHT - 8);
        }

        pickerPos = { x: x, y: y };
        isEmojiPickerOpen = true;
    }

    const sender = $derived(memberOf(message.sender?.did));
    const senderName = $derived(sender?.displayName || sender?.handle || "");

    const groupedReactions = $derived.by(() => {
        const map = new Map();
        for (const reaction of message?.reactions ?? []) {
            const senders = map.get(reaction.value);
            if (senders) {
                senders.push(reaction.sender);
            } else {
                map.set(reaction.value, [reaction.sender]);
            }
        }
        return [...map.entries()].map(([value, senders]) => ({
            value,
            senders,
        }));
    });

    function reactionNames(senders) {
        return senders
            .map((sender) => {
                const member = memberOf(sender?.did);
                return (
                    member?.displayName ||
                    member?.handle ||
                    $_("chat_unknown_user")
                );
            })
            .join(", ");
    }

    async function handleEmojiPick(emoji) {
        isEmojiPickerOpen = false;
        await toggleReaction(emoji.native);
    }

    function hasMyReaction(emoji: string) {
        return !!message?.reactions?.find(
            (reaction) =>
                reaction.value === emoji && reaction.sender?.did === myDid,
        );
    }

    async function toggleReaction(emoji: string) {
        const record = {
            convoId: convoId,
            messageId: message.id,
            value: emoji,
        };

        try {
            const nsid = hasMyReaction(emoji)
                ? "chat.bsky.convo.removeReaction"
                : "chat.bsky.convo.addReaction";
            const res = await currentAgent?.xrpc.post(nsid, record, {
                headers: {
                    "atproto-proxy": CHAT_PROXY,
                },
            });
            replaceMessage(res.message);
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }

    async function deleteMessage() {
        isDeleteOpen = false;

        try {
            const res = await currentAgent?.xrpc.post(
                "chat.bsky.convo.deleteMessageForSelf",
                {
                    convoId: convoId,
                    messageId: message.id,
                },
                {
                    headers: {
                        "atproto-proxy": CHAT_PROXY,
                    },
                },
            );
            replaceMessage({ ...res, $type: DELETED_MESSAGE_VIEW_TYPE });
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }
</script>

<div
    class="chat-item-wrap"
    class:chat-item-wrap--highlight={highlightId === message.id}
    data-message-id={message.id}
    onanimationend={(e) => {
        if (e.animationName === "chat-highlight-fade") onhighlightend?.();
    }}
>
    <div
        class="chat-item"
        class:chat-item--me={isMine}
        class:chat-item--joined={!clusterEnd}
        class:chat-item--cluster-first={clusterStart && !clusterEnd}
        class:chat-item--cluster-mid={!clusterStart && !clusterEnd}
        class:chat-item--cluster-last={!clusterStart && clusterEnd}
    >
        {#if message.replyTo}
            <ChatReplyQuote
                replyTo={message.replyTo}
                {convo}
                {members}
                mine={isMine}
                onjump={message.replyTo.$type !== DELETED_MESSAGE_VIEW_TYPE
                    ? () => onjump?.(message.replyTo.id)
                    : undefined}
            ></ChatReplyQuote>
        {/if}

        {#if showSender}
            <div class="chat-item__sender">
                {#if sender?.avatar}
                    <img
                        class="chat-item__sender-avatar"
                        loading="lazy"
                        src={sender.avatar}
                        alt=""
                        width="40"
                        height="40"
                    />
                {:else}
                    <span class="chat-item__sender-avatar"></span>
                {/if}

                <span class="chat-item__sender-name"
                    >{senderName || $_("chat_unknown_user")}</span
                >
            </div>
        {/if}

        {#if message.text}
            <p class="chat-item__text">
                {#if isEmojiSequenceOrCombination(message.text)}
                    <span class="chat-text-emoji">{message.text}</span>
                {:else}
                    <TimelineText record={message} _agent={currentAgent}
                    ></TimelineText>
                {/if}

                {#if clusterEnd}
                    <time
                        class="chat-item__time"
                        datetime={formatDate(
                            new Date(message.sentAt),
                            "yyyy-MM-dd'T'HH:mm:ss",
                        )}>{formatDate(new Date(message.sentAt), "HH:mm")}</time
                    >
                {/if}
            </p>
        {/if}

        {#if message.embed}
            {#if AppBskyEmbedRecord.isView(message.embed) && AppBskyEmbedRecord.isViewRecord(message.embed?.record)}
                <EmbedRecord record={message.embed.record} _agent={currentAgent}
                ></EmbedRecord>
            {:else if message.embed.$type === JOIN_LINK_EMBED_VIEW_TYPE}
                {#await import("$lib/components/chat/JoinLinkCard.svelte") then { default: JoinLinkCard }}
                    <JoinLinkCard
                        preview={message.embed.joinLinkPreview}
                        _agent={currentAgent}
                    ></JoinLinkCard>
                {/await}
            {/if}
        {/if}

        {#if groupedReactions.length}
            <ul class="chat-reactions-list">
                {#each groupedReactions as reaction (reaction.value)}
                    {@const mine = reaction.senders.some(
                        (sender) => sender?.did === myDid,
                    )}
                    <li class="chat-reactions-list__item">
                        <Tooltip>
                            {#snippet ref()}
                                <button
                                    class="chat-reaction"
                                    class:chat-reaction--mine={mine}
                                    onclick={() =>
                                        toggleReaction(reaction.value)}
                                >
                                    <span class="chat-reaction__value"
                                        >{reaction.value}</span
                                    >

                                    {#if reaction.senders.length > 1}
                                        <span class="chat-reaction__count"
                                            >{reaction.senders.length}</span
                                        >
                                    {/if}
                                </button>
                            {/snippet}

                            {#snippet content()}
                                {reactionNames(reaction.senders)}
                            {/snippet}
                        </Tooltip>
                    </li>
                {/each}
            </ul>
        {/if}

        <div class="chat-item-menu">
            {#if onreply}
                <button
                    onclick={() => onreply(message)}
                    aria-label={$_("chat_reply")}
                >
                    <Reply size="18" color="var(--text-color-3)"></Reply>
                </button>
            {/if}

            <button onclick={openEmojiPicker} aria-label="Reaction">
                <Laugh size="20" color="var(--text-color-3)"></Laugh>
            </button>

            <button
                onclick={() => {
                    isDeleteOpen = true;
                }}
                aria-label={$_("chat_message_delete")}
            >
                <Trash2 size="18" color="var(--text-color-3)"></Trash2>
            </button>

            {#if !isMine}
                <button
                    onclick={() => {
                        $reportModal = {
                            open: true,
                            data: {
                                type: "convoMessage",
                                convoId: convoId,
                                messageId: message.id,
                                did: message.sender.did,
                            },
                        };
                    }}
                    aria-label="Report"
                >
                    <Flag size="18" color="var(--text-color-3)"></Flag>
                </button>
            {/if}
        </div>

        {#if isEmojiPickerOpen}
            {#await import("$lib/components/publish/EmojiPicker.svelte") then { default: EmojiPicker }}
                <div
                    class="chat-emoji-picker"
                    {@attach (node: HTMLElement) => {
                        const base = node.getBoundingClientRect();
                        node.style.translate = `${pickerPos.x - base.left}px ${pickerPos.y - base.top}px`;
                    }}
                >
                    <EmojiPicker
                        onpick={handleEmojiPick}
                        onoutclick={() => {
                            isEmojiPickerOpen = false;
                        }}
                    ></EmojiPicker>
                </div>
            {/await}
        {/if}

        {#if isDeleteOpen}
            <ConfirmModal
                on:ok={deleteMessage}
                on:cancel={() => {
                    isDeleteOpen = false;
                }}
                yesText={$_("chat_message_delete")}
                cancelText={$_("cancel")}
            >
                <p class="chat-delete-confirm">
                    {$_("chat_message_delete_confirm")}
                </p>
            </ConfirmModal>
        {/if}
    </div>
</div>

<style lang="postcss">
    .chat-item-wrap {
        display: flex;

        &:hover {
            .chat-item-menu {
                visibility: visible;
                opacity: 1;
            }
        }

        &--highlight {
            animation: chat-highlight-fade 2.5s ease-out;
            border-radius: 12px;
        }
    }

    @keyframes chat-highlight-fade {
        0% {
            background-color: color-mix(
                in srgb,
                var(--primary-color) 14%,
                transparent
            );
        }

        75% {
            background-color: color-mix(
                in srgb,
                var(--primary-color) 14%,
                transparent
            );
        }

        100% {
            background-color: transparent;
        }
    }

    .chat-item:has(.chat-item__sender) .chat-item-menu {
        top: 22px;
    }

    .chat-item {
        margin-bottom: 8px;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        max-width: calc(100% - 88px);

        &--joined {
            margin-bottom: 2px;
        }

        &--cluster-first .chat-item__text {
            border-bottom-left-radius: 4px;
        }

        &--cluster-mid .chat-item__text {
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
        }

        &--cluster-last .chat-item__text {
            border-top-left-radius: 4px;
        }

        &--me {
            margin-left: auto;
            align-items: flex-end;

            .chat-item__text {
                color: var(--bg-color-1);
                background-color: var(--primary-color);
                border-radius: 16px;
            }

            .chat-item__time {
                color: var(--bg-color-1);
            }

            .chat-item-menu {
                right: 100%;
                left: auto;
                padding-right: 8px;
                padding-left: 0;
            }

            &.chat-item--cluster-first .chat-item__text {
                border-radius: 16px;
                border-bottom-right-radius: 4px;
            }

            &.chat-item--cluster-mid .chat-item__text {
                border-radius: 16px;
                border-top-right-radius: 4px;
                border-bottom-right-radius: 4px;
            }

            &.chat-item--cluster-last .chat-item__text {
                border-radius: 16px;
                border-top-right-radius: 4px;
            }
        }

        &__sender {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 2px;
        }

        &__sender-avatar {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: var(--primary-color);
            display: block;
            object-fit: cover;
        }

        &__sender-name {
            font-size: 12px;
            color: var(--text-color-3);
        }

        &__text {
            width: fit-content;
            position: relative;
            background-color: var(--border-color-2);
            padding: 8px 16px;
            border-radius: 16px;
            white-space: pre-line;
            font-size: var(--timeline-content-font-size);
            line-height: 1.5;
            overflow-wrap: anywhere;
        }

        &__time {
            font-size: 11px;
            color: var(--text-color-3);
            padding-bottom: 4px;
        }
    }

    .chat-text-emoji {
        font-size: calc(var(--timeline-content-font-size) * 2);
    }

    .chat-reactions-list {
        display: flex;
        align-items: center;
        gap: 4px;
        list-style: none;
        background-color: var(--bg-color-2);
        height: 32px;
        padding: 0 4px;
        border-radius: 16px;
        width: fit-content;
        margin-top: -4px;
        z-index: 1;
        position: relative;
    }

    .chat-reaction {
        display: flex;
        align-items: center;
        gap: 2px;
        height: 24px;
        padding: 0 6px;
        border-radius: 12px;
        font-size: 14px;

        &--mine {
            background-color: var(--bg-color-1);
            box-shadow: 0 0 0 1px var(--primary-color);
        }

        &__count {
            font-size: 12px;
            color: var(--text-color-3);
            font-weight: bold;
        }
    }

    .chat-delete-confirm {
        margin-bottom: 16px;
    }

    .chat-emoji-picker {
        position: fixed;
        left: 0;
        top: 0;
        z-index: 100;

        :global(.emoji-picker-wrap) {
            position: static;
        }

        :global(em-emoji-picker) {
            max-width: calc(100vw - 16px);
            height: min(435px, 60dvh);
        }
    }

    .chat-item-menu {
        position: absolute;
        left: 100%;
        top: 0;
        padding-left: 8px;
        height: 37px;
        display: flex;
        align-items: center;
        gap: 8px;
        visibility: hidden;
        opacity: 0;
    }
</style>
