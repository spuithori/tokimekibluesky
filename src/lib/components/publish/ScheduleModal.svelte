<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Modal from "$lib/components/ui/Modal.svelte";
  import { checkScheduleAuth } from '$lib/scheduleApi';
  import { agent } from '$lib/stores';
  import { onMount } from 'svelte';
  import { Calendar, Clock, AlertCircle } from 'lucide-svelte';
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";

  interface Props {
    onclose: () => void;
    onschedule: (date: Date) => void;
  }

  let { onclose, onschedule }: Props = $props();

  let isAuthenticated = $state(false);
  let isChecking = $state(true);
  let selectedDate = $state('');
  let selectedTime = $state('');
  let minDateTime = $state('');

  function updateMinDateTime() {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    minDateTime = `${year}-${month}-${day}`;

    if (!selectedDate) {
      selectedDate = minDateTime;
    }
    if (!selectedTime) {
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(Math.ceil(now.getMinutes() / 5) * 5).padStart(2, '0');
      selectedTime = `${hours}:${minutes === '60' ? '00' : minutes}`;
    }
  }

  let isValid = $derived.by(() => {
    if (!selectedDate || !selectedTime) return false;
    const scheduled = new Date(`${selectedDate}T${selectedTime}`);
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return scheduled > now;
  });

  function handleSchedule() {
    if (!isValid) return;
    const scheduled = new Date(`${selectedDate}T${selectedTime}`);
    onschedule(scheduled);
  }

  onMount(async () => {
    updateMinDateTime();
    if ($agent.agent) {
      isAuthenticated = await checkScheduleAuth($agent.agent);
    }
    isChecking = false;
  });
</script>

<Modal title={$_('schedule_post_title')} size="small" {onclose}>
  <div class="schedule-modal">
    {#if isChecking}
      <div class="schedule-loading">
        <LoadingSpinner></LoadingSpinner>
      </div>
    {:else if !isAuthenticated}
      <div class="schedule-auth-required">
        <AlertCircle size="48" color="var(--warning-color)" />
        <p>{$_('schedule_auth_required')}</p>
        <a href="/settings/schedule" class="schedule-settings-link">
          {$_('schedule_go_to_settings')}
        </a>
      </div>
    {:else}
      <div class="schedule-form">
        <p class="schedule-description">{$_('schedule_description')}</p>

        <div class="schedule-input-group">
          <label class="schedule-label" for="schedule-date">
            <Calendar size="18" />
            {$_('schedule_date')}
          </label>
          <input
            type="date"
            id="schedule-date"
            class="schedule-input"
            bind:value={selectedDate}
            min={minDateTime}
          />
        </div>

        <div class="schedule-input-group">
          <label class="schedule-label" for="schedule-time">
            <Clock size="18" />
            {$_('schedule_time')}
          </label>
          <input
            type="time"
            id="schedule-time"
            class="schedule-input"
            bind:value={selectedTime}
          />
        </div>

        <p class="schedule-note">{$_('schedule_note')}</p>

        <div class="schedule-actions">
          <button class="schedule-cancel-button" onclick={onclose}>
            {$_('edit_cancel_button')}
          </button>
          <button
            class="schedule-submit-button"
            onclick={handleSchedule}
            disabled={!isValid}
          >
            {$_('schedule_button')}
          </button>
        </div>
      </div>
    {/if}
  </div>
</Modal>

<style lang="postcss">
  .schedule-modal {
    min-height: 200px;
  }

  .schedule-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: var(--text-color-3);
  }

  .schedule-auth-required {
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

  .schedule-settings-link {
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

  .schedule-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .schedule-description {
    color: var(--text-color-2);
    font-size: 14px;
    margin: 0;
  }

  .schedule-input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .schedule-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-color-1);
  }

  .schedule-input {
    padding: 12px;
    border: 1px solid var(--border-color-1);
    border-radius: var(--border-radius-2);
    background-color: var(--bg-color-2);
    color: var(--text-color-1);
    font-size: 16px;

    &:focus {
      outline: none;
      border-color: var(--primary-color);
    }
  }

  .schedule-note {
    color: var(--text-color-3);
    font-size: 12px;
    margin: 0;
  }

  .schedule-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 8px;
  }

  .schedule-cancel-button {
    padding: 10px 20px;
    border: 1px solid var(--border-color-1);
    border-radius: var(--border-radius-3);
    background-color: transparent;
    color: var(--text-color-1);
    font-size: 14px;
    font-weight: bold;

    &:hover {
      background-color: var(--bg-color-2);
    }
  }

  .schedule-submit-button {
    padding: 10px 20px;
    border: none;
    border-radius: var(--border-radius-3);
    background-color: var(--primary-color);
    color: var(--bg-color-1);
    font-size: 14px;
    font-weight: bold;

    &:hover:not(:disabled) {
      opacity: 0.9;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
</style>
