<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { ChevronRight } from 'lucide-svelte';

    let { labelers, onselect }: {
        labelers: any[];
        onselect: (labelerDid: string) => void;
    } = $props();
</script>

<div class="report-step">
    <p class="report-step__title">{$_('report_labeler_select')}</p>

    <ul class="report-labeler-list">
        {#each labelers as labeler}
            <li class="report-labeler-list__item">
                <button class="report-labeler-list__button" onclick={() => onselect(labeler.creator.did)}>
                    <div class="report-labeler-list__avatar">
                        {#if labeler.creator.avatar}
                            <img src="{labeler.creator.avatar}" alt="">
                        {:else}
                            <span class="report-labeler-list__avatar-empty"></span>
                        {/if}
                    </div>
                    <div class="report-labeler-list__text">
                        <span class="report-labeler-list__name">{labeler.creator.displayName || labeler.creator.handle}</span>
                        <span class="report-labeler-list__handle">@{labeler.creator.handle}</span>
                    </div>
                    <ChevronRight size="18" color="var(--text-color-3)"></ChevronRight>
                </button>
            </li>
        {/each}
    </ul>
</div>

<style lang="postcss">
    .report-step__title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-color-1);
        margin-bottom: 12px;
    }

    .report-labeler-list {
        list-style: none;

        &__item {
            border-bottom: 1px solid var(--border-color-2);

            &:last-child {
                border-bottom: none;
            }
        }

        &__button {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 4px;
            text-align: left;

            &:hover {
                background-color: var(--bg-color-2);
            }
        }

        &__avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            overflow: hidden;
            flex-shrink: 0;

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
        }

        &__avatar-empty {
            display: block;
            width: 100%;
            height: 100%;
            background-color: var(--primary-color);
        }

        &__text {
            flex: 1;
            min-width: 0;
        }

        &__name {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-color-1);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        &__handle {
            display: block;
            font-size: 12px;
            color: var(--text-color-3);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }
</style>
