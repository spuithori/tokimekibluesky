<script lang="ts">
  import {_} from 'svelte-i18n';
  import Avatar from "../../../routes/(app)/Avatar.svelte";
  import {agent} from "$lib/stores";
  import { VolumeX, ShieldBan } from 'lucide-svelte';

  interface Props {
    _agent?: any;
    category: 'block' | 'mute';
    user: any;
  }

  let { _agent = $agent, category, user = $bindable() }: Props = $props();
  let isDisabled = $state(false);

  async function mute() {
      isDisabled = true;
      try {
          const mute = await _agent.agent.api.app.bsky.graph.muteActor({actor: user.did});
          user.viewer.muted = true;
      } catch (e) {
          console.error(e)
      }
      isDisabled = false;
  }

  async function unmute() {
      isDisabled = true;
      try {
          const mute = await _agent.agent.api.app.bsky.graph.unmuteActor({actor: user.did});
          user.viewer.muted = false;
      } catch (e) {
          console.error(e)
      }
      isDisabled = false;
  }

  async function block() {
      isDisabled = true;
      try {
          const block = await _agent.agent.api.app.bsky.graph.block.create(
              { repo: _agent.did() as string },
              {
                  subject: user.did,
                  createdAt: new Date().toISOString(),
              });
          user.viewer.blocking = block.uri;
      } catch (e) {
          console.error(e)
      }
      isDisabled = false;
  }

  async function unblock() {
      isDisabled = true;
      try {
          const rkey = user.viewer.blocking.split('/').slice(-1)[0];
          const block = await _agent.agent.api.app.bsky.graph.block.delete(
              { rkey: rkey, repo: _agent.did() as string },
              {
                  subject: user.did,
                  createdAt: new Date().toISOString(),
              });
          user.viewer.blocking = undefined;
      } catch (e) {
          console.error(e)
      }
      isDisabled = false;
  }
</script>

<div class="bm-users-item">
  <div class="bm-users-item__avatar">
    <Avatar href="/profile/{user.handle}" avatar={user.avatar} handle={user.handle}></Avatar>
  </div>

  <div class="bm-users-item__content">
    <div class="bm-users-item__meta">
      <h2 class="bm-users-item__title">{user.displayName || user.handle}</h2>
      <p class="bm-users-item__text">@{user.handle}</p>

      <div class="bm-users-labels">
        {#if user.viewer?.muted}
          <p class="bm-users-label bm-users-label--mute">{$_('muting')}</p>
        {/if}

        {#if user.viewer?.blocking}
          <p class="bm-users-label">{$_('blocking')}</p>
        {/if}
      </div>
    </div>


    <div class="bm-users-item__buttons">
      <button class="button button--sm button--with-icon" disabled={isDisabled} onclick={user.viewer?.muted ? unmute : mute}>
        <VolumeX size="20"></VolumeX>
        {$_(user.viewer?.muted ? 'button_unmute' : 'button_mute')}
      </button>

      <button class="button button--sm button--border button--danger button--with-icon"  disabled={isDisabled} onclick={user.viewer?.blocking ? unblock : block}>
        <ShieldBan size="20"></ShieldBan>
        {$_(user.viewer?.blocking ? 'button_unblock' : 'button_block')}
      </button>
    </div>
  </div>
</div>

<style lang="postcss">
  .bm-users-item {
      display: grid;
      grid-template-columns: 50px 1fr;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color-2);

      &__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 8px;
          align-items: center;
      }

      &__title {
          font-size: 18px;
          color: var(--text-color-1);
          letter-spacing: .05em;
      }

      &__text {
          font-size: 14px;
          color: var(--text-color-3);
      }

      &__buttons {
          margin-top: 8px;
          display: flex;
          gap: 8px;
      }
  }

  .bm-users-labels {
      display: flex;
      align-items: center;
      gap: 4px;
  }

  .bm-users-label {
      background-color: var(--bg-color-2);
      font-size: 13px;
      line-height: 1.5;
      padding: 2px 8px;
      border-radius: var(--border-radius-2);
      color: var(--danger-color);
      font-weight: bold;
      letter-spacing: .025em;

      &--mute {
          color: var(--primary-color);
      }
  }
</style>