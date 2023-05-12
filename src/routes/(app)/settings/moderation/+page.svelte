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
        gore: 'show',
        hate: 'show',
        impersonation: 'show',
        nsfw: 'show',
        nudity: 'show',
        spam: 'show',
        suggestive: 'show',
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
        labelsAlt.set('nsfw', ['porn']);

        labelsAlt.forEach((value, key) => {
            value.forEach(item => {
                labels[item] = labels[key];
            })
        });

        $settings.moderation.contentLabels = labels;
    }
</script>

<div>
  <div class="settings-heading">
    <a href="/settings" class="settings-back"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="16.97" viewBox="0 0 20 16.97">
      <path id="arrow-left" d="M3.828,9,9.9,2.929,8.485,1.515,0,10l.707.707,7.778,7.778L9.9,17.071,3.828,11H20V9Z" transform="translate(0 -1.515)" fill="var(--text-color-1)"/>
    </svg></a>

    <h1 class="settings-title">{$_('settings_moderation')}</h1>
  </div>

  <div class="settings-wrap">
    <div class="moderation-settings-groups">
      <div class="moderation-settings-group">
        <h3 class="moderation-settings-group__title">{$_('gore_title')}</h3>
        <p class="moderation-settings-group__text">{$_('gore_description')}</p>

        <div class="moderation-settings-group__content">
          <svg xmlns="http://www.w3.org/2000/svg" width="21.814" height="12.321" viewBox="0 0 21.814 12.321">
            <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l10.2,10.2,10.2-10.2" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--primary-color)" stroke-width="2"/>
          </svg>

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
          <svg xmlns="http://www.w3.org/2000/svg" width="21.814" height="12.321" viewBox="0 0 21.814 12.321">
            <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l10.2,10.2,10.2-10.2" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--primary-color)" stroke-width="2"/>
          </svg>

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
          <svg xmlns="http://www.w3.org/2000/svg" width="21.814" height="12.321" viewBox="0 0 21.814 12.321">
            <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l10.2,10.2,10.2-10.2" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--primary-color)" stroke-width="2"/>
          </svg>

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
          <svg xmlns="http://www.w3.org/2000/svg" width="21.814" height="12.321" viewBox="0 0 21.814 12.321">
            <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l10.2,10.2,10.2-10.2" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--primary-color)" stroke-width="2"/>
          </svg>

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
          <svg xmlns="http://www.w3.org/2000/svg" width="21.814" height="12.321" viewBox="0 0 21.814 12.321">
            <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l10.2,10.2,10.2-10.2" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--primary-color)" stroke-width="2"/>
          </svg>

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
          <svg xmlns="http://www.w3.org/2000/svg" width="21.814" height="12.321" viewBox="0 0 21.814 12.321">
            <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l10.2,10.2,10.2-10.2" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--primary-color)" stroke-width="2"/>
          </svg>

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
          <svg xmlns="http://www.w3.org/2000/svg" width="21.814" height="12.321" viewBox="0 0 21.814 12.321">
            <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l10.2,10.2,10.2-10.2" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--primary-color)" stroke-width="2"/>
          </svg>

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