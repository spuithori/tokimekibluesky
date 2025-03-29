<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Modal from "$lib/components/ui/Modal.svelte";
  import {settings} from '$lib/stores';
  import Notice from "$lib/components/ui/Notice.svelte";

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
        <Notice text={$_('lossless_image_upload_mode_notice')}></Notice>
      {/if}
    </dd>
  </dl>

  <dl class="settings-group">
    <dt class="settings-group__name">
      {$_('require_input_alt_text')}
    </dt>

    <dd class="settings-group__content">
      <div class="input-toggle mb10">
        <input class="input-toggle__input" type="checkbox" id="requireInputAltText" bind:checked={$settings.general.requireInputAltText}><label class="input-toggle__label" for="requireInputAltText"></label>
      </div>
    </dd>
  </dl>

  <dl class="settings-group">
    <dt class="settings-group__name">
      {$_('continuous_tag')}
    </dt>

    <dd class="settings-group__content">
      <div class="input-toggle mb10">
        <input class="input-toggle__input" type="checkbox" id="continuousTag" bind:checked={$settings.general.continuousTag}><label class="input-toggle__label" for="continuousTag"></label>
      </div>
    </dd>
  </dl>
</Modal>