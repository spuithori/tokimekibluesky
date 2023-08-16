<script lang="ts">
import { _ } from 'svelte-i18n';
import { onMount } from 'svelte';
import {agent, quotePost, replyRef, settings, sharedText} from '$lib/stores';
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
import spinner from '$lib/images/loading.svg';
import LangSelectorModal from "$lib/components/publish/LangSelectorModal.svelte";
import {languageMap} from "$lib/langs/languageMap";
import Menu from "$lib/components/ui/Menu.svelte";
import ThreadMembersList from "$lib/components/publish/ThreadMembersList.svelte";

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
let timer;
let links: string[] = [];
let externalImageBlob: Blob;
let searchActors = [];
let isContinueMode = false;
let isPublishUploadClose = false;
let isDraftModalOpen = false;
let isAltModalOpen = false;
let isLinkCardAdding = false;
let mentionsHistory = JSON.parse(localStorage.getItem('mentionsHistory')) || [];
const isMobile = navigator.userAgentData ? navigator.userAgentData.mobile : false;
const isVirtualKeyboardSupported = 'virtualKeyboard' in navigator;
if (isVirtualKeyboardSupported) {
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

let lang =[];

let langSettings = [
    {
        name: $_('lang_selector_auto'),
        value: 'auto',
    },
    /* {
        name: $_('lang_selector_display'),
        value: 'display',
    }, */
    {
        name: $_('lang_selector_manual'),
        value: 'manual',
    },
];
let langSetting = 'auto';
let isLangSelectorOpen = false;

if (!$settings.langSelector) {
    $settings.langSelector = 'auto';
}

const selfLabelsChoices = [
    {
        name: $_('self_labels_spoiler'),
        description: $_('self_labels_description_3'),
        val: 'spoiler',
    },
    {
        name: $_('self_labels_porn'),
        description: $_('self_labels_description_2'),
        val: 'porn',
    },
    {
        name: $_('self_labels_warning'),
        description: $_('self_labels_description_1'),
        val: '!warn',
    },
];

let selfLabels = [];
let currentSelfLabel = undefined;
let isSelfLabelingMenuOpen = false;

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

    if ($settings.design?.publishPosition === 'left') {
        isContinueMode = true;
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
            const res = await $agent.agent.api.app.bsky.actor.searchActorsTypeahead({term: mention.slice(1), limit: 4});
            searchActors = res.data.actors.length ? res.data.actors : mentionsHistory;
        } else {
            searchActors = [];
        }
    }, 200)

    if (getActorTypeAhead() && searchActors.length === 0) {
        searchActors = mentionsHistory;
    }
}

const publishKeypress = (e: { keyCode: number; ctrlKey: any; metaKey: any; }) => {
    if (e.keyCode === 13 && e.ctrlKey) {
        publish();
    }

    if (e.keyCode === 13 && e.metaKey) {
        publish();
    }
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
        }, 100);

        if (isMobile) {
            goto('#post', {noScroll: true});
        }
    }
}

function onClose() {
    if (isFocus) {
        isFocus = false;
        publishArea.blur();

        if (isMobile && window.location.hash === '#post') {
            history.back();
        }
    }
}

