<script lang="ts">
  import { run } from 'svelte/legacy';

  import { _ } from 'svelte-i18n';
  import {createEventDispatcher, onMount} from "svelte";
  import {agent, changedFollowData} from "$lib/stores";
  const dispatch = createEventDispatcher();

  let { _agent = $agent, following = $bindable(), user } = $props();
  let rkey;
  let isDisabled = $state(false);


  function generateRkey(following) {
      const followingPath = following.split('/');
      rkey = followingPath.slice(-1)[0];
      return rkey;
  }

  if (following) {
      rkey = generateRkey(following);
  }

  let follow = $state(function () {});
  let unfollow = $state(function () {});

  async function handleFollowChange(data) {
      if (!data) {
          return false;
      }

      if (data.did === user.did) {
          following = data.following;

          dispatch('followchange', {
              did: user.did,
              following: following,
          });
      }
  }

  onMount(async () => {
      follow = async function () {
          isDisabled = true;
          const res = await _agent.agent.api.app.bsky.graph.follow.create(
              { repo: _agent.did() },
              {
                  subject: user.did,
                  createdAt: new Date().toISOString(),
              },
          );
          generateRkey(res.uri);
          isDisabled = false;

          changedFollowData.set({
              did: user.did,
              following: res.uri,
          });
      }

      unfollow = async function () {
          isDisabled = true;
          const res = await _agent.agent.api.app.bsky.graph.follow.delete({
              repo: _agent.did(),
              rkey: rkey,
              },
          );
          isDisabled = false;

          changedFollowData.set({
              did: user.did,
              following: undefined,
          });
      }
  })
  run(() => {
    handleFollowChange($changedFollowData);
  });
</script>

<div>
  {#if !following}
    <button class="button button--sm button--follow" onclick={follow} disabled={isDisabled}>{$_('follow_button')}</button>
  {:else }
    <button class="button button--sm button--following" onclick={unfollow} disabled={isDisabled} data-unfollow-name="{$_('unfollow_button')}">{$_('now_following_button')}</button>
  {/if}
</div>
