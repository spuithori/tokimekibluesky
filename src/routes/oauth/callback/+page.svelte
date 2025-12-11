<script lang="ts">
import '../../styles.css';
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { initOAuth } from '$lib/oauth';
import { accountsDb } from '$lib/db';
import { _ } from 'svelte-i18n';
import { Agent as AtpAgent } from '@atproto/api';
import { CircleSlash, CircleCheck } from 'lucide-svelte';
import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";

let status = $state<'loading' | 'success' | 'error'>('loading');
let errorMessage = $state('');

onMount(async () => {
    try {
        const result = await initOAuth();

        if (result.session) {
            const did = result.session.did;

            let handle: string | undefined;
            let avatar: string | undefined;
            let displayName: string | undefined;
            try {
                const agent = new AtpAgent(result.session);
                const profile = await agent.getProfile({ actor: did });
                handle = profile.data.handle;
                avatar = profile.data.avatar;
                displayName = profile.data.displayName;
            } catch (e) {
                console.warn('Failed to fetch profile for OAuth account:', e);
            }

            const existingAccount = await accountsDb.accounts
                .where('did')
                .equals(did)
                .first();

            if (existingAccount) {
                await accountsDb.accounts.update(existingAccount.id, {
                    isOAuth: true,
                    oauthDid: did,
                    handle: handle,
                    avatar: avatar || existingAccount.avatar,
                    name: displayName || existingAccount.name,
                });
            } else {
                await accountsDb.accounts.add({
                    did: did,
                    service: 'https://bsky.social',
                    session: null,
                    isOAuth: true,
                    oauthDid: did,
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
        } else {
            status = 'error';
            errorMessage = 'No session returned from OAuth';
        }
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
