<script lang="ts">
import '../../styles.css';
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { signIn } from '$lib/oauth';
import { consumePassportCallback } from '$lib/atpassport';
import { _ } from 'tokimeki-i18n';
import CircleSlash from '@lucide/svelte/icons/circle-slash';
import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";

let errorMessage = $state('');

onMount(async () => {
    try {
        await signIn(consumePassportCallback(window.location.href));
    } catch (error) {
        console.error('@passport callback error:', error);
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }
});
</script>

<div class="oauth-callback">
    <div class="oauth-callback__content">
        {#if errorMessage}
            <div class="oauth-callback__icon">
                <CircleSlash color="var(--danger-color)" size="32"></CircleSlash>
            </div>

            <p class="oauth-callback__text">{$_('oauth_error')}</p>
            <p class="oauth-callback__text">{errorMessage}</p>
            <button class="button" onclick={() => goto('/login')}>
                {$_('back_to_login')}
            </button>
        {:else}
            <div class="oauth-callback__icon">
                <LoadingSpinner></LoadingSpinner>
            </div>
        {/if}
    </div>
</div>

<style lang="postcss">
    .oauth-callback {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background-color: var(--bg-color-1);
    }

    .oauth-callback__content {
        text-align: center;
        padding: 36px;
        background-color: var(--bg-color-2, #16213e);
        border-radius: var(--border-radius-5);
        max-width: 400px;
        width: 90%;
        color: var(--text-color-1);
    }

    .oauth-callback__text {
        margin: 16px 0;
    }

    .oauth-callback__icon {
        text-align: center;
        width: fit-content;
        margin: 0 auto;
    }
</style>
