<script lang="ts">
    import Search from '@lucide/svelte/icons/search';
    import { _ } from 'svelte-i18n';
    import ListMember from "$lib/components/list/ListMember.svelte";
    import X from '@lucide/svelte/icons/x';

    let { _agent, selected = $bindable<any[]>([]), max = 49, excludeDids = [] } = $props();
    let search = $state('');
    let actors = $state.raw<any[]>([]);
    let timer: ReturnType<typeof setTimeout>;

    function handleKeyDown() {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            try {
                const res = await _agent.xrpc.get('app.bsky.actor.searchActorsTypeahead', {term: search, limit: 10});
                actors = res.actors;
            } catch (e) {
                console.error(e);
            }
        }, 250);
    }

    function handleAdd(e) {
        const actor = e.detail.member;

        if (selected.length >= max || selected.some(member => member.did === actor.did)) {
            return;
        }

        selected = [...selected, actor];
    }

    function remove(did: string) {
        selected = selected.filter(member => member.did !== did);
    }

    function isExcluded(member): boolean {
        return member.did === _agent.did()
            || excludeDids.includes(member.did)
            || selected.some(s => s.did === member.did);
    }
</script>

<div class="actor-multi-select">
  {#if selected.length}
    <ul class="actor-chips">
      {#each selected as member (member.did)}
        <li class="actor-chips__item">
          {#if member.avatar}
            <img class="actor-chips__avatar" src={member.avatar} alt="" loading="lazy" width="40" height="40">
          {/if}

          <span class="actor-chips__name">{member.displayName || member.handle}</span>

          <button class="actor-chips__remove" onclick={() => remove(member.did)} aria-label="Remove">
            <X size="14" color="var(--text-color-3)"></X>
          </button>
        </li>
      {/each}
    </ul>

    <p class="actor-multi-select__count">{selected.length} / {max}</p>
  {/if}

  <div class="actor-multi-select-search">
    <input type="text" class="actor-multi-select-search__input" placeholder={$_('handle_or_name')} bind:value={search} onkeydown={handleKeyDown}>
    <Search size={20} color="var(--primary-color)" />
  </div>

  {#each actors as member (member.did)}
    <ListMember
        member={member}
        action={'add'}
        exclude={isExcluded(member)}
        on:add={handleAdd}
    ></ListMember>
  {/each}
</div>

<style lang="postcss">
  .actor-chips {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;

      &__item {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--bg-color-2);
          border: 1px solid var(--border-color-2);
          border-radius: 16px;
          padding: 4px 8px 4px 4px;
          font-size: 13px;
      }

      &__avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          object-fit: cover;
          display: block;
      }

      &__name {
          max-width: 120px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
      }

      &__remove {
          display: grid;
          place-content: center;
      }
  }

  .actor-multi-select__count {
      color: var(--text-color-3);
      font-size: 12px;
      text-align: right;
      margin-bottom: 8px;
  }

  .actor-multi-select-search {
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
