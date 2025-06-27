<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { agent, changedFollowData } from "$lib/stores";
  import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";

  let { _agent = $agent, following = $bindable(), user, followChange = function () {}, style = 'default' } = $props();
  let rkey;
  let isDisabled = $state(false);
  let isUnfollowDialogRender = $state(false);

  function generateRkey(following) {
      const followingPath = following.split('/');
      rkey = followingPath.slice(-1)[0];
      return rkey;
  }

  if (following) {
      rkey = generateRkey(following);
  }

  $effect(() => {
      handleFollowChange($changedFollowData);
  })

  function handleFollowChange(data) {
      if (!data) {
          return false;
      }

      if (data.did === user.did) {
          following = data.following;

          followChange({
              did: user.did,
              following: following,
          });
      }
  }

  async function follow() {
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

  async function unfollow() {
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

  function unfollowSkip() {
      isUnfollowDialogRender = true;
  }
</script>

<div>
  {#if !following}
    <button class="button button--follow" class:button--border={style === 'tiny'} class:button--ss={style === 'tiny'} class:button--sm={style !== 'tiny'} onclick={follow} disabled={isDisabled}>{$_('follow_button')}</button>
  {:else}
    <button class="button button--sm button--following" onclick={unfollowSkip} disabled={isDisabled} data-unfollow-name="{$_('unfollow_button')}">{$_('now_following_button')}</button>
  {/if}
</div>

{#if (isUnfollowDialogRender)}
  <ConfirmModal
          on:ok={unfollow}
          on:cancel={() => {isUnfollowDialogRender = false}}
          yesText="{$_('unfollow_button')}"
          cancelText="{$_('cancel')}"
  >
    <h3 class="modal-title modal-title--smaller modal-title--center">{$_('unfollow_confirm_title')}</h3>
    <p class="modal-description"></p>
  </ConfirmModal>
{/if}