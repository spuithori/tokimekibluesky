<script lang="ts">
  import type {LayoutData} from './$types';
  import {type JunkColumnDescriptor} from "$lib/junkColumn";
  import JunkColumn from "../../JunkColumn.svelte";
  import {getAgentContext} from "./state.svelte";

  interface Props {
    data: LayoutData;
  }
  let { data }: Props = $props();

  const agentContext = getAgentContext();

  const descriptor: JunkColumnDescriptor = $derived({
      id: 'profile_' + data.params.handle,
      algorithm: {
          algorithm: data.params.handle,
          type: 'author',
          name: '@' + data.params.handle,
      },
      did: agentContext.agent.did(),
      handle: agentContext.agent.handle(),
      settings: {
          timeline: {
              hideReply: 'all',
              hideRepost: 'all',
              hideQuote: false,
              hideMention: 'all',
              simpleReply: false,
          }
      },
  });
</script>

<svelte:head>
  <title>{data.params.handle} - TOKIMEKI</title>
</svelte:head>

<JunkColumn {descriptor} _agent={agentContext.agent}></JunkColumn>
