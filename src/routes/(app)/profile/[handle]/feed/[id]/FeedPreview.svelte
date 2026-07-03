<script lang="ts">
  import {type JunkColumnDescriptor} from "$lib/junkColumn";
  import JunkColumn from "../../../../JunkColumn.svelte";

  let { id, did, title, _agent, contentMode } = $props();

  const descriptor: JunkColumnDescriptor = $derived({
      id: `feed_${id}_${_agent.did()}`,
      algorithm: {
          algorithm: 'at://' + did + '/app.bsky.feed.generator/' + id,
          type: 'custom',
          name: title || '',
      },
      style: contentMode === 'app.bsky.feed.defs#contentModeVideo' ? 'video' : 'default',
      did: _agent.did(),
      handle: _agent.handle(),
  });
</script>

<JunkColumn {descriptor} name={title} {_agent}></JunkColumn>
