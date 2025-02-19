<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {agent, settings} from '$lib/stores';
    import { page } from '$app/stores';
    import type { LayoutData } from './$types';
    import UserProfile from "./UserProfile.svelte";
    import type { Snapshot } from './$types';
    import UserFollowButton from "./UserFollowButton.svelte";
    import UserEdit from "./UserEdit.svelte";
    import ProfileMenu from "$lib/components/profile/ProfileMenu.svelte";
    import PageModal from "$lib/components/ui/PageModal.svelte";
    import LabelerLabelList from "$lib/components/labeler/LabelerLabelList.svelte";
    import LabelerSubscribeButton from "$lib/components/labeler/LabelerSubscribeButton.svelte";
    import {goto} from "$app/navigation";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import {toast} from "svelte-sonner";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import AvatarAgentsSelector from "$lib/components/acp/AvatarAgentsSelector.svelte";
    import {setAgentContext} from "./state.svelte";
    import {profileHintState} from "$lib/classes/profileHintState.svelte";
    import {untrack} from "svelte";
    import UserNotification from "./UserNotification.svelte";

    const junkColumnState = getColumnState(true);

    interface Props {
        data: LayoutData;
    }

    let { data, children }: Props = $props();

    let profile = $state();
    let isLabeler = $state(false);
    let handle = $derived($page.params.handle);
    let _agent = $state($agent);
    let agentContext = setAgentContext(_agent);
    let currentPage = $derived.by(() => {
        try {
            const paths = data.url.pathname.split('/');

            switch (paths[3]) {
                case 'follow':
                    return 'follow';
                case 'follower':
                    return 'follower';
                case 'media':
                    return 'media';
                case 'video':
                  return 'video';
                case 'likes':
                    return 'likes';
                case 'feed':
                    return 'feed';
                case 'lists':
                    return 'lists';
                default:
                    return 'posts';
            }
        } catch (e) {
            return 'posts';
        }
    });

    $effect(() => {
        getProfile(handle, true);
    });

    export const snapshot: Snapshot = {
        capture: () => [profile],
        restore: (value) => {
            [profile] = value;
        }
    };

    function getProfile(handle, clear = true) {
        untrack(() => {
            if (clear) {
                profile = undefined;
            }

            if (profileHintState.hasProfile(handle)) {
                profile = $state.snapshot(profileHintState.profile);
                profileHintState.clear();
            }
        })

        _agent.agent.api.app.bsky.actor.getProfile({actor: handle})
            .then(res => {
                profile = res.data

                if (profile?.associated?.labeler) {
                    isLabeler = true;
                }
            })
    }

    function onProfileUpdate() {
        handleRefresh();
    }

    function handleRefresh() {
        getProfile(handle, false);
    }

    async function chatBegin() {
        try {
            const res = await _agent.agent.api.chat.bsky.convo.getConvoForMembers(
                {
                    members: [_agent.did(), profile.did as string]
                },
                {
                    headers: {
                        'atproto-proxy': CHAT_PROXY,
                    }
                }
              );

            const convo = res.data.convo;

            if (!junkColumnState.hasColumn('chat_' + convo.id)) {
                junkColumnState.add({
                    id: 'chat_' + convo.id,
                    algorithm: {
                        id: convo.id,
                        type: 'chat',
                        name: convo.members.filter(member => member.did !== _agent.did())[0].displayName || convo.members.filter(member => member.did !== _agent.did())[0].handle,
                    },
                    style: 'default',
                    settings: {
                        ...defaultDeckSettings,
                        playSound: 'notification1',
                    },
                    did: _agent.did(),
                    handle: _agent.handle(),
                    data: {
                        feed: [],
                        cursor: '',
                    }
                });
            }

            await goto(`/chat/${convo.id}`);
        } catch (e) {
            if (e.message === 'recipient has disabled incoming messages') {
                toast.error($_('error_chat_incoming_disabled'));
            } else if (e.message === 'Bad token scope') {
                toast.error($_('app_password_scope_error'));
            } else {
                console.error(e);
            }
        }
    }
</script>

