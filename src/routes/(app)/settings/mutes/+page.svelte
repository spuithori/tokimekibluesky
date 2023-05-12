<script lang="ts">
    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';

    $: {

    }
</script>

<div>
  <div class="settings-heading">
    <a href="/settings" class="settings-back"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="16.97" viewBox="0 0 20 16.97">
      <path id="arrow-left" d="M3.828,9,9.9,2.929,8.485,1.515,0,10l.707.707,7.778,7.778L9.9,17.071,3.828,11H20V9Z" transform="translate(0 -1.515)" fill="var(--text-color-1)"/>
    </svg></a>

    <h1 class="settings-title">{$_('settings_mutes')}</h1>
  </div>

  <div class="settings-wrap">
    工事中<br>
    Under construction
  </div>
</div>