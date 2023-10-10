<script lang="ts">
import { _ } from 'svelte-i18n';
import {agent, agents, isPublishInstantFloat, quotePost, replyRef, settings} from '$lib/stores';
import {selfLabels, isPublishFormExpand} from "$lib/components/editor/publishStore";
import FilePond, { registerPlugin } from 'svelte-filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview'
import FilePondPluginImageResize from 'filepond-plugin-image-resize';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import FilePondPluginImageTransform from 'filepond-plugin-image-transform';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
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

registerPlugin(FilePondPluginImageResize);
registerPlugin(FilePondPluginImagePreview);
registerPlugin(FilePondPluginFileValidateSize);
registerPlugin(FilePondPluginImageTransform);
registerPlugin(FilePondPluginFileValidateType);

let _agent = $agent;
let publishContent = '';
let publishContentJson;
let editor;
let isTextareaEnabled = false;
let isPublishEnabled = false;
let isAccountSelectDisabled = false;
let pond: any;
let name = 'filepond';
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

const isMobile = navigator?.userAgentData?.mobile || false;

if ('virtualKeyboard' in navigator) {
    navigator.virtualKeyboard.overlaysContent = true;
}

type BeforeUploadImage = {
    image: Blob | File,
    alt: string,
    id: string,
}
let images: BeforeUploadImage[] = [];

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
    pond.browse();
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

async function onFileSelected(file: any, output: any) {
    let image = new File([await output], output.name, {
        type: output.type,
    });

    images.push({
        image: image,
        alt: '',
        id: file.id,
    });
    images = images;

    isPublishEnabled = false;
}

function onFileDeleted(_error: any, file: any) {
    images = images.filter((image) => image.id !== file.id );
    images = images;
}

async function onFileReordered(files: { id: string }[], _origin: unknown, _target: unknown) {
    const sorter = files.map(file => file.id);
    images.sort((a, b) => {
        return sorter.indexOf(a.id) - sorter.indexOf(b.id);
    });
    images = images;
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

function handlePaste(e) {
    if (e.target === publishArea) {
        const items = e.clipboardData.items;

        for (const item of items) {
            if (item.type === 'image/png' || item.type === 'image/jpeg') {
                pond.addFile(item.getAsFile());
            }
        }
    }
}

function publishUploadClose() {
    if (pond) {
        pond.removeFiles();
    }

    isPublishUploadClose = true;
    toast.success($_('publish_upload_close_description'));
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
        if (pond) {
            pond.removeFiles();
        }
        embedImages.images = [];
        embedExternal = undefined;
        $isPublishInstantFloat = false;

        toast.success($_('draft_add_success'));
    } catch (e) {
        toast.error($_('error') + ': ' + e);
    }
}

