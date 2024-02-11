<script lang="ts">
  import spinner from "$lib/images/loading.svg";
  import {agent} from "$lib/stores";
  import toast from "svelte-french-toast";
  import {_} from "svelte-i18n";

  export let _agent = $agent;
  export let list;
  export let memberDid;

  $: isChecked = list.listItem !== '';
  let isDisabled = false;

  async function handleChange() {
      isDisabled = true;

      try {
          if (!list.listItem) {
              const res = await _agent.agent.api.app.bsky.graph.listitem.create(
                  {
                      repo: _agent.did() as string,
                  },
                  {
                      subject: memberDid,
                      list: list.uri,
                      createdAt: new Date().toISOString(),
                  }
              )

              list.listItem = res.uri;
          } else {
              await _agent.agent.api.app.bsky.graph.listitem.delete(
                  {
                      repo: _agent.did() as string,
                      rkey: list.listItem.split('/').slice(-1)[0],
                  }
              )

              list.listItem = '';
          }

          isDisabled = false;
      } catch(e) {
          console.error(e);
          toast.error(e.message);
      }
  }
</script>

<div class="list-add-item">
  <div class="list-add-item__content">
    <h2 class="list-add-item__title">
      {#if list?.purpose === 'app.bsky.graph.defs#modlist'}
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle-off"><path d="M20.5 14.9A9 9 0 0 0 9.1 3.5"/><path d="m2 2 20 20"/><path d="M5.6 5.6C3 8.3 2.2 12.5 4 16l-2 6 6-2c3.4 1.8 7.6 1.1 10.3-1.7"/></svg>
      {/if}
      {list.name}
    </h2>
  </div>

  <div class="list-add-item__buttons">
    {#if isDisabled}
      <div class="list-add-item__process">
        <img src={spinner} alt="">
      </div>
    {/if}
    <div class="input-toggle">
      <input class="input-toggle__input" type="checkbox" id={list.uri} bind:checked={isChecked} disabled={isDisabled} on:click|preventDefault={handleChange}><label class="input-toggle__label" for={list.uri}></label>
    </div>
  </div>
</div>

<style lang="postcss">
    .list-add-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 8px 0;
        border-bottom: 1px solid var(--border-color-2);

        &__title {
            font-size: 16px;
            letter-spacing: .025em;
            display: flex;
            gap: 8px;
            align-items: center;

            svg {
                flex-shrink: 0;
            }
        }

        &__buttons {
            display: flex;
            align-items: center;
            gap: 8px;
        }
    }
</style>