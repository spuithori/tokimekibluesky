<script lang="ts">
  import {_} from "svelte-i18n";
  import {createEventDispatcher} from "svelte";
  import {liveQuery} from "dexie";
  import {accountsDb} from "$lib/db";
  const dispatch = createEventDispatcher();

  interface Props {
    account: any;
    isEnabled?: boolean;
  }

  let { account, isEnabled = $bindable(false) }: Props = $props();
  const category = ['reply', 'like', 'repost', 'follow', 'quote', 'mention'];
  let selectedCategory = $state(account.notification);

  let _account = $derived(liveQuery(async () => {
      const _account = await accountsDb.accounts.get(account.id);
      return _account;
  }))

  function changeToggle() {
      dispatch('change', {
          enabled: isEnabled,
          did: account.did,
      });
  }

  async function handleCategoryChange() {
      try {
          const id = await accountsDb.accounts.update(account.id, {
              notification: selectedCategory,
          });
      } catch (e) {
          console.error(e);
      }
  }
</script>

<div class="push-notification-account-item">
  <h3 class="push-notification-account-item__title">@{account.handle || account.session?.handle || account.did}</h3>

  <dl class="settings-group settings-group--column">
    <dt class="settings-group__name">
      {$_('push_toggle_switch_this_account')}
    </dt>

    <dd class="settings-group__content">
      <div class="input-toggle">
        <input class="input-toggle__input" type="checkbox" id={account.did} bind:checked={isEnabled} onchange={changeToggle}><label class="input-toggle__label" for={account.did}></label>
      </div>
    </dd>
  </dl>

  {#if (isEnabled)}
    <div class="push-notification-categories">
      {#if account.notification}
        {#each category as term}
          <div class="push-notification-category">
            <dl class="settings-group">
              <dt class="settings-group__name">
                {$_(term)}
              </dt>

              <dd class="settings-group__content">
                <div class="input-toggle">
                  <input
                      class="input-toggle__input"
                      type="checkbox"
                      id={account.did + term}
                      bind:group={selectedCategory}
                      onchange={handleCategoryChange}
                      name={term}
                      value={term}
                  ><label class="input-toggle__label" for={account.did + term}></label>
                </div>
              </dd>
            </dl>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style lang="postcss">
  .push-notification-account-item {
      padding: 20px;
      border-radius: 6px;
      box-shadow: 0 0 10px var(--box-shadow-color-1);
      margin-bottom: 20px;

      &__title {
          font-size: 16px;
          letter-spacing: .025em;
      }
  }

  .push-notification-categories {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      border: 1px solid var(--border-color-1);
      padding: 10px 20px;
  }

  .push-notification-category {
      &:nth-child(-n + 3) {
          border-bottom: 1px solid var(--border-color-1);
      }
  }
</style>