function handleDraftUse(event: CustomEvent<{ draft: Draft }>) {
    isDraftModalOpen = false;
    editor.clear();
    quotePost.set(undefined);
    replyRef.set(undefined);
    images = [];
    links = [];
    if (pond) {
        pond.removeFiles();
    }

    const draft = event.detail.draft;
    editor.setContent(draft.json || draft.text);
    handleOpen();

    if (draft.images.length) {
        isPublishUploadClose = false;

        setTimeout(() => {
            for (const image of draft.images) {
                if (image.image.type === 'image/png' || image.image.type === 'image/jpeg') {
                    pond.addFile(image.image);
                }
            }
        }, 250)
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

async function publish() {
    isTextareaEnabled = true;
    isPublishEnabled = true;

    if (!publishContent && !images.length) {
        isTextareaEnabled = false;
        isPublishEnabled = false;
        return false;
    }

    if (images.length) {
        const filePromises = images.map(image => {
            return _agent.agent.api.com.atproto.repo.uploadBlob(image.image, {
                encoding: 'image/jpeg',
            });
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
    if (pond) {
        pond.removeFiles();
    }
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

        <button class="publish-upload-toggle" on:click={uploadContextOpen}><svg xmlns="http://www.w3.org/2000/svg" width="30" height="24" viewBox="0 0 30 24" fill="var(--bg-color-1)">
            <path id="photo" d="M0,67a3.009,3.009,0,0,1,3-3H27a3,3,0,0,1,3,3h0V85a3,3,0,0,1-3,3H3a3,3,0,0,1-3-3H0ZM16.5,80.5,12,76,3,85H27l-7.5-7.5Zm6-6a3,3,0,0,0,0-6h0a3,3,0,0,0,0,6Z" transform="translate(0 -64)"/>
          </svg>
        </button>
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

    <div class="publish-form" class:publish-form--expand={$isPublishFormExpand}>
      {#if $quotePost?.uri}
        <div class="publish-quote">
          <button class="publish-quote__delete" on:click={() => {quotePost.set(undefined); isPublishInstantFloat.set(false);}}><svg xmlns="http://www.w3.org/2000/svg" width="16.97" height="16.97" viewBox="0 0 16.97 16.97">
            <path id="close" d="M10,8.586,2.929,1.515,1.515,2.929,8.586,10,1.515,17.071l1.414,1.414L10,11.414l7.071,7.071,1.414-1.414L11.414,10l7.071-7.071L17.071,1.515Z" transform="translate(-1.515 -1.515)" fill="var(--text-color-1)"/>
          </svg>
          </button>

          <div class="timeline-external timeline-external--record timeline-external--record-publish">
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
          <button class="publish-quote__delete" on:click={() => {embedExternal = undefined; externalImageBlob = ''}}><svg xmlns="http://www.w3.org/2000/svg" width="16.97" height="16.97" viewBox="0 0 16.97 16.97">
            <path id="close" d="M10,8.586,2.929,1.515,1.515,2.929,8.586,10,1.515,17.071l1.414,1.414L10,11.414l7.071,7.071,1.414-1.414L11.414,10l7.071-7.071L17.071,1.515Z" transform="translate(-1.515 -1.515)" fill="var(--text-color-1)"/>
          </svg>
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

      {#if ($replyRef && typeof $replyRef !== 'string')}
        <div class="publish-quote publish-quote--reply">
          <button class="publish-quote__delete" on:click={() => {replyRef.set(undefined); isPublishInstantFloat.set(false);}}><svg xmlns="http://www.w3.org/2000/svg" width="16.97" height="16.97" viewBox="0 0 16.97 16.97">
            <path id="close" d="M10,8.586,2.929,1.515,1.515,2.929,8.586,10,1.515,17.071l1.414,1.414L10,11.414l7.071,7.071,1.414-1.414L11.414,10l7.071-7.071L17.071,1.515Z" transform="translate(-1.515 -1.515)" fill="var(--text-color-1)"/>
          </svg>
          </button>

          <div class="timeline-external timeline-external--record timeline-external--record-publish">
            <div class="timeline-external__image timeline-external__image--round">
              {#if ($replyRef.data.parent.author.avatar)}
                <img src="{$replyRef.data.parent.author.avatar}" alt="">
              {/if}
            </div>

            <div class="timeline-external__content">
              <div class="timeline__meta timeline__meta--member">
                <p class="timeline__user">{$_('reply_to', {values: {name: $replyRef.data.parent.author.displayName || $replyRef.data.parent.author.handle }})}</p>

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

      <Tiptap
          bind:text={publishContent}
          bind:json={publishContentJson}
          bind:this={editor}
          on:publish={() => {publish()}}
      ></Tiptap>
    </div>

    {#if (!isPublishUploadClose)}
      <div class="publish-upload" transition:fly="{{ y: 30, duration: 250 }}">
        <button class="publish-upload-close" aria-hidden="true" on:click={publishUploadClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16.97" height="16.97" viewBox="0 0 16.97 16.97">
            <path id="close" d="M10,8.586,2.929,1.515,1.515,2.929,8.586,10,1.515,17.071l1.414,1.414L10,11.414l7.071,7.071,1.414-1.414L11.414,10l7.071-7.071L17.071,1.515Z" transform="translate(-1.515 -1.515)" fill="var(--text-color-1)"/>
          </svg>
        </button>

        {#if (images.length)}
          <button class="publish-alt-text-button" on:click={() => {isAltModalOpen = true}}>{$_('add_alt_text')}</button>
        {/if}

        <FilePond
            bind:this={pond}
            {name}
            allowMultiple={true}
            allowReorder={true}
            allowPaste={false}
            maxFiles={4}
            maxParallelUploads={4}
            imageResizeTargetWidth={2000}
            imageResizeTargetHeight={2000}
            imageResizeMode={'contain'}
            acceptedFileTypes={'image/jpeg, image/png, image/webp'}
            imageTransformOutputMimeType={'image/jpeg'}
            imageTransformOutputQuality={'75'}
            onpreparefile={(file, output) => {onFileSelected(file, output)}}
            onremovefile="{(error, file) => {onFileDeleted(error, file)}}"
            onaddfilestart={(file) => {onFileAdded(file)}}
            onreorderfiles={(files, origin, target) => {onFileReordered(files, origin, target)}}
            credits={null}
            labelIdle="<span class='only-pc'>{$_('upload_image_label1')}<br>{$_('upload_image_label2')}</span>"
            labelMaxFileSizeExceeded="{$_('file_size_too_big')}"
            labelMaxFileSize="{$_('max_')} {'{'}filesize{'}'}"
            labelFileTypeNotAllowed="{$_('unsupported_file')}"
            fileValidateTypeLabelExpectedTypes="対応: JPG/PNG"
        />
      </div>
    {/if}
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
                    height: 100%;
                }

                .publish-form {
                    &--expand {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                    }
                }

                .publish-upload {
                    position: relative;
                    bottom: auto;
                    left: auto;
                    margin-top: 20px;
                }

                .publish-upload-close {
                    display: none;
                }

                .publish-form-continue-mode {
                    display: none;
                }

                .publish-alt-text-button {
                    position: static;
                    width: 100%;
                    margin-bottom: 10px;
                }
            }
        }
    }

    .publish-wrap {
        background-color: var(--publish-bg-color);
        border-top: 1px solid var(--border-color-1);
        padding: 20px 0 0;
        display: none;

        @media (max-width: 767px) {
            display: none;
            flex-direction: column;
            gap: 20px;
            padding: 20px 20px 90px;
            background-color: var(--bg-color-1);
            border: 1px solid var(--border-color-1);
            border-radius: 0;
            height: calc(100% + 1px);
        }
    }

    .publish-sp-open {
        display: flex;
        position: fixed;
        right: 20px;
        bottom: calc(20px + env(keyboard-inset-height, 0px));
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
    }

    .publish-upload {
        position: absolute;
        bottom: calc(100% + 20px);
        left: calc(50vw - 378px);
        width: 740px;
        max-width: 100%;
        height: 230px;
        z-index: 12;

        @media (max-width: 767px) {
            overflow: hidden;
            position: static;
            bottom: 100%;
            margin: 0 auto;
            height: auto;
            flex: 1;
        }
    }

    .publish-upload-toggle {
        display: none;
        left: calc(50vw - 440px);
        top: 20px;
        width: 40px;
        height: 40px;
        background-color: var(--bg-color-2);
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        z-index: 12;

        @media (max-width: 767px) {
            display: flex;
            margin-right: 15px;
        }
    }

    .publish-upload-toggle.shown {
        background-color: var(--primary-color);
    }

    .publish-upload-toggle.shown svg {
        fill: var(--bg-color-1);
    }

    @media (max-width: 767px) {
        .publish-upload-toggle {
            left: auto;
            right: 40px;
            top: 65px;
            width: 30px;
            height: 30px;
            padding: 6px;
            background-color: var(--primary-color);
            order: 1;
        }
    }

    .publish-quote {
        margin-bottom: 10px;
        position: relative;

        &--reply {
            .timeline-external {
                border: 2px solid var(--primary-color);
            }

        }

        .timeline__date {
            &::after {
                content: none;
            }
        }

        &__delete {
            position: absolute;
            right: 16px;
            top: 16px;
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
        background-color: var(--bg-color-1);
        color: var(--primary-color);
        border: 1px solid transparent;
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
        position: absolute;
        top: -40px;
        left: 0;
        background-color: var(--primary-color);
        color: var(--bg-color-1);
        border-radius: 4px;
        font-size: 14px;
        width: 740px;
        height: 30px;
        z-index: 10;
        font-weight: bold;
        transition: opacity .2s ease-in-out, transform .05s ease-in-out;

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
        max-width: 740px;
        width: 100%;
        margin: 0 auto;
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
</style>