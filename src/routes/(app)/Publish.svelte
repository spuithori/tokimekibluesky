<script lang="ts">
import {onMount} from 'svelte';
import {agent, timeline} from '$lib/stores';
import FilePond, { registerPlugin } from 'svelte-filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview'
import FilePondPluginImageResize from 'filepond-plugin-image-resize';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import FilePondPluginImageTransform from 'filepond-plugin-image-transform';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

registerPlugin(FilePondPluginImageResize);
registerPlugin(FilePondPluginImagePreview);
registerPlugin(FilePondPluginFileValidateSize);
registerPlugin(FilePondPluginImageTransform);
registerPlugin(FilePondPluginFileValidateType);

let publish = function () {};
let publishContent = '';
let isTextareaEnabled = false;
let files = [];
let pond;
let name = 'filepond';
let isUploadShown = false;

const publishKeypress = e => {
    if (e.keyCode === 13 && e.altKey) publish();
};

function uploadShownToggle() {
    isUploadShown = isUploadShown !== true;
}

async function onFileSelected(file, output) {
    const image = await file.file;
    const transformedImage = new File([await output], output.name, {
        type: output.type,
    });

    const fileCid = await $agent.agent.api.com.atproto.blob.upload(transformedImage, {
        encoding: 'image/jpeg',
    });
    files.push({
        cid: fileCid.data.cid,
        id: file.id,
    });
    files = files;
}

async function onFileDeleted(error, file) {
    files = files.filter((item) => item.id !== file.id );
}

$: {
    if (!isUploadShown) {
       files = [];
    }
}

onMount(async () => {
    publish = async function () {
        isTextareaEnabled = true;

        if (!publishContent) {
            isTextareaEnabled = false;
            return false;
        }

        let postData = [{ did: $agent.did() }, { text: publishContent, createdAt: new Date().toISOString() }];

        let embed;

        if (files.length) {
            embed = {
                $type: 'app.bsky.embed.images',
                images: [],
            }

            files.forEach(file => {
                embed.images.push({
                    image: {
                        cid: file.cid,
                        mimeType: 'image/jpeg',
                    },
                    alt: '',
                })
            })
        }

        await $agent.agent.api.app.bsky.feed.post.create(
            { did: $agent.did() },
            {
                embed: embed,
                text: publishContent,
                createdAt: new Date().toISOString(),
            },
        );

        isTextareaEnabled = false;
        isUploadShown = false;
        publishContent = '';
        const data = await $agent.getTimeline();
        timeline.set(data.feed);
    }
})
</script>

<section class="publish-group">
  <div class="publish-form">
    <textarea type="text" class="publish-form__input" disabled={isTextareaEnabled} bind:value={publishContent} on:keydown={publishKeypress} placeholder="Alt + Enter"></textarea>
    <button class="publish-form__submit" on:click={publish}><svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <title></title>
      <g id="icomoon-ignore">
      </g>
      <path fill="var(--primary-color)" d="M1009.376 5.12c-5.312-3.424-11.36-5.12-17.376-5.12-6.176 0-12.384 1.76-17.76 5.376l-960 640c-9.888 6.56-15.328 18.112-14.048 29.952 1.216 11.808 8.896 22.016 19.936 26.368l250.368 100.192 117.728 206.016c5.632 9.888 16.096 16 27.424 16.128 0.128 0 0.224 0 0.352 0 11.232 0 21.664-5.952 27.424-15.552l66.464-110.816 310.24 124.064c3.808 1.536 7.808 2.272 11.872 2.272 5.44 0 10.816-1.376 15.68-4.128 8.448-4.736 14.24-13.056 15.872-22.624l160-960c2.080-12.576-3.488-25.184-14.176-32.128zM100.352 664.864l741.6-494.432-539.2 577.184c-2.848-1.696-5.376-3.936-8.512-5.184l-193.888-77.568zM326.048 770.112c-0.064-0.128-0.16-0.192-0.224-0.32l606.176-648.8-516.768 805.184-89.184-156.064zM806.944 947.488l-273.312-109.312c-6.496-2.56-13.248-3.424-19.936-3.808l420.864-652.416-127.616 765.536z"></path>
    </svg></button>
  </div>

  <button class="publish-upload-toggle" class:shown="{isUploadShown}" on:click={uploadShownToggle}><svg xmlns="http://www.w3.org/2000/svg" width="30" height="24" viewBox="0 0 30 24" fill="var(--text-color-3)">
    <path id="photo" d="M0,67a3.009,3.009,0,0,1,3-3H27a3,3,0,0,1,3,3h0V85a3,3,0,0,1-3,3H3a3,3,0,0,1-3-3H0ZM16.5,80.5,12,76,3,85H27l-7.5-7.5Zm6-6a3,3,0,0,0,0-6h0a3,3,0,0,0,0,6Z" transform="translate(0 -64)"/>
  </svg>
  </button>

  {#if (isUploadShown)}
    <div class="publish-upload">
      <FilePond
          bind:this={pond}
          {name}
          allowMultiple={true}
          maxFiles={4}
          maxParallelUploads={4}
          imageResizeTargetWidth={2000}
          imageResizeTargetHeight={2000}
          maxFileSize={'1MB'}
          imageResizeMode={'contain'}
          acceptedFileTypes={'image/jpeg, image/png'}
          imageTransformOutputMimeType={'image/jpeg'}
          onpreparefile={(file, output) => {onFileSelected(file, output)}}
          onremovefile="{(error, file) => {onFileDeleted(error, file)}}"
          credits={null}
          labelIdle="ドラッグアンドドロップ またはクリック"
          labelMaxFileSizeExceeded="ファイルがでかすぎます"
          labelMaxFileSize="最大: {'{'}filesize{'}'}"
          labelFileTypeNotAllowed="アップロードできない形式です"
          fileValidateTypeLabelExpectedTypes="対応: JPG/PNG"
      />
    </div>
  {/if}
</section>

<style>
    .publish-group {
        position: fixed;
        left: 0;
        bottom: 0;
        right: 0;
        background-color: var(--bg-color-1);
        border-top: 1px solid var(--border-color-1);
        padding: 20px;
    }

    .publish-upload {
        position: fixed;
        bottom: 140px;
        left: calc(50vw - 32rem);
        width: 300px;
        height: 300px;
    }

    .publish-upload-toggle {
        position: absolute;
        left: calc(50vw - 32rem);
        top: 20px;
        width: 40px;
        height: 40px;
        background-color: var(--bg-color-2);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
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
        }

        .publish-upload {
            left: auto;
            right: 20px;
        }
    }
</style>