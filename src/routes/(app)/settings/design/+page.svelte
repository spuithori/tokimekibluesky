<script lang="ts">
    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import TimelineItem from "../../TimelineItem.svelte";
    let themePick: string = $settings?.design.theme || 'royalblue';
    let darkmode = $settings?.design.darkmode || false;
    let nonoto = $settings?.design.nonoto || false;
    let absoluteTime = $settings?.design.absoluteTime || false;
    let postsLayout = $settings?.design.postsLayout || 'default';
    let postsImageLayout = $settings?.design.postsImageLayout || 'default';
    let oneImageNoCrop = $settings?.design.oneImageNoCrop || false;

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
        $settings.design.absoluteTime = absoluteTime;
        $settings.design.postsLayout = postsLayout;
        $settings.design.postsImageLayout = postsImageLayout;
        $settings.design.oneImageNoCrop = oneImageNoCrop;
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
        {$_('posts_layout')}
      </dt>

      <dd class="settings-group__content">
        <div class="icons-radio-group">
          <div class="icons-radio">
            <input type="radio" bind:group={postsLayout} id="postsLayoutDefault" name="posts_layout" value={'default'}>
            <label for="postsLayoutDefault"><span class="icons-radio__ui"><svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75"><g data-name="グループ 116" transform="translate(-663 -402)"><g class="icons-radio__g" data-name="長方形 110" transform="translate(663 402)" fill="var(--bg-color-1)" stroke="var(--border-color-1)"><rect width="75" height="75" rx="4" stroke="none"/><rect x=".5" y=".5" width="74" height="74" rx="3.5" fill="none"/></g><circle data-name="楕円形 44" cx="9" cy="9" r="9" transform="translate(668 408)" fill="#d5d5d5"/><circle data-name="楕円形 45" cx="9" cy="9" r="9" transform="translate(668 431)" fill="#d5d5d5"/><circle data-name="楕円形 46" cx="9" cy="9" r="9" transform="translate(668 454)" fill="#d5d5d5"/><path data-name="長方形 111" fill="#d5d5d5" d="M691 410h23v4h-23z"/><path data-name="長方形 114" fill="#d5d5d5" d="M691 433h23v4h-23z"/><path data-name="長方形 116" fill="#d5d5d5" d="M691 456h23v4h-23z"/><path data-name="長方形 112" fill="#d5d5d5" d="M691 417h41v5h-41z"/><path data-name="長方形 113" fill="#d5d5d5" d="M691 440h41v5h-41z"/><path data-name="長方形 115" fill="#d5d5d5" d="M691 463h41v5h-41z"/></g></svg></span>{$_('default')}</label>
          </div>

          <div class="icons-radio">
            <input type="radio" bind:group={postsLayout} id="postsLayoutCompact" name="posts_layout" value={'compact'}>
            <label for="postsLayoutCompact"><span class="icons-radio__ui"><svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75"><defs><linearGradient id="a" x1=".5" x2=".5" y2=".749" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="var(--bg-color-1)" stop-opacity="0"/><stop offset="1" stop-color="var(--bg-color-1)"/></linearGradient></defs><g data-name="グループ 117" transform="translate(-756 -402)"><g class="icons-radio__g" data-name="長方形 117" transform="translate(756 402)" fill="var(--bg-color-1)" stroke="var(--border-color-1)"><rect width="75" height="75" rx="4" stroke="none"/><rect x=".5" y=".5" width="74" height="74" rx="3.5" fill="none"/></g><circle data-name="楕円形 47" cx="7.5" cy="7.5" r="7.5" transform="translate(761 406)" fill="#d5d5d5"/><circle data-name="楕円形 48" cx="7.5" cy="7.5" r="7.5" transform="translate(761 424)" fill="#d5d5d5"/><circle data-name="楕円形 49" cx="7.5" cy="7.5" r="7.5" transform="translate(761 442)" fill="#d5d5d5"/><circle data-name="楕円形 50" cx="7.5" cy="7.5" r="7.5" transform="translate(761 460)" fill="#d5d5d5"/><path data-name="長方形 123" fill="#d5d5d5" d="M781 408h23v3h-23z"/><path data-name="長方形 125" fill="#d5d5d5" d="M781 426h23v3h-23z"/><path data-name="長方形 127" fill="#d5d5d5" d="M781 444h23v3h-23z"/><path data-name="長方形 129" fill="#d5d5d5" d="M781 462h23v3h-23z"/><path data-name="長方形 122" fill="#d5d5d5" d="M781 413h41v4h-41z"/><path data-name="長方形 124" fill="#d5d5d5" d="M781 431h41v4h-41z"/><path data-name="長方形 126" fill="#d5d5d5" d="M781 449h41v4h-41z"/><path data-name="長方形 128" fill="#d5d5d5" d="M781 467h41v4h-41z"/><rect data-name="長方形 130" width="73" height="26" rx="4" transform="translate(757 450)" fill="url(#a)"/></g></svg></span>{$_('compact')}</label>
          </div>

          <div class="icons-radio">
            <input type="radio" bind:group={postsLayout} id="postsLayoutMinimum" name="posts_layout" value={'minimum'}>
            <label for="postsLayoutMinimum"><span class="icons-radio__ui"><svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75"><g data-name="グループ 118"><g class="icons-radio__g" data-name="長方形 131" fill="var(--bg-color-1)" stroke="var(--border-color-1)"><rect width="75" height="75" rx="4" stroke="none"/><rect x=".5" y=".5" width="74" height="74" rx="3.5" fill="none"/></g><path data-name="長方形 132" fill="#d5d5d5" d="M8 5h23v3H8z"/><path data-name="長方形 135" fill="#d5d5d5" d="M8 20h23v3H8z"/><path data-name="長方形 137" fill="#d5d5d5" d="M8 33h23v3H8z"/><path data-name="長方形 139" fill="#d5d5d5" d="M8 48h23v3H8z"/><path data-name="長方形 141" fill="#d5d5d5" d="M8 61h23v3H8z"/><path data-name="長方形 133" fill="#d5d5d5" d="M8 10h59v4H8z"/><path data-name="長方形 134" fill="#d5d5d5" d="M8 25h59v4H8z"/><path data-name="長方形 136" fill="#d5d5d5" d="M8 38h59v4H8z"/><path data-name="長方形 138" fill="#d5d5d5" d="M8 53h59v4H8z"/><path data-name="長方形 140" fill="#d5d5d5" d="M8 66h59v4H8z"/></g></svg></span>{$_('minimum')}</label>
          </div>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('posts_image_layout')}
      </dt>

      <dd class="settings-group__content">
        <div class="icons-radio-group">
          <div class="icons-radio">
            <input type="radio" bind:group={postsImageLayout} id="postsImageLayoutDefault" name="posts_image_layout" value={'default'}>
            <label for="postsImageLayoutDefault"><span class="icons-radio__ui"><svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75"><g data-name="グループ 119" transform="translate(-663 -536)"><g class="icons-radio__g" data-name="長方形 142" transform="translate(663 536)" fill="var(--bg-color-1)" stroke="var(--border-color-1)"><rect width="75" height="75" rx="4" stroke="none"/><rect x=".5" y=".5" width="74" height="74" rx="3.5" fill="none"/></g><rect class="icons-radio__r" data-name="長方形 144" width="26" height="26" rx="4" transform="translate(672 545)" fill="#d5d5d5"/><rect class="icons-radio__r" data-name="長方形 147" width="26" height="26" rx="4" transform="translate(672 576)" fill="#d5d5d5"/><rect class="icons-radio__r" data-name="長方形 145" width="26" height="26" rx="4" transform="translate(703 545)" fill="#d5d5d5"/><rect class="icons-radio__r" data-name="長方形 146" width="26" height="26" rx="4" transform="translate(703 576)" fill="#d5d5d5"/></g></svg></span>{$_('default')}</label>
          </div>

          <div class="icons-radio">
            <input type="radio" bind:group={postsImageLayout} id="postsImageLayoutCompact" name="posts_image_layout" value={'compact'}>
            <label for="postsImageLayoutCompact"><span class="icons-radio__ui"><svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75"><g data-name="グループ 120"><g class="icons-radio__g" data-name="長方形 148" fill="var(--bg-color-1)" stroke="var(--border-color-1)"><rect width="75" height="75" rx="4" stroke="none"/><rect x=".5" y=".5" width="74" height="74" rx="3.5" fill="none"/></g><g data-name="グループ 115" transform="translate(-756 -516)" fill="#d5d5d5"><rect class="icons-radio__r" data-name="長方形 151" width="14" height="14" rx="2" transform="translate(763 547)"/><rect class="icons-radio__r" data-name="長方形 152" width="14" height="14" rx="2" transform="translate(779 547)"/><rect class="icons-radio__r" data-name="長方形 153" width="14" height="14" rx="2" transform="translate(795 547)"/><rect class="icons-radio__r" data-name="長方形 154" width="14" height="14" rx="2" transform="translate(811 547)"/></g></g></svg></span>{$_('compact')}</label>
          </div>

          <div class="icons-radio">
            <input type="radio" bind:group={postsImageLayout} id="postsImageLayoutMinimum" name="posts_image_layout" value={'folding'}>
            <label for="postsImageLayoutMinimum"><span class="icons-radio__ui"><svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75"><g data-name="グループ 121"><g class="icons-radio__g" data-name="長方形 148" fill="var(--bg-color-1)" stroke="var(--border-color-1)"><rect width="75" height="75" rx="4" stroke="none"/><rect x=".5" y=".5" width="74" height="74" rx="3.5" fill="none"/></g><g data-name="グループ 115" transform="translate(-737 -520)"><rect class="icons-radio__r" data-name="長方形 151" width="24" height="6" rx="2" transform="translate(763 555)" fill="#d5d5d5"/></g></g></svg></span>{$_('folding')}</label>
          </div>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('one_image_no_crop')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="oneImageNoCrop" bind:checked={oneImageNoCrop}><label class="input-toggle__label" for="oneImageNoCrop"></label>
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

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('use_absolute_time')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="absoluteTime" bind:checked={absoluteTime}><label class="input-toggle__label" for="absoluteTime"></label>
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