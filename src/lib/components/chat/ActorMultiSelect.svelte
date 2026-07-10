<script lang="ts">
    import Search from '@lucide/svelte/icons/search';
    import { _ } from 'tokimeki-i18n';
    import { onDestroy } from "svelte";
    import ListMember from "$lib/components/list/ListMember.svelte";
    import X from '@lucide/svelte/icons/x';
    import Plus from '@lucide/svelte/icons/plus';
    import Minus from '@lucide/svelte/icons/minus';

    let { _agent, selected = $bindable<any[]>([]), excluded = $bindable<any[]>([]), negatable = false, allowSelf = false, max = 49, excludeDids = [], ariaLabel = undefined } = $props();
    let search = $state('');
    let actors = $state.raw<any[]>([]);
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;

    function handleKeyDown() {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const term = search.trim();
            if (!term) {
                controller?.abort();
                actors = [];
                return;
            }

            controller?.abort();
            controller = new AbortController();
            const signal = controller.signal;

            try {
                const res = await _agent.xrpc.get('app.bsky.actor.searchActorsTypeahead', {term, limit: 10}, {signal});
                actors = res.actors;
            } catch (e: any) {
                if (e?.name === 'AbortError' || signal.aborted) {
                    return;
                }
                console.error(e);
            }
        }, 250);
    }

    onDestroy(() => {
        clearTimeout(timer);
        controller?.abort();
    });

    function handleAdd(e: CustomEvent<{ member: any }>) {
        const actor = e.detail.member;

        if (selected.length + excluded.length >= max || selected.some(member => member.did === actor.did) || excluded.some(member => member.did === actor.did)) {
            return;
        }

        selected = [...selected, actor];
    }

    function remove(did: string, negated: boolean) {
        if (negated) {
            excluded = excluded.filter(member => member.did !== did);
        } else {
            selected = selected.filter(member => member.did !== did);
        }
    }

    function toggleNegate(member: any, negated: boolean) {
        if (negated) {
            excluded = excluded.filter(m => m.did !== member.did);
            if (!selected.some(m => m.did === member.did)) {
                selected = [...selected, member];
            }
        } else {
            selected = selected.filter(m => m.did !== member.did);
            if (!excluded.some(m => m.did === member.did)) {
                excluded = [...excluded, member];
            }
        }
    }

    function isExcluded(member: any): boolean {
        return (!allowSelf && member.did === _agent.did())
            || excludeDids.includes(member.did)
            || selected.some(s => s.did === member.did)
            || excluded.some(s => s.did === member.did);
    }
</script>

{#snippet chip(member: any, negated: boolean)}
    <li class={['actor-chips__item', negated && 'actor-chips__item--negated']}>
      {#if negatable}
        <button type="button" class="actor-chips__negate" onclick={() => toggleNegate(member, negated)} aria-pressed={negated} title={$_('search_filter_exclude_toggle')} aria-label={$_('search_filter_exclude_toggle')}>
          {#if negated}
            <Minus size="12" color="var(--danger-color)"></Minus>
          {:else}
            <Plus size="12" color="var(--text-color-3)"></Plus>
          {/if}
        </button>
      {/if}

      {#if member.avatar}
        <img class="actor-chips__avatar" src={member.avatar} alt="" loading="lazy" width="40" height="40">
      {/if}

      <span class="actor-chips__name">{member.displayName || member.handle}</span>

      <button class="actor-chips__remove" onclick={() => remove(member.did, negated)} aria-label={$_('remove')}>
        <X size="14" color="var(--text-color-3)"></X>
      </button>
    </li>
{/snippet}

<div class="actor-multi-select">
  {#if selected.length || excluded.length}
    <ul class="actor-chips">
      {#each selected as member (member.did)}
        {@render chip(member, false)}
      {/each}
      {#each excluded as member (member.did)}
        {@render chip(member, true)}
      {/each}
    </ul>

    <p class="actor-multi-select__count">{selected.length + excluded.length} / {max}</p>
  {/if}

  <div class="actor-multi-select-search">
    <input type="text" class="actor-multi-select-search__input" placeholder={$_('handle_or_name')} aria-label={ariaLabel ?? $_('handle_or_name')} bind:value={search} onkeydown={handleKeyDown}>
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

          &--negated {
              border-color: var(--danger-color);

              .actor-chips__name {
                  text-decoration: line-through;
              }
          }
      }

      &__negate {
          display: grid;
          place-content: center;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 1px solid var(--border-color-2);

          &:hover {
              border-color: var(--primary-color);
          }
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

      :global(svg) {
          position: absolute;
          right: 16px;
          top: 0;
          bottom: 0;
          margin: auto;
          pointer-events: none;
      }
  }
</style>
