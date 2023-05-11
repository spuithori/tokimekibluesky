<script lang="ts">
import { _ } from 'svelte-i18n';
import { onMount } from 'svelte';
import { agent, quotePost, replyRef, sharedText } from '$lib/stores';
import FilePond, { registerPlugin } from 'svelte-filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview'
import FilePondPluginImageResize from 'filepond-plugin-image-resize';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import FilePondPluginImageTransform from 'filepond-plugin-image-transform';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import { fade, fly } from 'svelte/transition';
import { clickOutside } from '$lib/clickOutSide';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import ja from 'date-fns/locale/ja/index';
import {
    type AppBskyFeedPost,
    RichText,
    AppBskyEmbedImages,
    AppBskyEmbedRecord,
    AppBskyEmbedRecordWithMedia,
    AppBskyFeedDefs, AppBskyEmbedExternal
} from '@atproto/api';
import toast from 'svelte-french-toast'
import { goto } from '$app/navigation';
import { db } from '$lib/db';
import DraftModal from "$lib/components/draft/DraftModal.svelte";
import AltModal from "$lib/components/alt/AltModal.svelte";

registerPlugin(FilePondPluginImageResize);
registerPlugin(FilePondPluginImagePreview);
registerPlugin(FilePondPluginFileValidateSize);
registerPlugin(FilePondPluginImageTransform);
registerPlugin(FilePondPluginFileValidateType);

let publish = function () {};
let publishContent = '';
let isTextareaEnabled = false;
let isPublishEnabled = false;
let files: any[] = [];
let pond: any;
let name = 'filepond';
let isFocus = false;
let publishArea: HTMLTextAreaElement;
let publishButtonText = $_('publish_button_send');
let timer;
let links: string[] = [];
let externalImageBlob: Blob;
let searchActors = [];
let isContinueMode = false;
let isPublishUploadClose = false;
let isDraftModalOpen = false;
let isAltModalOpen = false;

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

$: publishContentLength = new RichText({text: publishContent}).graphemeLength;
$: {
    isPublishEnabled = publishContentLength > 300;

    if (isDraftModalOpen) {
        document.body.classList.add('scroll-lock');
    } else {
        document.body.classList.remove('scroll-lock');
    }

    if (isDraftModalOpen) {
        document.body.classList.add('scroll-lock');
    } else {
        document.body.classList.remove('scroll-lock');
    }
}

function getActorTypeAhead() {
    const front = publishContent.slice(0, publishArea.selectionStart);
    const splitted = front.split(/[ \n]/g);
    const found = splitted ? splitted[splitted.length - 1].match(/@[^ ]*/g) : '';

    return found ? found[found.length - 1] : null;
}

function onPublishContentChange() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
        detectRichText(publishContent)
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

        const front = publishContent.slice(0, publishArea.selectionStart);
        const splitted = front.split(/[ \n]/g);
        const found = splitted ? splitted[splitted.length - 1].match(/@[^ ]*/g) : '';

        const mention = getActorTypeAhead();
        if (mention) {
            const res = await $agent.agent.api.app.bsky.actor.searchActorsTypeahead({term: mention.slice(1), limit: 4})
            searchActors = res.data.actors;
        } else {
            searchActors = [];
        }
    }, 250)
}

const publishKeypress = (e: { keyCode: number; ctrlKey: any; }) => {
    if (e.keyCode === 13 && e.ctrlKey) publish();
};

async function detectRichText(text) {
    const rt = new RichText({text: text});
    await rt.detectFacets($agent.agent);

    return rt;
}

function uploadContextOpen() {
    pond.browse();
}

function onFocus() {
    if (!isFocus) {
        isFocus = true;

        setTimeout(() => {
            publishArea.focus();
        }, 100)
    }
}

function onBlur() {
    //isFocus = false;
}

function close() {
    isFocus = false;
}

async function onFileAdded(file: any) {
    isPublishEnabled = true;
    publishButtonText = $_('publish_button_progress');
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
    publishButtonText = $_('publish_button_send');
}

async function onFileDeleted(error: any, file: any) {
    images = images.filter((image) => image.id !== file.id );
    images = images;
}

async function onFileReordered(files, origin, target) {
    const sorter = files.map(file => file.id);
    images.sort((a, b) => {
        return sorter.indexOf(a.id) - sorter.indexOf(b.id);
    });
    images = images;
}

function handleKeydown(event: { key: string; }) {
    const activeElement = document.activeElement?.tagName;

    if (event.key === 'n' && (activeElement === 'BODY' || activeElement === 'BUTTON')) {
        isFocus = true;
        setTimeout(() => {
            publishArea.focus();
        }, 100)
    }

    if (event.key === 'Escape' && isFocus) {
        isFocus = false;
        publishArea.blur();
    }
}

