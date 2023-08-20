<script lang="ts">
  import {agent} from "$lib/stores";
  import {_} from "svelte-i18n";
  import Avatar from "../../../routes/(app)/Avatar.svelte";

  export let _agent = $agent;
  export let uri;
  $: target = uri.split('/')[2];
  let members = [];

  $: getMembers(uri);

  function addData(feed) {
      if (!members.some(member => member.did === feed.post.author.did) && feed.post.author.did !== target && feed.post.author.did !== _agent.did()) {
          members = [...members, feed.post.author];
      }

      if (feed.parent) {
          addData(feed.parent);
      }
  }

  async function getMembers(uri) {
      members = [];

      if (!uri) {
          return false;
      }

      const res = await _agent.agent.api.app.bsky.feed.getPostThread({uri: uri});

      if (res.data?.thread.parent) {
          addData(res.data.thread.parent);
      }
  }
</script>

{#if members.length}
  <div class="thread-members">
    <p class="thread-members-title">+ {members.length}{$_('thread_members')}</p>

    <div class="thread-members-list">
      {#each members as member}
        <div class="thread-members-list__item">
          <Avatar href="/profile/{member.handle}" avatar={member.avatar}
                  handle={member.handle} {_agent}></Avatar>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style lang="postcss">
  .thread-members {
      display: flex;
      align-items: center;
      gap: 4px 10px;
      flex-wrap: wrap;
  }

  .thread-members-title {
      font-size: 14px;
      color: var(--text-color-3);
      white-space: nowrap;
  }

  .thread-members-list {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;

      &__item {
          width: 26px;
          height: 26px;

          img {
              width: 100%;
          }
      }
  }
</style>