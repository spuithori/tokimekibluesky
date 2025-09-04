<script lang="ts">
    import {_} from "svelte-i18n";
    import {page} from "$app/state";
    import {onMount} from "svelte";
    import {BskyAgent} from "@atproto/api";

    const handle = $derived(page.params.handle);
    const endpoint = $derived(page.data.endpoint);
    const _agent = new BskyAgent({service: endpoint});
    let collections = $state([]);
    let _handle = $state('');

    onMount(async () => {
        if (!handle) {
            return false;
        }

        const { data } = await _agent.com.atproto.repo.describeRepo({repo: handle});
        collections = data?.collections || [];
        _handle = data?.handle;
    });
</script>

{#key handle}
    <div class="collections-head">
        <h2 class="collections-head__title">{handle}</h2>

        <dl class="collections-head-list">
            <div class="collections-head-list__item">
                <dt class="collections-head-list__name">Handle</dt>
                <dd class="collections-head-list__content">{_handle}</dd>
            </div>

            <div class="collections-head-list__item">
                <dt class="collections-head-list__name">Endpoint</dt>
                <dd class="collections-head-list__content">{endpoint}</dd>
            </div>
        </dl>
    </div>

    <ul class="collections-list">
        {#each collections as collection}
            <li class="collections-list__item">
                <a href="/atproto-viewer/{handle}/{collection}">{collection}</a>
            </li>
        {/each}
    </ul>
{/key}

<style lang="postcss">
    :global {
        .collections-head {
            padding: 16px;
            background-color: var(--bg-color-2);
            border-radius: var(--border-radius-3);
            margin-bottom: 16px;

            &__title {
                font-size: 18px;
                margin-bottom: 8px;
            }
        }

        .collections-head-list {
            &__name {
                font-size: 12px;
                font-weight: bold;
                padding: 2px 8px;
                background-color: var(--text-color-1);
                color: var(--bg-color-1);
                border-radius: var(--border-radius-2);
                letter-spacing: .025em;
            }

            &__content {
                font-size: 14px;
            }

            &__item {
                display: flex;
                gap: 8px;
                align-items: baseline;
                margin-bottom: 4px;
            }
        }
    }

    .collections-list {
        list-style: none;
        display: grid;
        gap: 4px;
    }
</style>