<script lang="ts">
    import { run } from 'svelte/legacy';

    import {_} from "svelte-i18n";
    import { confetti } from '@neoconfetti/svelte';
    import {createEventDispatcher, onMount} from "svelte";
    import {settings} from "$lib/stores";
    let layout = $state($settings?.design.layout || 'default');
    const dispatch = createEventDispatcher();

    run(() => {
        $settings.design.layout = layout;
    });

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
                    <div class="big-radio-group">
                        <div class="big-radio">
                            <input type="radio" bind:group={layout} id="layoutDecks" name="layout" value={'decks'}>
                            <label for="layoutDecks">
                                <span class="big-radio__ui">
                                    <span class="big-radio__check">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--check-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                                    </span>
                                    <span class="big-radio__content">
                                         <span class="big-radio__title">{$_('layout_decks')}</span>
                                         <span class="big-radio__description">{$_('layout_decks_description')}</span>
                                    </span>
                                </span>
                            </label>
                        </div>

                        <div class="big-radio">
                            <input type="radio" bind:group={layout} id="layoutDefault" name="layout" value={'default'}>
                            <label for="layoutDefault">
                                <span class="big-radio__ui">
                                    <span class="big-radio__check">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--check-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                                    </span>
                                    <span class="big-radio__content">
                                        <span class="big-radio__title">{$_('layout_single')}</span>
                                        <span class="big-radio__description">{$_('layout_single_description')}</span>
                                    </span>
                                </span>
                            </label>
                        </div>
                    </div>
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