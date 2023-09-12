<script lang="ts">
    import {columns} from "$lib/stores";
    import {createEventDispatcher} from "svelte";
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
</button>

<style lang="postcss">
  .p-menu-profile {
      padding: 10px;
      border-radius: 4px;
      border: 1px solid var(--border-color-1);
      margin-bottom: 10px;
      width: 100%;
      display: block;
      text-align: left;
      transition: background-color .15s ease-in-out;
      color: var(--text-color-1);

      &:hover {
          background-color: var(--bg-color-2);
      }

      &--current {
          border-color: var(--primary-color);
          border-width: 2px;
      }
  }
</style>