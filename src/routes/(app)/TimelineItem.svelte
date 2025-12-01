<script lang="ts">
  import {_} from 'svelte-i18n'
  import { Trash2, Languages, Copy, AtSign, List, Flag, EyeOff, Rss, Pin, Pencil, Sticker, Repeat2, Reply, VolumeX, ShieldBan } from 'lucide-svelte';
  import { agent, settings, reportModal, listAddModal, agents, repostMutes, postMutes, bluefeedAddModal, pulseDetach, junkAgentDid } from '$lib/stores';
  import { AppBskyEmbedImages, AppBskyEmbedRecord, AppBskyEmbedRecordWithMedia, AppBskyEmbedVideo, AppBskyFeedDefs } from '@atproto/api'
  import { toast } from "svelte-sonner";
  import ProfileCardWrapper from "./ProfileCardWrapper.svelte";
  import Menu from "$lib/components/ui/Menu.svelte";
  import {goto} from "$app/navigation";
  import TimelineContent from "$lib/components/post/TimelineContent.svelte";
  import ReactionButtonsInMenu from "$lib/components/post/ReactionButtonsInMenu.svelte";
  import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
  import { getAccountIdByDid, getAllAgentDids, getDidFromUri } from "$lib/util.js";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import MediaTimelineItem from "$lib/components/media/MediaTimelineItem.svelte";
  import VideoTimelineItem from "$lib/components/post/VideoTimelineItem.svelte";
  import {getPostState} from "$lib/classes/postState.svelte";
  import MediaTimelineSingleItem from "$lib/components/media/MediaTimelineSingleItem.svelte";
  import {getEditPost} from "$lib/components/post/timelineUtil";

    let {
        _agent = $agent,
        data,
        isReplyExpanded = false,
        isSingle = false,
        isThread = false,
        isMedia = false,
        isPinned = false,
        column = undefined,
        index = 0,
        children
    } = $props();

    const columnState = getColumnState();
    const junkColumnState = getColumnState(true);
    const postState = getPostState();

    let isDialogRender = $state(false);
    let isEditDialogRender = $state(false);
    let isMenuOpen = $state(false);
    let isTranslated = false;
    let pulseTranslate = $state(false);
    let hideReply = column?.settings?.timeline?.hideReply
      ? column.settings.timeline.hideReply
      : $settings.timeline?.hideReply || 'all';
    let hideRepost = column?.settings?.timeline?.hideRepost
      ? column.settings.timeline.hideRepost
      : $settings.timeline?.hideRepost || 'all';
    let hideQuote = column?.settings?.timeline?.hideQuote
      ? column.settings.timeline.hideQuote
      : $settings.timeline?.hideQuote || false;
    let simpleReply = $derived(column?.settings?.timeline?.simpleReply
      ? column.settings.timeline.simpleReply
      : $settings.timeline?.simpleReply || false);

    if ($settings.general?.deleteConfirmSkip === undefined) {
        $settings.general.deleteConfirmSkip = false;
    }

    const isReasonRepost = (reason: any): reason is AppBskyFeedDefs.ReasonRepost => {
      return !!(reason as AppBskyFeedDefs.ReasonRepost)?.by;
    }

    if (data.reply && !data.reply?.parent) {
        delete data.reply;
    }

    let isHide: boolean = $state(false);
    let isReplyHide: boolean = $state(false);
    let isMuteOpen = $state(false);

    $effect(() => {
        handleEmbedDetach($pulseDetach);
    })

    detectPostMuteFilter();
    detectRepostMuteFilter();

    function probability(n) {
      return Math.random() < n / 100;
    }

    function handleEmbedDetach(detach: pulseDetach) {
        if (!detach) {
            return false;
        }

        if (detach.uri === data?.post?.uri) {
            data.post.embed = detach.embed;
        }
    }

    if (data.post?.author?.did !== _agent.did()) {
        switch (hideReply) {
            case 'all':
                break;
            case 'following':
                if (data.reply && (data?.reply?.parent?.author?.did !== _agent.did() && !data?.reply?.parent?.author?.viewer?.following)) {
                    isHide = true;
                }
                break;
            case 'me':
                if (data.reply && data?.reply?.parent?.author?.did !== _agent.did()) {
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

        if (data.reason.by.viewer?.muted) {
            isHide = true;
        }
    }

    if (hideQuote && column?.algorithm?.type !== 'notification') {
      if (AppBskyEmbedRecord.isView(data?.post?.embed) || AppBskyEmbedRecordWithMedia.isView(data?.post?.embed)) {
        isHide = true;
      }
    }

    const langFilter = column && column.settings?.langFilterEnabled ? column.settings.langFilter : $settings.langFilter;
    if (langFilter && langFilter.length && data.post.record.langs) {
        const isLangMatched = langFilter.some(lang => data.post.record.langs.includes(lang));

        if (!isLangMatched) {
            isHide = true;
        }
    }

    async function translation() {
        isMenuOpen = false;
        pulseTranslate = true;
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

    function sendMention() {
      const mention = `@${data.post.author.handle}`;
      postState.replaceText(`<span class="editor-mention" data-type="mention" data-id="${mention.slice(1)}">${mention}</span>`)

      isMenuOpen = false;
    }

    async function deletePost(uri: string) {
        const rkey = uri.split('/').slice(-1)[0];
        const _agent = $agents.get(getAccountIdByDid($agents, data.post.author.did));
        isMenuOpen = false;

        try {
            await _agent.agent.api.app.bsky.feed.post.delete(
                {repo: _agent.did(), rkey: rkey}
            );

            columnState.deletePost(uri);
            junkColumnState.deletePost(uri);

            toast.success($_('post_delete_success'));
        } catch (e) {
            toast.error($_('post_delete_failed') + ': ' + e);
        }
    }

    function deletePostStep() {
        if ($settings.general.deleteConfirmSkip) {
            deletePost(data.post.uri);
        } else {
            isDialogRender = true;
        }
    }

    function editPostStep() {
        if ($settings.general.deleteConfirmSkip) {
            editPost();
        } else {
            isEditDialogRender = true;
        }
    }

    async function editPost() {
        const toastId = toast.loading($_('process_to_delete_and_edit'), {
            duration: 100000,
        });

        try {
            const _post = await getEditPost(data);
            postState.replacePost(_post);
            toast.success($_('success_to_delete_and_edit'), {
                id: toastId,
                duration: 2000,
            });

            await deletePost(data.post.uri);
        } catch (e) {
            console.error(e);
            toast.error('Error', {
               id: toastId,
               duration: 5000,
            })
        }
    }

    function handleClick(event) {
        if (event.target.closest('button') || event.target.closest('.profile-card') || event.target.closest('a') || event.target.closest('.timeline-external') || event.target.closest('.likes-wrap') || event.target.closest('.dialog-modal') || event.target.closest('video') || event.target.closest('.video-player') || event.target.closest('.v2-modal') || event.target.closest('dialog')) {
            return false;
        }

        const selectionText = window.getSelection()?.toString();
        if (selectionText) {
            return false;
        }

        const rkey = data.post.uri.split('/').slice(-1)[0];
        const uri = '/profile/' + data.post.author.did + '/post/' + rkey;

        if (uri === location.pathname) {
            return false;
        }

        if (!junkColumnState.hasColumn('thread_' + rkey)) {
            junkColumnState.add({
                id: 'thread_' + rkey,
                algorithm: {
                    algorithm: 'at://' + data.post.author.did + '/app.bsky.feed.post/' + rkey,
                    type: 'thread',
                    name: 'Thread',
                },
                style: 'default',
                settings: defaultDeckSettings,
                did: _agent.did(),
                handle: _agent.handle(),
                data: {
                    feed: [data],
                    cursor: '',
                }
            })
        }

        junkAgentDid.set(_agent.did());
        goto(uri);
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

    function detectRepostMuteFilter() {
        if (!isReasonRepost(data.reason)) {
            return false;
        }

        const did = data.reason?.by.did;

        if (!did) {
            return false;
        }

        if ($repostMutes.includes(did)) {
            isHide = true;
        }
    }

    function detectPostMuteFilter() {
        if ($postMutes.includes(data.post.uri)) {
            isHide = true;
        }
    }

    function mutePost() {
        $postMutes = [...$postMutes, data.post.uri];
        localStorage.setItem('postMutes', JSON.stringify($postMutes));
        columnState.deletePost(data.post.uri);
        junkColumnState.deletePost(data.post.uri);
        toast.success($_('post_mute_success'));
    }

    async function registerPin() {
        isMenuOpen = false;

        try {
            await _agent.agent.upsertProfile(_profile => {
                const profile = _profile || {};
                profile.pinnedPost = {
                    uri: data.post.uri,
                    cid: data.post.cid,
                };

                return profile;
            });

            toast.success($_('success_register_pin'));
            const character = 'r';
            const keyboardEvent = new KeyboardEvent('keydown', {
                key: character,
                code: character.toUpperCase(),
                bubbles: true,
                cancelable: true,
            });
            document.dispatchEvent(keyboardEvent);
        } catch (e) {

        }
    }

    async function unregisterPin() {
        isMenuOpen = false;

        try {
            await _agent.agent.upsertProfile(_profile => {
                const profile = _profile || {};
                profile.pinnedPost = undefined;

                return profile;
            });

            toast.success($_('success_unregister_pin'));
            const character = 'r';
            const keyboardEvent = new KeyboardEvent('keydown', {
                key: character,
                code: character.toUpperCase(),
                bubbles: true,
                cancelable: true,
            });
            document.dispatchEvent(keyboardEvent);
        } catch (e) {

        }
    }

    async function detachQuote(uri: string, unDetach: boolean = false) {
        isMenuOpen = false;
        const rkey = uri.split('/').slice(-1)[0];
        let detachedEmbeddingUris = [];
        let embeddingRules = [];
        const _agent = $agents.get(getAccountIdByDid($agents, getDidFromUri(uri)));

        if (!_agent) {
            return false;
        }

        try {
            const { value } = await _agent.agent.app.bsky.feed.postgate.get({repo: _agent.did(), rkey: rkey});
            detachedEmbeddingUris = value?.detachedEmbeddingUris || [];
            embeddingRules = value?.embeddingRules || [];
        } catch (e) {
            //
        }

        try {
            const res = await _agent.agent.com.atproto.repo.putRecord({
                collection: 'app.bsky.feed.postgate',
                rkey: rkey,
                repo: _agent.did() as string,
                record: {
                    detachedEmbeddingUris: unDetach ? detachedEmbeddingUris.filter(_uri => _uri !== data.post.uri) : [...detachedEmbeddingUris, data.post.uri],
                    embeddingRules: embeddingRules,
                    post: uri,
                    createdAt: new Date().toISOString(),
                }
            });

            const _post = await _agent.getFeed(data.post.uri);

            pulseDetach.set({
                uri: data.post.uri,
                unDetach: unDetach,
                embed: _post.post.embed,
            });

            toast.success(unDetach ? $_('success_un_detach') : $_('success_detach'))
        } catch (e) {
            console.error(e);
            toast.error(e);
        }
    }

    async function mute() {
        try {
            const mute = await _agent.agent.api.app.bsky.graph.muteActor({actor: data.post.author.did});
            columnState.deletePostsFromDid(data.post.author.did);
            junkColumnState.deletePostsFromDid(data.post.author.did);
            toast.success($_('success_mute_on_menu'));
        } catch (e) {
            console.error(e)
        }
    }

    async function block() {
        try {
            const block = await _agent.agent.api.app.bsky.graph.block.create(
              { repo: _agent.did() as string },
              {
                  subject: data.post.author.did,
                  createdAt: new Date().toISOString(),
              });
            columnState.deletePostsFromDid(data.post.author.did);
            junkColumnState.deletePostsFromDid(data.post.author.did);
            toast.success($_('success_block_on_menu'));
        } catch (e) {
            console.error(e)
        }
    }
</script>

{#if (!isHide)}
  {#if (column?.style === 'media')}
    {#if (AppBskyEmbedImages.isView(data?.post?.embed) || AppBskyEmbedImages.isView(data?.post?.embed?.media))}
      {#if (column?.settings?.mediaColumns === 1)}
        <MediaTimelineSingleItem feed={column.data.feed} {index} {data} {_agent}></MediaTimelineSingleItem>
      {:else}
        <MediaTimelineItem feed={column.data.feed} {index} {data} {_agent}></MediaTimelineItem>
      {/if}
    {/if}
  {:else if (column?.style === 'video')}
    {#if AppBskyEmbedVideo.isView(data?.post?.embed)}
      <VideoTimelineItem feed={column.data.feed} {index} {data} {_agent}></VideoTimelineItem>
    {/if}
  {:else}
    <article class="timeline__item"
             class:timeline__item--compact={$settings?.design.postsLayout === 'compact' || $settings?.design.postsLayout === 'minimum'}
             class:timeline__item--minimum={$settings?.design.postsLayout === 'minimum'}
             class:timeline__item--hide={isHide}
             class:timeline__item--bubble={$settings?.design?.bubbleTimeline}
             onclick={handleClick}
    >
      {#if isPinned}
        <p class="sticky-text"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin"><line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>{$_('pinned_post')}
        </p>
      {/if}

      {#if (!isThread)}
        {#if (isReasonRepost(data.reason))}
          <p class="timeline-repost-message" data-aturi={data.reason.uri}>
            <ProfileCardWrapper handle={data.reason.by.handle} {_agent}>
              <a href="/profile/{data.reason.by.did}"><Repeat2 size="18" color="var(--primary-color)"></Repeat2><span class="timeline-repost-message__text">{$_('reposted_by', {values: {name: data.reason.by.displayName || data.reason.by.handle}})}</span></a>
            </ProfileCardWrapper>
          </p>
        {/if}
      {/if}

      {#if data?.reply?.parent?.notFound || data?.reply?.parent?.blocked}
        <article class="timeline-hidden-item">
          <p class="timeline-hidde-item__text">{$_('deleted_reply')}</p>
        </article>
      {:else if simpleReply && data.reply && !isThread}
        <p class="timeline-repost-message">
          <button style="pointer-events: none;">
            <Reply size="18" color="var(--primary-color)"></Reply>
            <span class="timeline-repost-message__text">{$_('reply_to', {values: {name: data.reply.parent.author.displayName || data.reply.parent.author.handle}})}</span>
          </button>
        </p>
      {:else if data.reply && !isSingle && !isReplyHide}
        {#if isReplyExpanded && data.reply.parent.uri !== data.reply.root.uri && !data?.reply?.root?.notFound && !data?.reply?.root?.blocked}
          <div class="timeline__column timeline__column--reply" class:timeline__item--hide={isReplyHide}>
            <TimelineContent post={data.reply.root} {_agent} {isMedia} {isSingle} {isTranslated} bind:isHide={isReplyHide} {pulseTranslate}></TimelineContent>
          </div>

          {#if data.reply.parent?.record?.reply?.parent?.uri !== data.reply.root.uri}
            <p class="timeline-read-thread-link">
              <a href={'/profile/' + data.reply.root.author.handle + '/post/' + data.reply.root.uri.split('/').slice(-1)[0]}>
                {$_('read_this_thread')}
              </a>
            </p>
          {/if}
        {/if}

        <div class="timeline__column timeline__column--reply" class:timeline__item--hide={isReplyHide}>
          {#if !isReplyExpanded && data.reply.parent.uri !== data.reply.root.uri}
            <span class="timeline-reply-bar"></span>
          {/if}

          <TimelineContent post={data.reply.parent} {_agent} {isMedia} {isSingle} {isTranslated} bind:isHide={isReplyHide} {pulseTranslate}></TimelineContent>
        </div>
      {/if}

      <div class="timeline__column">
        <TimelineContent post={data.post} reason={data?.reason} {_agent} {isMedia} {isSingle} {isTranslated} bind:isHide {pulseTranslate}>
          {@render children?.()}
        </TimelineContent>
      </div>

      <Menu bind:isMenuOpen={isMenuOpen}>
        {#snippet sub()}
          <div class="menu-sub-list">
            <ReactionButtonsInMenu
              {_agent}
              post={data.post}
            ></ReactionButtonsInMenu>
          </div>
        {/snippet}

        {#snippet content()}
          <ul class="timeline-menu-list">
            {#if (getAllAgentDids($agents).includes(data.post.author.did))}
              <li class="timeline-menu-list__item timeline-menu-list__item--delete">
                <button class="timeline-menu-list__button" onclick={deletePostStep}>
                  <Trash2 size="18" color="var(--danger-color)"></Trash2>
                  <span class="text-danger">{$_('delete_post')}</span>
                </button>
              </li>

              <li class="timeline-menu-list__item timeline-menu-list__item--delete">
                <button class="timeline-menu-list__button" onclick={editPostStep}>
                  <Pencil size="18" color="var(--danger-color)"></Pencil>
                  {$_('delete_and_edit')}
                </button>
              </li>

              {#if (isPinned)}
                <li class="timeline-menu-list__item timeline-menu-list__item--delete">
                  <button class="timeline-menu-list__button" onclick={unregisterPin}>
                    <Pin size="18" color="var(--text-color-1)"></Pin>
                    {$_('unregister_pin')}
                  </button>
                </li>
              {:else}
                <li class="timeline-menu-list__item timeline-menu-list__item--delete">
                  <button class="timeline-menu-list__button" onclick={registerPin}>
                    <Pin size="18" color="var(--text-color-1)"></Pin>
                    {$_('register_pin')}
                  </button>
                </li>
              {/if}
            {/if}

            <li class="timeline-menu-list__item timeline-menu-list__item--translate">
              <button class="timeline-menu-list__button" onclick={translation}>
                <Languages size="18" color="var(--text-color-1)"></Languages>
                {$_('translation')}
              </button>
            </li>

            <li class="timeline-menu-list__item timeline-menu-list__item--copy-url">
              <button class="timeline-menu-list__button" onclick={copyThreadUrl}>
                <Copy size="18" color="var(--text-color-1)"></Copy>
                {$_('copy_url')}
              </button>
            </li>

            <li class="timeline-menu-list__item timeline-menu-list__item--copy-handle">
              <button class="timeline-menu-list__button" onclick={sendMention}>
                <AtSign size="18" color="var(--text-color-1)"></AtSign>
                {$_('send_mention')}
              </button>
            </li>

            <li class="timeline-menu-list__item timeline-menu-list__item--report">
              <button class="timeline-menu-list__button" onclick={() => {$listAddModal = {open: true, author: data.post.author, did: _agent.did()}}}>
                <List size="18" color="var(--text-color-1)"></List>
                {$_('list_instant_manage')}
              </button>
            </li>

            {#if $settings?.general?.enableBluefeed || false}
              <li class="timeline-menu-list__item timeline-menu-list__item--bluefeed">
                <button class="timeline-menu-list__button" onclick={() => {$bluefeedAddModal = {open: true, post: data.post, did: _agent.did()}}}>
                  <Rss size="18" color="var(--text-color-1)"></Rss>
                  {$_('add_bluefeed')}
                </button>
              </li>
            {/if}

            {#if (!getAllAgentDids($agents).includes(data.post.author.did))}
              <li class="timeline-menu-list__item timeline-menu-list__item--hide">
                <button class="timeline-menu-list__button" onclick={mutePost}>
                  <EyeOff size="18" color="var(--text-color-1)"></EyeOff>
                  {$_('post_mute_on')}
                </button>
              </li>
            {/if}

            {#if (getAllAgentDids($agents).includes(data.post?.embed?.record?.author?.did || data.post?.embed?.record?.record?.author?.did))}
              {#if (AppBskyEmbedRecord.isViewRecord(data?.post?.embed?.record?.record) || AppBskyEmbedRecord.isViewRecord(data?.post?.embed?.record))}
                <li class="timeline-menu-list__item">
                  <button class="timeline-menu-list__button" onclick={() => {detachQuote(data?.post?.embed?.record?.uri || data?.post?.embed?.record?.record?.uri)}}>
                    <Sticker size="18" color="var(--danger-color)"></Sticker>
                    {$_('detach_quote')}
                  </button>
                </li>
              {/if}
            {/if}

            {#if ((data.post?.embed?.record?.detached || data.post?.embed?.record?.record?.detached) && getAllAgentDids($agents).includes(getDidFromUri(data.post?.embed?.record?.uri || data.post?.embed?.record?.record?.uri)))}
              <li class="timeline-menu-list__item">
                <button class="timeline-menu-list__button" onclick={() => {detachQuote(data?.post?.embed?.record?.uri || data?.post?.embed?.record?.record?.uri, true)}}>
                  <Sticker size="18" color="var(--danger-color)"></Sticker>
                  {$_('un_detach_quote')}
                </button>
              </li>
            {/if}

            <li class="timeline-menu-list__item timeline-menu-list__item--report">
              <button class="timeline-menu-list__button" onclick={mute}>
                <VolumeX size="18" color="var(--danger-color)"></VolumeX>
                {$_('button_mute')}
              </button>
            </li>

            <li class="timeline-menu-list__item timeline-menu-list__item--report">
              <button class="timeline-menu-list__button" onclick={block}>
                <ShieldBan size="18" color="var(--danger-color)"></ShieldBan>
                {$_('button_block')}
              </button>
            </li>

            <li class="timeline-menu-list__item timeline-menu-list__item--report">
              <button class="timeline-menu-list__button" onclick={report}>
                <Flag size="18" color="var(--danger-color)"></Flag>
                {$_('report')}
              </button>
            </li>
          </ul>
        {/snippet}
      </Menu>

      {#if ($settings?.general.devMode)}
        <div class="timeline-dev">
          <p>langs: {data.post.record?.langs ?? ' '}</p>
          <p>via: {data.post.record?.via ?? ' '}</p>
        </div>
      {/if}

      {#if (isDialogRender)}
        <ConfirmModal
                on:ok={() => {deletePost(data.post.uri)}}
                on:cancel={() => {isDialogRender = false}}
                confirmationName="deleteConfirmSkip"
                yesText={$_('delete')}
                cancelText={$_('cancel')}
        >
          <h3 class="modal-title modal-title--smaller modal-title--center">{$_('delete_confirm_title')}</h3>
        </ConfirmModal>
      {/if}

      {#if (isEditDialogRender)}
        <ConfirmModal
                on:ok={editPost}
                on:cancel={() => {isEditDialogRender = false}}
                confirmationName="deleteConfirmSkip"
                yesText={$_('delete')}
                cancelText={$_('cancel')}
        >
          <h3 class="modal-title modal-title--smaller modal-title--center">{$_('delete_confirm_title')}</h3>
          <p class="modal-description">{$_('delete_and_edit_confirm_description')}</p>
        </ConfirmModal>
      {/if}

      {#if (isThread && data?.post?.author?.viewer?.muted)}
        <div class="thread-notice">
          <p class="thread-notice__text">{$_('muted_user_thread')}</p>

          <button class="button button--sm" onclick={() => {isMuteOpen = true}}>{$_('show_button')}</button>
        </div>
      {/if}
    </article>
  {/if}
{/if}

<style lang="postcss">
  .timeline-hidden-item {
      margin-bottom: 16px;
  }

  .timeline__item--hide {
      display: none;
  }
</style>