<script lang="ts">
  import {_} from "svelte-i18n";
  import { settings } from '$lib/stores';

  export let keyword = {
      word: '',
      period: {
          start: '0:00',
          end: '0:00',
      }
  };
  export let index;

  $: console.log(keyword)

  const regTime = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/

  let startPercent;
  let endPercent;

  $: {
      $settings.keywordMutes[index] = keyword;

      if (regTime.test(keyword.period.start)) {
          const array = keyword.period.start.split(':');
          const minutes = Number(array[0]) * 60 + Number(array[1]);
          startPercent = minutes / 1440 * 100;
          console.log(startPercent)
      }

      if (regTime.test(keyword.period.end)) {
          const array = keyword.period.end.split(':');
          const minutes = Number(array[0]) * 60 + Number(array[1]);
          endPercent = minutes / 1440 * 100;
          console.log(endPercent)
      }
  }
</script>

<div class="keyword-mute">
  <div class="keyword-mute-group">
    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('keyword')}
      </dt>

      <dd class="settings-group__content">
        <div class="keyword-name">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <path id="edit-pencil" d="M9.84,2.96l3.2,3.2L3.2,16H0V12.8Zm1.12-1.12L12.8,0,16,3.2,14.16,5.04Z" fill="var(--text-color-1)"/>
          </svg>

          <input id="keyword" type="text" class="keyword-name__input" bind:value={keyword.word}>
        </div>
      </dd>
    </dl>

    <details class="accordion">
      <summary class="accordion__heading">{$_('keyword_period_setting')}
        <svg xmlns="http://www.w3.org/2000/svg" width="14.814" height="8.821" viewBox="0 0 14.814 8.821">
          <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l6.7,6.7,6.7-6.7" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--text-color-3)" stroke-width="2"/>
        </svg></summary>

      <dl class="settings-group">
        <dt class="settings-group__name">
          {$_('keyword_period')}
        </dt>

        <dd class="settings-group__content">
          <div class="keyword-time-group">
            <div class="keyword-time keyword-time--start">
              <div class="keyword-time__content">
                <input class="keyword-time__input" type="time" bind:value={keyword.period.start}>
              </div>
            </div>

            <div class="keyword-time-divider">～</div>

            <div class="keyword-time keyword-time--end">
              <div class="keyword-time__content">
                <input class="keyword-time__input" type="time" bind:value={keyword.period.end}>
              </div>
            </div>
          </div>

          <div class="keyword-time-graph">
            <div class="keyword-time-graph-name">
              <p>00:00</p>
              <p>12:00</p>
              <p>24:00</p>
            </div>

            <div class="keyword-time-graph-content" class:is-reverse={startPercent > endPercent}>
              <div
                  class="keyword-time-graph-content__1"
                  class:reverse={startPercent > endPercent}
                  style="left: {startPercent < endPercent ? startPercent : endPercent}%; width: {startPercent < endPercent ? endPercent - startPercent : startPercent - endPercent}%"
              ></div>
            </div>
          </div>
        </dd>
      </dl>
    </details>
  </div>
</div>

<style lang="postcss">
    .keyword-mute {
        box-shadow: 0 0 16px var(--box-shadow-color-1);
        border-radius: 6px;
        padding: 10px 20px 15px;
        margin-top: 20px;
    }

    .keyword-name {
        position: relative;
        border: 1px solid var(--border-color-1);
        border-radius: 4px;
        height: 40px;
        padding: 0 10px;
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 10px;
        overflow: hidden;

        &__input {
            color: var(--text-color-1);
            width: 100%;
        }

        &:focus-within {
            border-color: var(--text-color-1);
        }

        svg {
            flex-shrink: 0;
        }
    }

    .keyword-time-group {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .keyword-time {
        &__content {}

        &__input {
            border: 1px solid var(--border-color-1);
            border-radius: 4px;
            padding: 0 10px;
            height: 40px;
            color: var(--text-color-1);
        }
    }

    .keyword-time-graph {
        margin-top: 10px;
    }

    .keyword-time-graph-content {
        background-color: var(--border-color-1);
        height: 50px;
        position: relative;

        &.is-reverse {
            background-color: var(--primary-color);
        }

        &__1 {
            position: absolute;
            top: 0;
            bottom: 0;
            background-color: var(--primary-color);

            &.reverse {
                background-color: var(--border-color-1);
            }
        }
    }
    .keyword-time-graph-name {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
        color: var(--text-color-3);
    }
</style>