async function getDidByHandle(did: string) {
    const data = await $agent.agent.api.com.atproto.repo.describeRepo(
        { repo: did }
    );
    return data.data.did;
}

async function getReplyRefByUri() {
    const res = await $agent.getFeed($replyRef);
    let root = res.parent;
    while (root.parent) {
        root = root.parent;
    }

    $replyRef = {
        parent: res.post,
        root: root.post,
    }
}

async function addLinkCard(uri: string) {
    try {
        const res = await fetch(`/api/get-ogp`, {
            method: 'post',
            body: JSON.stringify({
                uri: uri,
            })
        });
        const data = await res.formData();

        embedExternal = {
            $type: 'app.bsky.embed.external',
            external: {
                uri: uri,
                title: data.get('title') as string,
                description: data.get('description') as string,
            }
        }

        const imageBlob = data.get('imageBlob');
        if (imageBlob && typeof imageBlob !== 'string') {
            externalImageBlob = imageBlob;

            const res = await $agent.agent.api.com.atproto.repo.uploadBlob(imageBlob, {
                encoding: 'image/jpeg',
            });
            embedExternal.external.thumb = res.data.blob;
        }
    } catch (e) {
        toast.error('Error!' + e)
    }
}

async function getImageDataFromBlob(blob) {
    let reader = new FileReader();
    reader.readAsDataURL(blob);

    await new Promise(resolve => {
        reader.onload = (() => {
            resolve();
        });
    });
    return reader.result;
}

$: {
    if (!isFocus) {
        embedImages.images = [];
    }

    if ($quotePost?.uri) {
        isFocus = true;
        setTimeout(() => {
            publishArea.focus();
        }, 100)

        embedRecord = {
            $type: 'app.bsky.embed.record',
            record: $quotePost,
        }
    }

    if ($replyRef) {
        isFocus = true;
        setTimeout(() => {
            publishArea.focus();
        }, 100)
    }

    if (typeof $replyRef === 'string') {
        getReplyRefByUri();
    }
}

function putActorSuggestion(actor: string) {
    const current = getActorTypeAhead();
    if (current) {
        publishContent = publishContent.replace(current, '@' + actor);
        searchActors = [];
        publishArea.focus();
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
        isFocus = false;
    }
}

async function saveDraft() {
    try {
        const id = await db.drafts.add({
            createdAt: Date.now(),
            text: publishContent,
            quotePost: $quotePost || undefined,
            replyRef: $replyRef || undefined,
            images: images,
            owner: $agent.did(),
        });

        if (!isContinueMode) {
            isFocus = false;
        }
        publishContent = '';
        quotePost.set(undefined);
        replyRef.set(undefined);
        embed = undefined;
        images = [];
        links = [];
        if (pond) {
            pond.removeFiles();
        }
        searchActors = [];
        embedImages.images = [];
        embedExternal = undefined;

        toast.success($_('draft_add_success'));
    } catch (e) {
        toast.error($_('error') + ': ' + e);
    }
}

function handleDraftUse(event) {
    isDraftModalOpen = false;

    publishContent = '';
    quotePost.set(undefined);
    replyRef.set(undefined);
    images = [];
    links = [];
    if (pond) {
        pond.removeFiles();
    }
    searchActors = [];

    const draft = event.detail.draft;
    publishContent = draft.text;

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
        replyRef.set(draft.replyRef);
    }
}

function handleAltClose(event) {
    images = event.detail.images;
    isAltModalOpen = false;
    console.log(images);
}

