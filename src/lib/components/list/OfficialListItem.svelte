<script lang="ts">
  import {_} from "svelte-i18n";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import {agent, columns, officialListModal} from "$lib/stores";
  import { toast } from "svelte-sonner";
  import {createEventDispatcher} from "svelte";
  import {List} from "lucide-svelte";
  import OfficialListMembersModal from "$lib/components/list/OfficialListMembersModal.svelte";
  import IconColumnsEdit from "$lib/icons/columns/IconColumnsEdit.svelte";
  const dispatch = createEventDispatcher();

  export let _agent = $agent;

  export let list = undefined;
  export let title = '';
  export let isModerationList = list?.purpose === 'app.bsky.graph.defs#modlist' || false;
  let items = [];
  export let uri = '';
  export let isMute = false;
  export let isBlock = undefined;
  export let editable = false;
  let isColumnAdded;
  let isMembersOpen = false;

  if (!list && uri) {
      _agent.agent.api.app.bsky.graph.getList({list: uri, limit: 100})
          .then(value => {
              list = value.data.list;
              items = value.data.items;
              title = list.name;
              isModerationList = list.purpose === 'app.bsky.graph.defs#modlist';
              isMute = list?.viewer?.muted;
              isBlock = list?.viewer?.blocked;
          })
          .catch(e => {
              console.error(e);
          })
  }

  async function addColumn() {
      const _column = {
          id: self.crypto.randomUUID(),
          algorithm: {
              type: 'officialList',
              algorithm: list.uri,
              name: list.name,
          },
          style: 'default',
          settings: defaultDeckSettings,
          did: _agent.did(),
          handle: _agent.handle(),
          data: {
              feed: [],
              cursor: '',
          }
      }

      try {
          $columns = [...$columns, _column];

          dispatch('add');
          toast.success($_('column_added'));
          isColumnAdded = true;
      } catch (e) {
          console.error(e);
          toast.error('Error: ' + e);
      }
  }
</script>

{#if list}
  <div class="list-item">
    <div class="list-item__avatar">
      <List color="var(--text-color-3)" size="28"></List>
    </div>

    <div class="list-item__content">
      <h3 class="list-item__title">
        <a href="/profile/{list.creator.handle}/lists/{list.uri.split('/').slice(-1)[0]}">{list.name}</a>

        {#if isModerationList}
          <span class="list-item__label">{$_('mute_list')}</span>
        {/if}
      </h3>

      <p class="list-item__description">
        {#if items.length}
          <button class="list-item__members-button" on:click={() => {isMembersOpen = true}}>{items.length}{$_('list_members_length_suffix')}</button>
          {#if list.description}
            ・
          {/if}

            {#if (isMembersOpen)}
                <OfficialListMembersModal members={items} on:close={() => {isMembersOpen = false}}></OfficialListMembersModal>
            {/if}
        {/if}
        {#if list.description}
          {list.description}
        {/if}
      </p>

      <slot></slot>
    </div>

    <div class="list-item__buttons">
      {#if isModerationList}
      {:else}
        <button class="button button--ss" on:click={addColumn} disabled={isColumnAdded}>{$_('feed_quick_add')}</button>
      {/if}

      {#if editable}
        <button
          class="algo-nav-edit"
          on:click={() => {$officialListModal = {open: true, uri: list.uri}}}
          aria-label="Edit list"
        >
          <IconColumnsEdit></IconColumnsEdit>
        </button>
      {/if}
    </div>
  </div>
{/if}

<style lang="postcss">
  .list-item {
      display: grid;
      grid-template-columns: 48px 1fr auto;
      gap: 8px;
      align-items: flex-start;
      position: relative;
      padding: 8px 16px;

      &:hover {
          background-color: var(--bg-color-3);
      }

      &__avatar {
          background-color: var(--border-color-2);
          aspect-ratio: 1 / 1;
          border-radius: var(--border-radius-3);
          display: grid;
          place-content: center;
      }

      &__title {
          font-size: 16px;
          letter-spacing: .025em;
          display: flex;
          align-items: center;
          gap: 8px;

          a {
              color: inherit;

              &:hover {
                  text-decoration: underline;
              }

              &::before {
                  content: '';
                  display: block;
                  position: absolute;
                  left: 0;
                  top: 0;
                  bottom: 0;
                  right: 0;
              }
          }
      }

      &__description {
          font-size: 14px;
          color: var(--text-color-3);
      }

      &__members-button {
          color: var(--text-color-3);
          position: relative;
          z-index: 1;

          &:hover {
              text-decoration: underline;
          }
      }

      &__label {
          font-size: 12px;
          height: 24px;
          border-radius: 12px;
          background-color: var(--danger-color);
          color: #fff;
          padding: 0 8px;
          display: grid;
          place-content: center;
          letter-spacing: 0;
          flex-shrink: 0;
      }

      &__buttons {
          margin-top: 8px;
      }
  }

  .algo-nav-edit {
      position: relative;
      z-index: 2;
  }
</style>