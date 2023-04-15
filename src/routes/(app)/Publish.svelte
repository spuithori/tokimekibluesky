<script lang="ts">
import { _ } from 'svelte-i18n';
import { onMount } from 'svelte';
import { agent, timeline, quotePost, replyRef } from '$lib/stores';
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
    AppBskyFeedDefs
} from '@atproto/api';
import toast from 'svelte-french-toast'

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
let isUploadShown = false;
let isFocus = false;
let publishArea: HTMLTextAreaElement;
let publishButtonText = $_('publish_button_send');

let embed: AppBskyEmbedImages.Main | AppBskyEmbedRecord.Main | AppBskyEmbedRecordWithMedia.Main | undefined;
let embedImages: AppBskyEmbedImages.Main = {
    $type: 'app.bsky.embed.images',
    images: [],
};
let embedRecord: AppBskyEmbedRecord.Main;
let embedRecordWithMedia: AppBskyEmbedRecordWithMedia.Main;

$: publishContentLength = new RichText({text: publishContent}).graphemeLength;
$: {
    isPublishEnabled = publishContentLength > 300;
}

const publishKeypress = (e: { keyCode: number; altKey: any; }) => {
    if (e.keyCode === 13 && e.altKey) publish();
};

function uploadShownToggle() {
    isUploadShown = isUploadShown !== true;
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

    if (image.size > 1000000) {
        console.log('デカすぎ')
    }

    const res = await $agent.agent.api.com.atproto.repo.uploadBlob(image, {
        encoding: 'image/jpeg',
    });

    embedImages.images.push({
       image: res.data.blob,
       alt: '',
       id: file.id
    });
    embedImages = embedImages;

    isPublishEnabled = !res.success;

    if (res.success) {
        publishButtonText = $_('publish_button_send');
    }
}

async function onFileDeleted(error: any, file: any) {
    embedImages.images = embedImages.images.filter((image) => image.id !== file.id );
    embedImages = embedImages;

    console.log(embedImages)
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

$: {
    if (!isUploadShown) {
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

        console.log('replyRef: ' + $replyRef);
    }

    if (typeof $replyRef === 'string') {
        getReplyRefByUri();
    }
}

onMount(async () => {
    publish = async function () {
        isTextareaEnabled = true;
        isPublishEnabled = true;

        if (!publishContent) {
            isTextareaEnabled = false;
            isPublishEnabled = false;
            return false;
        }

        let postData = [{ did: $agent.did() }, { text: publishContent, createdAt: new Date().toISOString() }];

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
                },
            );
            toast.success($_('success_to_post'));
        } catch (e) {
            toast.error($_('failed_to_post'));
        }

        isTextareaEnabled = false;
        isPublishEnabled = false;
        isUploadShown = false;
        isFocus = false;
        publishContent = '';
        quotePost.set(undefined);
        replyRef.set(undefined);
        embed = undefined;
        embedImages.images = [];
        const data = await $agent.getTimeline();
        timeline.set(data.feed);
    }
})
</script>

<svelte:window on:keydown={handleKeydown} />

<section class="publish-group"
         class:publish-group--expanded={isFocus}
         tabindex="-1"
         on:focusin={onFocus}
         on:focusout={onBlur}
         use:clickOutside={{ignoreElement: '.publish-sp-open'}}
         on:outclick={() => (isFocus = false)}
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
      <p class="publish-length">
        <span class="publish-length__current" class:over={publishContentLength > 300}>{publishContentLength}</span> / 300
      </p>

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

      <label class="publish-form__label" for="publishTextarea"></label>
      <textarea
        id="publishTextarea"
        class="publish-form__input"
        name="content"
        disabled={isTextareaEnabled}
        bind:value={publishContent}
        bind:this={publishArea}
        on:keydown={publishKeypress}
        placeholder="{$_('send_placeholder1')}&#13;{$_('send_placeholder2')}"
        autocomplete="nope"
    ></textarea>
    </div>

    {#if (isFocus)}
      <div class="publish-upload" transition:fly="{{ y: 30, duration: 250 }}">
        <FilePond
            bind:this={pond}
            {name}
            allowMultiple={true}
            maxFiles={4}
            maxParallelUploads={4}
            imageResizeTargetWidth={2000}
            imageResizeTargetHeight={2000}
            imageResizeMode={'contain'}
            acceptedFileTypes={'image/jpeg, image/png'}
            imageTransformOutputMimeType={'image/jpeg'}
            imageTransformOutputQuality={'80'}
            onpreparefile={(file, output) => {onFileSelected(file, output)}}
            onremovefile="{(error, file) => {onFileDeleted(error, file)}}"
            onaddfilestart={(file) => {onFileAdded(file)}}
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
</style>