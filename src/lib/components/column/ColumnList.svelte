<script lang="ts">
    import { flip } from 'svelte/animate';
    import { dndzone } from 'svelte-dnd-action';
    export let items;
    const flipDurationMs = 300;
    function handleDndConsider(e) {
        items = e.detail.items;
    }
    function handleDndFinalize(e) {
        items = e.detail.items;
    }
</script>

<div class="column-list" use:dndzone={{items: items, flipDurationMs}} on:consider={handleDndConsider} on:finalize={handleDndFinalize}>
  {#each items as column, index (column.id)}
    <div class="column-list__item" animate:flip="{{duration: flipDurationMs}}">
      <p class="column-list__title">{column.algorithm.name}</p>
    </div>
  {/each}
</div>

<style lang="postcss">
    .column-list {
        display: grid;
        gap: 15px;
        grid-auto-rows: min-content;

        &__item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
            box-shadow: 0 0 10px var(--box-shadow-color-1);
            border-radius: 6px;
            font-weight: 600;
        }
    }
</style>