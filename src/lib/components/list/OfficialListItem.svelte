<script lang="ts">
  import {_} from "svelte-i18n";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import {agent, columns} from "$lib/stores";
  import toast from "svelte-french-toast";
  import {createEventDispatcher} from "svelte";
  import {List} from "lucide-svelte";
  const dispatch = createEventDispatcher();

  export let _agent = $agent;

  export let list = undefined;
  let items = [];
  export let uri = '';
  let isColumnAdded;

  if (!list && uri) {
      _agent.agent.api.app.bsky.graph.getList({list: uri})
          .then(value => {
              list = value.data.list;
              items = value.data.items;
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

        {#if list.purpose === 'app.bsky.graph.defs#modlist'}
          <span class="list-item__label">{$_('mute_list')}</span>
        {/if}
      </h3>

      <p class="list-item__description">
        {#if items.length}
          {items.length}{$_('list_members_length_suffix')}
          {#if list.description}
            ・
          {/if}
        {/if}
        {#if list.description}
          {list.description}
        {/if}
      </p>
    </div>

    <div class="list-item__buttons">
      <button class="button button--ss" on:click={addColumn} disabled={isColumnAdded}>{$_('feed_quick_add')}</button>
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
      }

      &__buttons {
          margin-top: 8px;
      }
  }
</style>