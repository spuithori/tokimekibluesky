<script lang="ts">
  import { untrack } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import { defaultDeckSettings } from '$lib/components/deck/defaultDeckSettings';
  import { getColumnState } from '$lib/classes/columnState.svelte';
  import { parseSearchParams, searchColumnId } from '$lib/search/searchParams';
  import { searchColumnName } from '$lib/search/searchDisplay';
  import DeckSlot from '../../../DeckSlot.svelte';
  import { getAgentContext } from '../state.svelte';

  interface Props {
    handle: string;
    query: string;
  }

  let { handle, query }: Props = $props();

  const agentContext = getAgentContext();
  const columnState = getColumnState(true);
  const parsed = untrack(() => parseSearchParams(new URLSearchParams({ q: `from:${handle} ${query}`, sort: 'latest' })));
  const columnId = searchColumnId(parsed);

  const viewer = agentContext.agent;

  if (viewer && !columnState.hasColumn(columnId)) {
      columnState.add({
          id: columnId,
          algorithm: {
              algorithm: parsed.query,
              type: 'search',
              name: searchColumnName(parsed, $_),
              sort: parsed.sort,
              searchFilters: parsed.filters,
          },
          style: 'default',
          settings: defaultDeckSettings,
          did: viewer.did(),
          handle: viewer.handle(),
          data: {
              feed: [],
              cursor: '',
          },
      });
  }
</script>

{#if columnState.hasColumn(columnId)}
  <DeckSlot index={columnState.getColumnIndex(columnId)} isJunk={true} _agent={agentContext.agent}></DeckSlot>
{/if}