function handlePopstate(e) {
    if (isFocus) {
        isFocus = false;
        publishArea.blur();
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
        onFocus();
    }

    if (event.key === '/' && (activeElement === 'BODY' || activeElement === 'BUTTON')) {
        goto('/search');
    }

    if (event.key === 'Escape' && isFocus) {
        onClose();
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
    isLinkCardAdding = true;

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

        isLinkCardAdding = false;
    } catch (e) {
        toast.error('Error!' + e);
        isLinkCardAdding = false;
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

    if (typeof $replyRef === 'string') {
        getReplyRefByUri();
    }
}

$: quotePostObserve($quotePost);
$: replyRefObserve($replyRef);

function quotePostObserve(quotePost) {
    if (quotePost?.uri) {
        onFocus();

        embedRecord = {
            $type: 'app.bsky.embed.record',
            record: $quotePost,
        }
    }
}

function replyRefObserve(replyRef) {
    if (replyRef) {
        onFocus();
    }
}

function putActorSuggestion(actor: string) {
    const current = getActorTypeAhead();
    if (current) {
        const cursor = publishArea.selectionStart;
        const before = publishContent.substring(0, cursor);
        const after = publishContent.substring(cursor);
        const replace = before.substring(0, before.length - current.length);

        publishContent = replace + '@' + actor + after + ' ';
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
        onClose();
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
    onFocus();
}

async function languageDetect(text = publishContent) {
    try {
        const res = await fetch(`/api/language-detect`, {
            method: 'post',
            body: JSON.stringify({
                text: text,
            })
        });
        const langs: [] = await res.json() as [];

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

function setSelfLabel(index) {
    currentSelfLabel = index;
    selfLabels = [
        {
            val: selfLabelsChoices[index].val,
        }
    ];
    isSelfLabelingMenuOpen = false;
    publishArea.focus();
}

onMount(async () => {
    if ($sharedText) {
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

        if (!$settings.langSelector || $settings.langSelector === 'auto') {
            await languageDetect(publishContent);
        } else {
            lang = [ $settings.langSelector ];
        }

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
                    langs: lang || [],
                    labels: {
                        $type: 'com.atproto.label.defs#selfLabels',
                        values: selfLabels || [],
                    },
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

        if (Array.isArray(rt.facets)) {
            try {
                const dids: string[] = rt.facets.map(facet => {
                    if (facet.features[0].did) {
                        return facet.features[0].did as string
                    }
                }).filter(results => results !== undefined);
                const promises = dids.map(did => $agent.agent.com.atproto.repo.describeRepo({repo: did}));
                let actors = [];

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
        selfLabels = [];
        // const data = await $agent.getTimeline();
        // timeline.set(data.feed);

        if (isContinueMode) {
            setTimeout(() => {
                publishArea.focus();
            }, 100)
        }
    }
})

function handleClick() {

}

function tempYu() {
    publishContent = 'ﾋﾄﾘﾀﾞｹﾅﾝﾃｴﾗﾍﾞﾅｲﾖｰ';
    publishArea.focus();
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
  <button class="publish-sp-open" aria-label="投稿ウィンドウを開く" on:click={onFocus} class:publish-sp-open--left={$settings.design?.publishPosition === 'left'}>
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <path id="edit-pencil" d="M12.3,3.7l4,4L4,20H0V16Zm1.4-1.4L16,0l4,4L17.7,6.3l-4-4Z" fill="var(--bg-color-1)"/>
    </svg>
  </button>
{/if}

<section class="publish-group"
         class:publish-group--expanded={isFocus}
         class:publish-group--left={$settings.design?.publishPosition === 'left'}
         tabindex="-1"
         on:focusin={onFocus}
         on:focusout={onBlur}
         use:clickOutside={{ignoreElement: '.publish-sp-open'}}
         on:outclick={handleOutClick}
         on:click={handleClick}
>
  <div class="publish-position-switcher">
    {#if ($settings.design?.publishPosition !== 'left')}
      <button class="publish-position-switcher__button" on:click={() => {$settings.design.publishPosition = 'left'}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-panel-left"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="9" y1="3" y2="21"/></svg>
      </button>
    {:else}
      <button class="publish-position-switcher__button" on:click={() => {$settings.design.publishPosition = 'bottom'}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-panel-bottom"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="15" y2="15"/></svg>
      </button>
    {/if}
  </div>

  <div class="publish-wrap">
    {#if $agent.did() === 'did:plc:hiptcrt4k63szzz4ty3dhwcp'}
      <button on:click={tempYu} class="temp-yu" tabindex="-1" aria-hidden="true">
        <img src="/yuu.svg" alt="">
      </button>
    {/if}

    <div class="publish-buttons">
      {#if (publishContent)}
        <button class="publish-draft-button publish-save-draft" on:click={saveDraft} disabled={isPublishEnabled}>{$_('drafts_save')}</button>
      {:else}
        <button class="publish-draft-button publish-view-draft" on:click={() => {isDraftModalOpen = true}}>{$_('drafts')}</button>
      {/if}

      <div class="publish-form-continue-mode">
        <div class="publish-form-continue-mode-input" class:checked={isContinueMode}>
          <input id="continue_mode" type="checkbox" bind:checked={isContinueMode}>
          <label for="continue_mode">{$_('continuous_mode')}</label>
        </div>
      </div>

      <button class="publish-form__submit" on:click={publish} disabled={isPublishEnabled}><svg xmlns="http://www.w3.org/2000/svg" width="17" height="12.75" viewBox="0 0 17 12.75">
        <path id="send" d="M0,0,17,6.375,0,12.75ZM0,5.1V7.65L8.5,6.375Z" fill="var(--bg-color-1)"/>
      </svg>
        {$_('publish_button_send')}</button>

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
              <div class="timeline__meta timeline__meta--member">
                <p class="timeline__user">{$_('reply_to', {values: {name: $replyRef.parent.author.displayName || $replyRef.parent.author.handle }})}</p>

                <ThreadMembersList uri={$replyRef.parent.uri}></ThreadMembersList>
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

      <label class="publish-form__label" for="publishTextarea"></label>

      <div class="publish-actor-list-input-group">
        <div class="publish-bottom-buttons">
          <p class="publish-length">
            <span class="publish-length__current" class:over={publishContentLength > 300}>{publishContentLength}</span> / 300
          </p>

          <div class="publish-form-moderation"  class:publish-form-moderation--active={selfLabels.length}>
            <Menu bind:isMenuOpen={isSelfLabelingMenuOpen} buttonClassName="publish-form-moderation-button">
              <svg slot="ref" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>

              <ul slot="content" class="timeline-menu-list">
                {#each selfLabelsChoices as choice, index}
                  <li class="timeline-menu-list__item">
                    <button class="timeline-menu-list__button" on:click={() => setSelfLabel(index)}>{choice.name}</button>
                  </li>
                {/each}
              </ul>
            </Menu>
          </div>

          <div class="publish-form-lang-selector">
            <button class="publish-form-lang-selector-button" on:click={() => {isLangSelectorOpen = !isLangSelectorOpen}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              {#if ($settings.langSelector !== 'auto')}
                {$_(languageMap.get($settings.langSelector).name)}
              {/if}
            </button>
          </div>
        </div>

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

        {#if (selfLabels.length)}
          <p class="publish-self-labeling-warning">
            <svg  xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            <span>{selfLabelsChoices[currentSelfLabel].name}: {selfLabelsChoices[currentSelfLabel].description}</span>
            <button class="publish-self-labeling-warning__close text-button" on:click={() => {selfLabels = []}}>取り消し</button>
          </p>
        {/if}

        {#if searchActors.length}
          <div class="search-actor-list">
            {#each searchActors as actor}
              <button class="search-actor-item" on:click={() => {putActorSuggestion(actor.handle)}}>
                {#if (actor.isHistory)}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">
                    <g id="timer-outline" transform="translate(-47.988 -47.998)">
                      <path id="パス_58" data-name="パス 58" d="M55,62h-.014a7,7,0,0,1-5.216-11.667.538.538,0,0,1,.8.718,5.93,5.93,0,0,0,4.415,9.871H55A5.912,5.912,0,0,0,60.911,55a5.962,5.962,0,0,0-5.384-5.9v2.4a.538.538,0,0,1-1.077,0V48.683A.685.685,0,0,1,55.157,48a7.04,7.04,0,0,1,6.831,7A6.989,6.989,0,0,1,55,62Z" transform="translate(0 0)" fill="var(--text-color-3)"/>
                      <path id="パス_59" data-name="パス 59" d="M155.649,157.118l-2.683-3.837a.276.276,0,0,1,.384-.384l3.837,2.683a1.1,1.1,0,1,1-1.265,1.809A1.128,1.128,0,0,1,155.649,157.118Z" transform="translate(-101.413 -101.336)" fill="var(--text-color-3)"/>
                    </g>
                  </svg>
                {/if}
                @{actor.handle}
              </button>
            {/each}
          </div>
        {/if}
      </div>
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
  <DraftModal on:use={handleDraftUse} on:close={() => {isDraftModalOpen = false}}></DraftModal>
{/if}

{#if (isLangSelectorOpen)}
  <LangSelectorModal on:close={() => {isLangSelectorOpen = false; onFocus();}}></LangSelectorModal>
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

                .publish-form__input {
                    height: 160px;
                }

                .publish-wrap {
                    display: block;
                    height: 100vh;
                    width: 360px;
                    border-top: none;
                    border-right: 1px solid var(--border-color-1);
                    padding: 120px 20px 20px;
                }

                .publish-position-switcher {
                    left: auto;
                    right: 16px;
                    top: 80px;
                }

                .publish-draft-button {

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
            right: 15px;
            top: 20px;
            z-index: 12;
        }
    }

    .publish-length {
        margin-right: auto;
        color: var(--text-color-3);
        display: flex;
        align-items: center;

        @media (max-width: 767px) {

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
        display: flex;
        align-items: center;
        gap: 4px;

        &:focus-visible {
            border-color: var(--primary-color);
            color: var(--primary-color);
            font-weight: 600;
            outline: none;
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
        margin-right: auto;

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

    .temp-yu {
        position: absolute;
        bottom: 10px;
        left: 10px;

        @media (max-width: 767px) {
            display: none;
        }
    }

    .publish-form-lang-selector {
        position: relative;
    }

    .publish-form-lang-selector-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: var(--text-color-1);
        padding: 0 5px;
        font-size: 14px;
        height: 30px;
    }

    .publish-form-moderation {
        position: relative;
    }

    .publish-self-labeling-warning {
        margin-bottom: 10px;
        color: var(--text-color-3);
        display: flex;
        align-items: center;
        font-size: 14px;
        gap: 5px;
        position: relative;
        z-index: 12;

        @media (max-width: 767px) {
            display: grid;
            grid-template-columns: 20px 1fr 70px;
            font-size: 12px;
        }
    }

    .publish-bottom-buttons {
        display: flex;
        justify-content: flex-end;
        padding: 10px 15px;
        bottom: 10px;
        right: 10px;
        z-index: 13;
        background-color: var(--bg-color-2);
        gap: 5px;
    }
</style>