{#key handle}
  <PageModal>
    <section class="page profile">
      <div class="column-heading">
        {#if profile}
          <div class="column-heading__buttons">
            <button class="settings-back" on:click={() => {history.back()}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            </button>
          </div>

          <div class="column-heading__selector">
            <AvatarAgentsSelector
                bind:_agent
                onselect={(agent) => {agentContext.agent = agent}}
            ></AvatarAgentsSelector>
          </div>

          <div class="column-heading__buttons column-heading__buttons--right">
            {#if (profile.did !== _agent.did() && !isLabeler)}
              {#if !$settings?.general?.disableChat}
                <button class="profile-heading-button" on:click={chatBegin}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle-plus"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
                </button>
              {/if}

              <a class="profile-heading-button" href="/search?q=from:{handle}%20">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </a>
            {:else if (isLabeler && profile?.did)}
              
            {:else}
              <div class="profile-follow-button profile-follow-button--me">
                <UserEdit {profile} {_agent} on:update={onProfileUpdate}></UserEdit>
              </div>

              <a class="profile-heading-button" href="/search?q=from:{handle}%20">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </a>
            {/if}

            <ProfileMenu {handle} {profile} on:refresh={handleRefresh}></ProfileMenu>
          </div>
        {/if}

        <a class="settings-back" href="/">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </a>
      </div>

      <div class="user-profile-wrap">
        {#if profile}
          <UserProfile {handle} {profile} {isLabeler} {_agent} on:refresh={handleRefresh}>
            {#if (profile.did !== _agent.did() && !isLabeler)}
              <div class="user-profile-buttons">
                <UserFollowButton following="{profile.viewer?.following}" user={profile} {_agent}></UserFollowButton>
                <UserNotification {_agent} {profile}></UserNotification>
              </div>
            {:else if (isLabeler && profile?.did)}
              <LabelerSubscribeButton did={profile.did}></LabelerSubscribeButton>
            {/if}
          </UserProfile>
        {/if}

        {#if (isLabeler && profile?.did)}
          <div class="user-profile-labeler-wrap">
            <LabelerLabelList did={profile.did}></LabelerLabelList>
          </div>
        {/if}
      </div>

      <ul class="profile-tab">
        {#if (!isLabeler)}
          <li class="profile-tab__item" class:profile-tab__item--active={currentPage === 'posts'}><a href="/profile/{data.params.handle}/" data-sveltekit-noscroll>{$_('posts')}</a></li>
          <li class="profile-tab__item" class:profile-tab__item--active={currentPage === 'follow'}><a href="/profile/{data.params.handle}/follow" data-sveltekit-noscroll>{$_('follows')}</a></li>
          <li class="profile-tab__item" class:profile-tab__item--active={currentPage === 'follower'}><a href="/profile/{data.params.handle}/follower" data-sveltekit-noscroll>{$_('followers')}</a></li>
          <li class="profile-tab__item" class:profile-tab__item--active={currentPage === 'media'}><a href="/profile/{data.params.handle}/media" data-sveltekit-noscroll>{$_('media')}</a></li>
          <li class="profile-tab__item" class:profile-tab__item--active={currentPage === 'video'}><a href="/profile/{data.params.handle}/video" data-sveltekit-noscroll>{$_('video')}</a></li>
          <li class="profile-tab__item" class:profile-tab__item--active={currentPage === 'likes'}><a href="/profile/{data.params.handle}/likes" data-sveltekit-noscroll>{$_('likes')}</a></li>
          <li class="profile-tab__item" class:profile-tab__item--active={currentPage === 'feed'}><a href="/profile/{data.params.handle}/feed" data-sveltekit-noscroll>{$_('feeds')}</a></li>
          <li class="profile-tab__item" class:profile-tab__item--active={currentPage === 'lists'}><a href="/profile/{data.params.handle}/lists" data-sveltekit-noscroll>{$_('lists')}</a></li>
        {:else}
          <li class="profile-tab__item" class:profile-tab__item--active={currentPage === 'posts'}><a href="/profile/{data.params.handle}/" data-sveltekit-noscroll>{$_('posts')}</a></li>
        {/if}
      </ul>

      {#key agentContext.agent}
        {@render children?.()}
      {/key}
    </section>
  </PageModal>
{/key}

<style lang="postcss">
    .user-profile-wrap {
        padding: 16px;
    }

    .profile-relationship__item span {
        color: var(--text-color-2);
    }

    .user-profile-labeler-wrap {
        margin-top: 16px;
    }

    .profile-heading-button {
        width: 40px;
        height: 40px;
        display: grid;
        place-content: center;
        border-radius: 50%;
        background-color: var(--bg-color-2);
        transition: background-color .2s ease-in-out;

        &:hover {
            background-color: var(--border-color-1);
        }
    }

    .profile-tab {
        position: sticky;
        top: 52px;
        z-index: 2;
        background-color: var(--bg-color-1);
    }

    .user-profile-buttons {
        display: flex;
        gap: 8px;
    }
</style>