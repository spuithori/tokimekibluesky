<script lang="ts">
    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import TimelineItem from "../../TimelineItem.svelte";
    let themePick: string = $settings?.design.theme || 'superorange';
    let darkmode = $settings?.design.darkmode || false;
    let nonoto = $settings?.design.nonoto || false;

    const samplePost = {
        post: {
            author: {
                did: 'did:example:tokimekidummy',
                displayName: 'Ayumu',
                handle: 'ayumu.example.tokimeki.blue',
            },
            indexedAt: '2023-05-17T05:03:26.304Z',
            likeCount: 10,
            replyCount: 10,
            repostCount: 10,
            record: {
                $type: 'app.bsky.feed.post',
                createdAt: '2023-05-17T05:03:25.905Z',
                text: 'Dreams will not escape us if we do not give up step by step, even on an endless road.'
            },
            uri: 'at://did:example:tokimekidummy/app.bsky.feed.post/kdaosidoewo'
        }
    }

    $: {
        $settings.design.theme = themePick;
        $settings.design.darkmode = darkmode;
        $settings.design.nonoto = nonoto;
    }
</script>

<svelte:head>
  <title>Design - TOKIMEKI Bluesky</title>
</svelte:head>

<div>
  <div class="settings-heading">
    <a href="/settings" class="settings-back"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="16.97" viewBox="0 0 20 16.97">
      <path id="arrow-left" d="M3.828,9,9.9,2.929,8.485,1.515,0,10l.707.707,7.778,7.778L9.9,17.071,3.828,11H20V9Z" transform="translate(0 -1.515)" fill="var(--text-color-1)"/>
    </svg></a>

    <h1 class="settings-title">{$_('settings_design')}</h1>
  </div>

  <div class="settings-wrap">
    <aside class="sample-post" tabindex="-1">
      <p>{$_('sample')}</p>
      <TimelineItem data={samplePost}></TimelineItem>
    </aside>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('theme')}
      </dt>

      <dd class="settings-group__content">
        <ul class="theme-picker theme-picker--{themePick}">
          <li class="theme-picker__item theme-picker__item--lightpink">
            <button class="theme-picker__button" on:click={() => {themePick = 'lightpink'}} aria-label="ライトピンク"></button>
          </li>

          <li class="theme-picker__item theme-picker__item--pastelyellow">
            <button class="theme-picker__button" on:click={() => {themePick = 'pastelyellow'}} aria-label="パステルイエロー"></button>
          </li>

          <li class="theme-picker__item theme-picker__item--lightblue">
            <button class="theme-picker__button" on:click={() => {themePick = 'lightblue'}} aria-label="ライトブルー"></button>
          </li>

          <li class="theme-picker__item theme-picker__item--royalblue">
            <button class="theme-picker__button" on:click={() => {themePick = 'royalblue'}} aria-label="ロイヤルブルー"></button>
          </li>

          <li class="theme-picker__item theme-picker__item--superorange">
            <button class="theme-picker__button" on:click={() => {themePick = 'superorange'}} aria-label="超オレンジ"></button>
          </li>

          <li class="theme-picker__item theme-picker__item--violet">
            <button class="theme-picker__button" on:click={() => {themePick = 'violet'}} aria-label="すみれ"></button>
          </li>

          <li class="theme-picker__item theme-picker__item--scarlet">
            <button class="theme-picker__button" on:click={() => {themePick = 'scarlet'}} aria-label="スカーレット"></button>
          </li>

          <li class="theme-picker__item theme-picker__item--lightgreen">
            <button class="theme-picker__button" on:click={() => {themePick = 'lightgreen'}} aria-label="ライトグリーン"></button>
          </li>

          <li class="theme-picker__item theme-picker__item--paperwhite">
            <button class="theme-picker__button" on:click={() => {themePick = 'paperwhite'}} aria-label="ペーパーホワイト"></button>
          </li>

          <li class="theme-picker__item theme-picker__item--jade">
            <button class="theme-picker__button" on:click={() => {themePick = 'jade'}} aria-label="翡翠"></button>
          </li>

          <li class="theme-picker__item theme-picker__item--platinumsilver">
            <button class="theme-picker__button" on:click={() => {themePick = 'platinumsilver'}} aria-label="プラチナシルバー"></button>
          </li>

          <li class="theme-picker__item theme-picker__item--pinkgold">
            <button class="theme-picker__button" on:click={() => {themePick = 'pinkgold'}} aria-label="ピンクゴールド"></button>
          </li>
        </ul>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('darkmode')}
      </dt>

      <dd class="settings-group__content">
        <div class="radio-group">
          <div class="radio">
            <input type="radio" bind:group={darkmode} id="darkmodeFalse" name="darkmode" value={false}>
            <label for="darkmodeFalse"><span class="radio__ui"></span>{$_('light')}</label>
          </div>

          <div class="radio">
            <input type="radio" bind:group={darkmode} id="darkmodeTrue" name="darkmode" value={true}>
            <label for="darkmodeTrue"><span class="radio__ui"></span>{$_('dark')}</label>
          </div>

          <div class="radio">
            <input type="radio" bind:group={darkmode} id="darkmodePrefer" name="darkmode" value={'prefer'}>
            <label for="darkmodePrefer"><span class="radio__ui"></span>{$_('prefer')}</label>
          </div>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('do_not_use_noto_sans')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="nonoto" bind:checked={nonoto}><label class="input-toggle__label" for="nonoto"></label>
        </div>
      </dd>
    </dl>
  </div>
