<script lang="ts">
    import {agent, workerTimer} from '$lib/stores';
    import {_} from 'svelte-i18n';
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import Infinite from "$lib/components/utils/Infinite.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {settingsState} from "$lib/classes/settingsState.svelte";
    import ChatListItemColumn from "$lib/components/chat/ChatListItemColumn.svelte";
    import ChatTimeline from "./ChatTimeline.svelte";
    import {onDestroy} from "svelte";
    import {instantPlaySound} from "$lib/sounds";
    import {getConvoName, isBlockedDirectConvo} from "$lib/components/chat/convoUtil";
    import ChatRequestsList from "$lib/components/chat/ChatRequestsList.svelte";
    import {chatState} from "$lib/classes/chatState.svelte";
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import Inbox from '@lucide/svelte/icons/inbox';

    let { index, _agent = $agent, onrefresh, unique, isJunk, isSplit = false, column: columnProp = undefined } = $props();

    const columnState = getColumnState(isJunk);
    const column = columnProp ?? columnState.getColumn(index);

    let currentView: 'list' | 'detail' | 'requests' = $state('list');
    const requestCount = $derived(chatState.getRequestCount((_agent || $agent)?.did?.()));
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
            const res = await currentAgent.xrpc.get('chat.bsky.convo.listConvos', {cursor: '', status: 'accepted'}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });

            if (column.settings?.playSound && convos.length > 0) {
                const hasNewMessage = res.convos.some(newConvo => {
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

            const newConvosMap = new Map(res.convos.map(c => [c.id, c]));
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
        selectedConvoId = convo.id;
        selectedConvoName = getConvoName(convo, agentDid);
        column.algorithm.id = convo.id;
        column.algorithm.name = $_('chat_list') + ' / ' + selectedConvoName;
        column.data = { feed: [], cursor: '' };
        columnState.clearFeed(column.id);
        currentView = 'detail';
    }

    function handleBack() {
        currentView = 'list';
        selectedConvoId = null;
        column.algorithm.id = undefined;
        column.algorithm.name = $_('chat_list');
    }

    function handleLeave() {
        const removedId = selectedConvoId;
        handleBack();
        if (removedId) {
            handleListRefresh(removedId);
        }
    }

    async function handleLoadMore(loaded, complete) {
        const currentAgent = _agent || $agent;
        if (!currentAgent) {
            complete();
            return;
        }

        try {
            const res = await currentAgent.xrpc.get('chat.bsky.convo.listConvos', {cursor: cursor, status: 'accepted'}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });

            const existingIds = new Set(convos.map(c => c.id));
            const newConvos = res.convos.filter(c => !existingIds.has(c.id));

            convos = [...convos, ...newConvos];
            cursor = res.cursor || '';

            if (res.cursor) {
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
        <button class="chat-requests-toggle" onclick={() => {currentView = 'requests'}}>
            <Inbox size="18" color="var(--text-color-1)"></Inbox>
            <span>{$_('chat_request_inbox')}</span>

            {#if requestCount}
                <span class="chat-requests-toggle__badge">{requestCount}</span>
            {/if}
        </button>

        {#key listUnique}
            <div class="convo-list">
                {#each convos as convo (convo.id)}
                    {@const currentAgent = _agent || $agent}
                    {@const agentDid = currentAgent?.did?.()}
                    {#if !isBlockedDirectConvo(convo, agentDid)}
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
{:else if currentView === 'requests'}
    <div class="chat-list">
        <button class="chat-requests-toggle" onclick={() => {currentView = 'list'}}>
            <ArrowLeft size="18" color="var(--text-color-1)"></ArrowLeft>
            <span>{$_('chat_request_inbox')}</span>
        </button>

        <ChatRequestsList _agent={_agent || $agent} onopen={(convo) => {handleListRefresh(); handleConvoSelect(convo)}}></ChatRequestsList>
    </div>
{:else}
    <div class="chat-detail">
        <ChatTimeline {index} _agent={_agent || $agent} {unique} {isJunk} {onrefresh} {isSplit} {column} onback={handleBack} onleave={handleLeave}></ChatTimeline>
    </div>
{/if}

<style lang="postcss">
    .chat-list {
        padding: 0;
    }

    .convo-list {
        border-top: 1px solid var(--border-color-2);
    }

    .chat-requests-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        height: 44px;
        padding: 0 16px;
        color: var(--text-color-1);
        font-size: 14px;
        font-weight: bold;
        text-align: left;

        &:hover {
            background-color: var(--bg-color-2);
        }

        &__badge {
            margin-left: auto;
            min-width: 20px;
            height: 20px;
            padding: 0 6px;
            border-radius: 10px;
            background-color: var(--danger-color);
            color: #fff;
            font-size: 12px;
            font-weight: bold;
            display: grid;
            place-content: center;
        }
    }

    .chat-detail {
        display: flex;
        flex-direction: column;
        height: 100%;
    }
</style>
