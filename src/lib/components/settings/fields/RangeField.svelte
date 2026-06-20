<script lang="ts">
    interface Props {
        value: number;
        min?: number;
        max?: number;
        step?: number;
        id: string;
    }

    let { value = $bindable(), min = 0, max = 100, step = 1, id }: Props = $props();

    const ticks = $derived.by(() => {
        const result: number[] = [];
        for (let tick = min; tick <= max; tick += step) {
            result.push(tick);
        }
        return result;
    });
</script>

<div class="range">
    <input class="range__input" type="range" {min} {max} {step} bind:value list={id} />
    <datalist {id} class="range__datalist">
        {#each ticks as tick (tick)}
            <option value={tick}></option>
        {/each}
    </datalist>
</div>