</div>

<style lang="postcss">
    .theme-picker {
        display: grid;
        grid-template-columns: repeat(6, 50px);
        gap: 6px;
        list-style: none;
        margin-top: 10px;

        &--lightpink {
            .theme-picker__item--lightpink button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--pastelyellow {
            .theme-picker__item--pastelyellow button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--lightblue {
            .theme-picker__item--lightblue button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--royalblue {
            .theme-picker__item--royalblue button {
                border: 2px solid var(--text-color-3);
            }
        }

        &--superorange {
            .theme-picker__item--superorange button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--violet {
            .theme-picker__item--violet button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--scarlet {
            .theme-picker__item--scarlet button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--lightgreen {
            .theme-picker__item--lightgreen button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--paperwhite {
            .theme-picker__item--paperwhite button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--jade {
            .theme-picker__item--jade button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--platinumsilver {
            .theme-picker__item--platinumsilver button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--pinkgold {
            .theme-picker__item--pinkgold button {
                border: 2px solid var(--text-color-1);
            }
        }

        &__item {
            aspect-ratio: 1 / 1;
            border-radius: var(--primary-color);

            &--lightpink {
                button {
                    background-color: var(--color-theme-1);
                }
            }

            &--pastelyellow {
                button {
                    background-color: var(--color-theme-2);
                }
            }

            &--lightblue {
                button {
                    background-color: var(--color-theme-3);
                }
            }

            &--royalblue {
                button {
                    background-color: var(--color-theme-4);
                }
            }

            &--superorange {
                button {
                    background-color: var(--color-theme-5);
                }
            }

            &--violet {
                button {
                    background-color: var(--color-theme-6);
                }
            }

            &--scarlet {
                button {
                    background-color: var(--color-theme-7);
                }
            }

            &--lightgreen {
                button {
                    background-color: var(--color-theme-8);
                }
            }

            &--paperwhite {
                button {
                    background-color: var(--color-theme-9);
                    border: 2px solid var(--border-color-1);
                }
            }

            &--jade {
                button {
                    background-color: var(--color-theme-10);
                }
            }

            &--platinumsilver {
                button {
                    background-color: var(--color-theme-11);
                }
            }

            &--pinkgold {
                button {
                    background-color: var(--color-theme-12);
                }
            }
        }

        &__button {
            width: 100%;
            height: 100%;
            border-radius: 4px;
        }
    }
</style>