onMount(async () => {
    if ($sharedText) {
        await goto('/');
        publishContent = $sharedText;
        isFocus = true;

        setTimeout(() => {
            publishArea.focus();
            sharedText.set('');
        }, 100)
    }

    publish = async function () {
        isTextareaEnabled = true;
        isPublishEnabled = true;

        if (!publishContent) {
            isTextareaEnabled = false;
            isPublishEnabled = false;
            return false;
        }

        if (images.length) {
            const filePromises = images.map(image => {
                return $agent.agent.api.com.atproto.repo.uploadBlob(image.image, {
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
                embed = embedExternal;
            }
        }

        const rt = new RichText({text: publishContent});
        await rt.detectFacets($agent.agent);

        try {
            await $agent.agent.api.app.bsky.feed.post.create(
                { repo: $agent.did() },
                {
                    embed: embed,
                    facets: rt.facets,
                    text: rt.text,
                    createdAt: new Date().toISOString(),
                    reply: $replyRef || undefined,
                    via: 'TOKIMEKI',
                },
            );
            toast.success($_('success_to_post'));
        } catch (error) {
            console.log(error.message)
            toast.error($_('failed_to_post') + ':' + error.message);
            isTextareaEnabled = false;
            isPublishEnabled = false;
            throw new Error(error);
        }

        isTextareaEnabled = false;
        isPublishEnabled = false;
        if (!isContinueMode) {
            isFocus = false;
        }
        publishContent = '';
        quotePost.set(undefined);
        replyRef.set(undefined);
        embed = undefined;
        images = [];
        links = [];
        if (pond) {
            pond.removeFiles();
        }
        searchActors = [];
        embedImages.images = [];
        embedExternal = undefined;
        // const data = await $agent.getTimeline();
        // timeline.set(data.feed);

        if (isContinueMode) {
            setTimeout(() => {
                publishArea.focus();
            }, 100)
        }
    }
})
</script>

<svelte:window on:keydown={handleKeydown} />
<svelte:document on:paste={handlePaste} />

<section class="publish-group"
         class:publish-group--expanded={isFocus}
         tabindex="-1"
         on:focusin={onFocus}
         on:focusout={onBlur}
         use:clickOutside={{ignoreElement: '.publish-sp-open'}}
         on:outclick={handleOutClick}
>
  {#if (isFocus)}
    <button class="publish-sp-open" aria-label="投稿ウィンドウを閉じる" on:click={close}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16.97" height="16.97" viewBox="0 0 16.97 16.97">
        <path id="close" d="M10,8.586,2.929,1.515,1.515,2.929,8.586,10,1.515,17.071l1.414,1.414L10,11.414l7.071,7.071,1.414-1.414L11.414,10l7.071-7.071L17.071,1.515Z" transform="translate(-1.515 -1.515)" fill="var(--bg-color-1)"/>
      </svg>
    </button>
  {:else}
    <button class="publish-sp-open" aria-label="投稿ウィンドウを開く" on:click={onFocus}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
        <path id="edit-pencil" d="M12.3,3.7l4,4L4,20H0V16Zm1.4-1.4L16,0l4,4L17.7,6.3l-4-4Z" fill="var(--bg-color-1)"/>
      </svg>
    </button>
  {/if}

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

      <button class="publish-form__submit" on:click={publish} disabled={isPublishEnabled}><svg xmlns="http://www.w3.org/2000/svg" width="17" height="12.75" viewBox="0 0 17 12.75">
        <path id="send" d="M0,0,17,6.375,0,12.75ZM0,5.1V7.65L8.5,6.375Z" fill="var(--bg-color-1)"/>
      </svg>
        {publishButtonText}</button>

        <button class="publish-upload-toggle" on:click={uploadContextOpen}><svg xmlns="http://www.w3.org/2000/svg" width="30" height="24" viewBox="0 0 30 24" fill="var(--bg-color-1)">
            <path id="photo" d="M0,67a3.009,3.009,0,0,1,3-3H27a3,3,0,0,1,3,3h0V85a3,3,0,0,1-3,3H3a3,3,0,0,1-3-3H0ZM16.5,80.5,12,76,3,85H27l-7.5-7.5Zm6-6a3,3,0,0,0,0-6h0a3,3,0,0,0,0,6Z" transform="translate(0 -64)"/>
          </svg>
        </button>
    </div>

    <div class="publish-form">
      {#if $quotePost?.uri}
        <div class="publish-quote">
          <button class="publish-quote__delete" on:click={() => {quotePost.set(undefined)}}><svg xmlns="http://www.w3.org/2000/svg" width="16.97" height="16.97" viewBox="0 0 16.97 16.97">
            <path id="close" d="M10,8.586,2.929,1.515,1.515,2.929,8.586,10,1.515,17.071l1.414,1.414L10,11.414l7.071,7.071,1.414-1.414L11.414,10l7.071-7.071L17.071,1.515Z" transform="translate(-1.515 -1.515)" fill="var(--text-color-1)"/>
          </svg>
          </button>

          <div class="timeline-external timeline-external--record">
            <div class="timeline-external__image timeline-external__image--round">
              {#if ($quotePost.author.avatar)}
                <img src="{$quotePost.author.avatar}" alt="">
              {/if}
            </div>

            <div class="timeline-external__content">
              <div class="timeline__meta">
                <p class="timeline__user" title="{$quotePost.author.handle}">{ $quotePost.author.displayName || $quotePost.author.handle }</p>
                <p class="timeline__date">{formatDistanceToNow(parseISO($quotePost.record.createdAt), {locale: ja})}</p>
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
          <button class="publish-quote__delete" on:click={() => {embedExternal = undefined}}><svg xmlns="http://www.w3.org/2000/svg" width="16.97" height="16.97" viewBox="0 0 16.97 16.97">
            <path id="close" d="M10,8.586,2.929,1.515,1.515,2.929,8.586,10,1.515,17.071l1.414,1.414L10,11.414l7.071,7.071,1.414-1.414L11.414,10l7.071-7.071L17.071,1.515Z" transform="translate(-1.515 -1.515)" fill="var(--text-color-1)"/>
          </svg>
          </button>

          <div class="timeline-external timeline-external--record">
            <div class="timeline-external__image">
              {#if (embedExternal.external.thumb && externalImageBlob)}
                {#await (getImageDataFromBlob(externalImageBlob))}
                {:then thumb}
                  <img src="{thumb}" alt="">
                {/await}
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
          <button class="publish-quote__delete" on:click={() => {replyRef.set(undefined)}}><svg xmlns="http://www.w3.org/2000/svg" width="16.97" height="16.97" viewBox="0 0 16.97 16.97">
            <path id="close" d="M10,8.586,2.929,1.515,1.515,2.929,8.586,10,1.515,17.071l1.414,1.414L10,11.414l7.071,7.071,1.414-1.414L11.414,10l7.071-7.071L17.071,1.515Z" transform="translate(-1.515 -1.515)" fill="var(--text-color-1)"/>
          </svg>
          </button>

          <div class="timeline-external timeline-external--record">
            <div class="timeline-external__image timeline-external__image--round">
              {#if ($replyRef.parent.author.avatar)}
                <img src="{$replyRef.parent.author.avatar}" alt="">
              {/if}
            </div>

            <div class="timeline-external__content">
              <div class="timeline__meta">
                <p class="timeline__user">{$_('reply_to', {values: {name: $replyRef.parent.author.displayName || $replyRef.parent.author.handle }})}</p>
              </div>

              <p class="timeline-external__description">
                {$replyRef.parent.record.text}
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
              <button class="link-card-registerer-button" on:click={() => {addLinkCard(link)}}>{$_('link_card_embed')}: {link}</button>
          {/each}
        </div>
      {/if}

      {#if searchActors.length}
        <div class="search-actor-list">
          {#each searchActors as actor}
            <button class="search-actor-item" on:click={() => {putActorSuggestion(actor.handle)}}>
              @{actor.handle}
            </button>
          {/each}
        </div>
      {/if}

      <label class="publish-form__label" for="publishTextarea"></label>
      <textarea
        id="publishTextarea"
        class="publish-form__input"
        name="content"
        disabled={isTextareaEnabled}
        bind:value={publishContent}
        bind:this={publishArea}
        on:keydown={publishKeypress}
        on:input={onPublishContentChange}
        placeholder="{$_('send_placeholder1')}&#13;{$_('send_placeholder2')}"
        autocomplete="nope"
    ></textarea>
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
            acceptedFileTypes={'image/jpeg, image/png'}
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

  {#if (isAltModalOpen)}
    <AltModal images={images} on:close={handleAltClose}></AltModal>
  {/if}

  {#if (isDraftModalOpen)}
    <DraftModal on:use={handleDraftUse} on:close={() => {isDraftModalOpen = false}}></DraftModal>
  {/if}
</section>

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
            .publish-form__input {
                height: 160px;
            }

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
    }

    .publish-wrap {
        background-color: var(--bg-color-1);
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
        bottom: 20px;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background-color: var(--primary-color);
        align-items: center;
        justify-content: center;
        z-index: 20;

        @media (max-width: 767px) {
            display: flex;
        }
    }

    .publish-buttons {
        max-width: 740px;
        margin: 0 auto 10px;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        width: 100%;
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
            right: 15px;
            top: 20px;
            z-index: 12;
        }
    }

    .publish-length {
        margin-right: auto;
        color: var(--text-color-3);

        @media (max-width: 767px) {
           order: 2;
            margin-right: 15px;
            margin-left: auto;
        }

        &__current {
            &.over {
                font-weight: 600;
                color: var(--danger-color);
            }
        }
    }

    .publish-form__label {
        display: none;

        @media (max-width: 767px) {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            right: 0;
            z-index: 10;
        }
    }

    .publish-form__input {
        z-index: 12;
        position: relative;
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
        padding: 6px 10px;
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
    }

    .search-actor-list {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-bottom: 15px;
        position: relative;
        z-index: 11;

        @media (max-width: 767px) {
            flex-wrap: nowrap;
            overflow: auto;
        }
    }

    .search-actor-item {
        background-color: var(--bg-color-2);
        padding: 3px 6px;
        color: var(--text-color-3);
        font-size: 14px;
        border-radius: 4px;
        border: 1px solid var(--border-color-1);
        white-space: nowrap;
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
        min-width: 82px;
        height: 30px;
        border-radius: 4px;
        z-index: 12;
        background-color: var(--bg-color-1);
        color: var(--primary-color);
        border: 1px solid var(--primary-color);
        font-weight: 600;
        padding: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        letter-spacing: .025em;
        gap: 5px;
        white-space: nowrap;
        margin-right: 10px;

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
</style>