<script lang="ts">
    import { _, locale } from 'tokimeki-i18n';
    import { agent } from '$lib/stores';
    import { initColumns } from '$lib/classes/columnState.svelte';
    import { setPostState } from '$lib/classes/postState.svelte';
    import { createMockAgent } from '$lib/test-fixtures/mockAgent';
    import ColumnIcon from '$lib/components/column/ColumnIcon.svelte';
    import TimelineItem from '../../../routes/(app)/TimelineItem.svelte';
    import { buildDemoColumns, demoColumnRecord } from './demoDeckData';

    initColumns();
    setPostState();

    const mock = createMockAgent({ did: 'did:plc:demo0000' });
    if (!$agent) {
        agent.set(mock.agent);
    }

    const columns = $derived(buildDemoColumns($locale ?? 'en', {
        photos: $_('demo_column_photos'),
        friends: $_('demo_column_friends'),
        tech: $_('demo_column_tech'),
        cafe: $_('demo_column_cafe'),
    }));
</script>

<div class="demo-deck" aria-hidden="true">
    {#each columns as column, columnIndex (column.id)}
        {@const record = demoColumnRecord(column)}
        <div class="demo-col" style:--enter-delay="{columnIndex * 90}ms">
            <div class="demo-col__heading">
                <span class="demo-col__icon"><ColumnIcon type={column.type}></ColumnIcon></span>
                <span class="demo-col__title">
                    {column.name}
                    <span class="demo-col__subhead">{column.handle}</span>
                </span>
            </div>
            <div class="timeline timeline--default demo-col__timeline">
                {#each column.feed as data, index (data.post.uri)}
                    <TimelineItem {data} {index} column={record} _agent={mock.agent} feed={column.feed}>{#snippet children()}{/snippet}</TimelineItem>
                {/each}
            </div>
        </div>
    {/each}
</div>

<style lang="postcss">
    .demo-deck {
        display: flex;
        gap: var(--demo-gap, 12px);
        height: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    .demo-col {
        --deck-heading-icon-color: var(--text-color-3);

        width: var(--demo-col-width, 320px);
        flex-shrink: 0;
        height: 100%;
        overflow-y: auto;
        overscroll-behavior: contain;
        scroll-snap-align: start;
        scrollbar-width: none;
        background-color: var(--bg-color-1);
        border-radius: var(--deck-border-radius);
        box-shadow: 0 1px 2px rgba(20, 60, 90, .08), 0 12px 32px -20px rgba(20, 60, 90, .35);
        animation: demo-col-in .8s cubic-bezier(.22, 1, .36, 1) var(--enter-delay) both;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    .demo-col__heading {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        align-items: center;
        gap: 10px;
        height: var(--deck-heading-height);
        padding: 0 12px;
        background-color: var(--deck-heading-bg-color);
        border-bottom: 1px solid var(--deck-border-color);
    }

    .demo-col__icon {
        width: 36px;
        height: 36px;
        border-radius: 5px;
        background-color: var(--deck-heading-icon-bg-color);
        display: grid;
        place-content: center;
        flex-shrink: 0;
    }

    .demo-col__title {
        display: flex;
        flex-direction: column;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.2;
        letter-spacing: .025em;
        color: var(--deck-heading-title-color);
        min-width: 0;
    }

    .demo-col__subhead {
        font-size: 12px;
        font-weight: 400;
        color: var(--deck-heading-subhead-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .demo-col__timeline {
        pointer-events: none;
        user-select: none;
    }

    @keyframes demo-col-in {
        from {
            opacity: 0;
            transform: translateY(28px);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .demo-col {
            animation: none;
        }
    }
</style>
