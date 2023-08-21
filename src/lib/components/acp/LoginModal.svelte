<script lang="ts">
import {_} from "svelte-i18n";
import { AtpAgent, AtpSessionData } from "@atproto/api";
import { accountsDb } from "$lib/db";
import { createEventDispatcher } from "svelte";
import toast from "svelte-french-toast";
const dispatch = createEventDispatcher();

let identifier = '';
let password = '';
let errorMessage = '';
let service = 'https://bsky.social';

async function login() {
    const agent = new AtpAgent({
        service: service,
    });

    try {
        await agent.login({identifier: identifier, password: password});

        const id = await accountsDb.accounts.put({
            id: undefined,
            session: agent.session as AtpSessionData,
            did: agent.session?.did || '',
            service: service,
            avatar: '',
            following: undefined,
            notification: ['reply', 'like', 'repost', 'follow', 'quote', 'mention'],
        });

        const res = await agent.api.app.bsky.actor.getProfile({actor: agent.session.did});
        const avatar = res.data.avatar || '';

        const aid = await accountsDb.accounts.update(id, {
            avatar: avatar
        });

        dispatch('success', {
            id: id,
        });
    } catch (e) {
        //errorMessage = e.message;

        if (e.name === 'ConstraintError') {
            toast.error($_('login_duplicate_account'));
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

    <form action="#" on:submit|preventDefault={login}>
      <dl class="input-group">
        <dt class="input-group__name">
          <label for="service">Service</label>
        </dt>

        <dd class="input-group__content">
          <input class="input-group__input" type="text" name="service" id="service" placeholder="service" bind:value="{service}" required />
        </dd>
      </dl>

      <dl class="input-group">
        <dt class="input-group__name">
          <label for="email">Email or handle</label>
        </dt>

        <dd class="input-group__content">
          <input class="input-group__input" type="text" name="email" id="email" placeholder="Email or handle" bind:value="{identifier}" required />
        </dd>
      </dl>

      <dl class="input-group">
        <dt class="input-group__name">
          <label for="password">Password</label>
        </dt>

        <dd class="input-group__content">
          <input class="input-group__input" type="password" name="password" id="password" placeholder="Password" bind:value="{password}" required />
        </dd>
      </dl>

      <div class="login-submit">
        <button class="button button--login button--login-submit" type="submit">{$_('login')}</button>

        <button class="text-button" on:click|preventDefault={cancel}>{$_('cancel')}</button>
      </div>
    </form>

    <div class="app-password-recommend">
      <p>{$_('recommend_use_app_password')}<br><a href="{$_('url_app_password')}" target="_blank" rel="noopener">{$_('details')}</a></p>
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
</style>