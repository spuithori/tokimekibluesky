<script lang="ts">
    import { fade, fly } from 'svelte/transition';
    import { _ } from "svelte-i18n";
    import { contentLabels } from '$lib/stores';

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

    let labels: contentLabels = {
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

    try {
        if (localStorage.getItem('contentLabels')) {
            labels = JSON.parse(localStorage.getItem('contentLabels'))
        }
    } catch(e) {
        console.log(e)
    }

    $: {
        let labelsAlt = new Map();
        labelsAlt.set('nsfw', ['porn']);

        labelsAlt.forEach((value, key) => {
            value.forEach(item => {
                labels[item] = labels[key];
            })
        });

        contentLabels.set(JSON.stringify(labels));
        localStorage.setItem('contentLabels', $contentLabels);
    }
</script>

<div class="moderation-settings-modal" transition:fly="{{ y: 30, duration: 250 }}">
  <div class="moderation-settings-modal-contents">
    <h2 class="moderation-settings-modal-title">{$_('content_moderation_settings')}</h2>
    <p class="moderation-settings-modal-note">{$_('content_moderation_settings_note')}</p>

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


    <div class="moderation-settings-modal-close">
      <slot></slot>
    </div>
  </div>
</div>

<style lang="postcss">
    .moderation-settings-modal {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        z-index: 9999;
        background-color: rgba(0, 0, 0, .5);
        overflow: auto;
        padding: 50px 0;

        @media (max-width: 767px) {
            display: block;
            overscroll-behavior-y: none;
            padding: 20px;
        }
    }

    .moderation-settings-modal-contents {
        padding: 30px;
        border-radius: 10px;
        background-color: var(--bg-color-1);
        width: 740px;
        max-width: 100%;

        @media (max-width: 767px) {
            width: 100%;
        }
    }

    .moderation-settings-modal-close {
        text-align: center;
        margin-top: 30px;
    }

    .moderation-settings-modal-title {
        font-weight: 900;
        font-size: 20px;
        line-height: 1.5;
        margin-bottom: 10px;
    }

    .moderation-settings-modal-note {
        font-size: 14px;
    }

    .moderation-settings-groups {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px 30px;
        margin-top: 30px;

        @media (max-width: 767px) {
            grid-template-columns: 1fr;
            gap: 20px;
        }
    }

    .moderation-settings-group {
        position: relative;

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