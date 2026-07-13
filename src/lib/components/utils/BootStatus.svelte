<script lang="ts">
    import {_} from "tokimeki-i18n";
    import {toast} from "svelte-sonner";
    import {version} from "$app/environment";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import MissingAccountItem from "$lib/components/acp/MissingAccountItem.svelte";
    import {appState, type AccountResumeStatus} from "$lib/classes/appState.svelte";
    import {getErrorLog} from "$lib/errorLog";

    const statuses = $derived(Object.entries(appState.resumeStatus));
    const primaryStatus = $derived(appState.resumeStatus[appState.resumePrimaryDid]);
    const primaryUnreachable = $derived(primaryStatus?.phase === 'unreachable');
    const primaryAccount = $derived(appState.getResumeAccountById(primaryStatus?.accountId));

    let slow = $state(false);

    $effect(() => {
        const timer = setTimeout(() => {
            slow = true;
        }, 3000);
        return () => clearTimeout(timer);
    });

    function phaseText(status: AccountResumeStatus): string {
        switch (status.phase) {
            case 'retrying':
                return $_('boot_status_account_retrying', {attempt: status.attempt});
            case 'resumed':
                return $_('boot_status_account_resumed');
            case 'auth-required':
                return $_('boot_status_account_auth');
            case 'unreachable':
                return $_('boot_status_account_unreachable');
            default:
                return $_('boot_status_account_pending');
        }
    }

    function copyDiagnostics() {
        const diagnostics = {
            version,
            timestamp: new Date().toISOString(),
            online: navigator.onLine,
            userAgent: navigator.userAgent,
            bootError: appState.bootError,
            accounts: Object.entries(appState.resumeStatus).map(([did, status]) => ({
                did,
                handle: status.handle,
                phase: status.phase,
                attempt: status.attempt,
                offline: status.offline || undefined,
            })),
            errors: getErrorLog(),
        };

        navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2))
            .then(() => toast.success($_('boot_diagnostics_copied')))
            .catch(() => toast.error($_('failed_copy')));
    }
</script>

<div class="boot-status">
  {#if appState.bootError}
    <h2 class="boot-status__title boot-status__title--error">{$_('boot_error_title')}</h2>
    <p class="boot-status__description">{$_('boot_error_description')}</p>
    <p class="boot-status__description boot-status__description--detail">{appState.bootError.name}: {appState.bootError.message}</p>

    <div class="boot-status__buttons">
      <button class="button button--sm" onclick={() => location.reload()}>{$_('boot_error_reload')}</button>
      <button class="button button--border button--sm" onclick={copyDiagnostics}>{$_('boot_copy_diagnostics')}</button>
    </div>

    <p class="boot-status__recovery-text"><a href="/recovery" data-sveltekit-reload>{$_('boot_error_recovery')}</a></p>
  {:else if primaryUnreachable}
    <h2 class="boot-status__title boot-status__title--error">
      {appState.resumeStatus[appState.resumePrimaryDid]?.offline ? $_('session_offline_notice_title') : $_('boot_status_unreachable_title')}
    </h2>
    <p class="boot-status__description">
      {appState.resumeStatus[appState.resumePrimaryDid]?.offline ? $_('session_offline_notice') : $_('boot_status_unreachable_description')}
    </p>
  {:else}
    <LoadingSpinner padding={0}></LoadingSpinner>

    {#if slow}
      <h2 class="boot-status__title">{$_('boot_status_resuming')}</h2>
    {/if}
  {/if}

  {#if !appState.bootError && (slow || primaryUnreachable) && statuses.length}
    <ul class="boot-status__accounts">
      {#each statuses as [did, status] (did)}
        <li class="boot-status__account">
          <span class="boot-status__handle">@{status.handle}</span>
          <span class="boot-status__phase boot-status__phase--{status.phase}">{phaseText(status)}</span>
        </li>
      {/each}
    </ul>
  {/if}

  {#if slow && !primaryUnreachable}
    <p class="boot-status__slow">{$_('boot_status_slow')}</p>
  {/if}

  {#if !appState.bootError && (slow || primaryUnreachable)}
    <div class="boot-status__buttons">
      <button class="button button--sm" onclick={() => appState.retryStalledResume()}>{$_('boot_status_retry_now')}</button>
      <button class="button button--border button--sm" onclick={copyDiagnostics}>{$_('boot_copy_diagnostics')}</button>
    </div>
  {/if}

  {#if !appState.bootError && primaryUnreachable && primaryAccount}
    <div class="boot-status__recovery">
      <p class="boot-status__recovery-text">{$_('boot_status_manual_recovery')}</p>
      <MissingAccountItem account={primaryAccount}></MissingAccountItem>
    </div>
  {/if}
</div>

<style lang="postcss">
  .boot-status {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 40px 20px;
      max-width: 420px;
      margin: 0 auto;
      color: var(--text-color-2);

      &__title {
          font-size: 16px;
          text-align: center;
          color: var(--text-color-1);

          &--error {
              color: var(--danger-color);
          }
      }

      &__description {
          font-size: 14px;
          text-align: center;

          &--detail {
              font-size: 12px;
              color: var(--text-color-3);
              word-break: break-all;
          }
      }

      &__accounts {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
      }

      &__account {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
      }

      &__handle {
          word-break: break-all;
      }

      &__phase {
          flex-shrink: 0;
          color: var(--text-color-3);

          &--auth-required,
          &--unreachable {
              color: var(--danger-color);
          }

          &--resumed {
              color: var(--text-color-3);
          }
      }

      &__slow {
          font-size: 13px;
          text-align: center;
          color: var(--text-color-3);
      }

      &__buttons {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: center;
      }

      &__recovery {
          width: 100%;
          margin-top: 8px;
      }

      &__recovery-text {
          font-size: 13px;
          margin-bottom: 8px;
          text-align: center;
      }
  }
</style>
