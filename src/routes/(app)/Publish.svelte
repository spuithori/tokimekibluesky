<script lang="ts">
import {onMount} from "svelte";
import {agent, timeline} from "$lib/stores";

let publish = function () {};
let publishContent = '';
let isTextareaEnabled = false;
let file;
let up = '';

const publishKeypress = e => {
    if (e.keyCode === 13 && e.altKey) publish();
};

async function onFileSelected(e) {
    let image = e.target.files[0];
    let reader = new FileReader();
    reader.readAsDataURL(image);
    reader.onload = async (e) => {
        file = e.target.result
        up = await $agent.agent.api.com.atproto.blob.upload(image, {
            encoding: 'image/jpeg',
        });
        console.log(up)
    };
}

onMount(async () => {
    publish = async function () {
        isTextareaEnabled = true;

        if (!publishContent) {
            isTextareaEnabled = false;
            return false;
        }

        let postData = [{ did: $agent.did() }, { text: publishContent, createdAt: new Date().toISOString() }];

        await $agent.agent.api.app.bsky.feed.post.create(
            { did: $agent.did() },
            {
                embed: {
                    $type: 'app.bsky.embed.images',
                    images: [
                        {
                            image: {
                                cid: up.data.cid,
                                mimeType: 'image/jpeg',
                            },
                            alt: '',
                        }
                    ],
                },
                text: publishContent,
                createdAt: new Date().toISOString(),
            },
        );

        isTextareaEnabled = false;
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

  <input type="file" on:change={(file) => {onFileSelected(file)}}>
</section>

<style>
    .publish-group {
        position: fixed;
        left: 0;
        bottom: 0;
        right: 0;
        background-color: #fff;
        border-top: 1px solid gray;
        padding: 20px;
    }
</style>