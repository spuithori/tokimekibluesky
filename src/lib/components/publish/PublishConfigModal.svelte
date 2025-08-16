<script lang="ts">
  import { m } from "$lib/paraglide/messages.js";
  import Modal from "$lib/components/ui/Modal.svelte";
  import {settings} from '$lib/stores';
  import Notice from "$lib/components/ui/Notice.svelte";
  import {publishState} from "$lib/classes/publishState.svelte";

  let { onclose } = $props();
</script>

<Modal title={m.publish_config_modal_title()} size="small" {onclose}>
  <dl class="settings-group">
    <dt class="settings-group__name">
      {m.continuous_mode()}
    </dt>

    <dd class="settings-group__content">
      <div class="input-toggle mb10">
        <input class="input-toggle__input" type="checkbox" id="continuousMode" bind:checked={publishState.pinned}><label class="input-toggle__label" for="continuousMode"></label>
      </div>
    </dd>
  </dl>

  <dl class="settings-group">
    <dt class="settings-group__name">
      {m.lossless_image_upload_mode()}
    </dt>

    <dd class="settings-group__content">
      <div class="input-toggle mb10">
        <input class="input-toggle__input" type="checkbox" id="losslessImageUpload" bind:checked={$settings.general.losslessImageUpload}><label class="input-toggle__label" for="losslessImageUpload"></label>
      </div>

      {#if ($settings?.general?.losslessImageUpload)}
        <Notice text={m.lossless_image_upload_mode_notice()}></Notice>
      {/if}
    </dd>
  </dl>

  <dl class="settings-group">
    <dt class="settings-group__name">
      {m.require_input_alt_text()}
    </dt>

    <dd class="settings-group__content">
      <div class="input-toggle mb10">
        <input class="input-toggle__input" type="checkbox" id="requireInputAltText" bind:checked={$settings.general.requireInputAltText}><label class="input-toggle__label" for="requireInputAltText"></label>
      </div>
    </dd>
  </dl>

  <dl class="settings-group">
    <dt class="settings-group__name">
      {m.continuous_tag()}
    </dt>

    <dd class="settings-group__content">
      <div class="input-toggle mb10">
        <input class="input-toggle__input" type="checkbox" id="continuousTag" bind:checked={$settings.general.continuousTag}><label class="input-toggle__label" for="continuousTag"></label>
      </div>
    </dd>
  </dl>
</Modal>