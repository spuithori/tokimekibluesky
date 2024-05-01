<script lang="ts">
import { _ } from 'svelte-i18n';
import {
    agent,
    agents,
    hashtagHistory,
    isPublishInstantFloat,
    quotePost,
    replyRef,
    settings,
    threadGate
} from '$lib/stores';
import {selfLabels} from "$lib/components/editor/publishStore";
import { clickOutside } from '$lib/clickOutSide';
import {
    RichText,
    AppBskyEmbedImages,
    AppBskyEmbedRecord,
    AppBskyEmbedRecordWithMedia,
    AppBskyEmbedExternal, AppBskyFeedPost
} from '@atproto/api';
import { toast } from 'svelte-sonner'
import { goto, pushState } from '$app/navigation';
import { page } from '$app/stores';
import { db } from '$lib/db';
import DraftModal from "$lib/components/draft/DraftModal.svelte";
import {getAccountIdByDid} from "$lib/util";
import type { Draft } from '$lib/db';
import {detectRichTextWithEditorJson} from "$lib/components/editor/richtext";
import imageCompression from 'browser-image-compression';
import PublishPool from "$lib/components/editor/PublishPool.svelte";
import PublishMain from "$lib/components/editor/PublishMain.svelte";

let _agent = $agent;
let editor;
let isFocus = false;
let isContinueMode = false;
let isDraftModalOpen = false;
let mentionsHistory = JSON.parse(localStorage.getItem('mentionsHistory')) || [];
let isVirtualKeyboard = false;
let isEnabled = true;
let isPublishing = false;
let unique = Symbol();
let postsPool = [{}];
let currentPost = 0;
let getCurrentThreadData;

const isMobile = navigator?.userAgentData?.mobile || false;

if ('virtualKeyboard' in navigator) {
    navigator.virtualKeyboard.overlaysContent = true;
    isVirtualKeyboard = true;
}

if (!$settings.langSelector) {
    $settings.langSelector = 'auto';
}

$: isMobilePopState = isMobile ? $page.state.showPublish : false;

$: if (isMobile ? isFocus && isMobilePopState : isFocus) {
  document.documentElement.classList.add('scroll-lock');
} else {
  document.documentElement.classList.remove('scroll-lock');
}

function handleOpen() {
    if (!isFocus) {
        isFocus = true;
    }

    setTimeout(() => {
      editor.focus();
    }, 100);

    if (isMobile) {
        pushState('', {
            showPublish: true
        });
    }
}

function onClose() {
    if (isFocus) {
        isFocus = false;
        editor.blur();

        if (isMobile && $page.state.showPublish) {
            history.back();
        }
    }
}

function handleKeydown(event: { key: string; }) {
    const activeElement = document.activeElement?.tagName;

    if (event.key === 'n' && !(activeElement === 'TEXTAREA' || activeElement === 'INPUT')) {
        handleOpen();
    }

    if (event.key === '/' && (activeElement === 'BODY' || activeElement === 'BUTTON')) {
        goto('/search');
    }

    if (event.key === 'Escape' && isFocus) {
        onClose();
    }
}

async function getReplyRefByUri(uri: string) {
    if (!uri) {
        return false;
    }

    const res = await _agent.getFeed(uri);
    let root = res.parent;
    while (root.parent) {
        root = root.parent;
    }

    return {
        parent: res.post,
        root: root.post,
    }
}

$: quotePostObserve($quotePost);
$: replyRefObserve($replyRef);

function quotePostObserve(quotePost) {
    if (quotePost?.uri) {
        handleOpen();
    }
}

function replyRefObserve(replyRef) {
    if (replyRef) {
        handleOpen();
        _agent = $agents.get(getAccountIdByDid($agents, replyRef.did));
    } else {
        _agent = $agent;
    }
}

function handleOutClick() {
    if (!isContinueMode) {
        onClose();
    }
}

async function saveDraft() {
    try {
        postsPool[currentPost] = getCurrentThreadData();

        const id = await db.drafts.add({
            createdAt: Date.now(),
            owner: _agent.did() as string,
            ...postsPool[currentPost],
        });

        if (!isContinueMode) {
            isFocus = false;
        }
        editor.clear();
        quotePost.set(undefined);
        replyRef.set(undefined);
        postsPool = [{}];
        unique = Symbol();
        $isPublishInstantFloat = false;

        toast.success($_('draft_add_success'));
    } catch (e) {
        toast.error($_('error') + ': ' + e);
    }
}

