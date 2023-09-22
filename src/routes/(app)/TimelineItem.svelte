<script lang="ts">
    import {_} from 'svelte-i18n'
    import {agent, settings, isPreventEvent, reportModal, columns, didHint, pulseDelete, isReactionButtonSettingsModalOpen, listAddModal} from '$lib/stores';
    import ja from 'date-fns/locale/ja/index';
    import en from 'date-fns/locale/en-US/index';
    import pt from 'date-fns/locale/pt-BR/index';
    import ko from 'date-fns/locale/ko/index';
    import fa from 'date-fns/locale/fa-IR/index';
    import {AppBskyFeedDefs} from '@atproto/api'
    import toast from "svelte-french-toast";
    import ProfileCardWrapper from "./ProfileCardWrapper.svelte";
    import {onMount} from "svelte";
    import Menu from "$lib/components/ui/Menu.svelte";
    import {goto} from "$app/navigation";
    import TimelineContent from "$lib/components/post/TimelineContent.svelte";
    import {translate} from "$lib/translate";
    import ReactionButtons from "$lib/components/post/ReactionButtons.svelte";
    import ReactionButtonsInMenu from "$lib/components/post/ReactionButtonsInMenu.svelte";
    import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";

    export let _agent = $agent;
    export let data: AppBskyFeedDefs.FeedViewPost;
    export let isPrivate = false;
    export let isSingle: boolean = false;
    export let isThread: boolean = false;
    export let isMedia: boolean = false;
    export let isProfile: boolean = false;
    export let column = undefined;
    export let index = 0;

    let selectionText = '';
    let dialog;
    let isDialogRender = false;

    $: {
        if (dialog) {
            dialog.open();
        }
    }

    let isMenuOpen = false;
    let dateFnsLocale: Locale;

    let isShortCutNumberShown = false;
    let isTranslated = false;

    if (!$settings.general.deleteConfirmSkip) {
        $settings.general.deleteConfirmSkip = false;
    }

    const keycodeNumbers = [
        49,
        50,
        51,
        52,
        53,
        54,
        55,
        56,
        57
    ];

    const isReasonRepost = (reason: any): reason is AppBskyFeedDefs.ReasonRepost => {
      return !!(reason as AppBskyFeedDefs.ReasonRepost)?.by;
    }

    if ($settings.general.language === 'ja' || window.navigator.language === 'ja-JP') {
        dateFnsLocale = ja;
    } else if ($settings.general.language === 'pt-BR' || window.navigator.language === 'pt-BR') {
        dateFnsLocale = pt;
    } else if ($settings.general.language === 'ko' || window.navigator.language === 'ko-KR') {
        dateFnsLocale = ko;
    } else if ($settings.general.language === 'fa' || window.navigator.language === 'fa-IR') {
        dateFnsLocale = fa;
    } else {
        dateFnsLocale = en;
    }

    if (data.reply && !data.reply?.parent) {
        delete data.reply;
    }

    let isHide;
    let isReplyHide;

    let hideReply = column && column.settings?.timeline.hideReply
                  ? column.settings?.timeline.hideReply
                  : $settings.timeline?.hideReply || 'all';

    let hideRepost = column && column.settings?.timeline.hideRepost
            ? column.settings?.timeline.hideRepost
            : $settings.timeline?.hideRepost || 'all';

    function probability(n) {
      return Math.random() < n / 100;
    }

    $: handlePostDelete($pulseDelete);

    function handlePostDelete(uri) {
        if (uri === data.post.uri) {
            isHide = true;
        }
    }

    onMount(() => {
        if (data.post.author.did !== _agent.did()) {
          switch (hideReply) {
            case 'all':
              break;
            case 'following':
              if (data.reply && (data.reply.parent.author.did !== _agent.did() && !data.reply?.parent.author.viewer.following)) {
                isHide = true;
              }
              break;
            case 'me':
              if (data.reply && data.reply.parent.author.did !== _agent.did()) {
                isHide = true;
              }
              break;
            default:
          }
        }

        if (isReasonRepost(data.reason)) {
          switch (hideRepost) {
            case 'all':
              break;
            case 'many':
              if (probability(25)) {
                isHide = true;
              }
              break;
            case 'soso':
              if (probability(50)) {
                isHide = true;
              }
              break;
            case 'less':
              if (probability(75)) {
                isHide = true;
              }
              break;
            case 'none':
              isHide = true;
              break;
            default:
          }
        }

        const langFilter = column && column.settings?.langFilterEnabled ? column.settings.langFilter : $settings.langFilter;
        if (langFilter && langFilter.length && data.post.record.langs) {
            const isLangMatched = langFilter.some(lang => data.post.record.langs.includes(lang));

            if (!isLangMatched) {
                isHide = true;
            }
        }
    })

    async function translation() {
        ({ text: data.post.record.text, facets: data.post.record.facets } = await translate(data.post.record.text, $settings.general?.language, _agent));

        if (data.reply && !isSingle) {
            ({ text: data.reply.parent.record.text, facets: data.reply.parent.record.facets } = await translate(data.reply.parent.record.text, $settings.general?.language, _agent));
        }

        isMenuOpen = false;
        isTranslated = true;
    }

    function copyThreadUrl() {
        const url = 'https://bsky.app/profile/' + data.post.author.handle + '/post/' + data.post.uri.split('/').slice(-1)[0];

        navigator.clipboard.writeText(url)
            .then(() => {
                toast.success($_('success_copy_url'));
            }, () => {
                toast.error($_('failed_copy'));
            });

        isMenuOpen = false;
    }

    function copyHandle() {
        const handle = '@' + data.post.author.handle;

        navigator.clipboard.writeText(handle)
            .then(() => {
                toast.success($_('success_copy_handle'));
            }, () => {
                toast.success($_('failed_copy'));
            });

        isMenuOpen = false;
    }

    async function deletePost(uri: string) {
        const rkey = uri.split('/').slice(-1)[0];
        isMenuOpen = false;

        try {
            await _agent.agent.api.app.bsky.feed.post.delete(
                {repo: _agent.did(), rkey: rkey}
            );

            pulseDelete.set(data.post.uri);

            toast.success($_('post_delete_success'));
        } catch (e) {
            toast.error($_('post_delete_failed') + ': ' + e);
        }
    }

    function deletePostStep() {
        if ($settings.general.deleteConfirmSkip) {
            deletePost(data.post.uri)
        } else {
            isDialogRender = true;
        }
    }

    let keys = [];

    function handleKeydown(event) {
        isShortCutNumberShown = !!(event.ctrlKey && event.altKey);
        keys.push(event.keyCode);
    }

    function handleKeyup(event) {
        /*
        isShortCutNumberShown = !!(event.ctrlKey && event.altKey);
        const likeKey = 76;
        const repostKey = 83;
        const replyKey = 77;
        const keysString = keys.sort((a, b) => a - b).toString();

        const likeKeysString = [17, 18, likeKey, keycodeNumbers[index]].sort((a, b) => a - b).toString();
        const repostKeysString = [17, 18, repostKey, keycodeNumbers[index]].sort((a, b) => a - b).toString();
        const replyKeysString = [17, 18, replyKey, keycodeNumbers[index]].sort((a, b) => a - b).toString();

        if (keysString === likeKeysString) {
            voteFunc(data.post.cid, data.post.uri, data.post.viewer?.like);
        }

        if (keysString === repostKeysString) {
            repostFunc(data.post.cid, data.post.uri, data.post.viewer?.repost)
        }

        if (keysString === replyKeysString) {
            replyFunc(data.post, data.post.record.reply);
        }

        keys = [];

        */
    }

    function handleClick(event) {
        if (event.target.closest('button') || event.target.closest('.profile-card') || event.target.closest('a') || event.target.closest('.timeline-external') || event.target.closest('.likes-wrap') || event.target.closest('.dialog-modal')) {
            return false;
        }

        if (selectionText) {
            return false;
        }

        if ($isPreventEvent) {
            isPreventEvent.set(false);
            return false;
        }

        const uri = '/profile/' + data.post.author.handle + '/post/' + data.post.uri.split('/').slice(-1)[0];

        if (uri === location.pathname) {
            return false;
        }

        didHint.set(data.post.author.did);
        goto(uri);
    }

    function handleSelectStart(event) {
        selectionText = document.getSelection().toString();
    }

    async function addThreadColumn() {
        const uri = data.post.uri;

        if (uri === column.algorithm?.algorithm) {
            isMenuOpen = false;
            toast.success('Already');
            return false;
        }

        $columns = [...$columns, {
            id: self.crypto.randomUUID(),
            algorithm: {
                type: 'thread',
                algorithm: uri,
                name: 'Thread',
            },
            style: 'default',
            did: _agent.did(),
            handle: _agent.handle(),
        }];

        setTimeout(() => {
            document.querySelector('.deck').scrollLeft = 9999;
        }, 0);

        isMenuOpen = false;
    }

    function report() {
      $reportModal = {
        open: true,
        data: {
          uri: data.post.uri,
          cid: data.post.cid,
        }
      }
    }

    function handleLike(event) {
        data.post.likeCount = event.detail.count;
        data.post.viewer.like = event.detail.viewer;
    }

    function handleRepost(event) {
        data.post.repostCount = event.detail.count;
        data.post.viewer.repost = event.detail.viewer;
    }
