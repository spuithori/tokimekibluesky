<script lang="ts">
    import { _, locale } from 'tokimeki-i18n';

    let { date }: { date: Date } = $props();

    const label = $derived.by(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

        if (diffDays === 0) {
            return $_('chat_date_today');
        }

        if (diffDays === 1) {
            return $_('chat_date_yesterday');
        }

        const options: Intl.DateTimeFormatOptions = date.getFullYear() === now.getFullYear()
            ? { month: 'long', day: 'numeric', weekday: 'short' }
            : { year: 'numeric', month: 'long', day: 'numeric' };
        return new Intl.DateTimeFormat($locale || undefined, options).format(date);
    });
</script>

<div class="chat-date-separator">
  <span class="chat-date-separator__label">{label}</span>
</div>

<style lang="postcss">
  .chat-date-separator {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 16px 0 12px;
      color: var(--text-color-3);
      font-size: 12px;

      &::before,
      &::after {
          content: '';
          flex: 1;
          height: 1px;
          background-color: var(--border-color-2);
      }

      &__label {
          flex-shrink: 0;
      }
  }
</style>
