<script lang="ts">
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import {agent} from "$lib/stores";
  import {_} from "tokimeki-i18n";
  import {onMount, createEventDispatcher} from "svelte";
  import {accountsDb} from "$lib/db";
  import {getAccountIdByDidFromDb} from "$lib/util";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";
  import Info from '@lucide/svelte/icons/info';
  import {MERGE_PALETTE} from "$lib/merge/mergePalette";
  import type {MergeSourceType} from "$lib/merge/mergeEngine";

  const dispatch = createEventDispatcher();

  let { _agent = $agent } = $props();

  type Candidate = {
      key: string,
      type: MergeSourceType,
      algorithm?: string,
      name: string,
  };

  const MAX_SOURCES = 5;

  let savedFeeds = $state<any[]>([]);
  let officialLists = $state<any[]>([]);
  let isRefreshing = $state(true);
  let selectedKeys: string[] = $state([]);

  const basicCandidates: Candidate[] = [
      { key: 'default', type: 'default' as MergeSourceType, name: 'HOME' },
  ];

  const feedCandidates: Candidate[] = $derived(savedFeeds.map(feed => ({
      key: `custom:${feed.uri}`,
      type: 'custom' as MergeSourceType,
      algorithm: feed.uri,
      name: feed.name,
  })));

  const listCandidates: Candidate[] = $derived(officialLists.map(list => ({
      key: `officialList:${list.uri}`,
      type: 'officialList' as MergeSourceType,
      algorithm: list.uri,
      name: list.name,
  })));

  const candidates: Candidate[] = $derived([...basicCandidates, ...feedCandidates, ...listCandidates]);

  const selection = $derived(selectedKeys
      .map(key => candidates.find(c => c.key === key))
      .filter(Boolean) as Candidate[]);

  const canCreate = $derived(selection.length >= 2 && selection.length <= MAX_SOURCES);

  function toggle(key: string) {
      if (selectedKeys.includes(key)) {
          selectedKeys = selectedKeys.filter(k => k !== key);
      } else if (selectedKeys.length < MAX_SOURCES) {
          selectedKeys = [...selectedKeys, key];
      }
  }

  function orderOf(key: string): number {
      return selectedKeys.indexOf(key);
  }

  function create() {
      if (!canCreate) {
          return;
      }

      const sources = selection.map(c => ({
          id: self.crypto.randomUUID(),
          type: c.type,
          algorithm: c.algorithm,
          name: c.name,
      }));

      dispatch('add', {
          column: {
              id: self.crypto.randomUUID(),
              algorithm: {
                  type: 'merge',
                  name: selection.map(c => c.name).join(' + '),
                  sources,
              },
              style: 'default',
              settings: defaultDeckSettings,
              did: _agent.did(),
              handle: _agent.handle(),
              data: {
                  feed: [],
                  cursor: '',
              },
          },
      });

      selectedKeys = [];
  }

  async function updateSources() {
      const accountId = await getAccountIdByDidFromDb(_agent.did());
      const account = await accountsDb.accounts.get(accountId);
      savedFeeds = account?.feeds || [];
      officialLists = account?.lists || [];

      try {
          const [feeds, listRes] = await Promise.all([
              _agent.getSavedFeeds(),
              _agent.xrpc.get('app.bsky.graph.getLists', {actor: _agent.did(), limit: 100, cursor: ''}),
          ]);
          savedFeeds = feeds || [];
          officialLists = (listRes.lists as any[]).filter(item => item?.purpose !== 'app.bsky.graph.defs#modlist');
      } catch (e) {
          console.error(e);
      }

      isRefreshing = false;
  }

  onMount(() => {
      updateSources();
  });
</script>

