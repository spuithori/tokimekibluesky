<script lang="ts">
  import { preventDefault } from 'svelte/legacy';
  import { _ } from "svelte-i18n";
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

  let isOAuthLoading = $state(false);

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
