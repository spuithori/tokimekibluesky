<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import {toast} from "svelte-sonner";
    import ActorMultiSelect from "$lib/components/chat/ActorMultiSelect.svelte";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import {chatErrorKey} from "$lib/components/chat/chatErrors";
    import {GROUP_MEMBERS_MAX, getConvoMemberCount} from "$lib/components/chat/convoUtil";

    let { convo, _agent, onconvoupdate = undefined, ondone = undefined } = $props();
    let selected = $state<any[]>([]);
    let isAdding = $state(false);

    const remaining = $derived(Math.max(0, (convo?.kind?.memberLimit ?? GROUP_MEMBERS_MAX) - getConvoMemberCount(convo)));
    const excludeDids = $derived(convo?.members?.map(member => member.did) || []);

    async function addMembers() {
        if (!selected.length || isAdding) {
            return;
        }

        isAdding = true;

        try {
            const res = await _agent.xrpc.post('chat.bsky.group.addMembers', {
                convoId: convo.id,
                members: selected.map(member => member.did),
            }, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            onconvoupdate?.(res.convo);
            toast.success($_('chat_group_members_added'));
            selected = [];
            ondone?.();
        } catch (e) {
            console.error(e);
            toast.error($_(chatErrorKey(e)));
        } finally {
            isAdding = false;
        }
    }
</script>

<div class="group-add-members">
  <ActorMultiSelect {_agent} bind:selected={selected} max={remaining} {excludeDids}></ActorMultiSelect>

  <div class="group-add-members__submit">
    <button class="button button--ssl" disabled={!selected.length || isAdding} onclick={addMembers}>{$_('chat_group_add_members')}</button>
  </div>
</div>

<style lang="postcss">
  .group-add-members__submit {
      margin-top: 16px;
      text-align: center;
  }
</style>
