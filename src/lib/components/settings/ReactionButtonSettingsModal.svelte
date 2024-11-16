<script lang="ts">
  import {isReactionButtonSettingsModalOpen, settings} from "$lib/stores";
  import {_} from "svelte-i18n";
  import {Bookmark, Heart, Quote, Repeat2, Reply} from "lucide-svelte";

  const reactions = ['reply', 'repost', 'like', 'quote', 'bookmark'];
  const icons = [Reply, Repeat2, Heart, Quote, Bookmark]

  function close() {
      isReactionButtonSettingsModalOpen.set(false);
  }
</script>

<div class="reaction-button-settings-list">
  {#each reactions as item, index (item)}
    {@const SvelteComponent = icons[index]}
    <div class="reaction-button-settings-item reaction-button-settings-item--{item}">
      <div class="reaction-button-settings-item__heading">
        <h3 class="reaction-button-settings-item__title">{$_(item)}</h3>

        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id={'rbs_' + item} bind:group={$settings.design.reactionButtons.shown} value={item}><label class="input-toggle__label" for={'rbs_' + item}></label>
        </div>

        <span class="reaction-button-settings-item__icon">
              <SvelteComponent></SvelteComponent>
            </span>
      </div>

      {#if (item === 'reply' || item === 'repost' || item === 'like')}
        <div class="reaction-button-settings-item__child">
          <h4 class="reaction-button-settings-item__title2">{$_('show_counts')}</h4>

          <div class="input-toggle">
            <input class="input-toggle__input" type="checkbox" id={'rbsc_' + item} bind:checked={$settings.design.reactionButtons[item].showCounts}><label class="input-toggle__label" for={'rbsc_' + item}></label>
          </div>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style lang="postcss">
  .reaction-button-settings-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
  }

  .reaction-button-settings-item {
      border-radius: var(--border-radius-2);
      border: 1px solid var(--border-color-2);
      padding: 8px 8px 8px 16px;
      gap: 16px;
      display: flex;
      align-items: center;
      grid-column: 1 / 3;

      &__title {
          font-size: 14px;
          margin-bottom: 8px;
      }

      &__title2 {
          font-size: 12px;
          font-weight: normal;
          margin-bottom: 8px;
      }

      &__heading {
          width: 100%;
          position: relative;
      }

      &__child {
          background-color: var(--bg-color-2);
          padding: 8px;
          border-radius: var(--border-radius-2);
          width: 100%;
      }

      &__icon {
          position: absolute;
          right: 0;
          top: 0;
          pointer-events: none;
      }

      &--quote,
      &--bookmark {
          grid-column: span 1;
      }
  }
</style>