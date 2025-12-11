<script lang="ts">
  import { preventDefault } from 'svelte/legacy';
  import { _ } from "svelte-i18n";
  import { AtpAgent, AtpSessionData } from "@atproto/api";
  import { accountsDb } from "$lib/db";
  import { createEventDispatcher } from "svelte";
  import { toast } from "svelte-sonner";
  import { signIn } from '$lib/oauth';
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";

  const dispatch = createEventDispatcher();

  interface Props {
    existingId?: any;
    identifier?: string;
    isMissing?: boolean;
  }

  let { existingId = undefined, identifier = $bindable(''), isMissing = false }: Props = $props();

  let authMode = $state<'password' | 'oauth'>('oauth');
  let password = $state('');
  let errorMessage = '';
  let service = $state('https://bsky.social');
  let isTwoFactor = $state(false);
  let twoFactorValue = $state('');
  let isOAuthLoading = $state(false);

  async function loginWithPassword() {
    const agent = new AtpAgent({
      service: service,
    });

    try {
      await agent.login({ identifier: identifier, password: password, authFactorToken: isTwoFactor ? twoFactorValue : undefined });

      const id = await accountsDb.accounts.put({
        id: existingId,
        session: agent.session as AtpSessionData,
        did: agent.session?.did || '',
        service: service,
        handle: agent.session?.handle,
        avatar: '',
        following: undefined,
        notification: ['reply', 'like', 'repost', 'follow', 'quote', 'mention'],
        isOAuth: false,
      });

      dispatch('success', {
        id: id,
      });
    } catch (e) {
      if (e.name === 'ConstraintError') {
        toast.error($_('login_duplicate_account'));
      } else if (e.error === 'AuthFactorTokenRequired') {
        toast.info($_('login_2fa_code_send'));
        isTwoFactor = true;
      } else {
        toast.error(e.message);
      }
    }
  }

  async function loginWithOAuth() {
    if (!identifier.trim()) {
      toast.error($_('oauth_enter_handle'));
      return;
    }

    isOAuthLoading = true;

    try {
      await signIn(identifier.trim());
    } catch (error) {
      console.error('OAuth sign in error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start OAuth flow');
      isOAuthLoading = false;
    }
  }

  function cancel() {
    dispatch('cancel');
  }
</script>

<div class="login-modal">
  <div class="login-modal-contents">
    {#if (errorMessage)}
      <p>{errorMessage}</p>
    {/if}

    <div class="auth-mode-toggle">
      <button
        class="auth-mode-toggle__button"
        class:auth-mode-toggle__button--active={authMode === 'oauth'}
        onclick={() => authMode = 'oauth'}
        type="button"
      >
        OAuth
      </button>
      <button
        class="auth-mode-toggle__button"
        class:auth-mode-toggle__button--active={authMode === 'password'}
        onclick={() => authMode = 'password'}
        type="button"
      >
        {$_('login_password')}
      </button>
    </div>

    {#if authMode === 'oauth'}
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
            <input class="input-group__input" type="text" name="handle" id="handle" placeholder="example.bsky.social" bind:value={identifier} disabled={isOAuthLoading || isMissing} required >
          </dd>
        </dl>

        <div class="login-submit">
          <button class="button button--login" type="submit" disabled={isOAuthLoading}>
            {#if isOAuthLoading}
              <LoadingSpinner color="#fff" size={20}></LoadingSpinner>
            {:else}
              {$_('oauth_login')}
            {/if}
          </button>

          <button class="text-button" onclick={preventDefault(cancel)} disabled={isOAuthLoading}>
            {$_('cancel')}
          </button>
        </div>
      </form>

      <div class="oauth-info">
        <p>{$_('oauth_recommended')}</p>
      </div>
    {:else}
      <form action="#" onsubmit={preventDefault(loginWithPassword)}>
        <dl class="input-group">
          <dt class="input-group__name input-group__name--show">
            <label for="service">{$_('login_service')}</label>
          </dt>

          <dd class="input-group__content">
            <input class="input-group__input" type="text" name="service" id="service" placeholder="service" bind:value="{service}" required>
          </dd>
        </dl>

        <dl class="input-group">
          <dt class="input-group__name input-group__name--show">
            <label for="email">{$_('login_handle_or_email')}</label>
          </dt>

          <dd class="input-group__content">
            <span class="input-group__prefix"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-at-sign"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg></span>
            <input class="input-group__input" type="text" name="email" id="email" placeholder="example.bsky.social" bind:value="{identifier}" readonly={isMissing} required>
          </dd>
        </dl>

        <dl class="input-group">
          <dt class="input-group__name input-group__name--show">
            <label for="password">{$_('login_password')}</label>
          </dt>

          <dd class="input-group__content">
            <span class="input-group__prefix"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock-keyhole"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg></span>
            <input class="input-group__input" type="password" name="password" id="password" placeholder="password" bind:value="{password}" required />
          </dd>
        </dl>

        {#if (isTwoFactor)}
          <dl class="input-group">
            <dt class="input-group__name input-group__name--show">
              <label for="2fa">{$_('login_2fa_code')}</label>
            </dt>

            <dd class="input-group__content">
              <span class="input-group__prefix"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock-keyhole"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg></span>
              <input class="input-group__input" type="text" name="2fa" id="2fa" placeholder="XXXX-XXXX" bind:value="{twoFactorValue}" required />
            </dd>
          </dl>
        {/if}

        <div class="login-submit">
          <button class="button button--login" type="submit">{$_('login')}</button>

          <button class="text-button" onclick={preventDefault(cancel)}>{$_('cancel')}</button>
        </div>
      </form>

      <div class="app-password-recommend">
        <p>{$_('recommend_use_app_password')}<br><a href="{$_('url_app_password')}" target="_blank" rel="noopener">{$_('details')}</a></p>
      </div>
    {/if}
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

    .auth-mode-toggle {
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
        background-color: var(--bg-color-2);
        padding: 4px;
        border-radius: 8px;
    }

    .auth-mode-toggle__button {
        flex: 1;
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-color-2);
        background-color: transparent;
        transition: all 0.2s ease;

        &:hover {
            color: var(--text-color-1);
        }

        &--active {
            background-color: var(--primary-color);
            color: #fff;

            &:hover {
                color: #fff;
            }
        }
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

    .app-password-recommend {
        text-align: center;
        background-color: var(--base-bg-color);
        color: var(--text-color-2);
        padding: 10px;
        border-radius: 6px;
        margin-top: 20px;
        font-size: 14px;
    }

    .oauth-info {
        text-align: center;
        background-color: var(--bg-color-2);
        color: var(--text-color-2);
        padding: 12px;
        border-radius: 6px;
        margin-top: 20px;
        font-size: 13px;
        line-height: 1.5;
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
</style>
