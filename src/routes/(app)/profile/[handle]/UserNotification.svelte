<script lang="ts">
  import {_} from 'svelte-i18n';
  import {BellMinus, BellPlus} from "lucide-svelte";
  import {toast} from "svelte-sonner";
  import { agent } from "$lib/stores";

  let { _agent = $agent, profile, onupdate } = $props();
  let isPushNotificationEnabled = $state(true);

  async function handleClick() {
      isPushNotificationEnabled = false;

      try {
          const res = profile?.viewer?.activitySubscription
              ? await _agent.agent.api.app.bsky.notification.putActivitySubscription({
                  subject: profile.did,
                  activitySubscription: {
                      post: false,
                      reply: false,
                  }
              })
              : await _agent.agent.api.app.bsky.notification.putActivitySubscription({
                  subject: profile.did,
                  activitySubscription: {
                      post: true,
                      reply: false,
                  }
              });

          onupdate(res.data?.activitySubscription);
          toast.success($_('push_subscription_success'));
      } catch (e) {
          toast.error($_('push_subscription_failed') + ' ' + e.message);
      }

      isPushNotificationEnabled = true;
  }
</script>

<button class="user-notification-button" onclick={handleClick} disabled={!isPushNotificationEnabled}>
  {#if profile?.viewer?.activitySubscription}
    <BellMinus color="var(--primary-color)"></BellMinus>
  {:else}
    <BellPlus color="var(--primary-color)"></BellPlus>
  {/if}
</button>

<style lang="postcss">
  .user-notification-button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: var(--bg-color-1);
      display: grid;
      place-content: center;

      &:disabled {
          opacity: .6;
          cursor: not-allowed;
      }
  }
</style>