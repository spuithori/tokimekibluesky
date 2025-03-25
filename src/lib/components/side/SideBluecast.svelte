<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {onMount} from "svelte";
    import Avatar from "../../../routes/(app)/Avatar.svelte";
    import {fromUnixTime} from "date-fns";
    import {Mic} from "lucide-svelte";
    import {intlRelativeTimeFormatState} from "$lib/classes/intlRelativeTimeFormatState.svelte";

    let items = $state([]);

    onMount(async () => {
        const res = await fetch('https://www.bluecast.app/api/v1/lives', {
            headers: {
                "Content-Type": "application/json",
            },
        });
        items = await res.json();
    })
</script>

<div class="side-bluecast">
  <p class="bluecast-title"><Mic size="20" color="var(--danger-color)"></Mic>{$_('side_bluecast_title')}</p>

  <div class="bluecast-list">
    {#each items as item}
      <div class="bluecast-item">
        <div class="bluecast-item__avatar">
          <Avatar href="/profile/{item?.profileData?.handle}" avatar={item?.profileData?.avatar} handle={item?.profileData?.handle}></Avatar>
        </div>

        <div class="bluecast-item__content">
          <div class="bluecast-item__heading">
            <h3 class="bluecast-item__title"><a href="https://www.bluecast.app/user/@{item?.profileData?.handle}?t=listen" target="_blank" rel="noopener noreferrer">{item?.profileData?.displayName || item?.profileData?.handle}</a></h3>

            {#if (item?.createdAt?.seconds)}
              <p class="bluecast-item__date">{intlRelativeTimeFormatState.format({ laterDate: fromUnixTime(item?.createdAt?.seconds)})}</p>
            {/if}
          </div>

          {#if item?.channelDescription}
            <p class="bluecast-item__name">{item?.channelName}</p>
            <p class="bluecast-item__text">{item?.channelDescription}</p>
          {/if}
        </div>
      </div>
    {:else}
      <p class="bluecast-nothing">{$_('bluecast_nothing')}</p>
    {/each}
  </div>
</div>

<style lang="postcss">
    .side-bluecast {
        padding: 16px;
    }

    .bluecast-title {
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: bold;
        margin-bottom: 8px;
        color: var(--text-color-1);
    }

    .bluecast-item {
        position: relative;
        display: grid;
        grid-template-columns: 46px 1fr;
        gap: 12px;
        align-items: flex-start;
        border-bottom: 1px solid var(--border-color-2);
        padding: 12px 0;

        &__title {
            font-weight: bold;
            font-size: 14px;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;

            a {
                color: inherit;

                &::before {
                    content: '';
                    display: block;
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 1;
                }
            }
        }

        &__avatar {
            position: relative;
            z-index: 2;
        }

        &__name {
            margin-bottom: 8px;
        }

        &__text {
            color: var(--text-color-3);
            font-size: 14px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.3;
        }

        &__date {
            color: var(--timeline-date-color);
            letter-spacing: .05em;
            position: relative;
            cursor: default;
            font-weight: normal;
            font-size: 14px;

            &::before {
                content: '・';
            }

            &:not(:last-child) {
                &::after {
                    content: '・';
                }
            }
        }

        &__heading {
            display: flex;
            flex-wrap: wrap;
            margin-bottom: 4px;
        }
    }

    .bluecast-nothing {
        margin-top: 16px;
        color: var(--text-color-3);
    }
</style>