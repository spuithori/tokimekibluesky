<script lang="ts">
import { _ } from 'svelte-i18n';
import {agent, agents, isPublishInstantFloat, quotePost, replyRef, settings} from '$lib/stores';
import {selfLabels, isPublishFormExpand} from "$lib/components/editor/publishStore";
import { fly } from 'svelte/transition';
import { clickOutside } from '$lib/clickOutSide';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
    RichText,
    AppBskyEmbedImages,
    AppBskyEmbedRecord,
    AppBskyEmbedRecordWithMedia,
    AppBskyEmbedExternal
} from '@atproto/api';
import toast from 'svelte-french-toast'
import { goto } from '$app/navigation';
import { db } from '$lib/db';
import DraftModal from "$lib/components/draft/DraftModal.svelte";
import AltModal from "$lib/components/alt/AltModal.svelte";
import spinner from '$lib/images/loading.svg';
import ThreadMembersList from "$lib/components/publish/ThreadMembersList.svelte";
import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
import {getAccountIdByDid} from "$lib/util";
import type { Draft } from '$lib/db';
import Tiptap from "$lib/components/editor/Tiptap.svelte";
import {detectRichTextWithEditorJson} from "$lib/components/editor/richtext";
import ImageUpload from "$lib/components/editor/ImageUpload.svelte";
import imageCompression from 'browser-image-compression';
import {X} from "lucide-svelte";
import {acceptedImageType} from "$lib/components/editor/imageUploadUtil";

let _agent = $agent;
let publishContent = '';
let publishContentJson;
let editor;
let isTextareaEnabled = false;
let isPublishEnabled = false;
let isAccountSelectDisabled = false;
let isFocus = false;
let publishArea: HTMLTextAreaElement;
let timer: ReturnType<typeof setTimeout> | undefined;
let links: string[] = [];
let externalImageBlob: string = '';
let isContinueMode = false;
let isPublishUploadClose = false;
let isDraftModalOpen = false;
let isAltModalOpen = false;
let isLinkCardAdding = false;
let mentionsHistory = JSON.parse(localStorage.getItem('mentionsHistory')) || [];
let imageUploadEl;
let isDragover = 0;

const isMobile = navigator?.userAgentData?.mobile || false;

if ('virtualKeyboard' in navigator) {
    navigator.virtualKeyboard.overlaysContent = true;
}

type BeforeUploadImage = {
    image: Blob | File,
    alt: string,
    id: string,
}
let images = [];

let embed: AppBskyEmbedImages.Main | AppBskyEmbedRecord.Main | AppBskyEmbedRecordWithMedia.Main | AppBskyEmbedExternal.Main | undefined;
let embedImages: AppBskyEmbedImages.Main = {
    $type: 'app.bsky.embed.images',
    images: [],
};
let embedRecord: AppBskyEmbedRecord.Main;
let embedRecordWithMedia: AppBskyEmbedRecordWithMedia.Main;
let embedExternal: AppBskyEmbedExternal.Main | undefined;
let lang: string[] = [];

if (!$settings.langSelector) {
    $settings.langSelector = 'auto';
}

$: publishContentLength = new RichText({text: publishContent}).graphemeLength;
$: onPublishContentChange(publishContent);
$: isPublishEnabled = publishContentLength > 300;

function onPublishContentChange(text) {
    clearTimeout(timer);
    timer = setTimeout(async () => {
        detectRichText(text)
            .then(result => {
                links = [];

                if (result.facets) {
                    result.facets.forEach(facet => {
                        if (facet.features && facet.features[0]['$type'] === 'app.bsky.richtext.facet#link' && !links.includes(facet.features[0].uri)) {
                            links.push(facet.features[0].uri);
                            links = links;
                        }
                    })
                }
            });
    }, 200);
}

async function detectRichText(text: string) {
    const rt = new RichText({text: text});
    await rt.detectFacets(_agent.agent);

    return rt;
}

function uploadContextOpen() {
    imageUploadEl.open();
}

function handleOpen() {
    if (!isFocus) {
        isFocus = true;
    }

    setTimeout(() => {
      editor.focus();
    }, 100);

    if (isMobile) {
        goto('#post', {noScroll: true});
    }
}

