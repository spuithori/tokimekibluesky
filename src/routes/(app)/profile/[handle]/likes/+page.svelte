<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import type { LayoutData } from '../$types';
  import {getAgentContext} from "../state.svelte";
  import {type JunkColumnDescriptor} from "$lib/junkColumn";
  import JunkColumn from "../../../JunkColumn.svelte";

  interface Props {
      data: LayoutData;
  }

  let { data }: Props = $props();

  const agentContext = getAgentContext();

  const descriptor: JunkColumnDescriptor = $derived({
      id: `like_${data.params.handle}_${agentContext.agent.did()}`,
      algorithm: {
          algorithm: data.params.handle,
          type: 'authorLike',
          name: '',
      },
      did: agentContext.agent.did(),
      handle: agentContext.agent.handle(),
  });
</script>

<svelte:head>
  <title>{data.params.handle} {$_('page_title_likes')} - TOKIMEKI</title>
</svelte:head>

<JunkColumn {descriptor}></JunkColumn>
