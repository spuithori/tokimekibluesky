<script lang="ts">
  import {_} from 'svelte-i18n';
  import { agent, agents, hashtagHistory, isChatColumnFront, postgate, postPulse, settings, threadGate } from '$lib/stores';
  import {selfLabels} from "$lib/components/editor/publishStore";
  import {clickOutside} from '$lib/clickOutSide';
  import { AppBskyEmbedExternal, AppBskyEmbedImages, AppBskyEmbedRecord, AppBskyEmbedRecordWithMedia, AppBskyEmbedVideo, AppBskyVideoDefs, RichText } from '@atproto/api';
  import {toast} from 'svelte-sonner'
  import {goto, pushState} from '$app/navigation';
  import {page} from '$app/stores';
  import type {Draft} from '$lib/db';
  import {db} from '$lib/db';
  import DraftModal from "$lib/components/draft/DraftModal.svelte";
  import {getAccountIdByDid, getServiceAuthToken} from "$lib/util";
  import {detectRichTextWithEditorJson} from "$lib/components/editor/richtext";
  import imageCompression from 'browser-image-compression';
  import PublishPool from "$lib/components/editor/PublishPool.svelte";
  import PublishMain from "$lib/components/editor/PublishMain.svelte";
  import {getIntervalProcessingUpload} from "$lib/components/editor/videoUtil";
  import {tick} from "svelte";
  import {TID} from "@atproto/common-web";
  import {computeCid} from "$lib/components/editor/postUtil";
  import {postState} from "$lib/classes/postState.svelte";
  import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
  import {publishState} from "$lib/classes/publishState.svelte";
  import {Pin, PinOff, X} from "lucide-svelte";

  let _agent = $state($agent);
  let editor = $state();
  let isContinueMode = $state(false);
  let isDraftModalOpen = $state(false);
  let mentionsHistory = JSON.parse(localStorage.getItem('mentionsHistory')) || [];
  let isVirtualKeyboard = $state(false);
  let isEnabled = $state(true);
  let isPublishing = $state(false);
  let unique = $state(Symbol());
  let postsPool = $state([{}]);
  let currentPost = $state(0);
  let getCurrentThreadData = $state();
  let publishMainEl = $state();
  let writes = [];
  let tid: TID | undefined;

  const isMobile = navigator?.userAgentData?.mobile || false;

  if ('virtualKeyboard' in navigator) {
      navigator.virtualKeyboard.overlaysContent = true;
      isVirtualKeyboard = true;
  }

  if (!$settings.langSelector) {
      $settings.langSelector = 'auto';
  }

  let isMobilePopState = $derived(isMobile ? $page.state.showPublish : false);

  $effect(() => {
      if (isMobile ? publishState.show && isMobilePopState : publishState.show) {
          document.documentElement.classList.add('scroll-lock');
      } else {
          document.documentElement.classList.remove('scroll-lock');
      }
  })

  $effect(() => {
      handlePostPulse($postPulse);
  })

  $effect(() => {
      if (postState.quotePulse) {
          quoteObserve(postState.quote?.uri);
      }
  })

  $effect(() => {
      if (postState.replyPulse) {
          replyObserve(postState.reply);
      }
  })

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
          pushState('', {
              showPublish: true
          });
      }

      scrollDirectionState.direction = 'up';
  }

  function onClose(force: boolean = false) {
      if (publishState.show) {
          postState.quotePulse = undefined;
          postState.replyPulse = undefined;
          publishState.show = false;
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

      if (event.key === 'Escape' && publishState.show) {
          onClose();
      }
  }

  function handlePostPulse(posts) {
      if (!posts || !posts.length) {
          return false;
      }

      postsPool = posts;
      _agent = $agents.get(getAccountIdByDid($agents, posts[0].did));
      unique = Symbol();
      handleOpen();
      postPulse.set([]);
  }


  function quoteObserve(uri) {
      if (uri) {
          handleOpen();
      }
  }

  function replyObserve(reply) {
      if (reply) {
          handleOpen();
          _agent = $agents.get(getAccountIdByDid($agents, reply.did));
      } else {
          _agent = $agent;
      }
  }

  function handleOutClick() {
      if (isContinueMode || publishState.layout !== 'bottom') {
          return false;
      }

      onClose();
  }

  async function saveDraft() {
      try {
          postsPool[currentPost] = publishMainEl.getThread();

          const id = await db.drafts.add($state.snapshot({
              createdAt: Date.now(),
              owner: _agent.did() as string,
              ...postsPool[currentPost],
          }));

          if (!isContinueMode) {
              publishState.show = false;
          }
          editor.clear();
          postState.quote = undefined;
          postState.reply = undefined;
          postsPool = [{}];
          unique = Symbol();

          toast.success($_('draft_add_success'));
      } catch (e) {
          toast.error($_('error') + ': ' + e);
      }
  }

  async function handleDraftUse(draft: Draft) {
      isDraftModalOpen = false;
      editor.clear();
      postState.quote = undefined;
      postState.reply = undefined;

      postsPool = [{
          ...draft,
      }];
      unique = Symbol();

      tick().then(() => {
          editor.focus();
      });
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
      initialQuality: 0.85,
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
      postsPool[currentPost] = publishMainEl.getThread();
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
      if (!isContinueMode) {
          onClose();
      }
      editor.clear();
      postState.quote = undefined;
      postState.reply = undefined;
      selfLabels.set([]);
      threadGate.set('everybody');
      postsPool = [{}];
      currentPost = 0;
      writes = [];
      tid = undefined;
      unique = Symbol();

      if (isContinueMode) {
          await tick();
          editor.focus();
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

      lang = post.lang === 'auto' ? await languageDetect(post.text) : [post.lang];
      if (!lang.length && $settings?.general?.userLanguage) {
          lang = [$settings.general.userLanguage];
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

          if (!$postgate) {
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

  function applyAddThread(e) {
      postsPool[currentPost] = e.detail.data;
      postsPool.splice(currentPost + 1, 0, {});
      currentPost = currentPost + 1;
      tick().then(() => {
          editor.focus();
      })
  }

  function applyChangeThread(e) {
      postsPool[currentPost] = publishMainEl.getThread();
      currentPost = e.detail.index;
  }

  function applyDeleteThread(index) {
      postsPool[currentPost] = publishMainEl.getThread();
      postsPool.splice(index, 1);

      if (currentPost !== 0) {
          currentPost = currentPost - 1;
      } else {
          postsPool = postsPool;
      }

      tick().then(() => {
          editor.focus();
      })
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if (isMobile ? publishState.show && isMobilePopState : publishState.show)}
  <button class="only-mobile publish-sp-open publish-sp-open--close" class:publish-sp-open--vk={isVirtualKeyboard && !$settings.design?.mobilePostLayoutTop} aria-label="投稿ウィンドウを閉じる" onclick={() => {onClose(true)}}>
    <svg xmlns="http://www.w3.org/2000/svg" width="16.97" height="16.97" viewBox="0 0 16.97 16.97">
      <path id="close" d="M10,8.586,2.929,1.515,1.515,2.929,8.586,10,1.515,17.071l1.414,1.414L10,11.414l7.071,7.071,1.414-1.414L11.414,10l7.071-7.071L17.071,1.515Z" transform="translate(-1.515 -1.515)" fill="var(--bg-color-1)"/>
    </svg>
  </button>
{:else}
  <button class="only-mobile publish-sp-open" aria-label="投稿ウィンドウを開く" class:publish-sp-open--hidden={$isChatColumnFront} onclick={handleOpen}>
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <path id="edit-pencil" d="M12.3,3.7l4,4L4,20H0V16Zm1.4-1.4L16,0l4,4L17.7,6.3l-4-4Z" fill="var(--bg-color-1)"/>
    </svg>
  </button>
{/if}

<section class="publish-group"
         class:publish-group--expanded={isMobile ? publishState.show && isMobilePopState : publishState.show}
         class:publish-group--left={publishState.layout === 'left'}
         class:publish-group--bottom={publishState.layout === 'bottom'}
         class:publish-group--popup={publishState.layout === 'popup'}
         class:vk-publish-group={isVirtualKeyboard && !$settings.design?.mobilePostLayoutTop}
         use:clickOutside={{ignoreElement: '.publish-sp-open, .side-publish-button'}}
         onoutclick={handleOutClick}
>
  {#if (publishState.layout === 'popup')}
    <div class="publish-bg-close" onclick={onClose}></div>
  {/if}

  <div class="publish-wrap">
    <div class="publish-buttons">
      {#if (!isEnabled)}
        <button class="publish-draft-button publish-save-draft" onclick={saveDraft} disabled={postsPool.length > 1}>{$_('drafts_save')}</button>
      {:else}
        <button class="publish-draft-button publish-view-draft" onclick={() => {isDraftModalOpen = true}} disabled={postsPool.length > 1}>{$_('drafts')}</button>
      {/if}

      <div class="publish-form-continue-mode">
        <div class="publish-form-continue-mode-input" class:checked={isContinueMode}>
          <input id="continue_mode" type="checkbox" bind:checked={isContinueMode}>
          <label for="continue_mode">
            {#if (isContinueMode)}
              <Pin size="18"></Pin>
            {:else}
              <PinOff size="18"></PinOff>
            {/if}
            {$_('continuous_mode')}
          </label>
        </div>
      </div>

      <button class="publish-form__submit" class:publish-form__submit--hide={isVirtualKeyboard && !$settings.design?.mobilePostLayoutTop} onclick={publishAll} disabled={isEnabled}>{$_('publish_button_send')}</button>

      <button class="publish-form-sp-close" onclick={onClose}>
        <X color="var(--primary-color)"></X>
      </button>
    </div>

    {#key unique}
      {#key currentPost}
        {#each postsPool as post, index}
          <div class="publish-item-wrap" data-index="{index}">
            {#if (index > 0)}
              <button class="publish-item-delete" onclick={() => {applyDeleteThread(index)}} aria-label="delete"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
            {/if}

            {#if (index === currentPost)}
              <PublishMain
                  {post}
                  bind:_agent={_agent}
                  on:focus={handleOpen}
                  on:add={applyAddThread}
                  on:publish={publishAll}
                  bind:this={publishMainEl}
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
    <DraftModal {_agent} onuse={handleDraftUse} on:close={() => {isDraftModalOpen = false}}></DraftModal>
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
        pointer-events: auto;

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

        &--hidden {
            @media (max-width: 767px) {
                opacity: 0;
                visibility: hidden;
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
        margin-right: 16px;

        @media (max-width: 767px) {
            display: none;
        }
    }

    .publish-form-continue-mode-input {
        border: 1px solid var(--border-color-1);
        color: var(--border-color-1);
        padding: 0 12px;
        font-size: 14px;
        height: 30px;
        border-radius: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        cursor: pointer;
        position: relative;

        label {
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;

            &::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                right: 0;
            }
        }

        &.checked {
            border-color: var(--primary-color);
            color: var(--primary-color);
            font-weight: bold;
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

        &::before {
            content: '';
            display: block;
            position: absolute;
            width: 2px;
            background-color: var(--border-color-1);
            left: 32px;
            top: 0;
            bottom: 0;
        }

        &:not(:last-child) {
            &::after {
                content: '';
                display: block;
                position: absolute;
                left: 32px;
                margin: auto;
                bottom: 40px;
                top: 114px;
                width: 2px;
                background-color: var(--border-color-1);

                @media (max-width: 767px) {
                    left: 31px;
                }
            }
        }

        &:last-child {
            &::before {
                bottom: 12px;
            }
        }

        &[data-index='0'] {
            &::before {
                top: 12px;
            }
        }
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
                padding-bottom: 86px;
            }
        }
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