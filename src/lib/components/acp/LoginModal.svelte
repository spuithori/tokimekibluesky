<script lang="ts">
  import { preventDefault } from 'svelte/legacy';

import { m } from "$lib/paraglide/messages.js";
import { AtpAgent, AtpSessionData } from "@atproto/api";
import { accountsDb } from "$lib/db";
import { createEventDispatcher } from "svelte";
import { toast } from "svelte-sonner";
const dispatch = createEventDispatcher();

  interface Props {
    existingId?: any;
    identifier?: string;
    isMissing?: boolean;
  }

  let { existingId = undefined, identifier = $bindable(''), isMissing = false }: Props = $props();
let password = $state('');
let errorMessage = '';
let service = $state('https://bsky.social');
let isTwoFactor = $state(false);
let twoFactorValue = $state('');

async function login() {
    const agent = new AtpAgent({
        service: service,
    });

    try {
        await agent.login({identifier: identifier, password: password, authFactorToken: isTwoFactor ? twoFactorValue : undefined});

        const id = await accountsDb.accounts.put({
            id: existingId,
            session: agent.session as AtpSessionData,
            did: agent.session?.did || '',
            service: service,
            avatar: '',
            following: undefined,
            notification: ['reply', 'like', 'repost', 'follow', 'quote', 'mention'],
        });

        dispatch('success', {
            id: id,
        });
    } catch (e) {
        if (e.name === 'ConstraintError') {
            toast.error(m.login_duplicate_account());
        } else if (e.error === 'AuthFactorTokenRequired') {
            toast.info(m.login_2fa_code_send());
            isTwoFactor = true;
        } else {
            toast.error(e.message);
        }
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

    <form action="#" onsubmit={preventDefault(login)}>
      <dl class="input-group">
        <dt class="input-group__name input-group__name--show">
          <label for="service">{m.login_service()}</label>
        </dt>

        <dd class="input-group__content">
          <input class="input-group__input" type="text" name="service" id="service" placeholder="service" bind:value="{service}" required />
        </dd>
      </dl>

      <dl class="input-group">
        <dt class="input-group__name input-group__name--show">
          <label for="email">{m.login_handle_or_email()}</label>
        </dt>

        <dd class="input-group__content">
          <span class="input-group__prefix"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-at-sign"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg></span>
          <input class="input-group__input" type="text" name="email" id="email" placeholder="example.bsky.social" bind:value="{identifier}" readonly={isMissing} required />
        </dd>
      </dl>

      <dl class="input-group">
        <dt class="input-group__name input-group__name--show">
          <label for="password">{m.login_password()}</label>
        </dt>

        <dd class="input-group__content">
          <span class="input-group__prefix"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock-keyhole"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg></span>
          <input class="input-group__input" type="password" name="password" id="password" placeholder="password" bind:value="{password}" required />
        </dd>
      </dl>

      {#if (isTwoFactor)}
        <dl class="input-group">
          <dt class="input-group__name input-group__name--show">
            <label for="2fa">{m.login_2fa_code()}</label>
          </dt>

          <dd class="input-group__content">
            <span class="input-group__prefix"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock-keyhole"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg></span>
            <input class="input-group__input" type="text" name="2fa" id="2fa" placeholder="XXXX-XXXX" bind:value="{twoFactorValue}" required />
          </dd>
        </dl>
      {/if}

      <div class="login-submit">
        <button class="button button--login button--login-submit" type="submit">{m.login()}</button>

        <button class="text-button" onclick={preventDefault(cancel)}>{m.cancel()}</button>
      </div>
    </form>

    <div class="app-password-recommend">
      <p>{m.recommend_use_app_password()}<br><a href="{m.url_app_password()}" target="_blank" rel="noopener">{m.details()}</a></p>
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

    .app-password-recommend {
        text-align: center;
        background-color: var(--base-bg-color);
        color: var(--text-color-2);
        padding: 10px;
        border-radius: 6px;
        margin-top: 20px;
        font-size: 14px;
    }

    .input-group {
        input {
            border: 1px solid var(--border-color-1);
            color: var(--text-color-1);
            background-color: var(--bg-color-2);
        }
    }
</style>