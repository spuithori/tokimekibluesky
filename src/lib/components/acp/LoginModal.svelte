<script lang="ts">
  import LoginForm from "$lib/components/acp/LoginForm.svelte";

  interface Props {
    existingId?: any;
    identifier?: string;
    isMissing?: boolean;
    initialAuthMode?: 'password' | 'oauth';
    lockAuthMode?: boolean;
    onsuccess?: (id: any) => void;
    oncancel?: () => void;
  }

  let { existingId = undefined, identifier = $bindable(''), isMissing = false, initialAuthMode = undefined, lockAuthMode = false, onsuccess, oncancel }: Props = $props();
</script>

<div class="login-modal">
  <div class="login-modal-contents">
    <LoginForm {existingId} bind:identifier {isMissing} {initialAuthMode} {lockAuthMode} mode="tabs" {onsuccess} {oncancel} />
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
</style>
