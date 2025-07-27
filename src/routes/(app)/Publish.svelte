<script lang="ts">
  import {_} from 'svelte-i18n';
  import { agent, hashtagHistory, settings } from '$lib/stores';
  import { AppBskyEmbedExternal, AppBskyEmbedImages, AppBskyEmbedRecord, AppBskyEmbedRecordWithMedia, AppBskyEmbedVideo, AppBskyVideoDefs, RichText } from '@atproto/api';
  import {toast} from 'svelte-sonner'
  import {goto, pushState} from '$app/navigation';
  import {page} from '$app/stores';
  import type {Draft} from '$lib/db';
  import {db} from '$lib/db';
  import DraftModal from "$lib/components/draft/DraftModal.svelte";
  import {getServiceAuthToken} from "$lib/util";
  import {detectRichTextWithEditorJson} from "$lib/components/editor/richtext";
  import imageCompression from 'browser-image-compression';
  import PublishPool from "$lib/components/editor/PublishPool.svelte";
  import PublishMain from "$lib/components/editor/PublishMain.svelte";
  import {getIntervalProcessingUpload} from "$lib/components/editor/videoUtil";
  import {tick} from "svelte";
  import {TID} from "@atproto/common-web";
  import {computeCid} from "$lib/components/editor/postUtil";
  import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
  import {publishState} from "$lib/classes/publishState.svelte";
  import {Pencil, X, Settings2} from "lucide-svelte";
  import {getPostState} from "$lib/classes/postState.svelte";
  import {languageDetect} from '$lib/translate';
  import PublishConfigModal from "$lib/components/publish/PublishConfigModal.svelte";

  const postState = getPostState();

  let _agent = $state($agent);
  let editor = $state();
  let isDraftModalOpen = $state(false);
  let mentionsHistory = JSON.parse(localStorage.getItem('mentionsHistory')) || [];
  let isEnabled = $state(true);
  let isPublishing = $state(false);
  let isConfigOpen = $state(false);
  let writes = [];
  let continuousTags = [];
  let tid: TID | undefined;

  const isMobile = navigator?.userAgentData?.mobile || false;
  let isMobilePopState = $derived(isMobile ? $page.state.showPublish : false);

  $effect(() => {
      if (publishState.show) {
          tick().then(() => {
              editor.focus();
          });
      }
  })

  function handleOpen() {
      if (!publishState.show) {
          publishState.show = true;
      }

      tick().then(() => { editor.focus(); });

      if (isMobile) {
          tick().then(() => {
            pushState('', {
              showPublish: true
            });
          });
      }

      scrollDirectionState.direction = 'up';
  }

  function onClose() {
      if (publishState.show) {
          publishState.show = false;
          editor.blur();

          if (isMobile && $page.state.showPublish) {
              history.back();
          }
      }
  }

  function handleKeydown(event: { key: string; }) {
      const activeElement = document.activeElement?.tagName;

      if (event.key === 'n' && !(activeElement === 'TEXTAREA' || activeElement === 'INPUT' || document.activeElement.classList.contains('tiptap'))) {
          handleOpen();
      }

      if (event.key === '/' && (activeElement === 'BODY' || activeElement === 'BUTTON')) {
          goto('/search');
      }

      if (event.key === 'Escape' && publishState.show) {
          onClose();
      }
  }

  async function saveDraft() {
      try {
          const id = await db.drafts.add($state.snapshot({
              createdAt: Date.now(),
              owner: _agent.did() as string,
              ...postState.posts[postState.index],
          }));

          if (!publishState.pinned) {
              publishState.show = false;
          }

          postState.clearPosts();

          toast.success($_('draft_add_success'));
      } catch (e) {
          toast.error($_('error') + ': ' + e);
      }
  }

  function openDraft(e) {
      e.preventDefault();
      isDraftModalOpen = true;
  }

  async function handleDraftUse(draft: Draft) {
      isDraftModalOpen = false;
      postState.posts = [{
        ...draft,
        selfLabels: draft.selfLabels || [],
        lang: draft.lang || 'auto',
        threadGate: draft.threadGate || 'everybody',
        postGate: draft.postGate ?? true,
      }];

      tick().then(() => {
          editor.focus();
      });
  }

  async function uploadBlobWithCompression(image) {
    const compressed = $settings?.general?.losslessImageUpload
      ? await imageCompression(image.file, {
            useWebWorker: true,
            maxWidthOrHeight: 3000,
        })
      : await imageCompression(image.file, {
            maxSizeMB: 0.925,
            maxWidthOrHeight: 3000,
            fileType: 'image/jpeg',
            useWebWorker: true,
            initialQuality: 0.85,
        });

    return await _agent.agent.api.com.atproto.repo.uploadBlob(image.isGif ? image.file : compressed, {
      encoding: compressed.type,
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
      const toastId = toast.loading($_('process_to_post'));

      let i = 1;
      let root;
      let parent;
      let _replyRef;

      try {
          for (const post of postState.posts) {
              toast.loading($_('process_to_post') + '(' + i + '/' + postState.posts.length +  ')', {
                  id: toastId,
                  duration: 100000,
              })
              parent = await publish(post, _replyRef);

              if (postState.posts.length > 1 && i === 1) {
                  root = structuredClone(parent);
              }

              _replyRef = {
                  root: root,
                  parent: parent,
              }

              i = i + 1;
          }

          await _agent.agent.api.com.atproto.repo.applyWrites({
              repo: _agent.did(),
              writes: writes,
              validate: true,
          })

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

          writes = [];
          tid = undefined;
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
      if (!publishState.pinned) {
          onClose();
      }
      postState.clearPosts();
      writes = [];
      tid = undefined;

      if (publishState.pinned) {
          await tick();
          editor.focus();
      }

      if ($settings?.general?.continuousTag && continuousTags.length) {
        const tagsText = continuousTags.map(tag => `<span class="editor-hashtag">#${tag}</span>`).join(' ');
        postState.replaceText('<br>' + tagsText);
        await tick();
        editor.focus('start');
      }
  }

  async function publish(post, treeReplyRef = undefined) {
      isEnabled = true;

      let embed: AppBskyEmbedImages.Main | AppBskyEmbedRecord.Main | AppBskyEmbedRecordWithMedia.Main | AppBskyEmbedExternal.Main | undefined;
      let embedImages: AppBskyEmbedImages.Main = {
          $type: 'app.bsky.embed.images',
          images: [],
      };
      let embedVideo: AppBskyEmbedVideo.Main;
      let embedRecord: AppBskyEmbedRecord.Main;
      let embedRecordWithMedia: AppBskyEmbedRecordWithMedia.Main;
      let embedExternal: AppBskyEmbedExternal.Main | undefined = post.embedExternal || undefined;
      let lang: string[] = [];
      let selfLabels = [];

      const images = post.images;

      if (!post.text && !images.length && !embedExternal) {
          isEnabled = false;
          return false;
      }

      lang = post.lang === 'auto' ? await languageDetect(post.text) : post.lang;
      if (!lang.length && $settings?.general?.userLanguage) {
          lang = [$settings.general.userLanguage];
      }

      if (!Array.isArray(lang)) {
          lang = [lang];
      }

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

      if (post.video) {
          const videoToastId = toast.loading($_('process_to_video_upload'));

          try {
              const token = await getServiceAuthToken({lxm: 'com.atproto.repo.uploadBlob', exp: Date.now() / 1000 + 60 * 30}, _agent);

              const xhr = new XMLHttpRequest();
              const res = await new Promise<AppBskyVideoDefs.JobStatus>((resolve, reject) => {
                  xhr.upload.addEventListener('progress', e => {
                      const progress = e.loaded / e.total;

                      toast.loading($_('process_to_video_upload') + '(' + Math.round(progress * 100) + '%)', {
                          id: videoToastId,
                          duration: 100000,
                      });
                  })
                  xhr.onloadend = () => {
                      if (xhr.readyState === 4) {
                          const uploadRes = JSON.parse(
                              xhr.responseText,
                          ) as AppBskyVideoDefs.JobStatus
                          resolve(uploadRes)
                      } else {
                          reject(new Error(xhr.statusText));
                      }
                  }
                  xhr.onerror = () => {
                      reject(new Error(xhr.statusText));
                  }

                  xhr.open('POST', `https://video.bsky.app/xrpc/app.bsky.video.uploadVideo?did=${_agent.did()}&name=${self.crypto.randomUUID()}.${post.video.ext}`, true)
                  xhr.setRequestHeader('Content-Type', post.video.mimeType)
                  xhr.setRequestHeader('Authorization', 'Bearer ' + token)
                  xhr.send(post.video.bytes)
              })

              if (res.jobId) {
                  toast.loading($_('process_to_video_upload_processing'), {
                      id: videoToastId,
                      duration: 1000000,
                  });

                  try {
                      res.blob = await getIntervalProcessingUpload(res.jobId);
                  } catch (e) {
                      console.error(e);
                      throw new Error('Upload failed');
                  }
              }

              if (res.blob) {
                  embedVideo = {
                      $type: 'app.bsky.embed.video',
                      video: res.blob,
                      aspectRatio: {
                          width: post.video?.aspectRatio?.width || 1280,
                          height: post.video?.aspectRatio?.height || 720,
                      }
                  }

                  toast.success($_('success_to_video_upload'), {
                      id: videoToastId,
                      duration: 1500,
                  });
              } else {
                  throw new Error('Upload failed');
              }
          } catch (e) {
              toast.error('Video upload failed!!!', {
                  id: videoToastId,
                  duration: 5000,
              });
              console.error(e);
              throw new Error(e);
          }
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

      if (embedVideo && post?.quotePost?.uri) {
          embedRecordWithMedia = {
              $type: 'app.bsky.embed.recordWithMedia',
              media: embedVideo,
              record: embedRecord,
          }

          embed = embedRecordWithMedia;
      } else if (embedVideo) {
          embed = embedVideo;
      } else if (embedImages.images.length && post?.quotePost?.uri) {
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

      tid = TID.next(tid);
      const rkey = tid.toString()
      const uri = `at://${_agent.did()}/app.bsky.feed.post/${rkey}`

      try {
          const record = {
              $type: 'app.bsky.feed.post',
              embed: embed,
              facets: rt ? rt.facets : undefined,
              text: rt ? rt.text : '',
              createdAt: new Date().toISOString(),
              reply: treeReplyRef || shortReplyRef,
              langs: lang.length ? lang : undefined,
              labels: selfLabels.length ? {
                  $type: 'com.atproto.label.defs#selfLabels',
                  values: selfLabels || [],
              } : undefined,
              via: 'TOKIMEKI',
          };

          writes.push({
              $type: 'com.atproto.repo.applyWrites#create',
              collection: 'app.bsky.feed.post',
              rkey: rkey,
              value: record,
          })

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
                      } else if(item === 'follower') {
                          return {
                              $type: 'app.bsky.feed.threadgate#followerRule',
                          }
                      } else {
                          return {
                              $type: 'app.bsky.feed.threadgate#listRule',
                              list: item,
                          }
                      }
                  })
              }

              writes.push({
                  $type: 'com.atproto.repo.applyWrites#create',
                  collection: 'app.bsky.feed.threadgate',
                  rkey: rkey,
                  value: {
                      createdAt: new Date().toISOString(),
                      post: uri,
                      allow: allow,
                  }
              })
          }

          if (post.postGate === false) {
              writes.push({
                  $type: 'com.atproto.repo.applyWrites#create',
                  collection: 'app.bsky.feed.postgate',
                  rkey: rkey,
                  value: {
                      createdAt: new Date().toISOString(),
                      detachedEmbeddingUris: [],
                      embeddingRules: [{
                          $type: 'app.bsky.feed.postgate#disableRule',
                      }],
                      post: uri,
                  }
              })
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

              if ($settings?.general?.continuousTag) {
                  continuousTags = tags.filter(v => v);
              }

              if ($hashtagHistory.length > 4) {
                  $hashtagHistory = $hashtagHistory.slice(0, 4);
              }
              localStorage.setItem('hashtagHistory', JSON.stringify($hashtagHistory));
          }

          return {
              cid: await computeCid(record),
              uri,
          };
      } catch (error) {
          console.error((error as Error).message);
          toast.error($_('failed_to_post') + ':' + (error as Error).message);
          isEnabled = false;
          throw error;
      }
  }

  function applyAddThread() {
      postState.posts.splice(postState.index + 1, 0, $state.snapshot(postState.initPost));
      postState.index = postState.index + 1;
      tick().then(() => {
          editor.focus();
      })
  }

  function applyChangeThread(index) {
      postState.index = index;
  }

  function applyDeleteThread(index) {
      postState.posts.splice(index, 1);

      if (postState.index !== 0) {
          postState.index = postState.index - 1;
      }

      tick().then(() => {
          editor.focus();
      })
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if (isMobile ? publishState.show && isMobilePopState : publishState.show)}
  <button class="publish-toggle publish-toggle--close" aria-label="Close post composer." class:publish-toggle--vk={!$settings.design?.mobilePostLayoutTop} class:publish-toggle--mobileV2={$settings.design?.mobileNewUi} onclick={onClose}>
    <X size="24" color="var(--bg-color-1)"></X>
  </button>
{:else}
  <button class="publish-toggle" aria-label="Open post composer." class:publish-toggle--mobileV2={$settings.design?.mobileNewUi} onclick={handleOpen}>
    <Pencil size="22" color="var(--bg-color-1)"></Pencil>
  </button>
{/if}

