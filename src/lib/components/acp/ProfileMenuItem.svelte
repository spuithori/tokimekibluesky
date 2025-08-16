<script lang="ts">
    import { m } from "$lib/paraglide/messages.js";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    const columnState = getColumnState();

    interface Props {
        profile: any;
        isCurrent?: boolean;
    }

    let { profile, isCurrent = false }: Props = $props();
    let isDisabled = $state(false);

    async function changeProfile() {
        if (isCurrent) {
            return false;
        }

        isDisabled = true;

        localStorage.setItem('currentProfile', profile.id);
        columnState.columns = profile.columns;
        location.reload();
    }
</script>

<button class="p-menu-profile" class:p-menu-profile--current={isCurrent} onclick={changeProfile} disabled={isDisabled}>
    <span class="p-menu-profile__title">{profile.name}</span>
    <span class="p-menu-profile__columns">{profile.columns.length}{m.workspace_columns_length()}</span>
</button>

<style lang="postcss">
  .p-menu-profile {
      padding: 10px;
      border-radius: 4px;
      border: 2px solid var(--border-color-1);
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
      }
  }
</style>