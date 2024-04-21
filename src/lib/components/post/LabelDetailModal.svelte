<script lang="ts">
  import {_} from 'svelte-i18n';
  import {createEventDispatcher} from "svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  const dispatch = createEventDispatcher();

  export let labels = [];
</script>

<Modal title="" on:close>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>

            {$_('labeling_source_user')}
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>

            {#if (label?.label?.src === 'did:plc:ar7c4by46qjdydhdevvrndac')}
              <a href="/profile/did:plc:ar7c4by46qjdydhdevvrndac" on:click={close}>{$_('labeling_source_labeler_official')}</a>
            {:else}
              <a href="/profile/{label?.label?.src}" on:click={close}>{$_('labeling_source_labeler')}</a>
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