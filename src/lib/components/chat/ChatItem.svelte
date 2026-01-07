<script lang="ts">
    import TimelineText from "$lib/components/post/TimelineText.svelte";
    import {lightFormat} from "date-fns";
    import {isEmojiSequenceOrCombination} from "$lib/util";
    import EmbedRecord from "$lib/components/post/EmbedRecord.svelte";
    import {AppBskyEmbedRecord} from "@atproto/api";
    import { Laugh } from "lucide-svelte";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";

    let { message, _agent, convoId, updateReaction } = $props();
    let isEmojiPickerOpen = $state(false);

    async function handleEmojiPick(emoji: string) {
        isEmojiPickerOpen = false;

        try {
            const res = await toggleReaction(emoji.native);
            updateReaction(res.data.message);
        } catch (e) {
            console.error(e);
        }
    }

    async function toggleReaction(emoji: string) {
        const record = {
            convoId: convoId,
            messageId: message.id,
            value: emoji,
        };

        if (message?.reactions.find(r => r.value === emoji)) {
            return await _agent.agent.api.chat.bsky.convo.removeReaction(record, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
        } else {
            return await _agent.agent.api.chat.bsky.convo.addReaction(record, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
        }
    }
</script>

<div class="chat-item-wrap">
    <div class="chat-item" class:chat-item--me={message.sender.did === _agent.did()}>
        {#if message.text}
            <p class="chat-item__text">
                {#if isEmojiSequenceOrCombination(message.text)}
                    <span class="chat-text-emoji">{message.text}</span>
                {:else}
                    <TimelineText record={message} _agent={_agent}></TimelineText>
                {/if}

                <time class="chat-item__time" datetime={lightFormat(new Date(message.sentAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}>{lightFormat(new Date(message.sentAt), 'MM/dd HH:mm')}</time>
            </p>
        {/if}

        {#if message.embed}
            {#if (AppBskyEmbedRecord.isView(message.embed) && AppBskyEmbedRecord.isViewRecord(message.embed?.record)) }
                <EmbedRecord record={message.embed.record} {_agent}></EmbedRecord>
            {/if}
        {/if}

        {#if message?.reactions?.length}
            <ul class="chat-reactions-list">
                {#each message.reactions as reaction}
                    <li class="chat-reactions-list__item">
                        {reaction.value}
                    </li>
                {/each}
            </ul>
        {/if}

        <div class="chat-item-menu">
            <button onclick={() => {isEmojiPickerOpen = true}}>
                <Laugh size="20" color="var(--text-color-3)"></Laugh>
            </button>
        </div>

        {#if (isEmojiPickerOpen)}
            {#await import('$lib/components/publish/EmojiPicker.svelte') then { default: EmojiPicker }}
                <EmojiPicker onpick={handleEmojiPick} onoutclick={() => {isEmojiPickerOpen = !isEmojiPickerOpen}}></EmojiPicker>
            {/await}
        {/if}
    </div>
</div>

<style lang="postcss">
    .chat-item-wrap {
        overflow-anchor: none;
        display: flex;
        flex: 1;

        &:hover {
            .chat-item-menu {
                visibility: visible;
                opacity: 1;
            }
        }
    }

    .chat-item {
        margin-bottom: 8px;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: flex-start;

        &--me {
            margin-left: auto;
            align-items: flex-end;

            .chat-item__text {
                color: var(--bg-color-1);
                background-color: var(--primary-color);
                border-radius: 16px 0 16px 16px;
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
        }

        &__text {
            width: fit-content;
            position: relative;
            background-color: var(--border-color-2);
            padding: 8px 16px;
            border-radius: 0 16px 16px 16px;
            white-space: pre-line;
            font-size: var(--timeline-content-font-size);
            line-height: 1.5;
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
        padding: 0 8px;
        border-radius: 16px;
        width: fit-content;
        margin-top: -4px;
        z-index: 1;
        position: relative;
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