async function handleDraftUse(event: CustomEvent<{ draft: Draft }>) {
    isDraftModalOpen = false;
    editor.clear();
    quotePost.set(undefined);
    replyRef.set(undefined);

    const draft = event.detail.draft;
    postsPool = [{
        ...draft,
    }];
    unique = Symbol();

    setTimeout(() => {
        editor.focus();
    }, 100);
}

async function languageDetect(text) {
    try {
        const res = await fetch(`/api/language-detect`, {
            method: 'post',
            body: JSON.stringify({
                text: text,
            })
        });
        const langs = await res.json() as { lang: string; }[];

        if (langs.length) {
            return langs.map(lg => lg.lang);
        } else {
            return [];
        }
    } catch (e) {
        console.error(e);
        return [];
    }
}

async function uploadBlobWithCompression(image) {
  const compressed = await imageCompression(image.file, {
    maxSizeMB: 0.925,
    maxWidthOrHeight: 3000,
    fileType: 'image/jpeg',
    useWebWorker: true,
    initialQuality: 0.8,
  });

  return await _agent.agent.api.com.atproto.repo.uploadBlob(image.isGif ? image.file : compressed, {
    encoding: 'image/jpeg',
  });
}

async function uploadExternalImage(_blob) {
    if (_blob) {
        try {
            const imageRes = await fetch(_blob);
            let blob = await imageRes.blob();

            if (blob.type === 'image/gif') {
                blob = await imageCompression(blob, {
                    maxSizeMB: 0.925,
                    maxWidthOrHeight: 3000,
                    fileType: 'image/jpeg',
                    useWebWorker: true,
                    initialQuality: 0.8,
                });
            }

            const res = await _agent.agent.api.com.atproto.repo.uploadBlob(blob, {
                encoding: 'image/jpeg',
            });
            return res.data.blob;
        } catch (e) {
            toast.error(e);
        }
    }
}

async function publishAll() {
    if (isEnabled) {
        return false;
    }

    isPublishing = true;
    postsPool[currentPost] = getCurrentThreadData();
    const toastId = toast.loading($_('process_to_post'));

    let i = 1;
    let root;
    let parent;
    let _replyRef;

    try {
        for (const post of postsPool) {
            toast.loading($_('process_to_post') + '(' + i + '/' + postsPool.length +  ')', {
                id: toastId,
                duration: 100000,
            })
            parent = await publish(post, _replyRef);

            if (postsPool.length > 1 && i === 1) {
                root = structuredClone(parent);
            }

            _replyRef = {
                root: root,
                parent: parent,
            }

            i = i + 1;
        }

        await afterPublish();

        isPublishing = false;
        toast.success($_('success_to_post'), {
            id: toastId,
            duration: 1500,
        });
    } catch (e) {
        isPublishing = false;
        isEnabled = false;

        console.error(e);
        toast.error('Error: ' + e, {
            id: toastId,
            duration: 5000,
        });

        postsPool.splice(0, i - 1);
        currentPost = 0;
        unique = Symbol();
    }
}

async function afterPublish(rt = undefined) {
    if (rt && Array.isArray(rt.facets)) {
        try {
            const dids: string[] = rt.facets.map(facet => {
                if (facet.features[0].did) {
                    return facet.features[0].did as string
                }
            }).filter(results => results !== undefined);
            const promises = dids.map(did => _agent.agent.com.atproto.repo.describeRepo({repo: did}));
            let actors: { did: string; handle: string; isHistory: boolean; }[] = [];

            await Promise.all(promises)
                .then(ress => {
                    actors = ress.map(res => {
                        return {
                            did: res.data.did,
                            handle: res.data.handle,
                            isHistory: true,
                        }
                    });
                })

            mentionsHistory = [...actors, ...mentionsHistory];
            mentionsHistory = Array.from(new Set(mentionsHistory.map(a => a.did))).map(did => {
                return mentionsHistory.find(a => a.did === did)
            });
            if (mentionsHistory.length > 4) {
                mentionsHistory = mentionsHistory.slice(0, 4);
            }
            localStorage.setItem('mentionsHistory', JSON.stringify(mentionsHistory));
        } catch (e) {
            // do nothing.
        }
    }

    isEnabled = false;
    if (!isContinueMode) {
        onClose();
    }
    editor.clear();
    quotePost.set(undefined);
    replyRef.set(undefined);
    selfLabels.set([]);
    threadGate.set('everybody');
    $isPublishInstantFloat = false;
    postsPool = [{}];
    currentPost = 0;
    unique = Symbol();

    if (isContinueMode) {
        setTimeout(() => {
            editor.focus();
        }, 100)
    }
}

