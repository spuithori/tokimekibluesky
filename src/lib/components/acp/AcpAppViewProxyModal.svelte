<script lang="ts">
    import { m } from "$lib/paraglide/messages.js";
    import Modal from "$lib/components/ui/Modal.svelte";
    import {Waypoints} from "lucide-svelte";

    let { onclose, onchange, profile } = $props();
    let proxy = $state(profile?.appViewProxy || '');
    let isDisabled = $derived(!proxy);
</script>

<Modal title={m.change_appview_proxy()} size="small" {onclose}>
    <p class="text text-danger">{m.description_change_appview_proxy()}</p>

    <div class="input-text input-text--icon">
        <Waypoints size="20" color="var(--text-color-1)"></Waypoints>
        <input class="input-text__input" type="text" bind:value={proxy} placeholder="did:web:api.bsky.app#bsky_appview">
    </div>

    <div class="text-center">
        <button class="button" onclick={() => {onchange(proxy)}} disabled={isDisabled}>変更</button>
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