</script>

<svelte:window on:keydown={handleKeydown} on:keyup={handleKeyup} />
<svelte:document on:selectionchange={handleSelectStart} />

{#if (!isHide)}
  <article class="timeline__item"
           class:timeline__item--repost={isReasonRepost(data.reason)}
           class:timeline__item--reply={data.reply && data.reply.parent.author.did !== _agent.did()}
           class:timeline__item--compact={$settings?.design.postsLayout === 'compact' || $settings?.design.postsLayout === 'minimum'}
           class:timeline__item--minimum={$settings?.design.postsLayout === 'minimum'}
           on:click={handleClick}
  >
    {#if (isShortCutNumberShown && index < 9)}
      <p class="timeline-shortcut-number">{index + 1}</p>
    {/if}

    <div class="timeline-repost-messages">
      {#if (isReasonRepost(data.reason))}
        <p class="timeline-repost-message">
          <ProfileCardWrapper handle="{data.reason.by.handle}" {_agent}>
            <a href="/profile/{data.reason.by.handle}"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat-2"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>{$_('reposted_by', {values: {name: data.reason.by.displayName || data.reason.by.handle}})}</a>
          </ProfileCardWrapper>
        </p>
      {/if}
    </div>

    {#if (data.reply && !isSingle && !isReplyHide)}
      <div class="timeline__column timeline__column--reply">
        {#if (data.reply.parent.uri !== data.reply.root.uri)}
          <span class="timeline-reply-bar"></span>
        {/if}

        <TimelineContent post={data.reply.parent} locale={dateFnsLocale} {_agent} {isMedia} {isProfile} {isSingle} {isTranslated} bind:isHide={isReplyHide}></TimelineContent>
      </div>
    {/if}

    <div class="timeline__column">
      <TimelineContent post={data.post} locale={dateFnsLocale} {_agent} {isMedia} {isProfile} {isSingle} {isTranslated} bind:isHide={isHide}>

        <ReactionButtons
            {_agent}
            {isMedia}
            {data}
            on:repost={handleRepost}
            on:like={handleLike}
        ></ReactionButtons>

        <slot></slot>
      </TimelineContent>
    </div>

    <Menu bind:isMenuOpen={isMenuOpen}>
      <div class="menu-sub-list" slot="sub">
        <ReactionButtonsInMenu
            {_agent}
            {isMedia}
            {data}
            on:repost={handleRepost}
            on:like={handleLike}
        ></ReactionButtonsInMenu>
      </div>

      <ul class="timeline-menu-list" slot="content">
        {#if (data.post.author.did === _agent.did())}
          <li class="timeline-menu-list__item timeline-menu-list__item--delete">
            <button class="timeline-menu-list__button" on:click={deletePostStep}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              <span class="text-danger">{$_('delete_post')}</span>
            </button>
          </li>
        {/if}

        <li class="timeline-menu-list__item timeline-menu-list__item--translate">
          <button class="timeline-menu-list__button" on:click={() => {$isReactionButtonSettingsModalOpen = true; isMenuOpen = false}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-smile-plus"><path d="M22 11v1a10 10 0 1 1-9-10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/><path d="M16 5h6"/><path d="M19 2v6"/></svg>
            {$_('reaction_button_settings')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--translate">
          <button class="timeline-menu-list__button" on:click={translation}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-languages"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
            {$_('translation')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--copy-url">
          <button class="timeline-menu-list__button" on:click={copyThreadUrl}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            {$_('copy_url')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--copy-handle">
          <button class="timeline-menu-list__button" on:click={copyHandle}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-at-sign"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>
            {$_('copy_handle')}
          </button>
        </li>

        {#if ($settings.design?.layout === 'decks')}
          <li class="timeline-menu-list__item timeline-menu-list__item--report">
            <button class="timeline-menu-list__button" on:click={addThreadColumn}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-plus"><path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/></svg>
              {$_('add_thread_column')}
            </button>
          </li>
        {/if}

        <li class="timeline-menu-list__item timeline-menu-list__item--report">
          <button class="timeline-menu-list__button" on:click={() => {$listAddModal = {open: true, author: data.post.author, did: _agent.did()}}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
            {$_('list_instant_manage')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--report">
          <button class="timeline-menu-list__button" on:click={report}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flag"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
            {$_('report')}
          </button>
        </li>
      </ul>
    </Menu>

    {#if ($settings?.general.devMode)}
      <div class="timeline-dev">
        <p>langs: {data.post.record?.langs ?? ' '}</p>
        <p>via: {data.post.record?.via ?? ' '}</p>
      </div>
    {/if}

    {#if (isDialogRender)}
      <ConfirmModal
          bind:this={dialog}
          on:ok={() => {deletePost(data.post.uri)}}
          on:cancel={() => {isDialogRender = false}}
          confirmationName="deleteConfirmSkip"
          yesText="{$_('delete')}"
          cancelText="{$_('cancel')}"
      >
        <h3 class="modal-title modal-title--smaller modal-title--center">{$_('delete_confirm_title')}</h3>
      </ConfirmModal>
    {/if}
  </article>
{/if}
