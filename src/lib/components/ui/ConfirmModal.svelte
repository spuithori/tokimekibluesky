<script lang="ts">
    import {onMount} from "svelte";
  import {_} from "tokimeki-i18n";
  import {settings} from "$lib/stores";

  interface Props {
    yesText?: string;
    cancelText?: string;
    confirmationName?: any;
    children?: import('svelte').Snippet;
    onok?: () => void;
    oncancel?: () => void;
  }

  let {
    yesText = 'OK',
    cancelText = 'Cancel',
    confirmationName = undefined,
    children,
    onok,
    oncancel
  }: Props = $props();
  let el = $state();

  function ok() {
      onok?.();
      el.close();
  }

  function cancel() {
      el.close();
  }

  function close() {
      oncancel?.();
  }

  export function open() {
      el.showModal();
  }

  onMount(() => {
      el.showModal();
  })
</script>

<dialog class="dialog-modal" bind:this={el} onclose={close}>
  <div class="dialog-modal-contents">
    {@render children?.()}

    {#if confirmationName}
      <div class="skip-confirmation">
        <div class="checkbox">
          <input type="checkbox" class="checkbox__input" bind:checked={$settings.general[confirmationName]} id="skip_confirmation">
          <label class="checkbox__label" for="skip_confirmation">
            <span class="checkbox__ui"></span>
            <span class="checkbox__text">{$_('skip_confirmation_text')}</span>
          </label>
        </div>
      </div>
    {/if}

    <div class="dialog-modal-buttons">
      <button class="button button--sm" onclick={ok}>{yesText}</button>
      <button class="text-button" onclick={cancel}>{cancelText}</button>
    </div>
  </div>
</dialog>

<style lang="postcss">
    .skip-confirmation {
      margin-bottom: 32px;
  }
</style>
