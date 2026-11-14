<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import MessageCirclePlus from '@lucide/svelte/icons/message-circle-plus';
    import Search from '@lucide/svelte/icons/search';
    import X from '@lucide/svelte/icons/x';
    import { _ } from 'tokimeki-i18n';
    import {agent, settings} from '$lib/stores';
    import { page } from '$app/stores';
    import type { LayoutData } from './$types';
    import UserProfile from "./UserProfile.svelte";
    import type { Snapshot } from './$types';
    import UserFollowButton from "./UserFollowButton.svelte";
    import ProfileMenu from "$lib/components/profile/ProfileMenu.svelte";
    import PageModal from "$lib/components/ui/PageModal.svelte";
    import LabelerLabelList from "$lib/components/labeler/LabelerLabelList.svelte";
    import LabelerSubscribeButton from "$lib/components/labeler/LabelerSubscribeButton.svelte";
    import {beforeNavigate, goto} from "$app/navigation";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import {getConvoName} from "$lib/components/chat/convoUtil";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import {toast} from "svelte-sonner";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import AvatarAgentsSelector from "$lib/components/acp/AvatarAgentsSelector.svelte";
    import {setAgentContext} from "./state.svelte";
    import {AUTHOR_MODES, setProfileRefreshContext, type AuthorMode} from "$lib/classes/profileRefreshContext.svelte";
    import Refresher from "$lib/components/utils/Refresher.svelte";
    import {profileHintState} from "$lib/classes/profileHintState.svelte";
    import {onDestroy, untrack} from "svelte";
    import {shortcutManager} from "$lib/keyboard/shortcutManager.svelte";
    import {
        ProfileEditSession,
        applySavedOverlay,
        isSavedOverlaySettled,
        mergeSavedOverlay,
        savedOverlayUrls,
        type ProfileEditResult,
    } from "$lib/profile/profileEdit.svelte";
    import {ProfileAtmosphereState} from "$lib/atmosphere/profileAtmosphere.svelte";
    import {junkScrollRoot} from "$lib/components/virtual/junkScrollRoot.svelte";
    import UserNotification from "./UserNotification.svelte";
    import StatusEditModal from "$lib/components/profile/StatusEditModal.svelte";
    import Radio from '@lucide/svelte/icons/radio';
    import ProfileTabs from "$lib/components/profile/ProfileTabs.svelte";
    import {profileTabKeys, profileTabOf, type ProfileTabKey, type ProfileTabMenu} from "$lib/profile/profileTabs";
    import {findPageScrollRoot, smoothScrollToTopGuarded} from "$lib/components/virtual/scroll-helpers";

    const junkColumnState = getColumnState(true);

    interface Props {
        data: LayoutData;
    }

    let { data, children }: Props = $props();

    let profile = $state<any>();
    let isLabeler = $state(false);
    let handle = $derived($page.params.handle);
    let _agent = $state($agent);
    let agentContext = setAgentContext(_agent);
    let profileRefreshContext = setProfileRefreshContext();
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
                case 'starterpack':
                    return 'starterpack';
                case 'blog':
                    return 'blog';
                case 'search':
                    return 'search';
                default:
                    return 'posts';
            }
        } catch (e) {
            return 'posts';
        }
    });
    let edit = $state<ProfileEditSession>();
    let atmosphere = $state<ProfileAtmosphereState>();
    let isProfileOut = $state(false);
    let isSearchOpen = $state(false);
    let searchText = $state('');
    const SPLIT_LEFT_MIN = 350;
    let canSplit = $state(false);
    const isSplit = $derived(canSplit && $settings.design?.layout === 'decks' && !isLabeler);
    const isMiniShown = $derived(isProfileOut && !isSplit && !!profile);
    const isSearching = $derived(isSearchOpen || currentPage === 'search');
    const showBlogTab = $derived(currentPage === 'blog' || !!$settings?.general?.disableAtmosphere || !!atmosphere?.has('site.mochott.article'));
    let savedOverlay = $state.raw<{ did: string; result: ProfileEditResult }>();
    const shownProfile = $derived(profile && savedOverlay && savedOverlay.did === profile.did ? applySavedOverlay(profile, savedOverlay.result) : profile);
    let isStatusEditOpen = $state(false);
    const TAB_LABELS: Record<ProfileTabKey, string> = {
        posts: 'posts',
        follow: 'follows',
        media: 'media',
        likes: 'likes',
        feed: 'feeds',
        lists: 'lists',
        blog: 'blog',
        starterpack: 'starter_packs',
    };
    const AUTHOR_MODE_LABELS: Record<AuthorMode, string> = {
        all: 'profile_posts_nav_all',
        filtered: 'profile_posts_nav_filtered',
        replies: 'profile_posts_nav_reply',
        reposts: 'profile_posts_nav_repost',
    };
    const activeTab = $derived(profileTabOf(currentPage));
    const activeMenu = $derived.by((): { label?: string; menu: ProfileTabMenu } | undefined => {
        const column = profileRefreshContext.column;
        const base = `/profile/${data.params.handle}`;
        const actions: ProfileTabMenu['actions'] = [];
        if (column) {
            actions.push({ key: 'refresh', label: $_('refresh'), run: column.refresh });
            if (column.canAdd) {
                actions.push({ key: 'add', label: $_('add_thread_column'), disabled: column.isAdded, run: column.add });
            }
        }

        if (activeTab === 'posts' && column?.authorMode) {
            const mode = column.authorMode;
            return {
                label: mode === 'all' ? undefined : $_(AUTHOR_MODE_LABELS[mode]),
                menu: { options: AUTHOR_MODES.map((key) => ({ key, label: $_(AUTHOR_MODE_LABELS[key]), selected: key === mode, select: () => column.setAuthorMode(key) })), actions },
            };
        }
        if (activeTab === 'media') {
            return {
                label: currentPage === 'video' ? $_('video') : undefined,
                menu: {
                    options: [
                        { key: 'media', label: $_('profile_posts_nav_all'), selected: currentPage === 'media', href: `${base}/media` },
                        { key: 'video', label: $_('video'), selected: currentPage === 'video', href: `${base}/video` },
                    ],
                    actions,
                },
            };
        }
        if (activeTab === 'follow') {
            return {
                label: currentPage === 'follower' ? $_('followers') : undefined,
                menu: {
                    options: [
                        { key: 'follow', label: $_('follows'), selected: currentPage === 'follow', href: `${base}/follow` },
                        { key: 'follower', label: $_('followers'), selected: currentPage === 'follower', href: `${base}/follower` },
                    ],
                    actions: [],
                },
            };
        }
        return actions.length ? { menu: { options: [], actions } } : undefined;
    });
    const tabs = $derived(profileTabKeys({
        profile,
        current: currentPage,
        isLabeler,
        isMe: !!profile && profile.did === _agent.did(),
        hasBlog: showBlogTab,
    }).map((key) => ({
        key,
        label: (key === activeTab && activeMenu?.label) || $_(TAB_LABELS[key]),
        href: `/profile/${data.params.handle}/${key === 'posts' ? '' : key}`,
        menu: key === activeTab ? activeMenu?.menu : undefined,
    })));

    $effect(() => {
        getProfile(handle, true);
    });

    export const snapshot: Snapshot = {
        capture: () => [profile],
        restore: (value) => {
            [profile] = value;
        }
    };

    function ensureAtmosphere(target: { did?: string; handle?: string } | undefined) {
        if (!target?.did || !target.handle || atmosphere?.did === target.did) {
            return;
        }
        atmosphere = new ProfileAtmosphereState(target.did, target.handle, {
            detect: !$settings?.general?.disableAtmosphere,
            viewerDid: _agent.did(),
            getPostText: async (uri) => {
                const res = await _agent.xrpc.get('app.bsky.feed.getPosts', { uris: [uri] });
                return res?.posts?.[0]?.record?.text;
            },
        });
    }

    function getProfile(handle, clear = true) {
        untrack(() => {
            if (profileHintState.hasProfile(handle)) {
                profile = $state.snapshot(profileHintState.profile);
                profileHintState.clear();
                isLabeler = !!profile?.associated?.labeler;
                ensureAtmosphere(profile);
            } else if (clear && profile && profile.handle !== handle && profile.did !== handle) {
                profile = undefined;
                isLabeler = false;
                atmosphere = undefined;
            }
        })

        return _agent.xrpc.get('app.bsky.actor.getProfile', {actor: handle})
            .then(res => {
                profile = res
                isLabeler = !!profile?.associated?.labeler;
                ensureAtmosphere(res);

                if (savedOverlay && savedOverlay.did === res.did && isSavedOverlaySettled(res, savedOverlay.result)) {
                    releaseUrls(savedOverlayUrls(savedOverlay.result));
                    savedOverlay = undefined;
                }
            })
    }

    function observeProfileCard(node: HTMLElement) {
        const observer = new IntersectionObserver((entries) => {
            isProfileOut = !entries[entries.length - 1].isIntersecting;
        }, { rootMargin: '-52px 0px 0px 0px' });
        observer.observe(node);
        return () => {
            observer.disconnect();
            isProfileOut = false;
        };
    }

    function openSearch() {
        searchText = currentPage === 'search' ? ($page.url.searchParams.get('q') ?? '') : '';
        isSearchOpen = true;
    }

    function closeSearch() {
        isSearchOpen = false;
        if (currentPage === 'search') {
            goto(`/profile/${data.params.handle}/`, { noScroll: true });
        }
    }

    function submitSearch(e: SubmitEvent) {
        e.preventDefault();
        const query = searchText.trim();
        if (!query) {
            return;
        }
        goto(`/profile/${data.params.handle}/search?q=${encodeURIComponent(query)}`, { noScroll: true, keepFocus: true });
    }

    function scrollToTop() {
        const root = $settings.design?.layout === 'decks' ? findPageScrollRoot() : document.documentElement;
        if (root && (root === document.documentElement ? window.scrollY : root.scrollTop) > 0) {
            smoothScrollToTopGuarded(root);
        }
    }

    function focusOnMount(node: HTMLInputElement) {
        node.focus();
    }

    function markScrollRoot(active: boolean) {
        return (node: HTMLElement) => {
            junkScrollRoot.mark(node, active);
        };
    }

    function observeAvailableWidth(node: HTMLElement) {
        const host = node.closest('.modal-page');
        if (!(host instanceof HTMLElement)) {
            return;
        }
        const column = parseFloat(getComputedStyle(node).getPropertyValue('--deck-m-width')) || 400;
        const update = () => {
            canSplit = host.clientWidth >= SPLIT_LEFT_MIN + column;
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(host);
        return () => observer.disconnect();
    }

    function releaseUrls(urls: readonly string[], keep: readonly string[] = []) {
        for (const url of urls) {
            if (!keep.includes(url)) {
                URL.revokeObjectURL(url);
            }
        }
    }

    let stopEditEscape: (() => void) | undefined;

    function startEdit() {
        edit = new ProfileEditSession(shownProfile, _agent);
        stopEditEscape = shortcutManager.provide('profile.edit.cancel', () => {
            if (edit?.isConfirmingDiscard) {
                edit.isConfirmingDiscard = false;
            } else {
                cancelEdit();
            }
            return true;
        });
    }

    function closeEdit() {
        stopEditEscape?.();
        stopEditEscape = undefined;
        edit?.dispose(savedOverlayUrls(savedOverlay?.result));
        edit = undefined;
    }

    function cancelEdit() {
        if (!edit || edit.isSaving) {
            return;
        }
        if (edit.isDirty) {
            edit.isConfirmingDiscard = true;
            return;
        }
        closeEdit();
    }

    async function saveEdit() {
        const session = edit;
        if (!session) {
            return;
        }
        const result = await session.save();
        if (!result || edit !== session) {
            return;
        }
        const previous = savedOverlay && savedOverlay.did === session.did ? savedOverlay.result : undefined;
        const next = mergeSavedOverlay(previous, result);
        releaseUrls(savedOverlayUrls(savedOverlay?.result), savedOverlayUrls(next));
        savedOverlay = { did: session.did, result: next };
        closeEdit();
        handleRefresh();
    }

    function handleWindowKeydown(e: KeyboardEvent) {
        if (!edit || e.isComposing || e.key !== 'Enter' || !(e.ctrlKey || e.metaKey)) {
            return;
        }
        if (!(e.target instanceof Element) || !e.target.closest('.user-profile')) {
            return;
        }
        e.preventDefault();
        saveEdit();
    }

    beforeNavigate((navigation) => {
        if (edit?.isDirty) {
            navigation.cancel();
            if (!navigation.willUnload) {
                edit.isConfirmingDiscard = true;
            }
            return;
        }
        if (edit) {
            closeEdit();
        }
        if (isSearchOpen && navigation.to?.url.pathname.split('/')[3] !== 'search') {
            isSearchOpen = false;
        }
    });

    onDestroy(() => {
        closeEdit();
        releaseUrls(savedOverlayUrls(savedOverlay?.result));
    });

    function handleRefresh() {
        getProfile(handle, false);
    }

    async function handlePullRefresh(event: { complete: () => void }) {
        try {
            await Promise.all([
                getProfile(handle, false),
                profileRefreshContext.refresh?.(),
            ]);
        } catch (e) {
            console.error(e);
        } finally {
            event.complete();
        }
    }

    async function chatBegin() {
        try {
            const res = await _agent.xrpc.get('chat.bsky.convo.getConvoForMembers',
                {
                    members: [_agent.did(), profile.did as string]
                },
                {
                    headers: {
                        'atproto-proxy': CHAT_PROXY,
                    }
                }
              );

            const convo = res.convo;

            if (!junkColumnState.hasColumn('chat_' + convo.id)) {
                junkColumnState.add({
                    id: 'chat_' + convo.id,
                    algorithm: {
                        id: convo.id,
                        type: 'chat',
                        name: getConvoName(convo, _agent.did()),
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

<svelte:window onkeydown={handleWindowKeydown} />

{#key handle}
  <PageModal>
    <section class={['page', 'profile', isSplit && 'profile--split']} {@attach observeAvailableWidth}>
      <div class="column-heading">
        {#if edit}
          {#if edit.isConfirmingDiscard}
            <p class="profile-edit-confirm">{$_('profile_edit_discard_confirm')}</p>

            <div class="column-heading__buttons column-heading__buttons--right">
              <button class="button button--sm button--border button--danger" onclick={closeEdit}>{$_('profile_edit_discard')}</button>
              <button class="button button--sm" onclick={() => { if (edit) edit.isConfirmingDiscard = false; }}>{$_('profile_edit_back')}</button>
            </div>
          {:else}
            <div class="column-heading__buttons">
              <button class="button button--sm button--border" onclick={cancelEdit} disabled={edit.isSaving}>{$_('edit_cancel_button')}</button>
            </div>

            <div class="column-heading__buttons column-heading__buttons--right">
              <button class="button button--sm" onclick={saveEdit} disabled={!edit.canSave}>{$_('save_button')}</button>
            </div>
          {/if}
        {:else}
        {#if profile}
          <div class="column-heading__buttons">
            <button class="settings-back" onclick={() => {history.back()}}>
              <ArrowLeft color="var(--text-color-1)" />
            </button>
          </div>

          <div class="column-heading__selector">
            <AvatarAgentsSelector
                {_agent}
                onselect={(agent) => {agentContext.agent = agent; _agent = agent;}}
            ></AvatarAgentsSelector>
          </div>

          <div class={['profile-mini', isMiniShown && 'profile-mini--shown']} inert={!isMiniShown}>
            {#if shownProfile.avatar}
              <img class="profile-mini__avatar" src={shownProfile.avatar} alt="" width="28" height="28">
            {/if}

            <span class="profile-mini__name">{shownProfile.displayName || shownProfile.handle}</span>

            {#if (profile.did !== _agent.did() && !isLabeler && !profile.viewer?.following)}
              <UserFollowButton following={profile.viewer?.following} user={profile} {_agent} style="tiny"></UserFollowButton>
            {/if}
          </div>

          <div class="column-heading__buttons column-heading__buttons--right">
            {#if (profile.did !== _agent.did() && !isLabeler)}
              {#if !$settings?.general?.disableChat}
                <button class="profile-heading-button" onclick={chatBegin}>
                  <MessageCirclePlus size={20} color="var(--text-color-1)" />
                </button>
              {/if}

            {:else if (isLabeler && profile?.did)}

            {:else}
              <div class="profile-follow-button profile-follow-button--me">
                <button class="button button--sm" onclick={startEdit}>{$_('edit_profile_button')}</button>
              </div>

              <button class="profile-heading-button" onclick={() => {isStatusEditOpen = !isStatusEditOpen}}>
                <Radio size="20" color="var(--text-color-1)"></Radio>
              </button>

              {#if isStatusEditOpen}
                <StatusEditModal {_agent} onclose={() => {isStatusEditOpen = false; handleRefresh()}}></StatusEditModal>
              {/if}

            {/if}

            <ProfileMenu {handle} {profile} onrefresh={handleRefresh}></ProfileMenu>
          </div>
        {/if}

        <a class="settings-back" href="/">
          <X color="var(--text-color-1)" />
        </a>
        {/if}
      </div>

      <Refresher
          onrefresh={handlePullRefresh}
          refresherHeight={80}
          pullMin={80}
          pullMax={160}
          disabled={$settings.design?.layout === 'default' || isSplit}
      >
        <div class="profile-split">
        <div class="profile-split__left">
        <div class="user-profile-wrap" {@attach observeProfileCard}>
        {#if profile}
          <UserProfile profile={shownProfile} {isLabeler} {_agent} {edit} {atmosphere} stacked={isSplit}>
            {#if (profile.did !== _agent.did() && !isLabeler)}
              <div class="user-profile-buttons">
                <UserFollowButton following={profile.viewer?.following} user={profile} {_agent}></UserFollowButton>
                <UserNotification {_agent} {profile} onupdate={(v) => {profile.viewer.activitySubscription = v}}></UserNotification>
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
        </div>

        <div class={['profile-split__right', isSearching && 'profile-split__right--search']} {@attach markScrollRoot(isSplit)}>
        <div class="profile-nav">
          {#if isSearching}
            <form class="profile-search" role="search" onsubmit={submitSearch}>
              <Search size={18} color="var(--text-color-3)" />
              <input
                  class="profile-search__input"
                  type="text"
                  inputmode="search"
                  enterkeyhint="search"
                  bind:value={searchText}
                  placeholder={$_('search')}
                  aria-label={$_('search')}
                  {@attach focusOnMount}
              >
              <button class="profile-search__close" type="button" onclick={closeSearch} aria-label={$_('cancel')}>
                <X size={18} color="var(--text-color-1)" />
              </button>
            </form>
          {:else}
            <ProfileTabs {tabs} current={activeTab} onsearch={openSearch} onreselect={scrollToTop}></ProfileTabs>
          {/if}
        </div>

        {#key agentContext.agent}
          {@render children?.()}
        {/key}
        </div>
        </div>
      </Refresher>
    </section>
  </PageModal>
{/key}

<style lang="postcss">
    .user-profile-wrap {
        padding: 16px;
    }

    .profile--split {
        display: flex;
        flex-direction: column;
        height: 100%;

        :global(.svelte-refresher-host) {
            flex: 1;
            min-height: 0;
        }

        :global(.refresher-content) {
            height: 100%;
        }

        .profile-split {
            display: grid;
            grid-template-columns: minmax(0, 1fr) var(--deck-m-width, 400px);
            height: 100%;
        }

        .profile-split__left,
        .profile-split__right {
            min-width: 0;
            overscroll-behavior: contain;
            scrollbar-color: var(--scroll-bar-color) var(--scroll-bar-bg-color);
            scrollbar-width: thin;
        }

        .profile-split__left {
            overflow-y: auto;
        }

        .profile-split__right {
            overflow-y: scroll;
            border-left: 1px solid var(--border-color-2);
        }

        .profile-nav {
            top: 0;
        }
    }

    :global(.layout-decks .modal-page:has(.profile--split)) {
        --modal-page-width: calc(500px + var(--deck-m-width, 400px));
    }

    :global(.layout-decks .modal-page-content:has(> .profile--split)) {
        overflow: hidden;
    }

    .profile-edit-confirm {
        font-size: 14px;
        font-weight: bold;
        line-height: 1.4;
    }

    .user-profile-labeler-wrap {
        margin-top: 16px;
    }

    .profile-heading-button {
        width: 36px;
        height: 36px;
        display: grid;
        place-content: center;
        border-radius: var(--radius-round, 50%);
        background-color: var(--bg-color-2);
        transition: background-color var(--motion-duration-hover, .2s) var(--motion-easing-hover, ease-in-out);

        &:hover {
            background-color: var(--state-hover, var(--border-color-1));
        }
    }

    .profile-nav {
        position: sticky;
        top: var(--deck-heading-height, 52px);
        z-index: 10;
        height: 45px;
        border-bottom: 1px solid var(--border-color-2);
        background-color: var(--bg-color-1);
    }

    .profile-split__right :global(.deck-row--junk > .deck-heading) {
        display: none;
    }

    .profile-split__right--search :global(.deck-row--junk > .deck-heading) {
        display: flex;
        position: static;
        height: 48px;
        border-bottom: none;
        background: none;
        backdrop-filter: none;
    }

    .user-profile-buttons {
        display: flex;
        gap: 8px;
    }

    .profile-search {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 100%;
        padding: 0 6px 0 16px;
        font-size: 14px;

        &__input {
            flex: 1;
            min-width: 0;
            height: 100%;
            padding: 0;
            border: none;
            background: none;
            color: var(--text-color-1);
            font: inherit;
            font-weight: normal;
            line-height: inherit;

            &:focus {
                outline: none;
            }
        }

        &__close {
            display: grid;
            place-content: center;
            width: 32px;
            height: 32px;
            border-radius: var(--radius-round, 50%);

            &:hover {
                background-color: var(--state-hover, var(--border-color-1));
            }
        }
    }

    .profile-mini {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
        opacity: 0;
        transition: opacity var(--motion-duration-hover, .2s) var(--motion-easing-hover, ease-in-out);

        &--shown {
            opacity: 1;
        }

        &__avatar {
            flex: none;
            width: 28px;
            height: 28px;
            border-radius: var(--avatar-border-radius, 50%);
            object-fit: cover;
        }

        &__name {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 15px;
            font-weight: bold;
        }

        @media (prefers-reduced-motion: reduce) {
            transition: none;
        }
    }
</style>
