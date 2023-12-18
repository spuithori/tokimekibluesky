<script lang="ts">
    import {columns} from "$lib/stores";
    import {createEventDispatcher} from "svelte";
    import {_} from "svelte-i18n";

    const dispatch = createEventDispatcher();

    export let profile;
    export let isCurrent = false;
    let isDisabled = false;

    async function changeProfile() {
        if (isCurrent) {
            return false;
        }

        isDisabled = true;
        dispatch('reload');

        localStorage.setItem('currentProfile', profile.id);
        columns.set(profile.columns);
        location.reload();
    }
</script>

<button class="p-menu-profile" class:p-menu-profile--current={isCurrent} on:click={changeProfile} disabled={isDisabled}>
    <span class="p-menu-profile__title">{profile.name}</span>
    <span class="p-menu-profile__columns">{profile.columns.length}{$_('workspace_columns_length')}</span>
</button>

<style lang="postcss">
  .p-menu-profile {
      padding: 10px;
      border-radius: 4px;
      border: 1px solid var(--border-color-1);
      margin-bottom: 10px;
      width: 100%;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 2px 8px;
      text-align: left;
      transition: background-color .15s ease-in-out;
      color: var(--text-color-1);
      font-size: 14px;

      &__title {
          font-weight: 500;
      }

      &__columns {
          color: var(--text-color-3);
          font-size: 12px;
      }

      &:hover {
          background-color: var(--bg-color-2);
      }

      &--current {
          border-color: var(--primary-color);
          border-width: 2px;
      }
  }
</style>