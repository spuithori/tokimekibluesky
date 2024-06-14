<script lang="ts">
    import {createEventDispatcher, onMount} from 'svelte';
    import { _ } from 'svelte-i18n';
    import Modal from "$lib/components/ui/Modal.svelte";
    import {agent, junkColumns} from "$lib/stores";
    import ListMember from "$lib/components/list/ListMember.svelte";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import {goto} from "$app/navigation";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import {toast} from "svelte-sonner";
    const dispatch = createEventDispatcher();

    export let _agent = $agent;
    export let convos;
    let search = '';
    let actors = [];
    let timer;

    async function handleKeyDown() {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const res = await _agent.agent.api.app.bsky.actor.searchActorsTypeahead({term: search, limit: 10})
            actors = res.data.actors;
        }, 250);
    }

    async function handleSelect(e) {
        const actor = e.detail.member;

        try {
            const res = await $agent.agent.api.chat.bsky.convo.getConvoForMembers(
                {
                    members: [$agent.did(), actor.did as string]
                },
                {
                    headers: {
                        'atproto-proxy': CHAT_PROXY,
                    }
                }
            );

            const convo = res.data.convo;

            if ($junkColumns.findIndex(_column => _column.id === 'chat_' + convo.id) === -1) {
                junkColumns.set([...$junkColumns, {
                    id: 'chat_' + convo.id,
                    algorithm: {
                        id: convo.id,
                        type: 'chat',
                        name: convo.members.filter(member => member.did !== _agent.did())[0].displayName || convo.members.filter(member => member.did !== _agent.did())[0].handle,
                    },
                    style: 'default',
                    settings: {
                        ...defaultDeckSettings,
                        playSound: 'notification1',
                    },
                    did: _agent.did(),
                    handle: _agent.handle(),
                    data: {
                        feed: [],
                        cursor: '',
                    }
                }]);
            }

            await goto(`/chat/${convo.id}`);
        } catch (e) {
            if (e.message === 'recipient has disabled incoming messages') {
                toast.error($_('error_chat_incoming_disabled'));
            } else {
                console.error(e);
            }
        }
    }
</script>

<Modal title={$_('start_new_chat')} size="fixed" on:close>
  <div class="new-chat">
    <div class="new-chat-search">
      <input type="text" class="new-chat-search__input" placeholder={$_('handle_or_name')} bind:value={search} on:keydown={handleKeyDown} autofocus>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    </div>

    {#each actors as member}
      {#if (typeof member !== 'string')}
        <ListMember
                member={member}
                action={'chat'}
                exclude={member?.associated?.chat?.allowIncoming === 'none' || (!member?.viewer?.followedBy && member?.associated?.chat?.allowIncoming === 'following') || !member?.associated?.chat?.allowIncoming}
                on:add={handleSelect}
        ></ListMember>
      {/if}
    {/each}
  </div>
</Modal>

<style lang="postcss">
  .new-chat-search {
      position: relative;
      margin-bottom: 16px;

      &__input {
          border: 1px solid var(--border-color-1);
          background-color: var(--bg-color-2);
          height: 40px;
          border-radius: 20px;
          padding: 0 40px 0 20px;
          color: var(--text-color-1);
          width: 100%;

          &:placeholder-shown {
              color: var(--text-color-3);
          }
      }

      svg {
          position: absolute;
          right: 16px;
          top: 0;
          bottom: 0;
          margin: auto;
          pointer-events: none;
      }
  }
</style>