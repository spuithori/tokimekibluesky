<script lang="ts">
    import { supabase, supabaseSession } from '$lib/stores';
    import {_} from "svelte-i18n";
    import toast from "svelte-french-toast";

    let loading = false
    let email = ''

    const handleLogin = async () => {
        try {
            loading = true
            const { error } = await $supabase.auth.signInWithOtp({ email })
            if (error) throw error

            toast.success('メールを送信しました。メールのリンクをクリックするとログインできます。');
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message)
            }
        } finally {
            loading = false
        }
    }

    async function handleGitHubLogin() {
        const { data, error } = await $supabase.auth.signInWithOAuth({
            provider: 'github'
        })

        console.log(data);

        if (error) {
            console.error(error)
        }
    }
</script>

<div class="timeline">
  <p class="text-center">Send magic link をクリックするとメールが届きます。<br>メールのリンクをクリックするとログインできます。</p>

  <form class="sync-login-form" on:submit|preventDefault="{handleLogin}">
    <dl class="sync-login-group">
      <dt class="sync-login-group__name">
        <label for="email">{$_('email')}</label>
      </dt>

      <dd class="sync-login-group__content">
        <div class="sync-login-name">
          <input
              id="email"
              type="email"
              placeholder="example@tokimeki.blue"
              bind:value="{email}"
              class="sync-login-name__input"
              required
          >
        </div>
      </dd>
    </dl>

    <button disabled on:click={handleGitHubLogin}>GitHubでログイン(まだむり)</button>

    <div class="sync-login-buttons">
      <button type="submit" class="button" aria-live="polite" disabled="{loading}">
        <span>{loading ? 'Loading' : 'Send magic link'}</span>
      </button>
    </div>
  </form>
</div>

<style lang="postcss">
    .sync-login-group {
        @media (max-width: 767px) {
            margin-bottom: 20px;
        }

        &__name {
            font-size: 14px;
            margin-bottom: 6px;
        }

        &__content {

        }

        &--name {
            margin-bottom: 30px;

            @media (max-width: 767px) {
                margin-bottom: 20px;
            }
        }

        &__input {
            border: 1px solid var(--border-color-1);
            border-radius: 4px;
            height: 40px;
            padding: 0 10px;
            width: 100%;
            background-color: var(--bg-color-2);
            color: var(--text-color-1);
        }
    }

    .sync-login-name {
        position: relative;
        border: 1px solid var(--border-color-1);
        border-radius: 4px;
        height: 40px;
        padding: 0 10px;
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 10px;
        overflow: hidden;

        &__input {
            color: var(--text-color-1);
            height: 100%;
            width: 100%;
        }

        &:focus-within {
            border-color: var(--text-color-1);
        }

        svg {
            flex-shrink: 0;
        }
    }

    .sync-login-buttons {
        text-align: center;
    }

    .sync-login-form {
        margin-top: 30px;
    }

    .text-center {
        text-align: center;
    }
</style>