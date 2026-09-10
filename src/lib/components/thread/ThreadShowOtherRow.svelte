<script lang="ts">
  import {_} from 'tokimeki-i18n';
  import EyeOff from '@lucide/svelte/icons/eye-off';

  let { loading = false, onshowother }: { loading?: boolean; onshowother: () => void } = $props();
</script>

<div class="thread-row thread-row--control thread-row--other" data-row-key="other">
  <button class="thread-control thread-show-other" class:thread-control--loading={loading} disabled={loading} onclick={onshowother}>
    <span class="thread-show-other__icon">
      <EyeOff size="16" color="var(--text-color-3)"></EyeOff>
    </span>
    {$_('show_other_replies')}
  </button>
</div>
