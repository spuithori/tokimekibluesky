<script lang="ts">
  import AtSign from '@lucide/svelte/icons/at-sign';
  import LockKeyhole from '@lucide/svelte/icons/lock-keyhole';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { _ } from "tokimeki-i18n";
  import { slide } from 'svelte/transition';
  import { PasswordSession, type SessionData } from "$lib/password-session";
  import { accountsDb } from "$lib/db";
  import { toast } from "svelte-sonner";
  import { signIn } from '$lib/oauth';
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import HandleTypeahead from "$lib/components/acp/HandleTypeahead.svelte";

  interface Props {
    existingId?: any;
    identifier?: string;
    isMissing?: boolean;
    initialAuthMode?: 'password' | 'oauth';
    lockAuthMode?: boolean;
    mode?: 'tabs' | 'page';
    onsuccess?: (id: any) => void;
    oncancel?: () => void;
  }

  let { existingId = undefined, identifier = $bindable(''), isMissing = false, initialAuthMode = undefined, lockAuthMode = false, mode = 'tabs', onsuccess, oncancel }: Props = $props();

  let authMode = $state<'password' | 'oauth'>(initialAuthMode || 'oauth');
  const lockIdentifier = isMissing && identifier.trim() !== '';
  let password = $state('');
  let service = $state('https://bsky.social');
  let isTwoFactor = $state(false);
  let twoFactorValue = $state('');
  let isOAuthLoading = $state(false);
  let isPasswordLoading = $state(false);
  let isServerOpen = $state(false);
  const showPassword = $derived(authMode === 'password');
  const showOAuth = $derived(mode === 'page' || authMode === 'oauth');

  async function loginWithPassword() {
    const passwordSession = new PasswordSession({
      service: service,
    });

    isPasswordLoading = true;

    try {
      const sessionData = await passwordSession.login({ identifier: identifier, password: password, authFactorToken: isTwoFactor ? twoFactorValue : undefined });

      let id: number;

      if (existingId) {
        const existing = await accountsDb.accounts.get(existingId);
        if (existing?.did && sessionData.did && sessionData.did !== existing.did) {
          toast.error($_('login_account_mismatch'));
          return;
        }
        await accountsDb.accounts.update(existingId, {
          session: sessionData as SessionData,
          did: sessionData.did || '',
          service: service,
          handle: sessionData.handle,
          isOAuth: false,
          oauthDid: undefined,
        });
        id = existingId;
      } else {
        id = await accountsDb.accounts.put({
          session: sessionData as SessionData,
          did: sessionData.did || '',
          service: service,
          handle: sessionData.handle,
          avatar: '',
          following: undefined,
          notification: ['reply', 'like', 'repost', 'follow', 'quote', 'mention'],
          isOAuth: false,
        });
      }

      onsuccess?.(id);
    } catch (e: any) {
      if (e.name === 'ConstraintError') {
        toast.error($_('login_duplicate_account'));
      } else if (e.error === 'AuthFactorTokenRequired') {
        toast.info($_('login_2fa_code_send'));
        isTwoFactor = true;
      } else {
        toast.error(e.message);
      }
    } finally {
      isPasswordLoading = false;
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
    oncancel?.();
  }
</script>

<div class="login-form login-form--{mode}">
  {#if mode === 'tabs'}
    <div class="auth-mode-toggle">
      <button
        class="auth-mode-toggle__button"
        class:auth-mode-toggle__button--active={authMode === 'oauth'}
        onclick={() => authMode = 'oauth'}
        type="button"
        disabled={lockAuthMode}
      >
        {$_('login_tab_oauth')}
      </button>
      <button
        class="auth-mode-toggle__button"
        class:auth-mode-toggle__button--active={authMode === 'password'}
        onclick={() => authMode = 'password'}
        type="button"
        disabled={lockAuthMode}
      >
        {$_('login_password')}
      </button>
    </div>
  {/if}

  {#if showOAuth}
    <form class="login-form__section" action="#" onsubmit={(e) => { e.preventDefault(); loginWithOAuth(); }}>
      <dl class="input-group">
        <dt class="input-group__name input-group__name--show">
          <label for="handle">{$_('login_handle_label')}</label>
        </dt>

        <dd class="input-group__content">
          <HandleTypeahead bind:value={identifier} disabled={isOAuthLoading || lockIdentifier} id="handle" />
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

        {#if mode === 'tabs'}
          <button class="text-button" onclick={(e) => { e.preventDefault(); cancel(); }} disabled={isOAuthLoading}>
            {$_('cancel')}
          </button>
        {/if}
      </div>

      {#if mode === 'tabs'}
        <p class="login-form__note">{$_('oauth_recommended_note')}</p>
      {/if}
    </form>
  {/if}

  {#if mode === 'page' && !lockAuthMode}
    <button
      class="login-form__disclosure"
      class:login-form__disclosure--open={authMode === 'password'}
      type="button"
      aria-expanded={authMode === 'password'}
      aria-controls="login-password-section"
      onclick={() => authMode = authMode === 'password' ? 'oauth' : 'password'}
    >
      <span>{$_('login_with_app_password')}</span>
      <ChevronDown size={18} color="currentColor" />
    </button>
  {/if}

  {#if showPassword}
    <form
      class="login-form__section login-form__section--password"
      id="login-password-section"
      action="#"
      onsubmit={(e) => { e.preventDefault(); loginWithPassword(); }}
      transition:slide={{ duration: mode === 'page' ? 220 : 0 }}
      onintroend={(e) => { if (mode === 'page') e.currentTarget.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }}
    >
      <dl class="input-group">
        <dt class="input-group__name input-group__name--show">
          <label for="email">{$_('login_handle_or_email')}</label>
        </dt>

        <dd class="input-group__content">
          <span class="input-group__prefix"><AtSign size={20} color="var(--text-color-1)" /></span>
          <input class="input-group__input" type="text" name="email" id="email" placeholder="example.bsky.social" bind:value="{identifier}" readonly={lockIdentifier} required autocomplete="username">
        </dd>
      </dl>

      <dl class="input-group">
        <dt class="input-group__name input-group__name--show">
          <label for="password">{$_('login_app_password_label')}</label>
        </dt>

        <dd class="input-group__content">
          <span class="input-group__prefix"><LockKeyhole size={20} color="var(--text-color-1)" /></span>
          <input class="input-group__input" type="password" name="password" id="password" placeholder="xxxx-xxxx-xxxx-xxxx" bind:value="{password}" required autocomplete="current-password" />
        </dd>
      </dl>

      {#if (isTwoFactor)}
        <dl class="input-group">
          <dt class="input-group__name input-group__name--show">
            <label for="2fa">{$_('login_2fa_code')}</label>
          </dt>

          <dd class="input-group__content">
            <span class="input-group__prefix"><LockKeyhole size={20} color="var(--text-color-1)" /></span>
            <input class="input-group__input" type="text" name="2fa" id="2fa" placeholder="XXXX-XXXX" bind:value="{twoFactorValue}" required inputmode="text" autocomplete="one-time-code" />
          </dd>
        </dl>
      {/if}

      <button
        class="login-form__server-toggle"
        type="button"
        aria-expanded={isServerOpen}
        aria-controls="login-server-section"
        onclick={() => isServerOpen = !isServerOpen}
      >
        <ChevronDown size={16} color="currentColor" class={isServerOpen ? 'is-open' : ''} />
        <span>{$_('login_advanced')}</span>
        <span class="login-form__server-value">{service.replace(/^https?:\/\//, '')}</span>
      </button>

      {#if isServerOpen}
        <dl class="input-group" id="login-server-section" transition:slide={{ duration: 180 }}>
          <dt class="input-group__name input-group__name--show">
            <label for="service">{$_('login_service')}</label>
          </dt>

          <dd class="input-group__content">
            <input class="input-group__input" type="url" name="service" id="service" placeholder="https://bsky.social" bind:value="{service}" required>
          </dd>
        </dl>
      {/if}

      <div class="login-submit">
        <button class="button button--login" type="submit" disabled={isPasswordLoading}>
          {#if isPasswordLoading}
            <LoadingSpinner color="#fff" size={20}></LoadingSpinner>
          {:else}
            {$_('login')}
          {/if}
        </button>

        {#if mode === 'tabs'}
          <button class="text-button" onclick={(e) => { e.preventDefault(); cancel(); }}>{$_('cancel')}</button>
        {/if}
      </div>

      <p class="login-form__note">{$_('recommend_use_app_password')} <a href="{$_('url_app_password')}" target="_blank" rel="noopener">{$_('details')}</a></p>
    </form>
  {/if}
</div>

<style lang="postcss">
    .login-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .login-form__section {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .auth-mode-toggle {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
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
        transition: color .2s ease, background-color .2s ease;

        &:hover:not(:disabled) {
            color: var(--text-color-1);
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }

        &--active {
            background-color: var(--primary-color);
            color: #fff;

            &:hover {
                color: #fff;
            }

            &:disabled {
                opacity: 1;
            }
        }
    }

    .login-submit {
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;

        .button--login {
            width: 100%;
            min-width: 0;
        }
    }

    .login-form__note {
        font-size: 13px;
        line-height: 1.6;
        color: var(--text-color-3);
        text-align: center;
        margin: 0;

        a {
            color: var(--primary-color);
            text-decoration: underline;
        }
    }

    .login-form__disclosure {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        align-self: center;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-color-2);
        padding: 6px 10px;
        border-radius: 999px;
        transition: background-color .15s ease, color .15s ease;

        &:hover {
            background-color: var(--bg-color-2);
            color: var(--text-color-1);
        }

        &:focus-visible {
            outline: 2px solid var(--primary-color);
            outline-offset: 2px;
        }

        :global(svg) {
            transition: transform .2s ease;
        }

        &--open :global(svg) {
            transform: rotate(180deg);
        }
    }

    .login-form__section--password {
        padding-top: 16px;
        border-top: 1px solid var(--border-color-2);
    }

    .login-form__server-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--text-color-3);
        align-self: flex-start;
        padding: 4px 6px;
        margin-left: -6px;
        border-radius: var(--border-radius-3);

        &:focus-visible {
            outline: 2px solid var(--primary-color);
            outline-offset: 1px;
        }

        :global(svg) {
            transition: transform .2s ease;
        }

        :global(svg.is-open) {
            transform: rotate(180deg);
        }
    }

    .login-form__server-value {
        color: var(--text-color-2);
        font-weight: 600;
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
