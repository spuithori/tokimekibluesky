<script lang="ts">
import '../../styles.css';
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { accountsDb } from '$lib/db';
import { _ } from 'svelte-i18n';
import { CircleSlash, CircleCheck } from 'lucide-svelte';
import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";

let status = $state<'loading' | 'success' | 'error'>('loading');
let errorMessage = $state('');

onMount(async () => {
    const params = $page.url.searchParams;
    const error = params.get('error');

    if (error) {
        status = 'error';
        errorMessage = decodeURIComponent(error);
        return;
    }

    const newDid = params.get('new_did');
    if (!newDid) {
        status = 'error';
        errorMessage = 'No account information returned';
        return;
    }

    try {
        const handle = params.get('handle') || undefined;
        const avatar = params.get('avatar') || undefined;
        const displayName = params.get('name') || undefined;

        const existingAccount = await accountsDb.accounts
            .where('did')
            .equals(newDid)
            .first();

        if (existingAccount) {
            await accountsDb.accounts.update(existingAccount.id, {
                isOAuth: true,
                oauthDid: newDid,
                session: null,
                handle: handle,
                avatar: avatar || existingAccount.avatar,
                name: displayName || existingAccount.name,
            });
        } else {
            await accountsDb.accounts.add({
                did: newDid,
                service: 'https://bsky.social',
                session: null,
                isOAuth: true,
                oauthDid: newDid,
                handle: handle,
                avatar: avatar || '',
                name: displayName || '',
                following: undefined,
                notification: ['reply', 'like', 'repost', 'follow', 'quote', 'mention'],
            });
        }

        status = 'success';

        setTimeout(() => {
            goto('/');
        }, 1000);
    } catch (error) {
        console.error('OAuth callback error:', error);
        status = 'error';
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }
});
</script>

<div class="oauth-callback">
    <div class="oauth-callback__content">
        {#if status === 'loading'}
            <div class="oauth-callback__item">
                <div class="oauth-callback__icon">
                    <LoadingSpinner></LoadingSpinner>
                </div>
            </div>
        {:else if status === 'success'}
            <div class="oauth-callback__item">
                <div class="oauth-callback__icon">
                    <CircleCheck color="var(--primary-color)" size="32"></CircleCheck>
                </div>

                <p class="oauth-callback__text">{$_('oauth_success')}</p>
                <p class="oauth-callback__text">{$_('oauth_redirecting')}</p>
            </div>
        {:else}
            <div class="oauth-callback__item">
                <div class="oauth-callback__icon">
                    <CircleSlash color="var(--danger-color)" size="32"></CircleSlash>
                </div>

                <p class="oauth-callback__text">{$_('oauth_error')}</p>
                <p class="oauth-callback__text">{errorMessage}</p>
                <button class="button" onclick={() => goto('/login')}>
                    {$_('back_to_login')}
                </button>
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
