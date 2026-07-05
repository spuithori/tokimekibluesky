<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import {goto} from "$app/navigation";
    import {JOIN_LINK_PREVIEW_TYPE} from "$lib/components/chat/convoUtil";
    import Link2 from '@lucide/svelte/icons/link-2';
    import Users from '@lucide/svelte/icons/users';

    let { preview, _agent } = $props();
    const isActive = $derived(preview?.$type === JOIN_LINK_PREVIEW_TYPE);
</script>

<div class="join-link-card" class:join-link-card--inactive={!isActive}>
  {#if isActive}
    <div class="join-link-card__heading">
      <div class="join-link-card__avatar">
        {#if preview.owner?.avatar}
          <img src={preview.owner.avatar} alt="" loading="lazy" width="40" height="40">
        {/if}
      </div>

      <div class="join-link-card__body">
        <p class="join-link-card__name">{preview.name}</p>

        <p class="join-link-card__meta">
          <Users size="13" color="var(--text-color-3)"></Users>
          <span>{preview.memberCount} / {preview.memberLimit}</span>
        </p>
      </div>
    </div>

    <div class="join-link-card__buttons">
      {#if preview.viewer?.requestedAt}
        <span class="join-link-card__pending">{$_('chat_join_request_pending')}</span>
      {/if}

      <button class="button button--ss" onclick={() => goto('/chat/join/' + preview.code)}>
        {$_(preview.convo ? 'chat_join_link_open' : 'chat_join_link_join')}
      </button>
    </div>
  {:else}
    <p class="join-link-card__invalid">
      <Link2 size="16" color="var(--text-color-3)"></Link2>
      {$_(preview?.code !== undefined && preview?.$type?.includes('disabled') ? 'chat_join_link_disabled_note' : 'chat_join_link_invalid')}
    </p>
  {/if}
</div>

<style lang="postcss">
  .join-link-card {
      border: 1px solid var(--border-color-1);
      border-radius: var(--border-radius-3);
      padding: 12px;
      margin-top: 4px;
      max-width: 300px;
      background-color: var(--bg-color-1);

      &--inactive {
          background-color: var(--bg-color-2);
      }

      &__heading {
          display: grid;
          grid-template-columns: 40px 1fr;
          gap: 10px;
          align-items: center;
      }

      &__avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          background-color: var(--primary-color);

          img {
              width: 100%;
              height: 100%;
              object-fit: cover;
          }
      }

      &__name {
          font-weight: bold;
          font-size: 14px;
          line-height: 1.4;
          overflow-wrap: anywhere;
      }

      &__meta {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-color-3);
          font-size: 12px;
      }

      &__buttons {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
      }

      &__pending {
          color: var(--text-color-3);
          font-size: 12px;
      }

      &__invalid {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-color-3);
          font-size: 13px;
      }
  }
</style>