<section class="publish-group"
         class:publish-group--expanded={isMobile ? publishState.show && isMobilePopState : publishState.show}
         class:publish-group--left={publishState.layout === 'left'}
         class:publish-group--bottom={publishState.layout === 'bottom'}
         class:publish-group--popup={publishState.layout === 'popup'}
         class:vk-publish-group={!$settings.design?.mobilePostLayoutTop}
         class:publish-mobile-top={$settings?.design?.mobilePostLayoutTop}
>
  {#if (publishState.layout === 'popup')}
    <div class="publish-bg-close" onclick={onClose} aria-hidden="true"></div>
  {/if}

  <div class="publish-wrap">
    <div class="publish-header">
      <button class="editor-menu-button" onclick={() => {isConfigOpen = !isConfigOpen}}>
        <Settings2 size="20" color="var(--text-color-1)"></Settings2>
      </button>

      {#if (!isEnabled)}
        <button class="publish-draft-button publish-save-draft" onclick={saveDraft} disabled={postState.posts.length > 1}>{$_('drafts_save')}</button>
      {:else}
        <button class="publish-draft-button publish-view-draft" onclick={openDraft} disabled={postState.posts.length > 1}>{$_('drafts')}</button>
      {/if}

      <button class="publish-sp-close" onclick={onClose} aria-label="Close.">
        <X color="var(--primary-color)"></X>
      </button>

      <button class="publish-submit-button publish-submit-button--top" onclick={publishAll} disabled={isEnabled}>
        {$_('publish_button_send')}
      </button>
    </div>

    {#each postState.posts as post, index (post)}
      <div class="publish-item-wrap" data-index={index}>
        {#if (index > 0)}
          <button class="publish-item-delete" onclick={() => {applyDeleteThread(index)}} aria-label="delete">
            <X size="20"></X>
          </button>
        {/if}

        {#if (index === postState.index)}
          <PublishMain
                  {index}
                  bind:_agent={_agent}
                  onadd={applyAddThread}
                  onopen={handleOpen}
                  onpublish={publishAll}
                  bind:editor={editor}
                  bind:isEnabled={isEnabled}
                  {submitArea}
          >
          </PublishMain>
        {:else}
          <PublishPool {post} {index} bind:_agent={_agent} onchange={applyChangeThread} isEnabled={isPublishing}></PublishPool>
        {/if}
      </div>
    {/each}
  </div>

  {#if (isDraftModalOpen)}
    <DraftModal {_agent} onuse={handleDraftUse} onclose={() => {isDraftModalOpen = false}}></DraftModal>
  {/if}

  {#if (isConfigOpen)}
    <PublishConfigModal onclose={() => {isConfigOpen = false}}></PublishConfigModal>
  {/if}
</section>

{#snippet submitArea()}
  <button class="publish-submit-button publish-submit-button--bottom" onclick={publishAll} disabled={isEnabled}>
    {$_('publish_button_send')}
  </button>
{/snippet}

<style lang="postcss">
    .publish-toggle {
        display: flex;
        position: fixed;
        right: 16px;
        bottom: calc(16px + var(--safe-area-bottom));
        width: 52px;
        height: 52px;
        border-radius: 16px;
        background-color: var(--primary-color);
        align-items: center;
        justify-content: center;
        z-index: 2001;
        pointer-events: auto;

        @media (max-width: 767px) {
            display: flex;
            bottom: calc(64px + var(--safe-area-bottom));
        }

        &--vk {
            @media (max-width: 767px) {
                display: none;
            }
        }

        &--hidden {
            @media (max-width: 767px) {
                opacity: 0;
                visibility: hidden;
            }
        }

        &--mobileV2 {
            @media (max-width: 767px) {
                width: 48px;
                height: 48px;
                bottom: calc(112px + var(--visual-viewport-height, 0px) + var(--safe-area-bottom));
            }
        }
    }

    .publish-header {
        max-width: 740px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 12px 16px;

        @media (max-width: 767px) {
            padding: 12px 12px 8px;
        }
    }

    .publish-submit-button {
        z-index: 12;
        min-width: 72px;
        border-radius: var(--border-radius-3);
        background-color: var(--publish-post-button-bg-color);
        color: var(--publish-post-button-color);
        border: var(--publish-post-button-border);
        box-shadow: var(--publish-post-button-box-shadow);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        font-size: 14px;
        letter-spacing: .05em;
        font-weight: bold;
        gap: 0;
        white-space: nowrap;
        padding: 0 8px;

        &--top {
          height: 32px;
        }

        &:disabled {
          opacity: .6;
        }

        &--hide {
          @media (max-width: 767px) {
            display: none;
          }
        }

      &--bottom {
        @media (min-width: 768px) {
          display: none;
        }
      }

      &--top {
        @media (max-width: 767px) {
          display: none;
        }
      }

        @media (max-width: 767px) {
            order: 3;
        }
    }

    .publish-mobile-top {
      @media (max-width: 767px) {
        .publish-submit-button--bottom {
          display: none;
        }

        .publish-submit-button--top {
          display: flex !important;
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
        margin-left: auto;

        &:hover {
            opacity: .7;
        }

        &:disabled {
            color: var(--border-color-1);

            &:hover {
                opacity: 1;
            }
        }
    }

    .publish-sp-close {
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

    .publish-bg-close {
        position: fixed;
        inset: 0;
        cursor: pointer;
        z-index: -1;

        @media (max-width: 767px) {
            display: none;
        }
    }
</style>