async function publish(post, treeReplyRef = undefined) {
    isEnabled = true;

    type BeforeUploadImage = {
        image: Blob | File,
        alt: string,
        id: string,
    }

    let embed: AppBskyEmbedImages.Main | AppBskyEmbedRecord.Main | AppBskyEmbedRecordWithMedia.Main | AppBskyEmbedExternal.Main | undefined;
    let embedImages: AppBskyEmbedImages.Main = {
        $type: 'app.bsky.embed.images',
        images: [],
    };
    let embedRecord: AppBskyEmbedRecord.Main;
    let embedRecordWithMedia: AppBskyEmbedRecordWithMedia.Main;
    let embedExternal: AppBskyEmbedExternal.Main | undefined = post.embedExternal || undefined;
    let lang: string[] = [];
    let selfLabels = [];

    const images = post.images;

    if (!post.text && !images.length) {
        isEnabled = false;
        return false;
    }

    lang = post.lang === 'auto' ? await languageDetect(post.text) : [post.lang];
    selfLabels = post.selfLabels ? post.selfLabels : [];

    if (images.length) {
        const filePromises = images.map(image => {
            return uploadBlobWithCompression(image);
        });

        await Promise.all(filePromises)
            .then(results => results.forEach((result, index) => {
                embedImages.images.push({
                    image: result.data.blob,
                    alt: images[index].alt || '',
                    aspectRatio: {
                        width: images[index].width || undefined,
                        height: images[index].height || undefined,
                    }
                });
            }))
            .catch(error => {
                isEnabled = false;
                embedImages.images = [];
                throw new Error(error);
            });
    }

    if (post?.quotePost?.uri) {
        embedRecord = {
            $type: 'app.bsky.embed.record',
            record: {
                cid: post.quotePost.cid,
                uri: post.quotePost.uri,
            },
        }
    }

    if (embedImages.images.length && post?.quotePost?.uri) {
        embedRecordWithMedia = {
            $type: 'app.bsky.embed.recordWithMedia',
            media: embedImages,
            record: embedRecord,
        }

        embed = embedRecordWithMedia;
    } else if (embedExternal && post?.quotePost?.uri) {
        embedExternal.external.thumb = await uploadExternalImage(post?.externalImageBlob);
        embedRecordWithMedia = {
            $type: 'app.bsky.embed.recordWithMedia',
            media: embedExternal,
            record: embedRecord,
        }

        embed = embedRecordWithMedia;
    } else {
        if (embedImages.images.length) {
            embed = embedImages;
        }

        if (post?.quotePost?.uri) {
            embed = embedRecord;
        }

        if (embedExternal && !embedImages.images.length && !post?.quotePost?.uri) {
            embed = embedExternal;
            embed.external.thumb = await uploadExternalImage(post?.externalImageBlob);
        }
    }

    let rt: RichText | undefined;

    if (post.text) {
        rt = await detectRichTextWithEditorJson(_agent, post.text, post.json);
    }

    const shortReplyRef = post.replyRef ? {
        root: {
            cid: post.replyRef.data.root.cid,
            uri: post.replyRef.data.root.uri,
        },
        parent: {
            cid: post.replyRef.data.parent.cid,
            uri: post.replyRef.data.parent.uri,
        }
    } : undefined;

    try {
        const create = await _agent.agent.api.app.bsky.feed.post.create(
            { repo: _agent.did() as string },
            {
                embed: embed,
                facets: rt ? rt.facets : undefined,
                text: rt ? rt.text : '',
                createdAt: new Date().toISOString(),
                reply: treeReplyRef || shortReplyRef,
                via: 'TOKIMEKI',
                langs: lang.length ? lang : undefined,
                labels: selfLabels.length ? {
                    $type: 'com.atproto.label.defs#selfLabels',
                    values: selfLabels || [],
                } : undefined,
            },
        );

        if (post.threadGate !== 'everybody' && !post.replyRef) {
            let allow = [];

            if (Array.isArray(post.threadGate)) {
                allow = post.threadGate.map(item => {
                    if (item === 'mention') {
                        return {
                            $type: 'app.bsky.feed.threadgate#mentionRule',
                        }
                    } else if(item === 'following') {
                        return {
                            $type: 'app.bsky.feed.threadgate#followingRule',
                        }
                    } else {
                        return {
                            $type: 'app.bsky.feed.threadgate#listRule',
                            list: item,
                        }
                    }
                })
            }

            await _agent.agent.api.app.bsky.feed.threadgate.create(
                {
                    repo: _agent.did() as string,
                    rkey: create.uri.split('/').slice(-1)[0],
                },
                {
                    createdAt: new Date().toISOString(),
                    post: create.uri,
                    allow: allow,
                },
            );
        }

        if (rt?.facets) {
            const tags = rt.facets.map(facet => {
                if (facet?.features[0]?.tag) {
                    return facet.features[0].tag as string;
                }
            });
            let _hashtagHistory = [...tags, ...$hashtagHistory];
            _hashtagHistory = [...new Set(_hashtagHistory)];
            $hashtagHistory = _hashtagHistory.filter(v => v !== null);

            if ($hashtagHistory.length > 4) {
                $hashtagHistory = $hashtagHistory.slice(0, 4);
            }
            localStorage.setItem('hashtagHistory', JSON.stringify($hashtagHistory));
        }

        return create;
    } catch (error) {
        console.error((error as Error).message);
        toast.error($_('failed_to_post') + ':' + (error as Error).message);
        isEnabled = false;
        throw error;
    }
}

