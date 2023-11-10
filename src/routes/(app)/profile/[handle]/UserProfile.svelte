<script lang="ts">
import {createEventDispatcher} from 'svelte';
import {_} from 'svelte-i18n';
import {agent, userLists} from '$lib/stores';
import {getTextArray, isUriLocal} from '$lib/richtext';
import {page} from '$app/stores';
import {format, parseISO} from 'date-fns';
import ProfileCardWrapper from '../../ProfileCardWrapper.svelte';
import toast from 'svelte-french-toast';
import {RichText} from '@atproto/api';
import addSingleList from "$lib/components/list/addSingleList";
const dispatch = createEventDispatcher();

export let handle;
export let profile = getProfile(handle);

let currentPage = 'posts';
let firstPostDate = '';
let firstPostUri = '';
let isMenuOpen = false;
let textArray;
let unique = Symbol();
let serviceHost = '';
getServiceHost()
    .then(value => {
        serviceHost = value;
    })
    .catch(e => {
        serviceHost = '';
    });

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
    firstPostUri = '/profile/' + handle + '/post/' + firstPost.data.records[0].uri.split('/').slice(-1)[0];
}

async function getProfile(handle) {
    if (!handle) {
        return false;
    }

    const res = await $agent.agent.api.app.bsky.actor.getProfile({actor: handle});
    profile = res.data;
}

async function getServiceHost() {
    const res = await fetch('https://plc.directory/' + profile.did);
    const json = await res.json();
    return json?.service[0]?.serviceEndpoint;
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

function handleAddSingleList() {
    try {
        const lists = addSingleList(profile.displayName || profile.handle, profile.did, $agent.did());
        userLists.set(lists);
        toast.success($_('success_add_single_list'));
    } catch (e) {

    }
}
</script>

{#if (profile.did)}
  <div class="user-profile">
    {#if (profile.banner)}
      <div class="profile-banner">
        <img src="{profile.banner}" alt="" width="740" height="247">
      </div>
    {/if}

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
          <p class="profile-handle">@{profile.handle}</p>
        {/if}

        {#if (serviceHost)}
            <p class="profile-handle profile-handle--service"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-database"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>{serviceHost}</p>
        {/if}
      </div>
    </div>

    <div class="profile-detail">
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
    </div>
  </div>
{/if}

<style lang="postcss">
    .user-profile {

    }

    .profile-banner {
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 16px;

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
        grid-template-columns: 80px 1fr;
        align-items: flex-start;
        gap: 16px;
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
        font-size: 24px;
        margin-bottom: 2px;
        line-height: 1.5;
        letter-spacing: .025em;
        font-weight: 900;
        margin-top: 2px;

        @media (max-width: 767px) {
            font-size: 18px;
        }
    }

    .profile-handle {
        font-size: 16px;
        color: var(--text-color-3);
        font-weight: bold;

        @media (max-width: 767px) {
            padding-right: 50px;
        }

        &--service {
            font-size: 14px;
            font-weight: normal;
            margin-top: 4px;
            display: grid;
            grid-template-columns: 16px 1fr;
            gap: 4px;
            align-items: flex-start;
            line-height: 1.2;
        }
    }

    .profile-detail {
        margin-top: 16px;
    }

    .profile-description {
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

    .profile-first {
        color: var(--text-color-3);
        font-size: 14px;
        margin-top: 5px;

        a {
            color: inherit;
        }
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