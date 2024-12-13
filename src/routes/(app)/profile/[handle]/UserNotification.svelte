<script lang="ts">
  import {_, locale} from 'svelte-i18n';
  import {BellMinus, BellPlus} from "lucide-svelte";
  import {onMount} from "svelte";
  import {isSubscribe, sub} from "$lib/pushSubscription";
  import {toast} from "svelte-sonner";

  let { _agent, profile } = $props();
  let isPushNotificationEnabled = $state(false);
  let enableAccounts = $state(localStorage.getItem('pushNotificationAccounts') ? JSON.parse(localStorage.getItem('pushNotificationAccounts')) : []);
  let notifications = $state(localStorage.getItem('pushNotificationNotifications') ? JSON.parse(localStorage.getItem('pushNotificationNotifications')) : []);

  async function handleClick() {
      isPushNotificationEnabled = false;

      if (notifications.includes(profile.did)) {
          notifications = notifications.filter(notification => notification !== profile.did);
      } else {
          notifications = [...notifications, profile.did];
      }

      try {
          await sub(enableAccounts, $locale, notifications);
          toast.success($_('push_subscription_success'));
      } catch (e) {
          toast.error($_('push_subscription_failed') + ' ' + e.message);
      }

      isPushNotificationEnabled = true;
      localStorage.setItem('pushNotificationNotifications', JSON.stringify(notifications));
  }

  onMount(async () => {
      isPushNotificationEnabled = await isSubscribe();
  });
</script>

<button class="user-notification-button" onclick={handleClick} disabled={!isPushNotificationEnabled}>
  {#if notifications.includes(profile.did)}
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