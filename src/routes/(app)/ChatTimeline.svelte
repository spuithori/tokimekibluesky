<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {agent} from '$lib/stores';
    import ChatItem from "$lib/components/chat/ChatItem.svelte";
    import SystemMessage from "$lib/components/chat/SystemMessage.svelte";
    import ChatItemDeleted from "$lib/components/chat/ChatItemDeleted.svelte";
    import ChatItemPending from "$lib/components/chat/ChatItemPending.svelte";
    import ChatDateSeparator from "$lib/components/chat/ChatDateSeparator.svelte";
    import ChatHeader from "$lib/components/chat/ChatHeader.svelte";
    import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
    import {tick, onDestroy} from "svelte";
    import {goto} from "$app/navigation";
    import {toast} from "svelte-sonner";
    import {CHAT_PROXY, CLUSTER_WINDOW_MS} from "$lib/components/chat/chatConst";
    import {chatErrorKey} from "$lib/components/chat/chatErrors";
    import {chatRealtime} from "$lib/components/chat/chatRealtime";
    import Infinite from "$lib/components/utils/Infinite.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {settingsState} from "$lib/classes/settingsState.svelte";
    import {instantPlaySound} from "$lib/sounds";
    import ChevronDown from '@lucide/svelte/icons/chevron-down';
    import {DELETED_MESSAGE_VIEW_TYPE, SYSTEM_MESSAGE_VIEW_TYPE, getConvoName, isGroupConvo} from "$lib/components/chat/convoUtil";

    let { index, _agent = $agent, onrefresh, unique, isJunk, isSplit = false, column: columnProp = undefined, onback = undefined, onleave = undefined } = $props();
    let firstLoad = true;

    const columnState = getColumnState(isJunk);
    const column = $derived(columnProp ?? columnState.getColumn(index));

    let convo = $state.raw<any>(undefined);
    let memberMap = $state.raw<Record<string, any>>({});
    let scrollEl = $state<HTMLElement>();
    let contentEl = $state<HTMLElement>();
    let showNewPill = $state(false);
    let pendingMessages = $state<any[]>([]);
    let sendingCount = $state(0);
    let replyTarget = $state.raw<any>(undefined);
    let highlightId = $state<string | null>(null);
    let historyComplete = $state(false);
    let isReady = $state(false);
    let membersLoading = false;

    let stickBottom = true;
    let ignoreScroll = false;
    let anchorEl: HTMLElement | null = null;
    let anchorTop = 0;
    let anchorActive = false;

    $effect(() => {
        void unique;
        historyComplete = false;
        replyTarget = undefined;
        highlightId = null;
    });

    const currentAgent = $derived(_agent || $agent);
    const myDid = $derived(currentAgent?.did?.());
    const isGroup = $derived(isGroupConvo(convo));
    const isRequest = $derived(convo?.status === 'request');
    const feed = $derived.by(() => {
        const f = columnState.getFeed(column.id);
        return [...f].sort((a, b) => (new Date(a.sentAt).getTime() || 0) - (new Date(b.sentAt).getTime() || 0));
    });

    let declineConfirmOpen = $state(false);

    const BOTTOM_THRESHOLD = 100;

    const clusterMeta = $derived.by(() => {
        const isClusterable = (m: any) => m && m.$type !== SYSTEM_MESSAGE_VIEW_TYPE && m.$type !== DELETED_MESSAGE_VIEW_TYPE;
        const sameCluster = (a: any, b: any) => {
            if (!isClusterable(a) || !isClusterable(b)) return false;
            if (b.replyTo) return false;
            if (a.sender?.did !== b.sender?.did) return false;
            const ta = new Date(a.sentAt);
            const tb = new Date(b.sentAt);
            if (Math.abs(tb.getTime() - ta.getTime()) > CLUSTER_WINDOW_MS) return false;
            return ta.toDateString() === tb.toDateString();
        };
        const sameDay = (a: any, b: any) => {
            if (!a?.sentAt || !b?.sentAt) return true;
            return new Date(a.sentAt).toDateString() === new Date(b.sentAt).toDateString();
        };

        return feed.map((m, i) => ({
            start: !sameCluster(feed[i - 1], m),
            end: !sameCluster(m, feed[i + 1]),
            mine: m.sender?.did === myDid,
            newDay: i === 0 || !sameDay(feed[i - 1], m),
        }));
    });

    loadConvo();

    if (columnState.getFeed(column.id).length > 0) {
        firstLoad = false;
        tick().then(() => {
            jumpToBottom();
            isReady = true;
        });
    }

    async function loadConvo() {
        if (!currentAgent) return;

        try {
            const res = await currentAgent.xrpc.get('chat.bsky.convo.getConvo', {convoId: column.algorithm.id}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            updateConvo(res.convo);
            seedMembers(res.convo?.members);

            if (isGroupConvo(res.convo)) {
                loadMembers();
            }

            if (res.convo?.unreadCount > 0) {
                scheduleUpdateRead();
            }
        } catch (e) {
            console.error(e);
        }
    }

    function updateConvo(newConvo) {
        if (!newConvo) return;
        convo = newConvo;
        seedMembers(newConvo.members);

        const name = getConvoName(newConvo, currentAgent?.did?.());
        if (name) {
            column.algorithm.name = name;
        }
    }

    function seedMembers(list) {
        if (!list?.length) return;

        let changed = false;
        const next = {...memberMap};
        for (const member of list) {
            if (member?.did) {
                next[member.did] = member;
                changed = true;
            }
        }

        if (changed) {
            memberMap = next;
        }
    }

    async function loadMembers() {
        if (membersLoading || !currentAgent) return;
        membersLoading = true;

        try {
            let cursor = '';
            for (let i = 0; i < 20; i++) {
                const res = await currentAgent.xrpc.get('chat.bsky.convo.getConvoMembers', {convoId: column.algorithm.id, limit: 100, cursor: cursor}, {
                    headers: {
                        'atproto-proxy': CHAT_PROXY,
                    }
                });
                seedMembers(res?.members);
                cursor = res?.cursor || '';
                if (!cursor) break;
            }
        } catch (e) {
            console.error(e);
        } finally {
            membersLoading = false;
        }
    }

    let convoReloadTimer: ReturnType<typeof setTimeout>;

    function debouncedLoadConvo() {
        clearTimeout(convoReloadTimer);
        convoReloadTimer = setTimeout(loadConvo, 2000);
    }

    function handleLeave() {
        if (onleave) {
            onleave();
        } else if (isJunk) {
            goto('/chat');
        }
    }

    async function acceptRequest() {
        try {
            await currentAgent.xrpc.post('chat.bsky.convo.acceptConvo', {convoId: column.algorithm.id}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            if (convo) {
                convo = {...convo, status: 'accepted'};
            }
            currentAgent.updateChatCount();
            onrefresh?.();
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }

    async function declineRequest() {
        declineConfirmOpen = false;

        try {
            await currentAgent.xrpc.post('chat.bsky.convo.leaveConvo', {convoId: column.algorithm.id}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            currentAgent.updateChatCount();
            onrefresh?.();
            handleLeave();
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        }
    }

    function setScrollTop(value: number) {
        if (!scrollEl) return;
        const target = Math.max(0, value);
        if (Math.abs(scrollEl.scrollTop - target) < 0.5) return;
        ignoreScroll = true;
        scrollEl.scrollTop = target;
        requestAnimationFrame(() => { ignoreScroll = false; });
    }

    function pinBottom() {
        if (!scrollEl) return;
        setScrollTop(scrollEl.scrollHeight - scrollEl.clientHeight);
    }

    function jumpToBottom() {
        anchorActive = false;
        stickBottom = true;
        showNewPill = false;
        pinBottom();
    }

    function scrollToBottomSmooth() {
        if (!scrollEl) return;
        anchorActive = false;
        stickBottom = true;
        showNewPill = false;
        scrollEl.scrollTo({top: scrollEl.scrollHeight, behavior: 'smooth'});
    }

    function handleScroll() {
        if (ignoreScroll || !scrollEl) return;
        anchorActive = false;
        const dist = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
        stickBottom = dist <= BOTTOM_THRESHOLD;
        if (stickBottom) showNewPill = false;
    }

    function captureAnchor() {
        anchorEl = null;
        anchorActive = false;
        if (!scrollEl || !contentEl) return;

        const top = scrollEl.getBoundingClientRect().top;
        for (const child of Array.from(contentEl.children) as HTMLElement[]) {
            if (child.classList.contains('infinite-loading') || child.classList.contains('chat-date-separator')) continue;
            const rect = child.getBoundingClientRect();
            if (rect.bottom > top + 1) {
                anchorEl = child;
                anchorTop = rect.top;
                anchorActive = true;
                break;
            }
        }
    }

    function correctAnchor() {
        if (!anchorEl || !scrollEl) return;

        if (!anchorEl.isConnected) {
            anchorActive = false;
            anchorEl = null;
            return;
        }

        const delta = anchorEl.getBoundingClientRect().top - anchorTop;
        if (Math.abs(delta) > 0.5) {
            setScrollTop(scrollEl.scrollTop + delta);
        }
    }

    $effect(() => {
        const content = contentEl;
        const scroller = scrollEl;
        if (!content || !scroller) return;

        const observer = new ResizeObserver(() => {
            if (anchorActive) {
                correctAnchor();
            } else if (stickBottom) {
                pinBottom();
            }
        });
        observer.observe(content);
        observer.observe(scroller);
        return () => observer.disconnect();
    });

    let prevLastId: string | null | undefined = undefined;

    $effect(() => {
        const last = feed.at(-1) as any;
        const lastId = last?.id ?? null;

        if (lastId === prevLastId) return;
        const wasTracking = prevLastId !== undefined;
        prevLastId = lastId;

        if (!wasTracking || !last) return;

        const mine = last.sender?.did === myDid;

        if (mine) {
            anchorActive = false;
            stickBottom = true;
            showNewPill = false;
            tick().then(pinBottom);
        } else if (stickBottom) {
            anchorActive = false;
            tick().then(pinBottom);
        } else {
            showNewPill = true;
        }
    });

    function feedHasId(id: string): boolean {
        return columnState.getFeed(column.id).some(item => item.id === id);
    }

    function appendMessage(message) {
        if (!message?.id || feedHasId(message.id)) return;
        columnState.replaceFeed(column.id, f => [...f, message]);
    }

    function replaceMessage(message) {
        columnState.replaceFeed(column.id, f => f.map(item => {
            if (item.id === message.id) {
                return message;
            }
            return item;
        }));
    }

    $effect(() => {
        const did = myDid;
        const convoId = column.algorithm.id;
        if (!did || !convoId) return;
        return chatRealtime.register(did, convoId, applyLog);
    });

    function applyLog(log) {
        if (log.relatedProfiles?.length) {
            seedMembers(log.relatedProfiles);
        }

        switch (log.$type) {
            case 'chat.bsky.convo.defs#logCreateMessage': {
                const message = log.message;
                if (!message?.id) break;

                if (!feedHasId(message.id)) {
                    appendMessage(message);

                    if (message.sender?.did !== myDid) {
                        scheduleUpdateRead();

                        if (column.settings?.playSound) {
                            instantPlaySound(column.settings.playSound);
                        }
                    }
                }
                break;
            }
            case 'chat.bsky.convo.defs#logDeleteMessage':
            case 'chat.bsky.convo.defs#logAddReaction':
            case 'chat.bsky.convo.defs#logRemoveReaction': {
                if (log.message?.id) {
                    replaceMessage(log.message);
                }
                break;
            }
            default: {
                if (log.message?.$type === SYSTEM_MESSAGE_VIEW_TYPE && log.message.id && !feedHasId(log.message.id)) {
                    appendMessage(log.message);
                    debouncedLoadConvo();
                }
            }
        }
    }

    let readTimer: ReturnType<typeof setTimeout>;
    let hasUnseenIncoming = false;

    function scheduleUpdateRead() {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
            hasUnseenIncoming = true;
            return;
        }

        hasUnseenIncoming = false;
        clearTimeout(readTimer);
        readTimer = setTimeout(async () => {
            try {
                await currentAgent.xrpc.post('chat.bsky.convo.updateRead', {convoId: column.algorithm.id}, {
                    headers: {
                        'atproto-proxy': CHAT_PROXY,
                    }
                });
                currentAgent.updateChatCount();
            } catch (e) {
                console.error(e);
            }
        }, 1500);
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible' && hasUnseenIncoming) {
            scheduleUpdateRead();
        }
    }

    onDestroy(() => {
        clearTimeout(readTimer);
        clearTimeout(convoReloadTimer);
    });

    async function sendMessage(record) {
        const target = replyTarget;
        const pending = {
            localId: self.crypto.randomUUID(),
            record: record,
            status: 'sending',
            sentAt: new Date().toISOString(),
            replyTo: target ?? undefined,
        };

        if (target) {
            record.replyTo = { messageId: target.id };
        }

        replyTarget = undefined;
        pendingMessages.push(pending);
        await tick();
        jumpToBottom();
        await transmit(pending.localId);
    }

    async function transmit(localId: string) {
        const pending = pendingMessages.find(p => p.localId === localId);
        if (!pending) return;

        pending.status = 'sending';
        sendingCount++;

        try {
            const res = await currentAgent.xrpc.post('chat.bsky.convo.sendMessage', {
                convoId: column.algorithm.id,
                message: pending.record,
            }, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });

            pendingMessages = pendingMessages.filter(p => p.localId !== localId);
            appendMessage(res);
        } catch (e) {
            console.error(e);
            pending.status = 'failed';
            toast.error($_(chatErrorKey(e)));
        } finally {
            sendingCount--;
        }
    }

    function retrySend(localId: string) {
        transmit(localId);
    }

    function discardPending(localId: string) {
        pendingMessages = pendingMessages.filter(p => p.localId !== localId);
    }

    function handleStartReply(message: any) {
        replyTarget = message;
    }

    function requestHighlight(messageId: string) {
        if (highlightId !== messageId) {
            highlightId = messageId;
            return;
        }

        highlightId = null;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => { highlightId = messageId; });
        });
    }

    function scrollToReply(messageId: string) {
        const el = contentEl?.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`) as HTMLElement | null;

        if (!el || !scrollEl) {
            toast.error($_('chat_reply_not_loaded'));
            return;
        }

        anchorActive = false;
        stickBottom = false;

        const maxTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
        const target = scrollEl.scrollTop + (el.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top) - scrollEl.clientHeight * 0.3;
        scrollEl.scrollTo({ top: Math.max(0, Math.min(maxTop, target)), behavior: 'smooth' });

        requestHighlight(messageId);
    }

    const handleLoadMore = async (loaded, complete) => {
        const finish = () => {
            historyComplete = true;
            complete();
        };

        if (!currentAgent) {
            finish();
            return;
        }

        try {
            const res = await currentAgent.xrpc.get('chat.bsky.convo.getMessages', {cursor: column.data.cursor, limit: 50, convoId: column.algorithm.id}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });

            if (res?.cursor) {
                column.data.cursor = res.cursor;
            }

            const currentFeed = columnState.getFeed(column.id);
            const newItems = res.messages.filter(message => {
                return !currentFeed.some(item => item.id === message.id);
            }).reverse();

            if (firstLoad) {
                columnState.replaceFeed(column.id, f => [...newItems, ...f]);
                await tick();
                stickBottom = true;
                pinBottom();
            } else {
                anchorActive = false;
                const prevHeight = scrollEl?.scrollHeight ?? 0;
                const prevTop = scrollEl?.scrollTop ?? 0;
                columnState.replaceFeed(column.id, f => [...newItems, ...f]);
                await tick();
                if (scrollEl) {
                    setScrollTop(prevTop + scrollEl.scrollHeight - prevHeight);
                    captureAnchor();
                }
            }

            if (column.data.cursor && res.messages.length) {
                firstLoad = false;
                loaded();
            } else {
                finish();
            }
        } catch (e) {
            if (e.message === 'XRPC Not Supported') {
                setTimeout(() => {
                    loaded();
                }, 1000)
            } else {
                console.error(e);
                finish();
            }
        } finally {
            isReady = true;
        }
    }
</script>

<svelte:document onvisibilitychange={handleVisibilityChange} />

<div class="chat-view">
  {#if convo}
    <ChatHeader {convo} _agent={currentAgent} {onback} onconvoupdate={updateConvo} onleave={handleLeave}></ChatHeader>
  {/if}

  <div class="chat-messages-wrap">
    <div class="chat-messages" class:chat-messages--ready={isReady} bind:this={scrollEl} onscroll={handleScroll}>
      <div class="chat-content" bind:this={contentEl}>
      {#key unique}
          {#if settingsState.pdsRequestReady && !historyComplete}
              <Infinite oninfinite={handleLoadMore}></Infinite>
          {/if}
      {/key}

      {#each feed as data, i (data.id ?? data)}
        {@const meta = clusterMeta[i]}

        {#if meta?.newDay && data.sentAt}
          <ChatDateSeparator date={new Date(data.sentAt)}></ChatDateSeparator>
        {/if}

        {#if data.$type === SYSTEM_MESSAGE_VIEW_TYPE}
          <SystemMessage message={data} {convo} members={memberMap}></SystemMessage>
        {:else if data.$type === DELETED_MESSAGE_VIEW_TYPE}
          <ChatItemDeleted message={data} _agent={currentAgent}></ChatItemDeleted>
        {:else}
          <ChatItem
              message={data}
              _agent={currentAgent}
              convoId={column.algorithm.id}
              {convo}
              members={memberMap}
              showSender={isGroup && !meta.mine && meta.start}
              clusterStart={meta.start}
              clusterEnd={meta.end}
              {replaceMessage}
              onreply={handleStartReply}
              onjump={scrollToReply}
              {highlightId}
              onhighlightend={() => highlightId = null}
          ></ChatItem>
        {/if}
      {/each}

      {#each pendingMessages as pending (pending.localId)}
        <ChatItemPending {pending} onretry={retrySend} ondiscard={discardPending} {convo} members={memberMap} onjump={scrollToReply}></ChatItemPending>
      {/each}
      </div>
    </div>

    {#if showNewPill}
      <button class="chat-new-pill" onclick={scrollToBottomSmooth}>
        <ChevronDown size="16" color="var(--bg-color-1)"></ChevronDown>
        {$_('chat_new_messages')}
      </button>
    {/if}
  </div>

  <div class="chat-input">
    {#if isRequest}
      <div class="chat-request-bar">
        <p class="chat-request-bar__text">{$_('chat_request_prompt')}</p>

        <div class="chat-request-bar__buttons">
          <button class="button button--ssl" onclick={acceptRequest}>{$_('chat_request_accept')}</button>
          <button class="button button--ssl button--border" onclick={() => {declineConfirmOpen = true}}>{$_('chat_request_decline')}</button>
        </div>
      </div>
    {:else}
      {#await import('$lib/components/chat/ChatPublish.svelte') then { default: ChatPublish }}
        <ChatPublish id={column.algorithm.id} _agent={currentAgent} {convo} onsend={sendMessage} isSending={sendingCount > 0} {replyTarget} members={memberMap} oncancelreply={() => replyTarget = undefined}></ChatPublish>
      {/await}
    {/if}
  </div>
</div>

{#if declineConfirmOpen}
  <ConfirmModal on:ok={declineRequest} on:cancel={() => {declineConfirmOpen = false}} yesText={$_('chat_request_decline')} cancelText={$_('cancel')}>
    <p class="chat-decline-confirm">{$_('chat_request_decline_confirm')}</p>
  </ConfirmModal>
{/if}

<style lang="postcss">
  .chat-view {
      height: 100%;
      max-height: 100dvh;
      display: flex;
      flex-direction: column;
      min-height: 0;
      position: relative;
      cursor: initial;
  }

  .chat-messages-wrap {
      position: relative;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
  }

  .chat-messages {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      overflow-x: hidden;
      overflow-anchor: none;
      overscroll-behavior: contain;
      padding: 16px;
      scrollbar-width: thin;
      scrollbar-color: var(--scroll-bar-color) var(--scroll-bar-bg-color);
      opacity: 0;
      transition: opacity .15s ease-out;

      &--ready {
          opacity: 1;
      }

      > :global(*) {
          flex-shrink: 0;
      }
  }

  .chat-content {
      margin-top: auto;
  }

  .chat-new-pill {
      position: absolute;
      bottom: 12px;
      left: 50%;
      translate: -50% 0;
      display: flex;
      align-items: center;
      gap: 4px;
      height: 32px;
      padding: 0 14px;
      border-radius: 16px;
      background-color: var(--primary-color);
      color: var(--bg-color-1);
      font-size: 13px;
      font-weight: bold;
      box-shadow: 0 2px 8px rgba(0, 0, 0, .25);
      z-index: 5;
  }

  .chat-input {
      flex-shrink: 0;
      border-top: 1px solid var(--border-color-2);
      background-color: var(--timeline-bg-color);
      padding-bottom: var(--safe-area-bottom);
  }

  .chat-request-bar {
      padding: 12px 16px;
      text-align: center;

      &__text {
          font-size: 13px;
          color: var(--text-color-3);
          margin-bottom: 8px;
          line-height: 1.5;
      }

      &__buttons {
          display: flex;
          justify-content: center;
          gap: 8px;
      }
  }

  .chat-decline-confirm {
      margin-bottom: 16px;
  }
</style>
