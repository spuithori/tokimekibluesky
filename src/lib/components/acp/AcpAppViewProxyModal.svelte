<script lang="ts">
    import {_} from "tokimeki-i18n";
    import Modal from "$lib/components/ui/Modal.svelte";
    import Waypoints from '@lucide/svelte/icons/waypoints';
    import { BSKY_APPVIEW_PROXY } from "$lib/xrpc-client";

    const PROXY_PATTERN = /^did:[a-z]+:[^\s#]+#[A-Za-z0-9_]+$/;

    let { onclose, onchange, profile } = $props();
    let proxy = $state(profile?.appViewProxy || '');
    let trimmed = $derived(proxy.trim());
    let isInvalid = $derived(!!trimmed && !PROXY_PATTERN.test(trimmed));
</script>

<Modal title={$_('change_appview_proxy')} size="small" {onclose}>
    <p class="text text-danger">{$_('description_change_appview_proxy')}</p>
    <p class="text">{$_('description_appview_proxy_empty_default')}</p>

    <div class="input-text input-text--icon">
        <Waypoints size="20" color="var(--text-color-1)"></Waypoints>
        <input class="input-text__input" type="text" bind:value={proxy} placeholder={BSKY_APPVIEW_PROXY}>
    </div>

    {#if isInvalid}
        <p class="text text-danger">{$_('appview_proxy_invalid_format')}</p>
    {/if}

    <div class="text-center">
        <button class="button" onclick={() => {onchange(trimmed)}} disabled={isInvalid}>{$_('apply')}</button>
    </div>
</Modal>

<style lang="postcss">
    .text {
        white-space: pre-line;
    }

    .input-text {
        margin: 16px 0;
    }
</style>