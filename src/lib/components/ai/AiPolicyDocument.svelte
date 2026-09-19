<script lang="ts">
    import { locale } from 'tokimeki-i18n';
    import { AI_FEATURES, AI_POLICY_SECTIONS, AI_POLICY_VERSION } from '$lib/ai-policy';
    import AiTable from '$lib/components/ai/AiTable.svelte';

    const TABLE_ROWS = ['data', 'trigger', 'purpose', 'retention'] as const;
</script>

{#await import('$lib/ai-policy-copy') then { getAiPolicyCopy }}
    {@const copy = getAiPolicyCopy($locale)}
    <article class="ai-policy">
        <h2 class="ai-policy__title">{copy.title}</h2>
        <p class="ai-policy__updated">{copy.updated}: {AI_POLICY_VERSION}</p>
        <p class="ai-policy__body">{copy.intro}</p>

        {#each AI_POLICY_SECTIONS as section (section)}
            <section class="ai-policy__section">
                <h3 class="ai-policy__section-title">{copy.sections[section].title}</h3>
                <p class="ai-policy__body">{copy.sections[section].body}</p>

                {#if section === 'features'}
                    {#each AI_FEATURES as feature (feature.id)}
                        <h4 class="ai-policy__feature" id="aiPolicyFeature-{feature.id}">{copy.features[feature.id].name}</h4>
                        <AiTable>
                            <table aria-labelledby="aiPolicyFeature-{feature.id}">
                                <tbody>
                                    {#each TABLE_ROWS as row (row)}
                                        <tr>
                                            <th scope="row">{copy.columns[row]}</th>
                                            <td>{copy.features[feature.id][row]}</td>
                                        </tr>
                                    {/each}
                                    <tr>
                                        <th scope="row">{copy.columns.model}</th>
                                        <td><code>{feature.model}</code> ({feature.provider})</td>
                                    </tr>
                                </tbody>
                            </table>
                        </AiTable>
                    {/each}

                    <p class="ai-policy__body">{copy.notSent}</p>
                {/if}
            </section>
        {/each}
    </article>
{/await}

<style lang="postcss">
    .ai-policy {
        text-align: left;
        color: var(--text-color-1);

        &__title {
            font-size: 18px;
            font-weight: bold;
        }

        &__updated {
            margin: 4px 0 16px;
            font-size: 12px;
            color: var(--text-color-3);
        }

        &__body {
            font-size: 14px;
            line-height: 1.8;
        }

        &__section {
            margin-top: 24px;
        }

        &__feature {
            margin-top: 20px;
            font-size: 14px;
            font-weight: bold;
        }

        &__section-title {
            margin-bottom: 8px;
            font-size: 15px;
            font-weight: bold;
        }

        code {
            overflow-wrap: anywhere;
            font-size: 12px;
        }
    }
</style>
