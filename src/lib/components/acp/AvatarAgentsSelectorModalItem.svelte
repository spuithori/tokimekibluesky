<script lang="ts">
  import {createEventDispatcher} from "svelte";
  import {accountsDb} from "$lib/db";
  const dispatch = createEventDispatcher();

  export let agent;
  export let key;
  export let isCurrent = false;

  let avatar;
  let displayName;

  accountsDb.accounts.get(key)
      .then(value => {
          avatar = value?.avatar;
          displayName = value?.name;
      })

 function handleSelect() {
     dispatch('select');
 }
</script>

<div class="avatar-agents-selector-item"
     class:avatar-agents-selector-item--current={isCurrent}
     role="button"
     on:click={handleSelect}
>
  <div class="avatar-agents-selector-item__avatar">
    {#if (avatar)}
      <img src="{avatar}" alt="">
    {:else}
    {/if}
  </div>

  <div class="avatar-agents-selector-item__content">
    <p class="avatar-agents-selector-item__name">{displayName || '読み込みちゅう…'}</p>
    <p class="avatar-agents-selector-item__handle">@{agent.agent.session.handle}</p>
  </div>
</div>

<style lang="postcss">
  .avatar-agents-selector-item {
      flex-direction: column;
      background-color: var(--bg-color-1);
      z-index: 100;
      color: var(--text-color-1);
      font-size: 14px;
      white-space: nowrap;
      padding: 4px 8px;
      width: 100%;
      text-align: left;
      display: grid;
      grid-template-columns: 32px 1fr;
      gap: 8px;
      border-radius: var(--border-radius-2);

      &--current {
          border: 2px solid var(--primary-color);
      }

      &--selected {
          background-color: var(--bg-color-2);
      }

      &:hover {
          background-color: var(--bg-color-2);
      }

      &__avatar {
          overflow: hidden;
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          background-color: var(--primary-color);

          img {
              display: block;
              width: 100%;
          }
      }

      &__content {
          display: flex;
          flex-direction: column;
          line-height: 1.3;
      }

      &__name {
          font-weight: bold;
          font-size: 13px;
      }

      &__handle {
          font-size: 12px;
      }
  }
</style>