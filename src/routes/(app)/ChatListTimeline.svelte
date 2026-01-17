<script lang="ts">
    import {agent, workerTimer} from '$lib/stores';
    import {_} from 'svelte-i18n';
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import Infinite from "$lib/components/utils/Infinite.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {settingsState} from "$lib/classes/settingsState.svelte";
    import ChatListItemColumn from "$lib/components/chat/ChatListItemColumn.svelte";
    import ChatTimeline from "./ChatTimeline.svelte";
    import {ArrowLeft} from "lucide-svelte";
    import {onDestroy} from "svelte";
    import {instantPlaySound} from "$lib/sounds";

    let { index, _agent = $agent, onrefresh, unique, isJunk, isSplit = false, column: columnProp = undefined } = $props();

    const columnState = getColumnState(isJunk);
    const column = columnProp ?? columnState.getColumn(index);

    let currentView: 'list' | 'detail' = $state('list');
    let selectedConvoId: string | null = $state(null);
    let selectedConvoName: string = $state('');
    let convos = $state([]);
    let cursor = $state('');
    let listUnique = $state(Symbol());
    let lastCheckedTime = $state(Date.now());

    function handleTimer(e) {
        if (currentView === 'list' && e.data % 10 === 0) {
            refreshListData();
        }
    }
    $workerTimer.addEventListener('message', handleTimer);

    onDestroy(() => {
        $workerTimer.removeEventListener('message', handleTimer);
    });

    async function refreshListData() {
        const currentAgent = _agent || $agent;
        if (!currentAgent) return;

        try {
            const res = await currentAgent.agent.api.chat.bsky.convo.listConvos({cursor: ''}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });

            if (column.settings?.playSound && convos.length > 0) {
                const hasNewMessage = res.data.convos.some(newConvo => {
                    const existingConvo = convos.find(c => c.id === newConvo.id);
                    if (!newConvo.lastMessage) return false;

                    const isFromOther = newConvo.lastMessage.sender?.did !== currentAgent.did();
                    const messageTime = new Date(newConvo.lastMessage.sentAt).getTime();

                    if (existingConvo) {
                        const existingMessageTime = existingConvo.lastMessage
                            ? new Date(existingConvo.lastMessage.sentAt).getTime()
                            : 0;
                        return isFromOther && messageTime > existingMessageTime;
                    } else {
                        return isFromOther && messageTime > lastCheckedTime;
                    }
                });

                if (hasNewMessage) {
                    instantPlaySound(column.settings.playSound);
                }
            }

            lastCheckedTime = Date.now();

            const newConvosMap = new Map(res.data.convos.map(c => [c.id, c]));
            const existingConvosMap = new Map(convos.map(c => [c.id, c]));

            for (const [id, convo] of newConvosMap) {
                existingConvosMap.set(id, convo);
            }

            convos = Array.from(existingConvosMap.values()).sort((a, b) => {
                const aTime = new Date(a.lastMessage?.sentAt || 0).getTime();
                const bTime = new Date(b.lastMessage?.sentAt || 0).getTime();
                return bTime - aTime;
            });
        } catch (e) {
            console.error(e);
        }
    }

    function handleConvoSelect(convo) {
        const currentAgent = _agent || $agent;
        const agentDid = currentAgent?.did?.();
        const otherMember = convo.members.filter(member => member.did !== agentDid)[0];
        selectedConvoId = convo.id;
        selectedConvoName = otherMember?.displayName || otherMember?.handle || '';
        column.algorithm.id = convo.id;
        column.algorithm.name = $_('chat_list') + ' / ' + selectedConvoName;
        column.data = { feed: [], cursor: '' };
        currentView = 'detail';
    }

    function handleBack() {
        currentView = 'list';
        selectedConvoId = null;
        column.algorithm.id = undefined;
        column.algorithm.name = $_('chat_list');
    }

    async function handleLoadMore(loaded, complete) {
        const currentAgent = _agent || $agent;
        if (!currentAgent) {
            complete();
            return;
        }

        try {
            const res = await currentAgent.agent.api.chat.bsky.convo.listConvos({cursor: cursor}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });

            const existingIds = new Set(convos.map(c => c.id));
            const newConvos = res.data.convos.filter(c => !existingIds.has(c.id));

            convos = [...convos, ...newConvos];
            cursor = res.data.cursor || '';

            if (res.data.cursor) {
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            console.error(e);
            complete();
        }
    }

    function handleListRefresh(removedId?: string) {
        if (removedId) {
            convos = convos.filter(convo => convo.id !== removedId);
        } else {
            convos = [];
            cursor = '';
            listUnique = Symbol();
        }
    }

    export function refreshList() {
        convos = [];
        cursor = '';
        listUnique = Symbol();
    }

    export function getConvos() {
        return convos;
    }

    export function setConvos(newConvos) {
        convos = newConvos;
    }

    export function setCursor(newCursor) {
        cursor = newCursor;
    }

    export function getCurrentView() {
        return currentView;
    }
</script>

{#if currentView === 'list'}
    <div class="chat-list">
        {#key listUnique}
            <div class="convo-list">
                {#each convos as convo (convo.id)}
                    {@const currentAgent = _agent || $agent}
                    {@const agentDid = currentAgent?.did?.()}
                    {#if !convo.members.filter(member => member.did !== agentDid)[0]?.viewer?.blocking}
                        <ChatListItemColumn
                            {convo}
                            _agent={currentAgent}
                            onrefresh={handleListRefresh}
                            onselect={handleConvoSelect}
                        ></ChatListItemColumn>
                    {/if}
                {/each}
            </div>

            {#if settingsState.pdsRequestReady}
                <Infinite oninfinite={handleLoadMore}></Infinite>
            {/if}
        {/key}
    </div>
{:else}
    <div class="chat-detail">
        <div class="chat-detail__header">
            <button class="chat-detail__back" onclick={handleBack} aria-label="Back to list">
                <ArrowLeft size="20" color="var(--text-color-1)"></ArrowLeft>
            </button>
            <span class="chat-detail__name">{selectedConvoName}</span>
        </div>

        <ChatTimeline {index} _agent={_agent || $agent} {unique} {isJunk} {onrefresh} {isSplit} {column}></ChatTimeline>
    </div>
{/if}

<style lang="postcss">
    .chat-list {
        padding: 0;
    }

    .convo-list {
        border-top: 1px solid var(--border-color-2);
    }

    .chat-detail {
        display: flex;
        flex-direction: column;
        height: 100%;

        &__header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-bottom: 1px solid var(--border-color-2);
            background-color: var(--bg-color-1);
            position: sticky;
            top: var(--deck-heading-height);
            z-index: 5;
        }

        &__back {
            width: 32px;
            height: 32px;
            display: grid;
            place-content: center;
            border-radius: var(--border-radius-2);

            &:hover {
                background-color: var(--bg-color-2);
            }
        }

        &__name {
            font-weight: bold;
            font-size: 14px;
        }
    }
</style>
