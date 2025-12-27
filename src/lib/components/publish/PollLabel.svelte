<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { BarChart3 } from 'lucide-svelte';
    import type { Poll, PollDuration } from '$lib/classes/postState.svelte';
    import { settings } from '$lib/stores';

    interface Props {
        poll: Poll;
        onclick: () => void;
    }

    let { poll, onclick }: Props = $props();

    function formatDuration(value: PollDuration): string {
        const locale = $settings?.general?.userLanguage || 'en';
        const formatter = new Intl.DurationFormat(locale, { style: 'long' });

        switch (value) {
            case '5m': return formatter.format({ minutes: 5 });
            case '1h': return formatter.format({ hours: 1 });
            case '6h': return formatter.format({ hours: 6 });
            case '12h': return formatter.format({ hours: 12 });
            case '1d': return formatter.format({ days: 1 });
            case '3d': return formatter.format({ days: 3 });
            case '7d': return formatter.format({ days: 7 });
            default: return value;
        }
    }

    const optionCount = $derived(poll?.options?.length ?? 0);
    const durationLabel = $derived(poll?.duration ? formatDuration(poll.duration) : '');
</script>

{#if poll}
    <button type="button" class="poll-label" onclick={onclick}>
        <BarChart3 size="16"></BarChart3>
        <span>{optionCount} {$_('poll_option_placeholder', { values: { index: '' } }).replace(' {index}', '').trim()}</span>
        <span class="poll-duration">{durationLabel}</span>
    </button>
{/if}

<style lang="postcss">
    .poll-label {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        padding: 4px 8px;
        background-color: var(--bg-color-2);
        color: var(--text-color-2);
        font-weight: bold;
        border-radius: var(--border-radius-2);
    }

    .poll-duration {
        opacity: 0.8;
    }
</style>
