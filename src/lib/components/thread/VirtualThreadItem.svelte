<script lang="ts">
    import TimelineItem from "../../../routes/(app)/TimelineItem.svelte";
    import {createEventDispatcher} from "svelte";
    const dispatch = createEventDispatcher();

    export let column;
    export let depth;
    export let index;
    export let _agent;
    let item;
</script>

<TimelineItem
    bind:this={item}
    data={ column.data.feed[index] }
    index={index}
    column={column}
    {_agent}
    isSingle={true}
    isThread={true}
></TimelineItem>