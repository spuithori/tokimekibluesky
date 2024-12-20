<script lang="ts">
  import {_} from 'svelte-i18n';
  import {agent, repostMutes} from "$lib/stores";
  import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
  import InfiniteLoading from "svelte-infinite-loading";
  import Avatar from "../../../Avatar.svelte";
  import {Trash2} from "lucide-svelte";

  let slicedArray = $derived.by(() => {
    const result = [];
    const length = $repostMutes.length;
    for (let i = 0; i < length; i += 20) {
      const chunk = $repostMutes.slice(i, i + 20);
      result.push(chunk);
    }

    return result;
  });
  let actors = $state([]);
  let cursor = 0;

  function handleRemove(did: string) {
    actors = actors.filter(actor => actor.did !== did);
    $repostMutes = $repostMutes.filter(_did => did !== _did);
    localStorage.setItem('repostMutes', JSON.stringify($repostMutes));
  }

  async function handleLoadMore({ detail: { loaded, complete } }) {
    try {
      let res = await $agent.agent.api.app.bsky.actor.getProfiles({ actors: slicedArray[cursor] });
      cursor = cursor + 1;
      actors = [...actors, ...res.data.profiles];

      if (cursor < slicedArray.length) {
        loaded();
      } else {
        complete();
      }
    } catch (e) {
      console.error(e);
      complete();
    }
  }
</script>

<svelte:head>
  <title>{$_('settings_repost_mute')} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {$_('settings_repost_mute')}
  </SettingsHeader>

  <div class="settings-wrap">
    <div class="repost-mute-list">
      {#each actors as actor}
        <div class="repost-mute-list__item">
          <div class="repost-mute-list__avatar">
            <Avatar href="/profile/{ actor.handle !== 'handle.invalid' ? actor.handle : actor.did }" avatar={actor.avatar} profile={actor} handle={actor.handle}></Avatar>
          </div>

          <div class="repost-mute-list__content">
            <h3 class="repost-mute-list__title">{ actor.displayName || actor.handle }</h3>
            <p class="repost-mute-list__text">@{ actor.handle }</p>
          </div>

          <div class="repost-mute-list__buttons">
            <button class="repost-mute-remove-button" onclick={() => {handleRemove(actor.did)}}>
              <Trash2 color="var(--danger-color)" size="20"></Trash2>
            </button>
          </div>
        </div>
      {/each}
    </div>

    <InfiniteLoading on:infinite={handleLoadMore}>
      {#snippet noMore()}
        <p class="infinite-nomore"></p>
      {/snippet}
      {#snippet noResults()}
        <p class="infinite-nomore"></p>
      {/snippet}
    </InfiniteLoading>
  </div>
</div>

<style lang="postcss">
  .repost-mute-list {
      &__item {
          display: grid;
          align-items: center;
          grid-template-columns: 46px 1fr 36px;
          gap: 16px;
          margin-bottom: 16px;
      }

      &__content {
          min-width: 0;
      }

      &__title {
          font-size: 15px;
          color: var(--text-color-1);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
      }

      &__text {
          font-size: 13px;
          color: var(--text-color-3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
      }
  }

  .repost-mute-remove-button {
      width: 36px;
      height: 36px;
      display: grid;
      place-content: center;
      border-radius: var(--border-radius-2);

      &:hover {
          background-color: var(--bg-color-2);
      }
  }
</style>