<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Modal from "$lib/components/ui/Modal.svelte";
  import { checkScheduleAuth } from '$lib/scheduleApi';
  import { onMount } from 'svelte';
  import { AlertCircle, Timer } from 'lucide-svelte';
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import type { Agent } from '$lib/agent';
  import type { WhisperDuration } from '$lib/classes/postState.svelte';

  interface Props {
    onclose: () => void;
    onsubmit: (duration: WhisperDuration) => void;
    currentDuration?: WhisperDuration;
    _agent: Agent;
  }

  let { onclose, onsubmit, currentDuration, _agent }: Props = $props();

  let isAuthenticated = $state(false);
  let isChecking = $state(true);

  const durationOptions: { value: WhisperDuration; labelKey?: string; label?: string }[] = [
    { value: undefined, labelKey: 'whisper_none' },
    // { value: '10m', label: '10m' },
    { value: '30m', label: '30m' },
    { value: '1h', label: '1h' },
    { value: '6h', label: '6h' },
    { value: '12h', label: '12h' },
    { value: '24h', label: '24h' },
  ];

  function handleSelect(duration: WhisperDuration) {
    onsubmit(duration);
    onclose();
  }

  onMount(async () => {
    if (_agent.agent) {
      isAuthenticated = await checkScheduleAuth(_agent.agent);
    }
    isChecking = false;
  });
</script>

<Modal title={$_('whisper_title')} size="small" onclose={onclose}>
  <div class="whisper-modal">
    {#if isChecking}
      <div class="whisper-loading">
        <LoadingSpinner></LoadingSpinner>
      </div>
    {:else if !isAuthenticated}
      <div class="whisper-auth-required">
        <AlertCircle size="36" color="var(--primary-color)" />
        <p>{$_('schedule_auth_required')}</p>
        <a onclick={onclose} href="/settings/schedule" class="whisper-settings-link">
          {$_('schedule_go_to_settings')}
        </a>
      </div>
    {:else}
      <div class="whisper-form">
        <p class="whisper-description">{$_('whisper_description')}</p>

        <div class="whisper-input-group">
          <label class="whisper-label">
            <Timer size="18" />
            {$_('whisper_duration')}
          </label>
          <div class="whisper-options">
            {#each durationOptions as option}
              <button
                class="whisper-option"
                class:whisper-option--selected={currentDuration === option.value}
                onclick={() => { handleSelect(option.value); }}
              >
                {option.labelKey ? $_(option.labelKey) : option.label}
              </button>
            {/each}
          </div>
        </div>

        <p class="whisper-note">{$_('whisper_note')}</p>
      </div>
    {/if}
  </div>
</Modal>

<style lang="postcss">
  .whisper-modal {
    min-height: 200px;
  }

  .whisper-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: var(--text-color-3);
  }

  .whisper-auth-required {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    min-height: 200px;
    text-align: center;

    p {
      color: var(--text-color-2);
      font-size: 14px;
    }
  }

  .whisper-settings-link {
    display: inline-block;
    padding: 10px 20px;
    background-color: var(--primary-color);
    color: var(--bg-color-1);
    border-radius: var(--border-radius-3);
    font-weight: bold;
    text-decoration: none;

    &:hover {
      opacity: 0.9;
    }
  }

  .whisper-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .whisper-description {
    color: var(--text-color-2);
    font-size: 14px;
    margin: 0;
  }

  .whisper-input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .whisper-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-color-1);
  }

  .whisper-options {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .whisper-option {
    padding: 10px 16px;
    border: 1px solid var(--border-color-1);
    border-radius: var(--border-radius-2);
    background-color: var(--bg-color-2);
    color: var(--text-color-1);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
      border-color: var(--primary-color);
    }

    &--selected {
      background-color: var(--primary-color);
      color: var(--bg-color-1);
      border-color: var(--primary-color);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .whisper-note {
    color: var(--text-color-3);
    font-size: 12px;
    margin: 0;
  }
</style>
