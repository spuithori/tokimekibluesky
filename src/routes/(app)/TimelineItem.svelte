<script lang="ts">
    import {_} from 'svelte-i18n'
    import {
        Trash2,
        Users2,
        Languages,
        Copy,
        AtSign,
        ListPlus,
        List,
        Flag,
        EyeOff,
        Rss,
        Pin,
        Pencil
    } from 'lucide-svelte';
    import {
        agent,
        settings,
        isPreventEvent,
        reportModal,
        columns,
        didHint,
        pulseDelete,
        listAddModal,
        agents, repostMutes, postMutes, bluefeedAddModal, postPulse
    } from '$lib/stores';
    import {
        AppBskyEmbedExternal,
        AppBskyEmbedImages,
        AppBskyEmbedRecord,
        AppBskyFeedDefs,
        BskyAgent
    } from '@atproto/api'
    import { toast } from "svelte-sonner";
    import ProfileCardWrapper from "./ProfileCardWrapper.svelte";
    import {setContext} from "svelte";
    import Menu from "$lib/components/ui/Menu.svelte";
    import {goto} from "$app/navigation";
    import TimelineContent from "$lib/components/post/TimelineContent.svelte";
    import ReactionButtons from "$lib/components/post/ReactionButtons.svelte";
    import ReactionButtonsInMenu from "$lib/components/post/ReactionButtonsInMenu.svelte";
    import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
    import {
        getAccountIdByDid,
        getAllAgentDids,
        getImageBase64FromBlob,
        getImageObjectFromBlob,
        getService
    } from "$lib/util.js";
    import ReactionModal from "$lib/components/post/ReactionModal.svelte";
    import {getTextArray} from "$lib/richtext";

    export let _agent = $agent;
    export let data: AppBskyFeedDefs.FeedViewPost;
    export let isReplyExpanded = false;
    export let isSingle: boolean = false;
    export let isThread: boolean = false;
    export let isMedia: boolean = false;
    export let isProfile: boolean = false;
    export let isPinned: boolean = false;
    export let column = undefined;
    export let index = 0;

    setContext('timelineItem', data);

    let selectionText = '';
    let dialog;
    let editDialog;
    let isDialogRender = false;
    let isEditDialogRender = false;
    let isMenuOpen = false;
    let isShortCutNumberShown = false;
    let isTranslated = false;
    let isReactionModalOpen = false;
    let pulseTranslate = false;

    $: {
        if (dialog) {
            dialog.open();
        }

        if (editDialog) {
            editDialog.open();
        }
    }

    $: {
        localStorage.setItem('postMutes', JSON.stringify($postMutes));
    }

    if ($settings.general?.deleteConfirmSkip === undefined) {
        $settings.general.deleteConfirmSkip = false;
    }

    const isReasonRepost = (reason: any): reason is AppBskyFeedDefs.ReasonRepost => {
      return !!(reason as AppBskyFeedDefs.ReasonRepost)?.by;
    }

    if (data.reply && !data.reply?.parent) {
        delete data.reply;
    }

    let isHide;
    let isReplyHide;

    detectPostMuteFilter();
    detectRepostMuteFilter();

    export let hideReply = column && column.settings?.timeline.hideReply
                  ? column.settings?.timeline.hideReply
                  : $settings.timeline?.hideReply || 'all';

    export let hideRepost = column && column.settings?.timeline.hideRepost
            ? column.settings?.timeline.hideRepost
            : $settings.timeline?.hideRepost || 'all';

    function probability(n) {
      return Math.random() < n / 100;
    }

    $: handlePostDelete($pulseDelete);

    function handlePostDelete(uri) {
        if (uri === data?.post?.uri) {
            isHide = true;
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
        const _agent = $agents.get(getAccountIdByDid($agents, data.post.author.did));
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
            let _post = { did: data.post.author.did };
            const __agent = new BskyAgent({service: await getService(data.post.author.did)});

            if (AppBskyEmbedImages.isView(data?.post?.embed)) {
                const blobs = data.post.record.embed.images.map(image => {
                    return {
                        cid: image.image.ref.toString(),
                        mimeType: image.image.mimeType,
                        alt: image.alt,
                        width: image.aspectRatio.width,
                        height: image.aspectRatio.height,
                    }
                });

                const promises = blobs.map(blob => getImageObjectFromBlob(data.post.author.did, blob, __agent));
                _post.images = await Promise.all(promises);
            }

            if (AppBskyEmbedImages.isView(data?.post?.embed?.media)) {
                const blobs = data.post.record.embed.media.images.map(image => {
                    return {
                        cid: image.image.ref.toString(),
                        mimeType: image.image.mimeType,
                        alt: image.alt,
                        width: image.aspectRatio.width,
                        height: image.aspectRatio.height,
                    }
                });

                const promises = blobs.map(blob => getImageObjectFromBlob(data.post.author.did, blob, __agent));
                _post.images = await Promise.all(promises);
            }

            if (AppBskyEmbedRecord.isViewRecord(data?.post?.embed?.record)) {
                _post.quotePost = {
                    ...data.post.embed.record,
                    record: data.post.embed.record.value,
                };
            }

            if (AppBskyEmbedRecord.isViewRecord(data?.post?.embed?.record?.record)) {
                _post.quotePost = {
                    ...data.post.embed.record.record,
                    record: data.post.embed.record.record.value,
                };
            }

            if (data.reply && !data.reply.parent?.notFound && !data.reply.parent?.blocked) {
                _post.replyRef = {
                    did: data.post.author.did,
                    data: {
                        parent: data.reply.parent,
                        root: data.reply.root,
                    }
                }
            }

            if (AppBskyEmbedExternal.isView(data?.post?.embed)) {
                _post.embedExternal = {
                    $type: 'app.bsky.embed.external',
                    external: structuredClone(data.post.embed.external),
                };

                if (data.post.embed.external?.thumb) {
                    _post.externalImageBlob = await getImageBase64FromBlob(data.post.author.did, {cid: data.post.record.embed.external.thumb.ref.toString(), mimeType: data.post.record.embed.external.thumb.mimeType}, __agent);
                }
            }

            let text = '';
            getTextArray(data.post.record).forEach(item => {
                if (item.isLink()) {
                    text = text + `<a href="${item.link.uri}">${item.text}</a>`
                } else if (item.isMention()) {
                    text = text + `<span class="editor-mention" data-type="mention" data-id="${item.text.slice(1)}">${item.text}</span>`
                } else if (item.isTag()) {
                    text = text + `<span class="editor-hashtag">${item.text}</span>`
                } else {
                    text = text + item.text.replaceAll('\n', '<br>');
                }
            })
            _post.text = text;

            postPulse.set([_post]);
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
        pulseDelete.set(data.post.uri);
        toast.success($_('post_mute_success'));

        setTimeout(() => {
            pulseDelete.set(undefined);
        }, 500)
    }

    async function registerPin() {
        isMenuOpen = false;

        try {
            await _agent.agent.upsertProfile(_profile => {
                const profile = _profile || {};
                profile.pinnedPost = data.post.uri;

                return profile;
            });

            toast.success($_('success_register_pin'));
            location.reload();
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
            location.reload();
        } catch (e) {

        }
    }
</script>

<svelte:document on:selectionchange={handleSelectStart} />

{#if (!isHide)}
  <article class="timeline__item"
           class:timeline__item--repost={isReasonRepost(data.reason)}
           class:timeline__item--reply={data.reply && data.reply?.parent?.author?.did !== _agent.did()}
           class:timeline__item--compact={$settings?.design.postsLayout === 'compact' || $settings?.design.postsLayout === 'minimum'}
           class:timeline__item--minimum={$settings?.design.postsLayout === 'minimum'}
           on:click={handleClick}
  >
    {#if (isShortCutNumberShown && index < 9)}
      <p class="timeline-shortcut-number">{index + 1}</p>
    {/if}

    {#if isPinned}
      <p class="sticky-text"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin"><line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>{$_('pinned_post')}
      </p>
    {/if}

    <div class="timeline-repost-messages">
      {#if (isReasonRepost(data.reason))}
        <p class="timeline-repost-message">
          <ProfileCardWrapper handle="{data.reason.by.handle}" {_agent}>
            <a href="/profile/{data.reason.by.handle}"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat-2"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg><span class="timeline-repost-message__text">{$_('reposted_by', {values: {name: data.reason.by.displayName || data.reason.by.handle}})}</span></a>
          </ProfileCardWrapper>
        </p>
      {/if}
    </div>

    {#if (data?.reply?.parent?.notFound || data?.reply?.parent?.blocked || data?.reply?.root?.notFound || data?.reply?.root?.blocked)}
      <article class="timeline-hidden-item">
        <p class="timeline-hidde-item__text">{$_('deleted_post')}</p>
      </article>
    {:else}
      {#if (data.reply && !isSingle && !isReplyHide)}
        {#if (isReplyExpanded && data.reply.parent.uri !== data.reply.root.uri)}
          <div class="timeline__column timeline__column--reply">
            <TimelineContent post={data.reply.root} {_agent} {isMedia} {isProfile} {isSingle} {isTranslated} bind:isHide={isReplyHide} {pulseTranslate}></TimelineContent>
          </div>

          {#if (data.reply.parent?.record?.reply?.parent?.uri !== data.reply.root.uri)}
            <p class="timeline-read-thread-link">
              <a href={'/profile/' + data.reply.root.author.handle + '/post/' + data.reply.root.uri.split('/').slice(-1)[0]}>{$_('read_this_thread')}</a>
            </p>
          {/if}
        {/if}

        <div class="timeline__column timeline__column--reply">
          {#if (!isReplyExpanded && data.reply.parent.uri !== data.reply.root.uri)}
            <span class="timeline-reply-bar"></span>
          {/if}

          <TimelineContent post={data.reply.parent} {_agent} {isMedia} {isProfile} {isSingle} {isTranslated} bind:isHide={isReplyHide} {pulseTranslate}></TimelineContent>
        </div>
      {/if}
    {/if}

    <div class="timeline__column">
      <TimelineContent post={data.post} {_agent} {isMedia} {isProfile} {isSingle} {isTranslated} bind:isHide={isHide} {pulseTranslate}>

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
        {#if (getAllAgentDids($agents).includes(data.post.author.did))}
          <li class="timeline-menu-list__item timeline-menu-list__item--delete">
            <button class="timeline-menu-list__button" on:click={deletePostStep}>
              <Trash2 size="18" color="var(--danger-color)"></Trash2>
              <span class="text-danger">{$_('delete_post')}</span>
            </button>
          </li>

          <li class="timeline-menu-list__item timeline-menu-list__item--delete">
            <button class="timeline-menu-list__button" on:click={editPostStep}>
              <Pencil size="18" color="var(--danger-color)"></Pencil>
              {$_('delete_and_edit')}
            </button>
          </li>

          {#if (isPinned)}
            <li class="timeline-menu-list__item timeline-menu-list__item--delete">
              <button class="timeline-menu-list__button" on:click={unregisterPin}>
                <Pin size="18" color="var(--text-color-1)"></Pin>
                {$_('unregister_pin')}
              </button>
            </li>
          {:else}
            <li class="timeline-menu-list__item timeline-menu-list__item--delete">
              <button class="timeline-menu-list__button" on:click={registerPin}>
                <Pin size="18" color="var(--text-color-1)"></Pin>
                {$_('register_pin')}
              </button>
            </li>
          {/if}
        {/if}

        <li class="timeline-menu-list__item timeline-menu-list__item--translate">
          <button class="timeline-menu-list__button" on:click={translation}>
            <Languages size="18" color="var(--text-color-1)"></Languages>
            {$_('translation')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--copy-url">
          <button class="timeline-menu-list__button" on:click={copyThreadUrl}>
            <Copy size="18" color="var(--text-color-1)"></Copy>
            {$_('copy_url')}
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--copy-handle">
          <button class="timeline-menu-list__button" on:click={copyHandle}>
            <AtSign size="18" color="var(--text-color-1)"></AtSign>
            {$_('copy_handle')}
          </button>
        </li>

        {#if ($settings.design?.layout === 'decks')}
          <li class="timeline-menu-list__item timeline-menu-list__item--report">
            <button class="timeline-menu-list__button" on:click={addThreadColumn}>
              <ListPlus size="18" color="var(--text-color-1)"></ListPlus>
              {$_('add_thread_column')}
            </button>
          </li>
        {/if}

        <li class="timeline-menu-list__item timeline-menu-list__item--report">
          <button class="timeline-menu-list__button" on:click={() => {$listAddModal = {open: true, author: data.post.author, did: _agent.did()}}}>
            <List size="18" color="var(--text-color-1)"></List>
            {$_('list_instant_manage')}
          </button>
        </li>

        {#if $settings?.general?.enableBluefeed || false}
          <li class="timeline-menu-list__item timeline-menu-list__item--bluefeed">
            <button class="timeline-menu-list__button" on:click={() => {$bluefeedAddModal = {open: true, post: data.post, did: _agent.did()}}}>
              <Rss size="18" color="var(--text-color-1)"></Rss>
              {$_('add_bluefeed')}
            </button>
          </li>
        {/if}

        {#if ($agents.size > 1)}
          <li class="timeline-menu-list__item">
            <button class="timeline-menu-list__button" on:click={() => {isReactionModalOpen = true}}>
              <Users2 size="18" color="var(--text-color-1)"></Users2>
              {$_('reaction_other_account_menu')}
            </button>
          </li>
        {/if}

        {#if (!getAllAgentDids($agents).includes(data.post.author.did))}
          <li class="timeline-menu-list__item timeline-menu-list__item--hide">
            <button class="timeline-menu-list__button" on:click={mutePost}>
              <EyeOff size="18" color="var(--text-color-1)"></EyeOff>
              {$_('post_mute_on')}
            </button>
          </li>
        {/if}

        <li class="timeline-menu-list__item timeline-menu-list__item--report">
          <button class="timeline-menu-list__button" on:click={report}>
            <Flag size="18" color="var(--danger-color)"></Flag>
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

    {#if (isEditDialogRender)}
      <ConfirmModal
          bind:this={editDialog}
          on:ok={editPost}
          on:cancel={() => {isEditDialogRender = false}}
          confirmationName="deleteConfirmSkip"
          yesText="{$_('delete')}"
          cancelText="{$_('cancel')}"
      >
        <h3 class="modal-title modal-title--smaller modal-title--center">{$_('delete_confirm_title')}</h3>
        <p class="modal-description">{$_('delete_and_edit_confirm_description')}</p>
      </ConfirmModal>
    {/if}

    {#if (isReactionModalOpen)}
      <ReactionModal {_agent} on:close={() => {isReactionModalOpen = false}}></ReactionModal>
    {/if}
  </article>
{:else}
  {#if isThread}
    <article class="timeline-hidden-item">
      <p class="timeline-hidde-item__text">{$_('hiding_post')}</p>
    </article>
  {/if}
{/if}

<style lang="postcss">
  .timeline-hidden-item {
      margin-bottom: 16px;
  }
</style>