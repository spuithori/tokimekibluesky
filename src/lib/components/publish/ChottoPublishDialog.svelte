<script lang="ts">
    import { untrack } from 'svelte';
    import { _ } from 'tokimeki-i18n';
    import Check from '@lucide/svelte/icons/check';
    import ExternalLink from '@lucide/svelte/icons/external-link';
    import Modal from '$lib/components/ui/Modal.svelte';
    import { MOCHOTT_ORIGIN } from '$lib/components/mochott/mochottConst';
    import type { ChottoPreview } from '$lib/chotto/chotto';
    import ChottoIntroArt from './ChottoIntroArt.svelte';

    interface Props {
        authorizeUrl?: string;
        preview: ChottoPreview;
        recheck: () => Promise<boolean>;
        onsettle: (confirmed: boolean) => void;
    }

    let { authorizeUrl, preview, recheck, onsettle }: Props = $props();

    let step = $state<'consent' | 'waiting' | 'connected' | 'confirm'>(untrack(() => authorizeUrl) ? 'consent' : 'confirm');
    let agreed = $state(false);
    let checking = false;

    const policies = [
        { href: `${MOCHOTT_ORIGIN}/terms`, label: 'chotto_terms' },
        { href: `${MOCHOTT_ORIGIN}/privacy`, label: 'privacy_policy' },
        { href: `${MOCHOTT_ORIGIN}/guideline`, label: 'chotto_guideline' },
    ];

    const confirming = $derived(step === 'connected' || step === 'confirm');

    function openMochott() {
        if (!authorizeUrl) {
            return;
        }
        const width = 480;
        const height = 720;
        const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
        const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
        window.open(authorizeUrl, 'mochott-connect', `popup,width=${width},height=${height},left=${left},top=${top}`);
        step = 'waiting';
    }

    async function checkOnReturn() {
        if (step !== 'waiting' || checking || document.visibilityState !== 'visible') {
            return;
        }
        checking = true;
        const connected = await recheck().catch(() => false);
        checking = false;
        if (connected && step === 'waiting') {
            step = 'connected';
        }
    }
</script>

<svelte:window onfocus={checkOnReturn} />
<svelte:document onvisibilitychange={checkOnReturn} />

