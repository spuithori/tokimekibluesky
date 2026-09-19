<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import Sparkles from '@lucide/svelte/icons/sparkles';
    import SettingsHeader from '$lib/components/settings/SettingsHeader.svelte';
    import AiFeatureList from '$lib/components/ai/AiFeatureList.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { AI_POLICY_VERSION, hasAiPolicyConsent, isAutoColumnIconEnabled } from '$lib/ai-policy';
    import { aiConsent } from '$lib/ai/consent.svelte';

    const consented = $derived(hasAiPolicyConsent(settingsStore.general));
    let isAgreed = $state(false);

    function enable() {
        if (!isAgreed) {
            return;
        }
        aiConsent.grant();
        isAgreed = false;
    }

    async function handleAutoColumnIcon(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
        const input = event.currentTarget;
        if (!input.checked) {
            settingsStore.general.autoColumnIcon = false;
            return;
        }

        input.checked = false;
        if (await aiConsent.ensure('columnIcon')) {
            settingsStore.general.autoColumnIcon = true;
        }
    }
</script>

<svelte:head>
    <title>TOKIMEKI AI - TOKIMEKI</title>
</svelte:head>

<div>
    <SettingsHeader>
        TOKIMEKI AI
    </SettingsHeader>

    <div class="settings-wrap">
        <p class="ai-text">{$_('ai_intro')}</p>

        <section class="ai-status" class:ai-status--on={consented} aria-labelledby="aiStatusState">
            <div class="ai-status__icon" aria-hidden="true">
                <Sparkles size="24" color={consented ? 'var(--bg-color-1)' : 'var(--text-color-3)'}></Sparkles>
            </div>

            <div class="ai-status__body">
                <p class="ai-status__state" id="aiStatusState">{consented ? $_('ai_status_consented') : $_('ai_status_none')}</p>
                <p class="ai-status__note">{consented ? AI_POLICY_VERSION : $_('ai_status_none_hint')}</p>
            </div>

            {#if !consented}
                <div class="checkbox checkbox--padding checkbox--fullwidth ai-status__check">
                    <input type="checkbox" class="checkbox__input" id="aiPolicyConsentInline" bind:checked={isAgreed}>
                    <label class="checkbox__label" for="aiPolicyConsentInline">
                        <span class="checkbox__ui"></span>
                        <span class="checkbox__text">{$_('ai_policy_consent_label')}</span>
                    </label>
                </div>
            {/if}

            <div class="ai-status__actions">
                {#if consented}
                    <button class="button button--border button--sm" onclick={() => aiConsent.withdraw()}>{$_('ai_withdraw')}</button>
                {:else}
                    <button class="button button--sm" onclick={enable} disabled={!isAgreed}>{$_('ai_consent_enable')}</button>
                {/if}
                <button class="button button--border button--sm" onclick={() => aiConsent.showPolicy()}>{$_('ai_policy_read')}</button>
            </div>
        </section>

        <h2 class="ai-heading">{$_('ai_section_features')}</h2>

        <AiFeatureList>
            {#snippet control(feature)}
                {#if feature.id === 'columnIcon'}
                    <div class="input-toggle">
                        <input
                            class="input-toggle__input"
                            type="checkbox"
                            id="autoColumnIcon"
                            aria-label={$_('ai_feature_columnIcon')}
                            checked={isAutoColumnIconEnabled(settingsStore.general)}
                            onchange={handleAutoColumnIcon}
                        /><label class="input-toggle__label" for="autoColumnIcon"></label>
                    </div>
                {/if}
            {/snippet}
        </AiFeatureList>

        <h2 class="ai-heading">{$_('ai_section_handling')}</h2>

        <p class="ai-text">{$_('ai_consent_route')}</p>
        <p class="ai-text">{$_('ai_consent_experimental')}</p>
    </div>
</div>

<style lang="postcss">
    .ai-text {
        margin-bottom: 12px;
        font-size: 14px;
        line-height: 1.8;
        color: var(--text-color-1);
    }

    .ai-heading {
        margin: 32px 0 12px;
        font-size: 18px;
        color: var(--text-color-1);
    }

    .ai-status {
        display: grid;
        grid-template-columns: 48px 1fr;
        gap: 12px 16px;
        align-items: center;
        padding: 20px;
        margin-top: 20px;
        border: 1px solid var(--border-color-2);
        border-radius: var(--border-radius-2);
        background-color: var(--bg-color-2);

        &--on {
            border-color: var(--primary-color);
        }

        &__icon {
            display: grid;
            place-content: center;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background-color: var(--bg-color-3);
        }

        &--on &__icon {
            background-color: var(--primary-color);
        }

        &__state {
            font-size: 16px;
            font-weight: bold;
            color: var(--text-color-1);
        }

        &__note {
            font-size: 13px;
            line-height: 1.6;
            color: var(--text-color-3);
        }

        &__check {
            grid-column: 1 / -1;
            text-align: left;

            :global(.checkbox__ui) {
                flex-shrink: 0;
            }

            :global(.checkbox__text) {
                line-height: 1.6;
                color: var(--text-color-1);
            }
        }

        &__actions {
            grid-column: 1 / -1;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;

            @media (max-width: 767px) {
                :global(.button) {
                    flex: 1 1 100%;
                }
            }
        }
    }
</style>
