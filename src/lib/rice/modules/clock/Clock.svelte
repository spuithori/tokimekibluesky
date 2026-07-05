<script lang="ts">
    import { locale } from 'svelte-i18n';
    import { riceState } from '$lib/rice/riceState.svelte';

    interface Props {
        variant?: 'bar' | 'column';
        options?: Record<string, string>;
    }

    let { variant = 'bar', options: itemOptions = {} }: Props = $props();

    let now = $state(new Date());

    $effect(() => {
        const id = setInterval(() => {
            now = new Date();
        }, 1000);
        return () => clearInterval(id);
    });

    const options = $derived({ ...(riceState.moduleConfig('clock')?.options ?? {}), ...itemOptions });
    const timeFormatter = $derived(new Intl.DateTimeFormat($locale || undefined, {
        hour: '2-digit',
        minute: '2-digit',
        ...(options.seconds === 'true' ? { second: '2-digit' } : {}),
        ...(options.hour12 === 'true' ? { hour12: true } : options.hour12 === 'false' ? { hour12: false } : {}),
    }));
    const dateFormatter = $derived(new Intl.DateTimeFormat($locale || undefined, {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
    }));
    const showDate = $derived(variant === 'column' || options.date === 'true');
</script>

<time class="rice-clock rice-clock--{variant}" datetime={now.toISOString()}>
    {#if showDate}
        <span class="rice-clock__date">{dateFormatter.format(now)}</span>
    {/if}
    <span class="rice-clock__time">{timeFormatter.format(now)}</span>
</time>

<style>
    .rice-clock {
        display: flex;
        align-items: center;
        gap: 8px;
        font-variant-numeric: tabular-nums;
        color: var(--text-color-1);
    }

    .rice-clock--bar {
        font-size: 13px;
        white-space: nowrap;
    }

    .rice-clock--bar .rice-clock__date {
        color: var(--text-color-3);
    }

    .rice-clock--column {
        flex-direction: column;
        gap: 4px;
    }

    .rice-clock--column .rice-clock__time {
        font-size: 48px;
        font-weight: bold;
        line-height: 1.2;
    }

    .rice-clock--column .rice-clock__date {
        font-size: 16px;
        color: var(--text-color-2);
    }
</style>