<Modal title={$_(confirming ? 'chotto_confirm_title' : 'chotto_consent_title')} size="small" onclose={() => onsettle(false)}>
    {#if step === 'consent'}
        <div class="chotto-dialog__body">
            <ChottoIntroArt />

            <p class="chotto-dialog__text">
                {$_('chotto_consent_text')}
                <a class="chotto-dialog__about" href="{MOCHOTT_ORIGIN}/documents/welcome" target="_blank" rel="noopener">{$_('chotto_about')}<ExternalLink size="14" /></a>
            </p>

            <div class="checkbox checkbox--padding checkbox--fullwidth chotto-dialog__agree">
                <input type="checkbox" class="checkbox__input" id="chottoConsent" bind:checked={agreed} />
                <label class="checkbox__label" for="chottoConsent">
                    <span class="checkbox__ui"></span>
                    <span class="checkbox__text">{$_('chotto_agree_before')}{#each policies as policy, index (policy.href)}{#if index > 0}{$_('chotto_agree_sep')}{/if}<a href={policy.href} target="_blank" rel="noopener">{$_(policy.label)}</a>{/each}{$_('chotto_agree_after')}</span>
                </label>
            </div>
        </div>
    {:else if step === 'waiting'}
        <div class="chotto-dialog__waiting">
            <span class="chotto-dialog__dots" aria-hidden="true"><span></span><span></span><span></span></span>
            <p class="chotto-dialog__text">{$_('chotto_connect_waiting')}</p>
        </div>
    {:else}
        <div class="chotto-dialog__body chotto-dialog__body--confirm">
            {#if step === 'connected'}
                <p class="chotto-dialog__connected"><Check size="16" />{$_('chotto_connected')}</p>
            {/if}

            <div class="chotto-dialog__card">
                <span class="chotto-dialog__label">{$_('chotto_confirm_article')}</span>
                <strong class="chotto-dialog__title">{preview.title}</strong>
                <span class="chotto-dialog__label">
                    {$_('chotto_confirm_chars', {count: preview.chars.toLocaleString()})}{#if preview.images > 0}・{$_('chotto_confirm_images', {count: preview.images})}{/if}
                </span>
            </div>

            <div class="chotto-dialog__card">
                <span class="chotto-dialog__label">{$_('chotto_confirm_post')}</span>
                <p class="chotto-dialog__excerpt">{preview.excerpt}</p>
                <span class="chotto-dialog__more">…{preview.more}</span>
            </div>
        </div>
    {/if}

    <div class="chotto-dialog__buttons">
        <button class="button button--border" onclick={() => onsettle(false)}>{$_('cancel')}</button>
        {#if step === 'consent'}
            <button class="button" disabled={!agreed} onclick={openMochott}>{$_('chotto_consent_agree')}</button>
        {:else if step === 'waiting'}
            <button class="button" onclick={openMochott}>{$_('chotto_connect_reopen')}</button>
        {:else}
            <button class="button" onclick={() => onsettle(true)}>{$_('publish_button_send')}</button>
        {/if}
    </div>
</Modal>

<style lang="postcss">
    .chotto-dialog__body {
        display: flex;
        flex-direction: column;
        gap: 16px;

        &--confirm {
            gap: 12px;
        }
    }

    .chotto-dialog__text {
        margin: 0;
        font-size: 14px;
        line-height: 1.7;
        text-align: left;
    }

    .chotto-dialog__about {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        white-space: nowrap;
    }

    a {
        color: var(--primary-color);

        &:hover {
            text-decoration: underline;
        }
    }

    .chotto-dialog__agree {
        text-align: left;

        :global(.checkbox__ui) {
            flex-shrink: 0;
        }

        :global(.checkbox__text) {
            display: block;
            font-size: 13px;
            line-height: 1.6;
            color: var(--text-color-1);
        }
    }

    .chotto-dialog__waiting {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 0 4px;
    }

    .chotto-dialog__dots {
        display: flex;
        flex: none;
        gap: 4px;

        span {
            width: 6px;
            height: 6px;
            border-radius: 3px;
            background: var(--primary-color);
            animation: chotto-dot 1.2s ease-in-out infinite;

            &:nth-child(2) {
                animation-delay: .2s;
            }

            &:nth-child(3) {
                animation-delay: .4s;
            }
        }
    }

    @keyframes chotto-dot {
        0%, 100% { opacity: .25; }
        50% { opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
        .chotto-dialog__dots span {
            animation: none;
        }
    }

    .chotto-dialog__connected {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        padding: 10px 14px;
        border-radius: var(--border-radius-4);
        background: color-mix(in srgb, var(--primary-color) 12%, transparent);
        font-size: 13px;

        :global(svg) {
            flex: none;
            color: var(--primary-color);
        }
    }

    .chotto-dialog__card {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 14px 16px;
        border: 1px solid var(--border-color-1);
        border-radius: 12px;
        text-align: left;
    }

    .chotto-dialog__label {
        font-size: 12px;
        color: var(--text-color-3);
    }

    .chotto-dialog__title {
        font-size: 15px;
        line-height: 1.5;
        overflow-wrap: anywhere;
    }

    .chotto-dialog__excerpt {
        display: -webkit-box;
        margin: 0;
        overflow: hidden;
        font-size: 13px;
        line-height: 1.7;
        white-space: pre-line;
        overflow-wrap: anywhere;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        line-clamp: 3;
    }

    .chotto-dialog__more {
        font-size: 13px;
        font-weight: bold;
        color: var(--primary-color);
    }

    .chotto-dialog__buttons {
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
