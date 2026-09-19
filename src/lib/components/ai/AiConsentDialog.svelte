<script lang="ts">
    import { untrack } from 'svelte';
    import { _ } from 'tokimeki-i18n';
    import { pushState } from '$app/navigation';
    import { page } from '$app/state';
    import { AI_POLICY_VERSION } from '$lib/ai-policy';
    import { aiConsent, type AiDialogView } from '$lib/ai/consent.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import AiFeatureList from '$lib/components/ai/AiFeatureList.svelte';
    import AiPolicyDocument from '$lib/components/ai/AiPolicyDocument.svelte';

    const isPolicy = $derived(aiConsent.view === 'policy');

    aiConsent.attach({
        push: view => pushState('', { ...page.state, aiDialog: view }),
        pop: depth => history.go(-depth),
    });

    $effect(() => {
        const shown = (page.state as { aiDialog?: AiDialogView }).aiDialog;
        untrack(() => aiConsent.sync(shown));
    });

    function close(agreed: boolean) {
        aiConsent.settle(agreed);
    }
</script>

{#if aiConsent.open}
    <Modal
        title={isPolicy ? $_('tokimeki_ai') : $_('ai_consent_title')}
        size={isPolicy ? 'normal' : 'small'}
        onclose={() => close(false)}
        onback={isPolicy && !aiConsent.policyOnly ? () => aiConsent.back() : undefined}
    >
        {#if isPolicy}
            <AiPolicyDocument></AiPolicyDocument>
        {:else}
            <p class="ai-consent-text">{$_('ai_consent_scope')}</p>

            <AiFeatureList current={aiConsent.feature}></AiFeatureList>

            <p class="ai-consent-text">{$_('ai_consent_route')}</p>
            <p class="ai-consent-text">{$_('ai_consent_experimental')}</p>

            <p class="ai-consent-policy">
                <button class="ai-link" type="button" onclick={() => aiConsent.showPolicy()}>{$_('ai_policy_open')}</button>
                <span class="ai-consent-policy__version">{AI_POLICY_VERSION}</span>
            </p>

            <div class="checkbox checkbox--padding checkbox--fullwidth ai-consent-check">
                <input type="checkbox" class="checkbox__input" id="aiPolicyConsent" bind:checked={aiConsent.checked}>
                <label class="checkbox__label" for="aiPolicyConsent">
                    <span class="checkbox__ui"></span>
                    <span class="checkbox__text">{$_('ai_policy_consent_label')}</span>
                </label>
            </div>

            <div class="ai-consent-buttons">
                <button class="button button--border" onclick={() => close(false)}>{$_('cancel')}</button>
                <button class="button" onclick={() => close(true)} disabled={!aiConsent.checked}>{$_('ai_consent_enable')}</button>
            </div>
        {/if}
    </Modal>
{/if}

<style lang="postcss">
    .ai-consent-text {
        margin: 12px 0;
        font-size: 14px;
        line-height: 1.6;
        text-align: left;
    }

    .ai-consent-policy {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 8px;
        margin-top: 16px;
        font-size: 14px;

        &__version {
            font-size: 12px;
            color: var(--text-color-3);
        }
    }

    .ai-consent-check {
        margin-top: 16px;
        text-align: left;

        :global(.checkbox__ui) {
            flex-shrink: 0;
        }

        :global(.checkbox__text) {
            line-height: 1.6;
            color: var(--text-color-1);
        }
    }

    .ai-consent-buttons {
        display: flex;
        gap: 8px;
        margin-top: 20px;

        :global(.button) {
            flex: 1;
            width: auto;
            min-width: 0;
        }
    }
</style>
