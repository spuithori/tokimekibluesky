<script lang="ts">
import {createEventDispatcher} from 'svelte';
import {_} from 'svelte-i18n';
import {agent} from '$lib/stores';
import {getTextArray, isUriLocal} from '$lib/richtext';
import {page} from '$app/stores';
import {format, parseISO} from 'date-fns';
import ProfileCardWrapper from '../../ProfileCardWrapper.svelte';
import UserFollowButton from './UserFollowButton.svelte';
import UserEdit from './UserEdit.svelte';
import toast from 'svelte-french-toast';
import Menu from '$lib/components/ui/Menu.svelte';
import {RichText} from '@atproto/api';
const dispatch = createEventDispatcher();

export let profile;
export let handle;


let currentPage = 'posts';
let firstPostDate = '';
let firstPostUri = '';
let isMenuOpen = false;
let textArray;
let unique = Symbol();

console.log(profile)

$: detectTextArray(profile.description);
getFirstPostData(handle);

function detectTextArray(text) {
    textArray = new RichText({text: text});
    textArray.detectFacets($agent.agent);
}

async function getFirstRecord(handle) {
    return await $agent.agent.api.com.atproto.repo.listRecords({
        collection: "app.bsky.feed.post",
        limit: 1,
        reverse: true,
        repo: handle});
}

async function getFirstPostData(handle = $page.params.handle) {
    const firstPost = await getFirstRecord(handle);
    const firstPostDateRaw = firstPost.data.records[0].value.createdAt;
    firstPostDate = format(parseISO(firstPostDateRaw), 'yyyy/MM/dd');
    firstPostUri = '/profile/' + $page.params.handle + '/post/' + firstPost.data.records[0].uri.split('/').slice(-1)[0];
}

function onProfileUpdate() {
    dispatch('refresh');
}

async function mute() {
    try {
        isMenuOpen = false;
        const mute = await $agent.agent.api.app.bsky.graph.muteActor({actor: handle});

        dispatch('refresh');
    } catch (e) {
        console.error(e)
    }
}

async function unmute() {
    try {
        isMenuOpen = false;
        const mute = await $agent.agent.api.app.bsky.graph.unmuteActor({actor: handle});

        dispatch('refresh');
    } catch (e) {
        console.error(e)
    }
}

async function getDidByHandle(handle) {
    const res = await $agent.agent.api.com.atproto.identity.resolveHandle({ handle: handle });
    return res.data.did;
}

async function block() {
    try {
        isMenuOpen = false;
        const did = await getDidByHandle(handle);
        const block = await $agent.agent.api.app.bsky.graph.block.create(
            { repo: $agent.did() },
            {
                subject: did,
                createdAt: new Date().toISOString(),
            });
        dispatch('refresh');
    } catch (e) {
        console.error(e)
    }
}

async function unblock(uri) {
    try {
        isMenuOpen = false;
        const did = await getDidByHandle(handle);
        const rkey = uri.split('/').slice(-1)[0];
        const block = await $agent.agent.api.app.bsky.graph.block.delete(
            {rkey: rkey, repo: $agent.did() },
            {
                subject: did,
                createdAt: new Date().toISOString(),
            });
        dispatch('refresh');
    } catch (e) {
        console.error(e)
    }
}

async function copyDid() {
    const data = await profile;
    navigator.clipboard.writeText(data.did)
        .then(() => {
            toast.success($_('success_copy_did'));
        }, () => {
            toast.success($_('failed_copy'));
        });

    isMenuOpen = false;
}
</script>

