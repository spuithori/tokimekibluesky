<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onMount } from 'svelte';
  import { sub, unsub, isSubscribe } from '$lib/pushSubscription';
  import { agent } from '$lib/stores';
  import toast from 'svelte-french-toast'

  let isChecked = false;
  let isDisabled = false;

  async function pushToggle() {
      isDisabled = true;

      if (isChecked) {
          try {
              await sub($agent.did());
              toast.success($_('push_subscription_success'));
              isChecked = true;
          } catch (e) {
              toast.error($_('push_subscription_failed') + ' ' + e.message);
              isChecked = false;
          }
      } else {
          await unsub();
          toast.success($_('push_subscription_unsubscribe'));
      }

      isDisabled = false;
  }

  onMount(async () => {
      isChecked = await isSubscribe();
  })
</script>

<div class="push-settings">
  <h2 class="push-settings-title">{$_('push_settings')}</h2>

  <div class="push-settings-notice">
    <h3>{$_('push_notes')}</h3>
    <p>{$_('push_text_1')}: <strong>DID</strong></p>
    <p>{$_('push_text_2')}</p>
    <p><strong class="text-danger">{$_('push_text_3')}</strong></p>
    <p>{$_('push_text_4')}</p>
    <p>{$_('push_text_5')}</p>
  </div>

  <div class="push-settings-toggle-wrap">
    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('push_toggle_switch')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="pushToggle" bind:checked={isChecked} on:change={pushToggle} disabled={isDisabled}><label class="input-toggle__label" for="pushToggle"></label>
        </div>
      </dd>
    </dl>
  </div>
</div>

<style lang="postcss">
    .push-settings-notice {
        border: 1px solid var(--border-color-1);
        padding: 15px;
        margin: 15px 0;
    }

    .about-subhead {
        font-weight: 900;
        font-size: 18px;
        text-align: center;
        margin-bottom: 15px;
    }

    .about-logo {
        text-align: center;
        margin-bottom: 25px;

        svg {
            display: inline-block;
        }
    }

    .about-text {
        line-height: 1.75;
        white-space: pre-line;

        &:not(:last-child) {
            margin-bottom: 1em;
        }
    }

    .push-settings-toggle-wrap {
        max-width: 300px;
        width: 100%;
        margin: 0 auto;

        .settings-group {
            border: 2px solid var(--primary-color);
            padding-left: 20px;
            padding-right: 20px;
        }
    }
</style>