function applyAddThread(e) {
    postsPool[currentPost] = e.detail.data;
    postsPool.splice(currentPost + 1, 0, {});
    currentPost = currentPost + 1;
    setTimeout(() => {
        editor.focus();
    }, 100);
}

function applyChangeThread(e) {
    postsPool[currentPost] = getCurrentThreadData();
    currentPost = e.detail.index;
}

function applyDeleteThread(index) {
    postsPool[currentPost] = getCurrentThreadData();
    postsPool.splice(index, 1);

    if (currentPost !== 0) {
        currentPost = currentPost - 1;
    } else {
        postsPool = postsPool;
    }

    setTimeout(() => {
        editor.focus();
    }, 100);
}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if (isMobile ? isFocus && isMobilePopState : isFocus)}
  <button class="publish-sp-open publish-sp-open--close" class:publish-sp-open--vk={isVirtualKeyboard && !$settings.design?.mobilePostLayoutTop} aria-label="投稿ウィンドウを閉じる" on:click={onClose} class:publish-sp-open--left={$settings.design?.publishPosition === 'left'}>
    <svg xmlns="http://www.w3.org/2000/svg" width="16.97" height="16.97" viewBox="0 0 16.97 16.97">
      <path id="close" d="M10,8.586,2.929,1.515,1.515,2.929,8.586,10,1.515,17.071l1.414,1.414L10,11.414l7.071,7.071,1.414-1.414L11.414,10l7.071-7.071L17.071,1.515Z" transform="translate(-1.515 -1.515)" fill="var(--bg-color-1)"/>
    </svg>
  </button>
{:else}
  <button class="publish-sp-open" aria-label="投稿ウィンドウを開く" class:publish-sp-open--left={$settings.design?.publishPosition === 'left'} on:click={handleOpen}>
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <path id="edit-pencil" d="M12.3,3.7l4,4L4,20H0V16Zm1.4-1.4L16,0l4,4L17.7,6.3l-4-4Z" fill="var(--bg-color-1)"/>
    </svg>
  </button>
{/if}

<section class="publish-group"
         class:publish-group--expanded={isMobile ? isFocus && isMobilePopState : isFocus}
         class:publish-group--left={$settings.design?.publishPosition === 'left'}
         class:publish-group--bottom={$settings.design?.publishPosition === 'bottom'}
         class:vk-publish-group={isVirtualKeyboard && !$settings.design?.mobilePostLayoutTop}
         use:clickOutside={{ignoreElement: '.publish-sp-open'}}
         on:outclick={handleOutClick}
