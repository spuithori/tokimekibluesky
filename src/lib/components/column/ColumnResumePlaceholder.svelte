<script lang="ts">
    import {_} from "tokimeki-i18n";
    import Unplug from '@lucide/svelte/icons/unplug';
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import MissingAccountItem from "$lib/components/acp/MissingAccountItem.svelte";
    import ColumnAgentMissing from "$lib/components/column/ColumnAgentMissing.svelte";
    import {appState} from "$lib/classes/appState.svelte";

    let { column } = $props();

    const status = $derived(appState.resumeStatus[column?.did]);
    const phase = $derived(status?.phase);
    const authAccount = $derived(phase === 'auth-required' ? appState.getResumeAccountById(status?.accountId) : undefined);

    let slow = $state(false);

    $effect(() => {
        const timer = setTimeout(() => {
            slow = true;
        }, 3000);
        return () => clearTimeout(timer);
    });
</script>

<div class="column-resume-placeholder deck-row-wrap column-resume-placeholder--{column?.settings?.width || 'medium'}">
  {#if phase === 'auth-required'}
    <Unplug size={40} color="var(--danger-color)" />
    <p class="column-resume-placeholder__text">{$_('column_resume_auth')}</p>

    {#if authAccount}
      <div class="column-resume-placeholder__account">
        <MissingAccountItem account={authAccount}></MissingAccountItem>
      </div>
    {:else if status?.handle}
      <p class="column-resume-placeholder__handle">@{status.handle}</p>
    {/if}
  {:else if phase === 'unreachable'}
    <Unplug size={40} color="var(--danger-color)" />
    <p class="column-resume-placeholder__text">
      {status?.offline ? $_('session_offline_notice') : $_('column_resume_unreachable')}
    </p>

    {#if status?.handle}
      <p class="column-resume-placeholder__handle">@{status.handle}</p>
    {/if}

    <button class="button button--sm" onclick={() => appState.retryAccount(status.accountId)}>{$_('retry')}</button>
  {:else if !phase}
    <ColumnAgentMissing {column}></ColumnAgentMissing>
  {:else}
    <LoadingSpinner padding={0}></LoadingSpinner>

    {#if slow}
      {#if phase === 'retrying'}
        <p class="column-resume-placeholder__text">{$_('column_resume_retrying', {attempt: status.attempt})}</p>
      {:else}
        <p class="column-resume-placeholder__text">{$_('column_resume_pending')}</p>
      {/if}

      {#if status?.handle}
        <p class="column-resume-placeholder__handle">@{status.handle}</p>
      {/if}
    {/if}
  {/if}
</div>

<style lang="postcss">
  .column-resume-placeholder {
      width: 450px;
      flex-shrink: 0;
      height: 100%;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 50px 30px;
      color: var(--text-color-3);
      border-radius: var(--deck-border-radius);
      border: var(--deck-border-width) solid var(--deck-border-color);
      background-color: var(--deck-content-bg-color);

      @media (max-width: 767px) {
          width: 100vw;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          height: 100dvh;
          border: none;
          border-radius: 0;
      }

      &--xxs {
          width: var(--deck-xxs-width);
      }

      &--xs {
          width: var(--deck-xs-width);
      }

      &--small {
          width: var(--deck-s-width);
      }

      &--medium {
          width: var(--deck-m-width);
      }

      &--large {
          width: var(--deck-l-width);
      }

      &--xl {
          width: var(--deck-xl-width);
      }

      &--xxl {
          width: var(--deck-xxl-width);
      }

      @media (max-width: 767px) {
          &--xxs, &--xs, &--small, &--medium, &--large, &--xl, &--xxl {
              width: 100vw;
          }
      }

      &__text {
          font-size: 14px;
          text-align: center;
      }

      &__handle {
          font-size: 13px;
          word-break: break-all;
          text-align: center;
      }

      &__account {
          width: 100%;
      }
  }
</style>
