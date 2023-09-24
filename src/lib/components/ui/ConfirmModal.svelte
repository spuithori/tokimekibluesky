<script lang="ts">
  import {createEventDispatcher} from "svelte";
  import {_} from "svelte-i18n";
  import {settings} from "$lib/stores";

  const dispatch = createEventDispatcher();
  export let yesText = 'OK';
  export let cancelText = 'Cancel';
  export let confirmationName = undefined;
  let el;

  function ok() {
      dispatch('ok');
      el.close();
  }

  function cancel() {
      el.close();
  }

  function close() {
      dispatch('cancel');
  }

  export function open() {
      el.showModal();
  }
</script>

<dialog class="dialog-modal" bind:this={el} on:close={close}>
  <div class="dialog-modal-contents">
    <slot></slot>

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
      <button class="button button--sm" on:click={ok}>{yesText}</button>
      <button class="text-button" on:click={cancel}>{cancelText}</button>
    </div>
  </div>
</dialog>

<style lang="postcss">
  .dialog-modal {
      margin: auto;
      appearance: none;
      background-color: transparent;
      border: none;

      &::backdrop {
          background-color: rgba(0, 0, 0, .6);
      }
  }

  .dialog-modal-contents {
      width: 100%;
      height: max-content;
      max-width: 300px;
      margin: auto;
      background-color: var(--bg-color-1);
      padding: 24px 16px;
      border-radius: var(--border-radius-3);
      text-align: center;
  }

  .dialog-modal-buttons {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
  }

  .skip-confirmation {
      margin-bottom: 16px;
  }
</style>