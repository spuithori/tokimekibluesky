<script lang="ts">
    import User from '@lucide/svelte/icons/user';
    import Shield from '@lucide/svelte/icons/shield';
  import {_} from 'tokimeki-i18n';
  import Modal from "$lib/components/ui/Modal.svelte";

  let { labels = [], onclose } = $props();
</script>

<Modal title="" size="small" {onclose}>
  <div class="label-detail-group">
    {#each labels as label}
      <div class="label-detail">
        <h3 class="label-detail__title">
          {#if (label.source.type === 'user' || label.label.src === 'did:plc:ar7c4by46qjdydhdevvrndac' || !label?.labelDef?.locales[0]?.name)}
            {$_('labeling_' + label?.label?.val)}
          {:else}
            {label?.labelDef?.locales[0]?.name}
          {/if}
        </h3>

        <p class="label-detail__user">
          {#if (label?.source?.type === 'user')}
            <User size={20} color="var(--text-color-1)" />

            {$_('labeling_source_user')}
          {:else}
            <Shield size={20} color="var(--text-color-1)" />

            {#if (label?.label?.src === 'did:plc:ar7c4by46qjdydhdevvrndac')}
              <a href="/profile/did:plc:ar7c4by46qjdydhdevvrndac" onclick={close}>{$_('labeling_source_labeler_official')}</a>
            {:else}
              <a href="/profile/{label?.label?.src}" onclick={close}>{$_('labeling_source_labeler')}</a>
            {/if}
          {/if}
        </p>

        <dl class="label-detail-list">
          <div class="label-detail-list__item">
            <dt class="label-detail-list__name">{$_('label_detail_adult')}:</dt>
            <dd class="label-detail-list__content"><strong>{label?.labelDef?.flags.includes('adult') ? 'Yes' : 'No'}</strong></dd>
          </div>

          <div class="label-detail-list__item">
            <dt class="label-detail-list__name">{$_('label_detail_val')}:</dt>
            <dd class="label-detail-list__content">{label?.label?.val}</dd>
          </div>

          <div class="label-detail-list__item">
            <dt class="label-detail-list__name">{$_('label_detail_default_setting')}:</dt>
            <dd class="label-detail-list__content">{$_(label?.labelDef?.defaultSetting)}</dd>
          </div>
        </dl>
      </div>
    {/each}
  </div>
</Modal>

<style lang="postcss">
  .label-detail {
      border: 1px solid var(--border-color-2);
      border-radius: var(--border-radius-2);
      background-color: var(--bg-color-3);
      margin-bottom: 8px;
      padding: 8px 16px;
      text-align: left;
      font-size: 14px;
      color: var(--text-color-1);

      &__title {
          font-size: 16px;
          margin-bottom: 8px;
      }

      &__user {
          display: flex;
          gap: 4px;
          align-items: center;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-color-2);

          svg {
              flex-shrink: 0;
          }
      }
  }

  .label-detail-list {
      &__item {
          display: flex;
          gap: 0 4px;
      }

      &__name {
          flex-shrink: 0;
          white-space: nowrap;
      }
  }
</style>