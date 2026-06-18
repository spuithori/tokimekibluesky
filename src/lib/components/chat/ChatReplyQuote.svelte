<script lang="ts">
    import { _ } from "svelte-i18n";
    import {
        createMemberNameResolver,
        getReplyPreview,
    } from "$lib/components/chat/convoUtil";

    let {
        replyTo,
        convo = undefined,
        members = {},
        mine = false,
        onjump = undefined,
    } = $props();

    const preview = $derived(
        getReplyPreview(
            replyTo,
            createMemberNameResolver(members, convo, $_("chat_unknown_user")),
        ),
    );
</script>

{#snippet inner()}
    <span class="chat-reply-quote__connector" aria-hidden="true"></span>
    <span class="chat-reply-quote__body">
        {#if preview?.name}
            <span class="chat-reply-quote__name">{preview.name}</span>
        {/if}
        <span class="chat-reply-quote__text"
            >{preview?.key ? $_(preview.key) : preview?.text}</span
        >
    </span>
{/snippet}

{#if onjump}
    <button
        type="button"
        class="chat-reply-quote chat-reply-quote--clickable"
        class:chat-reply-quote--me={mine}
        onclick={onjump}
        aria-label={$_("chat_reply_jump")}
    >
        {@render inner()}
    </button>
{:else}
    <div class="chat-reply-quote" class:chat-reply-quote--me={mine}>
        {@render inner()}
    </div>
{/if}

<style lang="postcss">
    .chat-reply-quote {
        display: flex;
        align-items: stretch;
        gap: 6px;
        max-width: 100%;
        min-width: 0;
        padding-left: 8px;
        margin-bottom: -2px;
        text-align: left;
    }

    .chat-reply-quote--clickable {
        cursor: pointer;

        &:hover .chat-reply-quote__text {
            text-decoration: underline;
        }
    }

    .chat-reply-quote__connector {
        flex: 0 0 16px;
        margin-top: 8px;
        border-top: 1px solid var(--border-color-1);
        border-left: 1px solid var(--border-color-1);
        border-top-left-radius: 10px;
    }

    .chat-reply-quote__body {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        padding-bottom: 6px;
    }

    .chat-reply-quote__name {
        flex: 0 0 auto;
        font-size: 12px;
        font-weight: bold;
        color: var(--text-color-3);
    }

    .chat-reply-quote__text {
        min-width: 0;
        font-size: 12px;
        color: var(--text-color-3);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .chat-reply-quote--me {
        flex-direction: row-reverse;
        padding-left: 0;
        padding-right: 12px;

        .chat-reply-quote__connector {
            border-left: none;
            border-right: 1px solid var(--border-color-1);
            border-top-left-radius: 0;
            border-top-right-radius: 10px;
        }
    }
</style>
