<script lang="ts">
    import { locale } from 'svelte-i18n';
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';

    interface Props {
        options?: Record<string, string>;
    }

    let { options = {} }: Props = $props();

    const now = new Date();
    let offset = $state(0);

    const weekStart = $derived(options.weekstart === 'sunday' ? 0 : 1);
    const viewDate = $derived(new Date(now.getFullYear(), now.getMonth() + offset, 1));
    const cells = $derived.by(() => {
        const lead = (viewDate.getDay() - weekStart + 7) % 7;
        const count = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
        const list: (number | null)[] = Array(lead).fill(null);
        for (let day = 1; day <= count; day++) {
            list.push(day);
        }
        return list;
    });
    const weekdayLabels = $derived.by(() => {
        const formatter = new Intl.DateTimeFormat($locale || undefined, { weekday: 'narrow' });
        return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 7 + weekStart + i)));
    });
    const monthLabel = $derived(new Intl.DateTimeFormat($locale || undefined, { year: 'numeric', month: 'long' }).format(viewDate));
    const isToday = (day: number | null) => offset === 0 && day === now.getDate();
</script>

<div class="rice-calendar">
    <div class="rice-calendar__header">
        <button class="rice-calendar__nav" aria-label="Previous month" onclick={() => { offset -= 1; }}>
            <ChevronLeft size={16} strokeWidth="var(--icon-stroke-width, 2px)"></ChevronLeft>
        </button>
        <button class="rice-calendar__month" onclick={() => { offset = 0; }}>{monthLabel}</button>
        <button class="rice-calendar__nav" aria-label="Next month" onclick={() => { offset += 1; }}>
            <ChevronRight size={16} strokeWidth="var(--icon-stroke-width, 2px)"></ChevronRight>
        </button>
    </div>
    <div class="rice-calendar__grid">
        {#each weekdayLabels as label}
            <span class="rice-calendar__weekday">{label}</span>
        {/each}
        {#each cells as day, i (i)}
            {#if day === null}
                <span class="rice-calendar__cell"></span>
            {:else}
                <span class="rice-calendar__cell" class:rice-calendar__cell--today={isToday(day)}>{day}</span>
            {/if}
        {/each}
    </div>
</div>

<style>
    .rice-calendar {
        padding: 8px 12px;
        color: var(--text-color-1);
        font-size: 12px;
    }

    .rice-calendar__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        margin-bottom: 6px;
    }

    .rice-calendar__month {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--text-color-1);
        font-size: 13px;
        font-weight: bold;
        text-align: center;
    }

    .rice-calendar__nav {
        flex-shrink: 0;
        display: grid;
        place-content: center;
        width: 24px;
        height: 24px;
        border-radius: var(--border-radius-2);
        color: var(--text-color-2);
        transition: background-color var(--anim-hover-duration, .15s) var(--anim-hover-easing, ease);

        &:hover {
            background-color: var(--side-nav-hover-bg-color, var(--bg-color-2));
        }
    }

    .rice-calendar__grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
    }

    .rice-calendar__weekday {
        display: grid;
        place-content: center;
        height: 20px;
        color: var(--text-color-3);
        font-size: 10px;
    }

    .rice-calendar__cell {
        display: grid;
        place-content: center;
        height: 24px;
        border-radius: 50%;
        font-variant-numeric: tabular-nums;
    }

    .rice-calendar__cell--today {
        background-color: var(--primary-color);
        color: var(--bg-color-1);
        font-weight: bold;
    }
</style>