<div class="user-profile">
  <div class="profile-banner">
    {#if (profile.banner)}
      <img src="{profile.banner}" alt="" width="740" height="247">
    {/if}
  </div>

  {#if (profile.labels?.length)}
    <dl class="profile-reported">
      <dt class="profile-reported__name"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="19.999" viewBox="0 0 20 19.999">
        <path id="exclamation-solid" d="M2.93,17.07a10,10,0,1,1,14.142,0,10,10,0,0,1-14.142,0ZM9,5v6h2V5Zm0,8v2h2V13Z" transform="translate(0)" fill="#ffffff"/>
      </svg>{$_('reporting_this_user')}: </dt>

      {#each profile.labels as label}
        <dd class="profile-reported__content">{$_(label.val)}</dd>
      {/each}
    </dl>
  {/if}

  {#if (profile.viewer?.blocking)}
    {#if (profile.viewer.blocking.split('/').slice(-3)[0] === $agent.did())}
      <p class="profile-muted">{$_('blocking_this_user')}</p>
    {/if}
  {/if}

  {#if (profile.viewer?.blockedBy)}
    <p class="profile-muted">{$_('blocked_by_this_user')}</p>
  {/if}

  {#if (profile.viewer?.muted)}
    <p class="profile-muted">{$_('muting_this_user')}</p>
  {/if}

  <div class="profile-column">
    <div class="profile-avatar">
      {#if (profile.avatar)}
        <img src="{profile.avatar}" alt="">
      {/if}
    </div>

    <div class="profile-content">
      <h1 class="profile-display-name">{profile.displayName || profile.handle}</h1>
      {#if (profile.displayName)}
        <p class="profile-handle">{profile.handle}</p>
      {/if}

      {#if (profile.description)}
        <div class="profile-description">
          <p class="profile-description__text">
            {#each getTextArray(textArray) as item}
              {#if (item.isLink() && item.link)}
                {#if (isUriLocal(item.link.uri))}
                  <a href="{new URL(item.link.uri).pathname}">{item.text}</a>
                {:else}
                  <a href="{item.link.uri}" target="_blank" rel="noopener nofollow noreferrer">{item.text}</a>
                {/if}
              {:else if (item.isMention() && item.mention)}
                <ProfileCardWrapper handle="{item.text.slice(1)}">
                  <a href="/profile/{item.text.slice(1)}">{item.text}</a>
                </ProfileCardWrapper>
              {:else}
                <span>{item.text}</span>
              {/if}
            {/each}
          </p>
        </div>
      {/if}

      <div class="profile-relationship">
        <p class="profile-relationship__item"><span>{profile.followsCount}</span> {$_('follows')}</p>
        <p class="profile-relationship__item"><span>{profile.followersCount}</span> {$_('followers')}</p>
        <p class="profile-relationship__item"><span>{profile.postsCount}</span> {$_('posts')}</p>

        {#if (profile.viewer?.followedBy)}
          <p class="profile-relationship__by">{$_('follows_you')}</p>
        {/if}
      </div>

      {#if (firstPostDate)}
        <p class="profile-first"><a href="{firstPostUri}">{$_('first_post_date', {values: {date: firstPostDate }})}</a></p>
      {/if}

      {#if (profile.did !== $agent.did())}
        <div class="profile-follow-button">
          <UserFollowButton following="{profile.viewer?.following}" user={profile}></UserFollowButton>
        </div>
      {:else}
        <div class="profile-follow-button profile-follow-button--me">
          <UserEdit {profile} on:update={onProfileUpdate}></UserEdit>
        </div>
      {/if}

      <div class="profile-menu-wrap">
        <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="profile-menu-toggle">
          <svg slot="ref" xmlns="http://www.w3.org/2000/svg" width="4.5" height="18" viewBox="0 0 4.5 18">
            <path id="dots-horizontal-triple" d="M10.25,13.25A2.25,2.25,0,1,1,12.5,11,2.25,2.25,0,0,1,10.25,13.25Zm0-6.75A2.25,2.25,0,1,1,12.5,4.25,2.25,2.25,0,0,1,10.25,6.5Zm0,13.5a2.25,2.25,0,1,1,2.25-2.25A2.25,2.25,0,0,1,10.25,20Z" transform="translate(-8 -2)" fill="var(--text-color-3)"/>
          </svg>

          <ul slot="content" class="timeline-menu-list">
            {#if (profile.did !== $agent.did())}
              {#if (!profile.viewer?.muted)}
                <li class="timeline-menu-list__item timeline-menu-list__item--mute">
                  <button class="timeline-menu-list__button" on:click={mute}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20.414" height="20.485" viewBox="0 0 20.414 20.485">
                      <g id="グループ_86" data-name="グループ 86" transform="translate(-1038.793 -743.722)">
                        <path id="volume-mute" d="M9.889,8.111H5v7.333H9.889L16,21.556V2Z" transform="translate(1036.6 741.722)" fill="var(--danger-color)"/>
                        <line id="線_22" data-name="線 22" x1="19" y2="19" transform="translate(1039.5 744.5)" fill="none" stroke="var(--danger-color)" stroke-width="2"/>
                      </g>
                    </svg>
                    <span class="text-danger">{$_('mute_user')}</span>
                  </button>
                </li>
              {:else}
                <li class="timeline-menu-list__item timeline-menu-list__item--mute">
                  <button class="timeline-menu-list__button" on:click={unmute}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20.414" height="20.485" viewBox="0 0 20.414 20.485">
                      <g id="グループ_86" data-name="グループ 86" transform="translate(-1038.793 -743.722)">
                        <path id="volume-mute" d="M9.889,8.111H5v7.333H9.889L16,21.556V2Z" transform="translate(1036.6 741.722)" fill="var(--danger-color)"/>
                        <line id="線_22" data-name="線 22" x1="19" y2="19" transform="translate(1039.5 744.5)" fill="none" stroke="var(--danger-color)" stroke-width="2"/>
                      </g>
                    </svg>
                    <span class="text-danger">{$_('unmute_user')}</span>
                  </button>
                </li>
              {/if}

              {#if (!profile.viewer?.blocking)}
                <li class="timeline-menu-list__item timeline-menu-list__item--mute">
                  <button class="timeline-menu-list__button" on:click={block}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
                      <path id="block" d="M0,9a9,9,0,1,1,9,9A9,9,0,0,1,0,9ZM14.688,4.59,4.581,14.679a7.2,7.2,0,0,0,10.107-10.1ZM13.419,3.312A7.2,7.2,0,0,0,3.312,13.419L13.419,3.312Z" fill="var(--danger-color)"/>
                    </svg>
                    <span class="text-danger">{$_('block_user')}</span>
                  </button>
                </li>
              {:else}
                <li class="timeline-menu-list__item timeline-menu-list__item--mute">
                  <button class="timeline-menu-list__button" on:click={() => {unblock(profile.viewer.blocking)}}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
                      <path id="block" d="M0,9a9,9,0,1,1,9,9A9,9,0,0,1,0,9ZM14.688,4.59,4.581,14.679a7.2,7.2,0,0,0,10.107-10.1ZM13.419,3.312A7.2,7.2,0,0,0,3.312,13.419L13.419,3.312Z" fill="var(--danger-color)"/>
                    </svg>
                    <span class="text-danger">{$_('unblock_user')}</span>
                  </button>
                </li>
              {/if}
            {/if}

            <li class="timeline-menu-list__item timeline-menu-list__item--copy">
              <button class="timeline-menu-list__button" on:click={copyDid}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14.417" height="18" viewBox="0 0 14.417 18">
                  <path id="clipboard" d="M6.532,2.345a2.7,2.7,0,0,1,5.352,0l1.829.36v.9h.9a1.8,1.8,0,0,1,1.8,1.8V16.221a1.8,1.8,0,0,1-1.8,1.8H3.8a1.8,1.8,0,0,1-1.8-1.8V5.409a1.807,1.807,0,0,1,1.8-1.8h.9v-.9l1.829-.36ZM4.7,5.409H3.8V16.221H14.615V5.409h-.9v.9H4.7Zm4.505-1.8a.9.9,0,1,0-.9-.9A.9.9,0,0,0,9.208,3.606Z" transform="translate(-2 -0.023)" fill="var(--text-color-3)"/>
                </svg>
                <span>{$_('copy_did')}</span>
              </button>
            </li>
          </ul>
        </Menu>
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
    .profile-banner {
        border-radius: 20px;
        overflow: hidden;
        margin-bottom: 30px;

        @media (max-width: 767px) {
            border-radius: 10px;
            margin-bottom: 20px;
        }
    }

    .profile-banner img {
        width: 100%;
        height: auto;
    }

    .profile-column {
        display: grid;
        grid-template-columns: 112px 1fr;
        align-items: flex-start;
        gap: 30px;
        position: relative;

        @media (max-width: 767px) {
            grid-template-columns: 75px 1fr;
            gap: 15px;
        }
    }

    .profile-content {
        word-break: break-all;
    }

    .profile-avatar {
        aspect-ratio: 1 / 1;
        width: 100%;
        border-radius: 50%;
        overflow: hidden;
        background-color: var(--primary-color);
    }

    .profile-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .profile-display-name {
        font-size: 30px;
        margin-bottom: 2px;
        line-height: 1.5;
        letter-spacing: .025em;
        padding-right: 210px;

        @media (max-width: 767px) {
            font-size: 24px;
            padding-right: 50px;
        }
    }

    .profile-handle {
        font-size: 16px;

        @media (max-width: 767px) {
            padding-right: 50px;
        }
    }

    .profile-description {
        margin-top: 10px;

        &__text {
            line-height: 1.75;
            white-space: pre-line;
        }
    }

    .profile-relationship {
        font-size: 18px;
        font-weight: 600;
        line-height: 1.5;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0 15px;
        margin-top: 6px;

        &__by {
            font-weight: 400;
            font-size: 15px;
        }
    }

    .profile-follow-button {
        position: absolute;
        top: 0;
        right: 50px;

        @media (max-width: 767px) {
            position: static;
            margin-top: 10px;
        }
    }

    .profile-first {
        color: var(--text-color-3);
        font-size: 14px;
        margin-top: 5px;

        a {
            color: inherit;
        }
    }

    .profile-menu-wrap {
        position: absolute;
        top: 0;
        right: 0;
    }

    .profile-muted {
        background-color: var(--bg-color-2);
        padding: 10px;
        color: var(--text-color-3);
        margin-bottom: 15px;
        border-radius: 6px;
        border: 1px solid var(--border-color-1);
    }

    .profile-reported {
        background-color: var(--danger-color);
        color: #fff;
        font-weight: 600;
        padding: 10px;
        border-radius: 6px;
        margin-bottom: 15px;
        display: flex;
        gap: 0 5px;
        font-size: 18px;

        @media (max-width: 767px) {
            font-size: 15px;
            display: block;
        }

        &__name {
            display: flex;
            align-items: center;
            gap: 0 4px;
            white-space: nowrap;

            @media (max-width: 767px) {
                white-space: normal;
            }

            svg {
                margin-top: 2px;
                flex-shrink: 0;
            }
        }

        &__content {
            @media (max-width: 767px) {
                margin-left: 25px;
            }
        }
    }
</style>