<script lang="ts">
    import {_} from "tokimeki-i18n";
    import { confetti } from '@neoconfetti/svelte';
    import {createEventDispatcher} from "svelte";
    import LayoutField from '$lib/components/settings/fields/custom/LayoutField.svelte';
    const dispatch = createEventDispatcher();

    let el = $state();

    function handleClose() {
        localStorage.setItem('isRepeater', 'true');
        dispatch('close');
    }
</script>

<div class="welcome-modal" bind:this={el}>
    <div class="confetti" use:confetti></div>

    <div class="welcome-modal-contents">
        <div class="welcome-modal-heading">
            <button class="text-button" onclick={handleClose}>{$_('skip')}</button>
        </div>

        <h2 class="welcome-modal-title">{$_('welcome_to_tokimeki')}</h2>
        <p class="welcome-modal-text">{$_('welcome_to_tokimeki_text1')}</p>

        <div class="welcome-modal-setting">
            <div class="settings-group">
                <div class="settings-group__content">
                    <LayoutField detailed></LayoutField>
                </div>
            </div>
        </div>

        <p class="welcome-modal-text">{$_('welcome_to_tokimeki_text2')}</p>

        <div class="welcome-modal-close">
            <button class="button button--sm" onclick={handleClose}>{$_('welcome_to_tokimeki_close')}</button>
        </div>
    </div>
</div>

<style lang="postcss">
    .welcome-modal {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        z-index: 9999;
        background-color: rgba(0, 0, 0, .5);
        overflow: auto;
        padding: 50px 0;

        @media (max-width: 767px) {
            display: block;
            overscroll-behavior-y: none;
            padding: 20px;
        }
    }

    .welcome-modal-contents {
        padding: 30px;
        border-radius: 10px;
        background-color: var(--bg-color-1);
        width: 740px;
        max-width: 100%;
        position: relative;
        z-index: 2;

        @media (max-width: 767px) {
            width: 100%;
        }
    }

    .welcome-modal-close {
        text-align: center;
        margin-top: 24px;
    }

    .welcome-modal-title {
        font-weight: 900;
        font-size: 20px;
        line-height: 1.5;
        margin-bottom: 10px;
        letter-spacing: .025em;
        text-align: center;
        color: var(--text-color-1);
    }

    .welcome-modal-text {
        text-align: center;
        color: var(--text-color-1);
        white-space: pre-line;
    }

    .welcome-modal-heading {
        display: flex;
        justify-content: flex-end;
    }

    .welcome-modal-setting {
        margin-top: 24px;
        margin-bottom: 16px;
    }

    .confetti {
        position: fixed;
        left: 0;
        right: 0;
        margin: auto;
        top: 0;
        display: flex;
        justify-content: center;
    }
</style>