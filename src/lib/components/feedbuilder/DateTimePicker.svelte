<script lang="ts">
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';

  interface Props {
    value: string;

    onchange?: (value: string) => void;
    disabled?: boolean;
    id?: string;
    min?: string;
    max?: string;
    ariaLabel?: string;
  }

  let {
    value = $bindable(),
    onchange,
    disabled = false,
    id,
    min,
    max,
    ariaLabel
  }: Props = $props();

  function handleInput(e: Event) {
    const v = (e.currentTarget as HTMLInputElement).value;
    value = v;
    onchange?.(v);
  }
</script>

<div class="datetime-picker" class:is-disabled={disabled}>
  <span class="datetime-picker__icon" aria-hidden="true">
    <CalendarClock size={16} strokeWidth={1.8} />
  </span>
  <input
    class="datetime-picker__input"
    type="datetime-local"
    {value}
    oninput={handleInput}
    {disabled}
    {id}
    {min}
    {max}
    aria-label={ariaLabel}
  />
</div>

<style lang="postcss">
  .datetime-picker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid var(--border-color-2);
    border-radius: var(--radius-3);
    background-color: var(--bg-color-1);
    color: var(--text-color-1);
    transition: border-color var(--duration-fast) var(--ease-out);
    min-width: 220px;

    &:focus-within:not(.is-disabled) {
      border-color: var(--text-color-2);
    }

    &.is-disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  }

  .datetime-picker__icon {
    display: inline-flex;
    flex-shrink: 0;
    color: var(--text-color-3);
  }

  .datetime-picker__input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 14px;
    padding: 0;
    line-height: 1.4;

    &::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: 0.55;
      transition: opacity var(--duration-fast) var(--ease-out);

      &:hover { opacity: 1; }
    }

    &:disabled {
      cursor: not-allowed;
    }
  }
</style>
