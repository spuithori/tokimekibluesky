<script lang="ts">
  import {BellMinus, BellPlus} from "lucide-svelte";
  import {toast} from "svelte-sonner";
  import { agent } from "$lib/stores";
  import { refreshPushListActivity } from "$lib/pushSubscription";
  import { m } from "$lib/paraglide/messages.js";
  import {getLocale} from "$lib/paraglide/runtime";

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
          toast.success(m.push_subscription_success());

          const { data: { subscriptions } } = await _agent.agent.api.app.bsky.notification.listActivitySubscriptions({ limit: 100 });
          await refreshPushListActivity(subscriptions.map(sub => sub.did), getLocale());
      } catch (e) {
          toast.error(m.push_subscription_failed() + ' ' + e.message);
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