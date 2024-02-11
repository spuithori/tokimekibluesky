<script lang="ts">
    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';

    type contentLabelsSelect = 'hide' | 'warn' | 'show';
    type contentLabels = {
        gore: contentLabelsSelect,
        hate: contentLabelsSelect,
        impersonation: contentLabelsSelect,
        nsfw: contentLabelsSelect,
        nudity: contentLabelsSelect,
        spam: contentLabelsSelect,
        suggestive: contentLabelsSelect,
    }

    let labels: contentLabels = $settings.moderation.contentLabels || {
        gore: 'warn',
        hate: 'warn',
        impersonation: 'warn',
        nsfw: 'warn',
        nudity: 'warn',
        spam: 'warn',
        suggestive: 'warn',
    };

    const contentLabelsSelections = [
        {
            value: 'hide',
            text: $_('hide')
        },
        {
            value: 'warn',
            text: $_('warn')
        },
        {
            value: 'show',
            text: $_('show')
        }
    ];

    $: {
        let labelsAlt = new Map();
        labelsAlt.set('nsfw', ['porn','sexual']);

        labelsAlt.forEach((value, key) => {
            value.forEach(item => {
                labels[item] = labels[key];
            })
        });

        $settings.moderation.contentLabels = labels;
    }
</script>

<svelte:head>
  <title>{$_('settings_moderation')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" on:click={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_moderation')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <div class="settings-child-nav">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle-off"><path d="M20.5 14.9A9 9 0 0 0 9.1 3.5"/><path d="m2 2 20 20"/><path d="M5.6 5.6C3 8.3 2.2 12.5 4 16l-2 6 6-2c3.4 1.8 7.6 1.1 10.3-1.7"/></svg>
      <a href="/settings/moderation/modlist">{$_('settings_mod_list')}<br><span>{$_('settings_mod_list_description')}</span></a>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
    </div>

    <div class="moderation-settings-groups">
      <div class="moderation-settings-group">
        <h3 class="moderation-settings-group__title">{$_('gore_title')}</h3>
        <p class="moderation-settings-group__text">{$_('gore_description')}</p>

        <div class="moderation-settings-group__content">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

          <select bind:value={labels.gore}>
            {#each contentLabelsSelections as option}
              <option value="{option.value}">{option.text}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="moderation-settings-group">
        <h3 class="moderation-settings-group__title">{$_('hate_title')}</h3>
        <p class="moderation-settings-group__text">{$_('hate_description')}</p>

        <div class="moderation-settings-group__content">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

          <select bind:value={labels.hate}>
            {#each contentLabelsSelections as option}
              <option value="{option.value}">{option.text}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="moderation-settings-group">
        <h3 class="moderation-settings-group__title">{$_('impersonation_title')}</h3>
        <p class="moderation-settings-group__text">{$_('impersonation_description')}</p>

        <div class="moderation-settings-group__content">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

          <select bind:value={labels.impersonation}>
            {#each contentLabelsSelections as option}
              <option value="{option.value}">{option.text}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="moderation-settings-group">
        <h3 class="moderation-settings-group__title">{$_('nsfw_title')}</h3>
        <p class="moderation-settings-group__text">{$_('nsfw_description')}</p>

        <div class="moderation-settings-group__content">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

          <select bind:value={labels.nsfw}>
            {#each contentLabelsSelections as option}
              <option value="{option.value}">{option.text}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="moderation-settings-group">
        <h3 class="moderation-settings-group__title">{$_('nudity_title')}</h3>
        <p class="moderation-settings-group__text">{$_('nudity_description')}</p>

        <div class="moderation-settings-group__content">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

          <select bind:value={labels.nudity}>
            {#each contentLabelsSelections as option}
              <option value="{option.value}">{option.text}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="moderation-settings-group">
        <h3 class="moderation-settings-group__title">{$_('spam_title')}</h3>
        <p class="moderation-settings-group__text">{$_('spam_description')}</p>

        <div class="moderation-settings-group__content">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

          <select bind:value={labels.spam}>
            {#each contentLabelsSelections as option}
              <option value="{option.value}">{option.text}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="moderation-settings-group">
        <h3 class="moderation-settings-group__title">{$_('suggestive_title')}</h3>
        <p class="moderation-settings-group__text">{$_('suggestive_description')}</p>

        <div class="moderation-settings-group__content">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

          <select bind:value={labels.suggestive}>
            {#each contentLabelsSelections as option}
              <option value="{option.value}">{option.text}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
    .moderation-settings-groups {
        margin-top: 24px;
    }

    .moderation-settings-group {
        position: relative;
        margin-bottom: 30px;

        &__content {
            margin-top: 10px;
            position: relative;
            background-color: var(--bg-color-2);

            svg {
                position: absolute;
                right: 15px;
                top: 0;
                bottom: 0;
                margin: auto;
                z-index: 1;
              pointer-events: none;
            }
        }

        &__title {
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 2px;
            letter-spacing: .025em;
        }

        &__text {
            color: var(--text-color-3);
            font-size: 14px;
        }

        select {
            border: 1px solid var(--border-color-1);
            background-color: var(--bg-color-2);
            height: 40px;
            border-radius: 4px;
            width: 100%;
            padding: 0 10px;
            cursor: pointer;
            position: relative;
            color: var(--text-color-1);
        }
    }
</style>