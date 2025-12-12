<script lang="ts">
import { preventDefault } from 'svelte/legacy';
import { _ } from 'svelte-i18n';
import { signIn } from '$lib/oauth';
import { toast } from 'svelte-sonner';
import { createEventDispatcher } from 'svelte';
import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";

const dispatch = createEventDispatcher();

let handle = $state('');
let isLoading = $state(false);

async function loginWithOAuth() {
    if (!handle.trim()) {
        toast.error($_('oauth_enter_handle'));
        return;
    }

    isLoading = true;

    try {
        await signIn(handle.trim());
    } catch (error) {
        console.error('OAuth sign in error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to start OAuth flow');
        isLoading = false;
    }
}

function cancel() {
    dispatch('cancel');
}
</script>

<div class="login-modal">
    <div class="login-modal-contents">
        <h2 class="login-modal__title">{$_('oauth_login')}</h2>

        <form action="#" onsubmit={preventDefault(loginWithOAuth)}>
            <dl class="input-group">
                <dt class="input-group__name input-group__name--show">
                    <label for="handle">Handle</label>
                </dt>

                <dd class="input-group__content">
                    <span class="input-group__prefix">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="4"/>
                            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>
                        </svg>
                    </span>
                    <input
                        class="input-group__input"
                        type="text"
                        name="handle"
                        id="handle"
                        placeholder="example.bsky.social"
                        bind:value={handle}
                        disabled={isLoading}
                        required
                    />
                </dd>
            </dl>

            <div class="login-submit">
                <button
                    class="button button--login button--login-submit"
                    type="submit"
                    disabled={isLoading}
                >
                    {#if isLoading}
                        <LoadingSpinner color="#fff"></LoadingSpinner>
                    {:else}
                        {$_('oauth_sign_in')}
                    {/if}
                </button>

                <button class="text-button" onclick={preventDefault(cancel)} disabled={isLoading}>
                    {$_('cancel')}
                </button>
            </div>
        </form>
    </div>
</div>

<style lang="postcss">
    .login-modal {
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
        font-family: var(--font-family, sans-serif);

        @media (max-width: 767px) {
            display: block;
            overscroll-behavior-y: none;
            padding: 20px;
        }
    }

    .login-modal-contents {
        padding: 30px;
        border-radius: 10px;
        background-color: var(--bg-color-1);
        max-width: 400px;
        width: 100%;

        @media (max-width: 767px) {
            width: 100%;
        }
    }

    .login-modal__title {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 16px;
        text-align: center;
        color: var(--text-color-1);
    }

    .login-modal__description {
        font-size: 14px;
        color: var(--text-color-2);
        text-align: center;
        margin-bottom: 24px;
        line-height: 1.5;
    }

    .login-submit {
        text-align: center;
        margin-top: 30px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;

        .text-button {
            margin-top: 10px;
        }
    }

    .input-group {
        input {
            border: 1px solid var(--border-color-1);
            color: var(--text-color-1);
            background-color: var(--bg-color-2);

            &:disabled {
                opacity: 0.6;
            }
        }
    }

    .button--login-submit {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;

        &:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
    }

    .button__spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
