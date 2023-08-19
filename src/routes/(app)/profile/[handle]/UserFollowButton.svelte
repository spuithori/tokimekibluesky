<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {createEventDispatcher, onMount} from "svelte";
  import {agent, changedFollowData} from "$lib/stores";
  const dispatch = createEventDispatcher();

  export let _agent = $agent;
  export let following;
  export let user;
  let rkey;
  let isDisabled = false;

  $: handleFollowChange($changedFollowData);

  function generateRkey(following) {
      const followingPath = following.split('/');
      rkey = followingPath.slice(-1)[0];
      return rkey;
  }

  if (following) {
      rkey = generateRkey(following);
  }

  let follow = function () {};
  let unfollow = function () {};

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
</script>

<div>
  {#if !following}
    <button class="button button--sm button--follow" on:click={follow} disabled={isDisabled}>{$_('follow_button')}</button>
  {:else }
    <button class="button button--sm button--following" on:click={unfollow} disabled={isDisabled} data-unfollow-name="{$_('unfollow_button')}">{$_('now_following_button')}</button>
  {/if}
</div>