{#snippet candidateList(items: Candidate[], title: string)}
    {#if items.length}
        <div class="merge-choices__group">
            <div class="merge-choices__group-heading">
                <p class="merge-choices__group-title">{title}</p>
            </div>

            <div class="merge-choices__list">
                {#each items as candidate (candidate.key)}
                    {@const order = orderOf(candidate.key)}
                    <button
                            class="merge-choices__item"
                            class:merge-choices__item--selected={order !== -1}
                            aria-pressed={order !== -1}
                            disabled={order === -1 && selectedKeys.length >= MAX_SOURCES}
                            onclick={() => {toggle(candidate.key)}}
                    >
                        <span
                                class="merge-choices__order"
                                class:merge-choices__order--active={order !== -1}
                                style:--merge-source-color={order !== -1 ? MERGE_PALETTE[order % MERGE_PALETTE.length] : undefined}
                        >
                            {order !== -1 ? order + 1 : ''}
                        </span>

                        <span class="merge-choices__icon">
                            <ColumnIcon type={candidate.type} color="var(--text-color-3)"></ColumnIcon>
                        </span>

                        <span class="merge-choices__name">{candidate.name}</span>
                    </button>
                {/each}
            </div>
        </div>
    {/if}
{/snippet}

<div class="merge-choices">
    <p class="merge-choices__description">
        {$_('merge_select_sources')}

        {#if (isRefreshing)}
            <LoadingSpinner padding={0} size={14}></LoadingSpinner>
        {/if}
    </p>

    <p class="merge-choices__note">
        <Info size={14} color="var(--text-color-3)"></Info>
        {$_('merge_non_chrono_note')}
    </p>

    {@render candidateList(basicCandidates, $_('basic_columns'))}
    {@render candidateList(feedCandidates, $_('feed_columns'))}
    {@render candidateList(listCandidates, $_('official_list_columns'))}

    <div class="merge-choices__footer">
        <p class="merge-choices__count" class:merge-choices__count--ready={canCreate}>
            {selection.length} / {MAX_SOURCES}
        </p>

        <button class="button" disabled={!canCreate} onclick={create}>{$_('merge_create_column')}</button>
    </div>
</div>

<style lang="postcss">
    .merge-choices {
        &__description {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: var(--text-color-3);
            margin-bottom: 12px;
        }

        &__note {
            display: flex;
            align-items: flex-start;
            gap: 6px;
            font-size: 12px;
            line-height: 1.5;
            color: var(--text-color-3);
            padding: 8px 10px;
            border: 1px solid var(--border-color-2);
            border-radius: var(--border-radius-2);
            margin-bottom: 20px;

            :global(svg) {
                flex-shrink: 0;
                margin-top: 2px;
            }
        }

        &__group {
            margin-bottom: 24px;
        }

        &__group-heading {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-bottom: 8px;
        }

        &__group-title {
            font-weight: bold;
            font-size: 14px;
            letter-spacing: .025em;
        }

        &__list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 8px;

            @media (max-width: 767px) {
                grid-template-columns: 1fr;
            }
        }

        &__item {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            padding: 8px 12px;
            border: 2px solid var(--border-color-1);
            border-radius: 6px;
            background-color: var(--bg-color-1);
            color: var(--text-color-1);
            font-weight: bold;
            font-size: 14px;
            text-align: left;
            transition: border-color .1s ease, background-color .1s ease;

            &:hover:not(:disabled) {
                border-color: var(--border-color-2);
            }

            &--selected,
            &--selected:hover:not(:disabled) {
                border-color: var(--primary-color);
                background-color: color-mix(in srgb, var(--primary-color) 5%, var(--bg-color-1));
            }

            &:disabled {
                opacity: .4;
            }
        }

        &__order {
            flex-shrink: 0;
            width: 22px;
            height: 22px;
            display: grid;
            place-content: center;
            border-radius: 50%;
            border: 2px dashed var(--border-color-1);
            color: #fff;
            font-size: 12px;
            font-weight: bold;
            transition: border-color .1s ease, background-color .1s ease;

            &--active {
                border: none;
                background-color: var(--merge-source-color);
            }
        }

        &__icon {
            flex-shrink: 0;
            display: grid;
            place-content: center;
            width: 22px;
            height: 22px;
        }

        &__name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        &__footer {
            position: sticky;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 16px;
            margin: 0 -4px;
            padding: 12px 4px;
            background-color: var(--bg-color-1);
            border-top: 1px solid var(--border-color-2);
        }

        &__count {
            font-size: 14px;
            font-weight: bold;
            color: var(--text-color-3);
            font-variant-numeric: tabular-nums;

            &--ready {
                color: var(--primary-color);
            }
        }

        &__footer .button:disabled {
            opacity: .5;
        }
    }
</style>
