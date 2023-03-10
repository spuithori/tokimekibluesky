<script lang="ts">
    import { theme, nonoto } from '$lib/stores';
    import { goto } from '$app/navigation';
    let darkMode = localStorage.getItem('theme') === 'dark';
    let nonotoToggle = JSON.parse(localStorage.getItem('nonoto')) === true;

    $: {
        localStorage.setItem('theme', darkMode ? 'dark' : 'default');
        theme.set(darkMode ? 'dark' : 'default');

        localStorage.setItem('nonoto', nonotoToggle ? 'true' : 'false');
        nonoto.set(String(nonotoToggle));
    }

    async function logout() {
        localStorage.removeItem('session');
        goto('/login');
    }
</script>

<div class="settings-box">
  <dl class="settings-group">
    <dt class="settings-group__name">
      ダークモード
    </dt>

    <dd class="settings-group__content">
      <div class="input-toggle">
        <input class="input-toggle__input" type="checkbox" id="darkMode" bind:checked={darkMode}><label class="input-toggle__label" for="darkMode"></label>
      </div>
    </dd>
  </dl>

  <dl class="settings-group">
    <dt class="settings-group__name">
      Noto Sansを使用しない
    </dt>

    <dd class="settings-group__content">
      <div class="input-toggle">
        <input class="input-toggle__input" type="checkbox" id="nonoto" bind:checked={nonotoToggle}><label class="input-toggle__label" for="nonoto"></label>
      </div>
    </dd>
  </dl>

  <div class="logout">
    <button class="button button--logout button--sm button--border button--white" type="submit" name="logout" on:click={logout}>ログアウト</button>
  </div>
</div>

<style>
    .settings-box {
        position: absolute;
        top: 80px;
        right: 0;
        width: 200px;
        height: max-content;
        overflow: auto;
        background-color: var(--bg-color-1);
        border-radius: 8px;
        border: 1px solid var(--border-color-1);
        box-shadow: 0 0 16px rgba(0, 0, 0, .16);
        padding: 20px;
        z-index: 200;
    }

    input[type=checkbox]{
        display: block;
        height: 0;
        width: 0;
        visibility: hidden;
    }

    .input-toggle__label {
        position: relative;
        text-indent: -9999px;
        width: 50px;
        height: 30px;
        background: var(--border-color-1);
        display: block;
        border-radius: 15px;
        cursor: pointer;
    }

    .input-toggle__label:after {
        content: '';
        position: absolute;
        top: 5px;
        left: 5px;
        width: 20px;
        height: 20px;
        background: var(--bg-color-1);
        border-radius: 50%;
        transition: all 0.25s ease-in-out;
    }

    .input-toggle__input:checked + .input-toggle__label {
        background: var(--primary-color);
    }

    .input-toggle__input:checked + .input-toggle__label:after {
        left: calc(100% - 5px);
        transform: translateX(-100%);
    }

    .input-toggle__label:active:after {
        width: 20px;
    }

    .settings-group {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        gap: 10px;
        font-size: 14px;
        border-bottom: 1px solid var(--border-color-1);
    }

    .settings-group:first-child {
        border-top: 1px solid var(--border-color-1);
    }

    .logout {
        margin-top: 20px;
    }
</style>