function onClose() {
    if (isFocus) {
        isFocus = false;
        editor.blur();

        if (isMobile && window.location.hash === '#post') {
            history.back();
        }
    }
}

function handlePopstate(e: PopStateEvent) {
    if (isFocus) {
        isFocus = false;
    }
}

function onFileAdded(_file: unknown) {
    isPublishEnabled = true;
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

async function getReplyRefByUri() {
    if (!$replyRef) {
        return false;
    }

    const res = await _agent.getFeed($replyRef.data);
    let root = res.parent;
    while (root.parent) {
        root = root.parent;
    }

    $replyRef.data = {
        parent: res.post,
        root: root.post,
    }
}

async function addLinkCard(uri: string) {
    isLinkCardAdding = true;

    try {
        const res = await fetch('https://tokimeki-api.vercel.app/api/ogp?url=' + encodeURIComponent(uri));
        const data = await res.json();

        embedExternal = {
            $type: 'app.bsky.embed.external',
            external: {
                uri: uri,
                title: data.title || '',
                description: data.description || '',
            }
        }

        if (data.imageBase64) {
            externalImageBlob = data.imageBase64;
        } else {
            externalImageBlob = '';
        }

        isLinkCardAdding = false;
    } catch (e) {
        toast.error('Error!' + e);
        isLinkCardAdding = false;
    }
}

$: {
    if (!isFocus) {
        embedImages.images = [];
    }

    if ($replyRef) {
        if (typeof $replyRef.data === 'string') {
            getReplyRefByUri();
        }
    }
}

$: quotePostObserve($quotePost);
$: replyRefObserve($replyRef);

function quotePostObserve(quotePost) {
    if (quotePost?.uri) {
        handleOpen();
        embedRecord = {
            $type: 'app.bsky.embed.record',
            record: $quotePost,
        }
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

async function handlePaste(e) {
    const itemsList = e.clipboardData.items;
    await uploadImageFromFileList(itemsList);
}

async function handleDrop(e) {
    isDragover = 0;
    const itemsList = e.dataTransfer.items;
    await uploadImageFromFileList(itemsList);
}

async function uploadImageFromFileList(itemsList: FileList) {
    isPublishEnabled = true;
    const items = Array.from(itemsList).slice(0, 4);
    let promises = [];

    for (const item of items) {
        if (acceptedImageType.includes(item.type)) {
            promises = [...promises, imageUploadEl.applyImageFromFile(item.getAsFile())]
        }
    }

    await Promise.all(promises);
    isPublishEnabled = false;
}

function handleDragover(e) {
  isDragover = isDragover + 1;
}

function handleDragleave(e) {
  isDragover = isDragover - 1;
}

function handleOutClick() {
    if (!isContinueMode) {
        onClose();
    }
}

async function saveDraft() {
    try {
        const id = await db.drafts.add({
            createdAt: Date.now(),
            text: publishContent,
            json: publishContentJson,
            quotePost: $quotePost || undefined,
            replyRef: $replyRef || undefined,
            images: images,
            owner: _agent.did() as string,
        });

        if (!isContinueMode) {
            isFocus = false;
        }
        editor.clear();
        quotePost.set(undefined);
        replyRef.set(undefined);
        embed = undefined;
        images = [];
        links = [];
        embedImages.images = [];
        embedExternal = undefined;
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
    images = [];
    links = [];

    const draft = event.detail.draft;
    editor.setContent(draft.json || draft.text);
    handleOpen();

    if (draft.images.length) {
        isPublishUploadClose = false;
        let promises = [];

        for (const image of draft.images) {
          if (image.file) {
            promises = [...promises, imageUploadEl.applyImageFromFile(image.file, image.alt)];
          }

          if (image.image) {
            promises = [...promises, imageUploadEl.applyImageFromFile(image.image)];
          }
        }

        await Promise.all(promises);
    }

    if (draft.quotePost) {
        quotePost.set(draft.quotePost);
    }

    if (draft.replyRef) {
        if (draft.replyRef.did) {
            replyRef.set(draft.replyRef);
        } else {
            replyRef.set({
                did: _agent.did(),
                data: draft.replyRef,
            })
        }
    }
}

function handleAltClose(event: CustomEvent<{ images: BeforeUploadImage[] }>) {
    images = event.detail.images;
    isAltModalOpen = false;
    editor.focus();
}

async function languageDetect(text = publishContent) {
    try {
        const res = await fetch(`/api/language-detect`, {
            method: 'post',
            body: JSON.stringify({
                text: text,
            })
        });
        const langs = await res.json() as { lang: string; }[];

        if (langs.length) {
            lang = langs.map(lg => lg.lang);
        } else {
            lang = [];
        }
    } catch (e) {
        console.error(e);
        lang = [];
    }
}

async function uploadBlobWithCompression(image) {
  const compressed = await imageCompression(image.file, {
    maxSizeMB: 0.92,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
  });

  return await _agent.agent.api.com.atproto.repo.uploadBlob(image.isGif ? image.file : compressed, {
    encoding: 'image/jpeg',
  });
}

async function publish() {
    if (isPublishEnabled) {
        return false;
    }

    isTextareaEnabled = true;
    isPublishEnabled = true;

    if (!publishContent && !images.length) {
        isTextareaEnabled = false;
        isPublishEnabled = false;
        return false;
    }

    if (images.length) {
        const filePromises = images.map(image => {
            return uploadBlobWithCompression(image);
        });

        const promise = Promise.all(filePromises)
            .then(results => results.forEach((result, index) => {
                embedImages.images.push({
                    image: result.data.blob,
                    alt: images[index].alt || '',
                });
            }))
            .catch(error => {
                isTextareaEnabled = false;
                isPublishEnabled = false;
                embedImages.images = [];
                throw new Error(error);
            })

        await toast.promise(promise, {
            loading: $_('images_uploading'),
            success: $_('images_upload_success'),
            error: $_('images_upload_failed')
        })
    }

    if (embedImages.images.length && $quotePost?.uri) {
        embedRecordWithMedia = {
            $type: 'app.bsky.embed.recordWithMedia',
            media: embedImages,
            record: embedRecord,
        }

        embed = embedRecordWithMedia;
    } else {
        if (embedImages.images.length) {
            embed = embedImages;
        }

        if ($quotePost?.uri) {
            embed = embedRecord;
        }

        if (embedExternal && !embedImages.images.length && !$quotePost?.uri) {
            if (externalImageBlob) {
                try {
                    const imageRes = await fetch(externalImageBlob);
                    const blob = await imageRes.blob();

                    const res = await _agent.agent.api.com.atproto.repo.uploadBlob(blob, {
                        encoding: 'image/jpeg',
                    });
                    embedExternal.external.thumb = res.data.blob;
                } catch (e) {
                    toast.error(e);
                }
            }
            embed = embedExternal;
        }
    }

    let rt: RichText | undefined;

    if (publishContent) {
        rt = await detectRichTextWithEditorJson(_agent, publishContent, publishContentJson);
    }

    if (!$settings.langSelector || $settings.langSelector === 'auto') {
        await languageDetect(publishContent);
    } else {
        lang = [ $settings.langSelector ];
    }

    const shortReplyRef = $replyRef ? {
        root: {
            cid: $replyRef.data.root.cid,
            uri: $replyRef.data.root.uri,
        },
        parent: {
            cid: $replyRef.data.parent.cid,
            uri: $replyRef.data.parent.uri,
        }
    } : undefined;

    try {
        await _agent.agent.api.app.bsky.feed.post.create(
            { repo: _agent.did() as string },
            {
                embed: embed,
                facets: rt ? rt.facets : undefined,
                text: rt ? rt.text : '',
                createdAt: new Date().toISOString(),
                reply: shortReplyRef,
                via: 'TOKIMEKI',
                langs: lang.length ? lang : undefined,
                labels: $selfLabels.length ? {
                    $type: 'com.atproto.label.defs#selfLabels',
                    values: $selfLabels || [],
                } : undefined,
            },
        );
        toast.success($_('success_to_post'));
    } catch (error) {
        console.error((error as Error).message);
        toast.error($_('failed_to_post') + ':' + (error as Error).message);
        isTextareaEnabled = false;
        isPublishEnabled = false;
        throw error;
    }

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

    isTextareaEnabled = false;
    isPublishEnabled = false;
    if (!isContinueMode) {
        onClose();
    }
    editor.clear();
    quotePost.set(undefined);
    replyRef.set(undefined);
    embed = undefined;
    images = [];
    links = [];
    embedImages.images = [];
    embedExternal = undefined;
    externalImageBlob = '';
    selfLabels.set([]);
    $isPublishInstantFloat = false

    if (isContinueMode) {
        setTimeout(() => {
            editor.focus();
        }, 100)
    }
}

function handleAgentSelect(event) {
    _agent = event.detail.agent;
}

</script>

<svelte:window on:keydown={handleKeydown} on:popstate={handlePopstate} />
<svelte:document on:paste={handlePaste} />

{#if (isFocus)}
  <button class="publish-sp-open" aria-label="投稿ウィンドウを閉じる" on:click={onClose} class:publish-sp-open--left={$settings.design?.publishPosition === 'left'}>
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
         class:publish-group--expanded={isFocus}
         class:publish-group--left={$settings.design?.publishPosition === 'left'}
         use:clickOutside={{ignoreElement: '.publish-sp-open'}}
         on:outclick={handleOutClick}
>
  <div class="publish-wrap">
    <div class="publish-wrap-container">
      <div class="publish-buttons">
        {#if (publishContent)}
          <button class="publish-draft-button publish-save-draft" on:click={saveDraft} disabled={isPublishEnabled}>{$_('drafts_save')}</button>
        {:else}
          <button class="publish-draft-button publish-view-draft" on:click={() => {isDraftModalOpen = true}}>{$_('drafts')}</button>
        {/if}

        <p class="publish-length">
          <span class="publish-length__current" class:over={publishContentLength > 300}>{publishContentLength}</span> / 300
        </p>


        <div class="publish-form-continue-mode">
          <div class="publish-form-continue-mode-input" class:checked={isContinueMode}>
            <input id="continue_mode" type="checkbox" bind:checked={isContinueMode}>
            <label for="continue_mode">{$_('continuous_mode')}</label>
          </div>
        </div>

        <button class="publish-form__submit" on:click={publish} disabled={isPublishEnabled}>{$_('publish_button_send')}</button>
      </div>

      {#if $agents.size > 1}
        <div class="publish-form-agents-selector">
          <AgentsSelector
                  {_agent}
                  isDisabled={isAccountSelectDisabled}
                  on:select={handleAgentSelect}
                  style={'publish'}
          ></AgentsSelector>
        </div>
      {/if}

      {#if ($replyRef && typeof $replyRef !== 'string')}
        <div class="publish-quote publish-quote--reply">
          <button class="publish-quote__delete" on:click={() => {replyRef.set(undefined); isPublishInstantFloat.set(false);}}>
            <X color="#fff" size="18"></X>
          </button>

          <div class="timeline-external timeline-external--record timeline-external--record-publish">
            <div class="timeline-external__image timeline-external__image--round">
              {#if ($replyRef.data.parent.author.avatar)}
                <img src="{$replyRef.data.parent.author.avatar}" alt="">
              {/if}
            </div>

            <div class="timeline-external__content">
              <div class="timeline__meta timeline__meta--member">
                <p class="timeline__user">{$replyRef.data.parent.author.displayName || $replyRef.data.parent.author.handle}</p>

                <ThreadMembersList uri={$replyRef.data.parent.uri} {_agent}></ThreadMembersList>
              </div>

              <p class="timeline-external__description">
                {$replyRef.data.parent.record.text}
              </p>
            </div>

            <span class="timeline-external__icon">

            </span>
          </div>
        </div>
      {/if}

      <div class="publish-form"
           class:publish-form--expand={$isPublishFormExpand}
           class:publish-form--dragover={isDragover}
           on:dragover|preventDefault
           on:drop|preventDefault={handleDrop}
           on:dragenter|preventDefault={handleDragover}
           on:dragleave|preventDefault={handleDragleave}
      ><Tiptap
              bind:text={publishContent}
              bind:json={publishContentJson}
              bind:this={editor}
              on:publish={() => {publish()}}
              on:focus={handleOpen}
              on:upload={uploadContextOpen}
      >
        <div class="publish-upload">
          {#if (images.length)}
            <button class="publish-alt-text-button" on:click={() => {isAltModalOpen = true}}>
              <span class="ai-label">AI</span>
              {$_('add_alt_text')}
            </button>
          {/if}

          <ImageUpload
                  bind:this={imageUploadEl}
                  bind:images={images}
                  on:preparestart={() => {isPublishEnabled = true}}
                  on:prepareend={() => {isPublishEnabled = false}}
          ></ImageUpload>

          {#if $quotePost?.uri}
            <div class="publish-quote">
              <button class="publish-quote__delete" on:click={() => {quotePost.set(undefined); isPublishInstantFloat.set(false);}}>
                <X color="#fff" size="18"></X>
              </button>

              <div class="timeline-external timeline-external--record timeline-external--record-publish-quote">
                <div class="timeline-external__image timeline-external__image--round">
                  {#if ($quotePost.author.avatar)}
                    <img src="{$quotePost.author.avatar}" alt="">
                  {/if}
                </div>

                <div class="timeline-external__content">
                  <div class="timeline__meta">
                    <p class="timeline__user" title="{$quotePost.author.handle}">{ $quotePost.author.displayName || $quotePost.author.handle }</p>
                    <p class="timeline__date">{formatDistanceToNow(parseISO($quotePost.record.createdAt))}</p>
                  </div>

                  <p class="timeline-external__description">
                    {$quotePost.record.text}
                  </p>
                </div>

                <span class="timeline-external__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28.705" height="25.467" viewBox="0 0 28.705 25.467">
              <path id="パス_3" data-name="パス 3" d="M-21.352-46.169H-9.525v6.82A26.369,26.369,0,0,1-16.777-20.7h-5.266A26.721,26.721,0,0,0-15.7-34.342h-5.655Zm16.273,0H6.662v6.82A26.079,26.079,0,0,1-.59-20.7H-5.77A25.477,25.477,0,0,0,.489-34.342H-5.079Z" transform="translate(22.043 46.169)" fill="var(--primary-color)"/>
            </svg>
            </span>
              </div>
            </div>
          {/if}

          {#if (embedExternal && !images.length && !$quotePost?.uri)}
            <div class="publish-quote publish-quote--external">
              <button class="publish-quote__delete" on:click={() => {embedExternal = undefined; externalImageBlob = ''}}>
                <X color="#fff" size="18"></X>
              </button>

              <div class="timeline-external timeline-external--record">
                <div class="timeline-external__image">
                  {#if (externalImageBlob)}
                    <img src="{externalImageBlob}" alt="">
                  {/if}
                </div>

                <div class="timeline-external__content">
                  <p class="timeline-external__title"><a href="{embedExternal.external.uri}" target="_blank" rel="noopener nofollow noreferrer">{embedExternal.external.title}</a></p>
                  <p class="timeline-external__description">{embedExternal.external.description}</p>
                  <p class="timeline-external__url">{embedExternal.external.uri}</p>
                </div>
              </div>
            </div>
          {/if}

          {#if (!embedExternal && links.length && !images.length && !$quotePost?.uri)}
            <div class="link-card-registerer">
              {#each links as link}
                <button
                        disabled={isLinkCardAdding}
                        class="link-card-registerer-button"
                        on:click={() => {addLinkCard(link)}}
                >
                  {#if (isLinkCardAdding)}
                    <img class="loading-spinner" src={spinner} alt="">
                  {/if}
                  {$_('link_card_embed')}: {link}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </Tiptap>
      </div>
    </div>
  </div>
</section>

{#if (isAltModalOpen)}
  <AltModal images={images} on:close={handleAltClose}></AltModal>
{/if}

{#if (isDraftModalOpen)}
  <DraftModal {_agent} on:use={handleDraftUse} on:close={() => {isDraftModalOpen = false}}></DraftModal>
{/if}

<style lang="postcss">
    .publish-group {
        position: fixed;
        left: 0;
        bottom: 0;
        right: 0;
        z-index: 2000;

        @media (max-width: 767px) {
            overflow: auto;
            overscroll-behavior: contain;
            z-index: 2000;
        }

        &--expanded {
            .publish-wrap {
                display: block;
            }

            @media (max-width: 767px) {
                top: 0;

                .publish-wrap {
                   display: flex;
                }
            }
        }

        &--left {
            @media (min-width: 768px) {
                top: 0;
                right: auto;
                z-index: 100;
                position: static;
                height: 100%;

                .publish-wrap {
                    display: flex;
                    flex-direction: column;
                    width: auto;
                    border-top: none;
                    padding: 16px;
                    background-color: transparent;
                }

                .publish-form {
                    &--expand {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                    }
                }

                .publish-form-continue-mode {
                    display: none;
                }

                .publish-alt-text-button {
                    position: static;
                    width: 100%;
                }
            }
        }
    }

    .publish-wrap {
        background-color: var(--publish-bg-color);
        border-top: 1px solid var(--border-color-1);
        padding: 16px 0 0;
        display: none;

        @media (max-width: 767px) {
            display: none;
            flex-direction: column;
            padding: 16px 16px 90px;
            background-color: var(--bg-color-1);
            border: 1px solid var(--border-color-1);
            border-radius: 0;
            min-height: calc(100% + 1px);
        }
    }

    .publish-wrap-container {
        max-width: 740px;
        width: 100%;
        margin: 0 auto;
    }

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
    }

    .publish-buttons {
        max-width: 740px;
        margin: 0 auto 10px;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        width: 100%;
        flex-wrap: wrap;

        @media (max-width: 767px) {
          margin-bottom: 16px;
        }
    }

    .publish-upload {
        padding: 0 8px;
        background-color: var(--publish-textarea-bg-color);
    }

    .publish-quote {
        position: relative;

        &--reply {
          .publish-quote__delete {
            top: 0;
            right: 0;
          }
        }

        .timeline__date {
            &::after {
                content: none;
            }
        }

        &__delete {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, .5);
            display: grid;
            place-content: center;
            position: absolute;
            right: 8px;
            top: 8px;
            z-index: 12;
        }
    }

    .publish-form__submit {
        z-index: 12;

        @media (max-width: 767px) {
            order: 3;
        }
    }

    .link-card-registerer {
        display: flex;
        flex-direction: column;
    }

    .link-card-registerer-button {
        border: 1px solid var(--border-color-1);
        padding: 6px 26px 6px 10px;
        font-size: 14px;
        border-radius: 6px;
        margin-bottom: 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        position: relative;
        z-index: 11;
        text-align: left;
        color: var(--text-color-1);
        background-color: var(--bg-color-1);

        &:disabled {
          color: var(--text-color-3);
        }

        .loading-spinner {
            width: 16px;
            height: 16px;
            position: absolute;
            right: 10px;
            top: 0;
            bottom: 0;
            margin: auto;
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
        font-weight: 600;
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

        @media (max-width: 767px) {

        }
    }

    .publish-alt-text-button {
        background-color: var(--primary-color);
        color: var(--bg-color-1);
        border-radius: 4px;
        font-size: 14px;
        width: 100%;
        height: 30px;
        z-index: 10;
        font-weight: bold;
        transition: opacity .2s ease-in-out, transform .05s ease-in-out;
        margin-bottom: 8px;

        &:hover {
            opacity: .8;
        }

        &:active {
            transform: scale(.99);
        }

        @media (max-width: 767px) {
            position: relative;
            top: auto;
            left: auto;
            width: 100%;
        }
    }

    .publish-form-agents-selector {

    }

    .publish-length {
        color: var(--publish-length-color);
        display: flex;
        align-items: center;
        margin-right: 8px;

        @media (max-width: 767px) {

        }

        &__current {
            &.over {
                font-weight: 600;
                color: var(--danger-color);
            }
        }
    }

    .ai-label {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        background-color: rgba(0, 0, 0, .2);
        color: var(--bg-color-1);
        letter-spacing: .1em;
        font-weight: bold;
        font-size: 12px;
        line-height: 1.05;
        height: 20px;
        border-radius: 10px;
        padding: 0 8px 0 10px;
        margin-right: 2px;
    }
</style>