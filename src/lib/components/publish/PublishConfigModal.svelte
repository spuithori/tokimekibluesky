<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Modal from "$lib/components/ui/Modal.svelte";
  import {settings} from '$lib/stores';

  let { onclose } = $props();
</script>

<Modal title={$_('publish_config_modal_title')} size="small" {onclose}>
  <dl class="settings-group">
    <dt class="settings-group__name">
      {$_('lossless_image_upload_mode')}
    </dt>

    <dd class="settings-group__content">
      <div class="input-toggle mb10">
        <input class="input-toggle__input" type="checkbox" id="losslessImageUpload" bind:checked={$settings.general.losslessImageUpload}><label class="input-toggle__label" for="losslessImageUpload"></label>
      </div>

      {#if ($settings?.general?.losslessImageUpload)}
        <p class="notice"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>{$_('lossless_image_upload_mode_notice')}</p>
      {/if}
    </dd>
  </dl>
</Modal>