>
  <div class="publish-wrap">
    <div class="publish-buttons">
      {#if (!isEnabled)}
        <button class="publish-draft-button publish-save-draft" on:click={saveDraft} disabled={postsPool.length > 1}>{$_('drafts_save')}</button>
      {:else}
        <button class="publish-draft-button publish-view-draft" on:click={() => {isDraftModalOpen = true}} disabled={postsPool.length > 1}>{$_('drafts')}</button>
      {/if}

      <div class="publish-form-continue-mode">
        <div class="publish-form-continue-mode-input" class:checked={isContinueMode}>
          <input id="continue_mode" type="checkbox" bind:checked={isContinueMode}>
          <label for="continue_mode">{$_('continuous_mode')}</label>
        </div>
      </div>

      <button class="publish-form__submit" class:publish-form__submit--hide={isVirtualKeyboard && !$settings.design?.mobilePostLayoutTop} on:click={publishAll} disabled={isEnabled}>{$_('publish_button_send')}</button>

      <button class="publish-form-sp-close" on:click={onClose}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>

    {#key unique}
      {#key currentPost}
        {#each postsPool as post, index}

          <div class="publish-item-wrap">
            {#if (index > 0)}
              <button class="publish-item-delete" on:click={() => {applyDeleteThread(index)}} aria-label="delete"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
            {/if}

            {#if (index === currentPost)}
              <PublishMain
                      {post}
                      bind:_agent={_agent}
                      on:focus={handleOpen}
                      on:add={applyAddThread}
                      on:publish={publishAll}
                      bind:getThread={getCurrentThreadData}
                      bind:editor={editor}
                      bind:isEnabled={isEnabled}
                      length={postsPool.length}
              ></PublishMain>
            {:else}
              <PublishPool {post} {index} bind:_agent={_agent} on:change={applyChangeThread} isEnabled={isPublishing}></PublishPool>
            {/if}
          </div>

        {/each}
      {/key}
    {/key}
  </div>

  {#if (isDraftModalOpen)}
    <DraftModal {_agent} on:use={handleDraftUse} on:close={() => {isDraftModalOpen = false}}></DraftModal>
  {/if}
</section>

<style lang="postcss">
    .publish-sp-open {
        display: flex;
        position: fixed;
        right: 20px;
        bottom: calc(20px + env(keyboard-inset-height, 0px) + var(--safe-area-bottom));
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background-color: var(--primary-color);
        align-items: center;
        justify-content: center;
        z-index: 2001;

        @media (max-width: 767px) {
            display: flex;
        }

        &--left {
            @media (min-width: 768px) {
                display: none;
            }
        }

        &--vk {
            @media (max-width: 767px) {
                display: none;
            }
        }
    }

    .publish-buttons {
        max-width: 740px;
        margin: 0 auto;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        width: 100%;
        flex-wrap: wrap;
        padding-bottom: 12px;

        @media (max-width: 767px) {
            padding: 12px 12px 8px;
        }
    }

    .publish-form__submit {
        z-index: 12;

        @media (max-width: 767px) {
            order: 3;
        }
    }

    .publish-form-continue-mode {
        margin-right: 20px;

        @media (max-width: 767px) {
            display: none;
        }
    }

    .publish-form-continue-mode-input {
        border: 1px solid var(--border-color-1);
        color: var(--text-color-3);
        padding: 0 10px;
        font-size: 14px;
        height: 30px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        cursor: pointer;
        position: relative;

        label {
            cursor: pointer;

            &::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                right: 0;
            }
        }

        &::before {
            content: '';
            display: block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: var(--border-color-1);
        }

        &.checked {
            border-color: var(--primary-color);
            color: var(--primary-color);

            &::before {
                background-color: var(--primary-color);
            }
        }
    }

    .publish-draft-button {
        position: relative;
        height: 30px;
        border-radius: 4px;
        z-index: 12;
        color: var(--primary-color);
        font-weight: bold;
        padding: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        letter-spacing: .025em;
        gap: 5px;
        white-space: nowrap;
        margin-right: auto;

        &:hover {
            opacity: .7;
        }

        &:disabled {
            color: var(--border-color-1);

            &:hover {
                opacity: 1;
            }
        }

        @media (max-width: 767px) {

        }
    }

    .publish-form-sp-close {
        height: 30px;
        width: 30px;
        display: none;
        place-content: center;

        @media (min-width: 768px) {
            display: none;
        }
    }

    .publish-item-wrap {
        position: relative;
    }

    .publish-item-delete {
        position: absolute;
        right: 4px;
        top: 4px;
        z-index: 1;
    }

    .vk-publish-group {
        .publish-wrap {
            @media (max-width: 767px) {
                padding-bottom: 46px;
            }
        }
    }
</style>