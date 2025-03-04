<script lang="ts">
  import {agents, isRealtimeListenersModalOpen} from "$lib/stores";
  import {getAccountIdByDid} from "$lib/util";
  import {RealtimeClient} from "$lib/realtime";
  import {onDestroy} from "svelte";
  import {_} from "svelte-i18n";
  import Modal from "$lib/components/ui/Modal.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";

  const columnState = getColumnState();
  let listeners = $state(new Set());
  let clients = new Map();

  $effect(() => {
      updateRealtimeListeners(columnState.columns);
  })

  $effect(() => {
      updateRealtimeConnection(listeners);
  })

  function updateRealtimeListeners(columns) {
      let _listeners = new Set();
      columns.forEach(column => {
          const _agent = $agents.get(getAccountIdByDid($agents, column.did));
          if (_agent) {
            const host = _agent.agent.service.host === 'bsky.social' ? 'Jetstream (us-west2)' : _agent.agent.service.host;

            if (column.settings?.autoRefresh === -1) {
              _listeners.add(host);
            }
          }
      });
      listeners = _listeners;
  }

  function updateRealtimeConnection(listeners) {
      if (listeners.size > 0) {
          listeners.forEach(host => {
              let client = clients.get(host);
              if (!client) {
                  client = new RealtimeClient(host);
                  clients.set(host, client);
              }

              client.connect();
          });
      }

      clients.forEach((value, key) => {
          if (!listeners.has(key)) {
              if (value) {
                  value.disconnect();
              }
              clients.set(key, null);
              clients.delete(key);
          }
      });
  }

  onDestroy(() => {
      clients.forEach((value, key) => {
          if (value) {
              value.disconnect();
          }
          clients.set(key, null);
          clients.delete(key);
      });
  });
</script>

{#if $isRealtimeListenersModalOpen}
  <Modal title={$_('realtime_listeners_title')} onclose={() => {$isRealtimeListenersModalOpen = false}}>
    <div class="realtime-listeners-list">
      {#each clients as [host, socket]}
        {#if socket}
          <div class="realtime-listeners-list__item">
            <h3 class="realtime-listeners-list__title">{host}</h3>
            <p class="realtime-listeners-list__status">{$_('realtime_listeners_status_' + socket.status())}</p>

            <div class="realtime-listeners-list__buttons">
              <button class="button button--ss" onclick={() => {socket.reconnect(); $isRealtimeListenersModalOpen = false}}>{$_('realtime_listeners_reconnect')}</button>
              <button class="button button--ss" onclick={() => {socket.disconnect(); $isRealtimeListenersModalOpen = false}}>{$_('realtime_listeners_disconnect')}</button>
            </div>
          </div>
        {/if}
      {/each}
    </div>
  </Modal>
{/if}


<style lang="postcss">
  .realtime-listeners-list {
      &__item {
          margin-bottom: 16px;
      }

      &__title {
          line-height: 1.5;
          font-size: 16px;
      }

      &__status {
          font-size: 14px;
          margin: 4px 0 8px;
      }
  }
</style>