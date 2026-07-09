<script lang="ts">
    import { effectLayerRegistry } from '$lib/rice/modules/registries.svelte';
</script>

{#each [...effectLayerRegistry.entries()] as [id, layer] (id)}
    <div class="rice-effect-layer" style:z-index={layer.zIndex}>
        {#await layer.loader() then loaded}
            {@const Layer = loaded.default}
            <Layer options={layer.getOptions?.()}></Layer>
        {/await}
    </div>
{/each}

<style>
    .rice-effect-layer {
        position: fixed;
        inset: 0;
        pointer-events: none;
    }
</style>
