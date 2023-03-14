<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onMount } from "svelte";
  import { agent } from "$lib/stores";

  export let following;
  export let user;
  let rkey;
  let isDisabled = false;

  function generateRkey(following) {
      const followingPath = following.split('/');
      rkey = followingPath.slice(-1)[0];
      return rkey;
  }

  if (following) {
      rkey = generateRkey(following)
  }

  let follow = function () {};
  let unfollow = function () {};

  async function refreshFollowing() {
      let profile = await $agent.agent.api.app.bsky.actor.getProfile({actor: user.handle});
      following = profile.data.viewer.following;
      if (following) {
          rkey = generateRkey(following)
      }

      isDisabled = false;
  }

  onMount(async () => {
      follow = async function () {
          isDisabled = true;
          await $agent.agent.api.app.bsky.graph.follow.create(
              { did: $agent.did() },
              {
                  subject: {
                      did: user.did,
                      declarationCid: user.declaration.cid,
                  },
                  createdAt: new Date().toISOString(),
              },
          );
          refreshFollowing();
      }

      unfollow = async function () {
          isDisabled = true;
          await $agent.agent.api.app.bsky.graph.follow.delete({
              did: $agent.did(),
              rkey: rkey,
              },
          );
          refreshFollowing();
      }
  })
</script>

<div>
  {#if !following}
    <button class="button button--sm button--follow" on:click={follow} disabled={isDisabled}>{$_('follow_button')}</button>
  {:else }
    <button class="button button--sm button--following" on:click={unfollow} disabled={isDisabled}>{$_('now_following_button')}</button>
  {/if}
</div>
