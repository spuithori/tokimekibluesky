<script lang="ts">
    import { untrack } from 'svelte';
    import {_} from 'tokimeki-i18n';
    import { compressImage, blobToDataUrl } from '$lib/imageCompressor/compressor';
    import Modal from "$lib/components/ui/Modal.svelte";
    import { ImageEditor } from 'tokimeki-image-editor';
    import { settings } from '$lib/stores';
    import ProfileLinksEditor from '$lib/components/profile/ProfileLinksEditor.svelte';
    import ProfileLinkForm from '$lib/components/profile/ProfileLinkForm.svelte';
    import { normalizeProfileLinkUrl, validateLinkInput, type ProfileLink } from '$lib/profileLinks/rules';
    import { loadOwnProfileLinks, resolveNewLink, sameProfileLinks, writeProfileLinks } from '$lib/profileLinks/repo';

    let { profile, _agent, onclose, onupdate } = $props();

    let isEditOpen = $state(false);
    let displayName = $state(profile.displayName);
    let description = $state(profile.description);
    let currentAvatar = $state(profile.avatar);
    let currentBanner = $state(profile.banner);
    let pronouns = $state(profile.pronouns);
    let links: ProfileLink[] = $state([]);
    let linksStatus: 'loading' | 'ready' | 'error' = $state('loading');
    let linkFormIndex: number | null | undefined = $state();
    let originalLinks: ProfileLink[] = [];
    let migratedWebsite = false;
    let websiteResolving: Promise<void> = Promise.resolve();
    let avatar;
    let banner;
    let errorMessage = '';

    let isSubmitDisabled = $state(false);
    let submitButtonText = $state($_('submit_button_submit'));

    let avatarInput = $state();
    let bannerInput = $state();
    let avatarBase64 = $state('');
    let bannerBase64 = $state('');

    let cropTarget: 'avatar' | 'banner' | null = $state(null);
    let cropFile: File | null = $state(null);

    function onAvatarSelected(e) {
        const file = e.target?.files[0] || undefined;
        e.target.value = '';

        if (!file) {
            return false;
        }

        cropFile = file;
        cropTarget = 'avatar';
    }

    async function onAvatarDeleted(error, file) {
        avatar = null;
        currentAvatar = null;
    }

    function onBannerSelected(e) {
        const file = e.target?.files[0] || undefined;
        e.target.value = '';

        if (!file) {
            return false;
        }

        cropFile = file;
        cropTarget = 'banner';
    }

    async function handleCropComplete(dataUrl: string, blobObj: {blob: Blob, width: number, height: number}) {
        const target = cropTarget;
        cropTarget = null;
        cropFile = null;

        if (target === 'avatar') {
            avatar = await fileUpload(blobObj.blob, 'avatar');
        } else if (target === 'banner') {
            banner = await fileUpload(blobObj.blob, 'banner');
        }
    }

    function handleCropCancel() {
        cropTarget = null;
        cropFile = null;
    }

    async function onBannerDeleted(error, file) {
        banner = null;
        currentBanner = null;
    }

    async function fileUpload(file, from: 'avatar' | 'banner') {
        const image = await compressImage(file, {
            maxSizeMB: 2_000_000 / 1024 / 1024,
            maxWidthOrHeight: 2000,
        });

        if (from === 'avatar') {
            avatarBase64 = await blobToDataUrl(image);
        } else {
            bannerBase64 = await blobToDataUrl(image);
        }

        const fileBlob = await _agent.xrpc.post('com.atproto.repo.uploadBlob', image, {
            encoding: image.type,
        });
        isSubmitDisabled = false;
        submitButtonText = $_('submit_button_submit');
        return fileBlob.blob
    }

    function migrateWebsite() {
        if (typeof profile.website !== 'string') {
            return;
        }
        const url = normalizeProfileLinkUrl(profile.website.trim().replace(/^http:\/\//i, 'https://'));
        if (!url || validateLinkInput(url, []).error) {
            return;
        }
        links = [{ url }];
        migratedWebsite = true;
        websiteResolving = resolveNewLink(_agent, url, true).then(resolved => {
            if (resolved.blocked) {
                links = links.filter(link => link.url !== url);
                migratedWebsite = false;
                return;
            }
            links = links.map(link => {
                if (link.url !== url || link.icon) {
                    return link;
                }
                const next = { ...link };
                if (resolved.icon) next.icon = resolved.icon;
                if (resolved.iconUrl) next.iconUrl = resolved.iconUrl;
                if (!next.title && resolved.title) next.title = resolved.title;
                return next;
            });
        });
    }

    const linksLoading = untrack(() => loadOwnProfileLinks(_agent))
        .then(own => {
            originalLinks = own.links;
            links = [...own.links];
            linksStatus = 'ready';
            if (!own.refs?.length) {
                migrateWebsite();
            }
        })
        .catch(e => {
            console.error(e);
            linksStatus = 'error';
        });

    function saveLink(saved: ProfileLink) {
        links = linkFormIndex == null ? [...links, saved] : links.map((link, i) => i === linkFormIndex ? saved : link);
        linkFormIndex = undefined;
    }

    function removeLink() {
        links = links.filter((_link, i) => i !== linkFormIndex);
        linkFormIndex = undefined;
    }

    async function submit() {
        isSubmitDisabled = true;

        let profileObj: Record<string, unknown> = {
            displayName: displayName,
            description: description,
            pronouns: pronouns,
        }
        if (avatar) {
            profileObj.avatar = avatar;
        }
        if (banner) {
            profileObj.banner = banner;
        }

        let linkWrite: Awaited<ReturnType<typeof writeProfileLinks>> | undefined;
        try {
            await linksLoading;
            await websiteResolving;
            const nextLinks = $state.snapshot(links);
            if (linksStatus === 'ready' && !sameProfileLinks(nextLinks, originalLinks)) {
                linkWrite = await writeProfileLinks(_agent, nextLinks, originalLinks);
            }
            const refs = linkWrite?.refs;
            const dropWebsite = linksStatus === 'ready' && migratedWebsite;

            await _agent.upsertProfile((_profile: Record<string, unknown>) => {
                const next: Record<string, unknown> = {
                    ..._profile,
                    ...profileObj,
                };
                if (refs) {
                    if (refs.length) {
                        next.links = refs;
                    } else {
                        delete next.links;
                    }
                }
                if (dropWebsite) {
                    delete next.website;
                }
                return next;
            });
            await linkWrite?.deleteRemoved();
            isEditOpen = false;
            onupdate();
        } catch (e) {
            await linkWrite?.deleteCreated();
            console.error(e)
            errorMessage = e.message;
            isSubmitDisabled = false;
        }
    }
</script>

<Modal
  title={linkFormIndex === undefined ? $_('edit_profile_button') : $_(linkFormIndex === null ? 'profile_link_add' : 'profile_link_edit')}
  size="small"
  {onclose}
  onback={linkFormIndex === undefined ? undefined : () => { linkFormIndex = undefined; }}
>
  {#if linkFormIndex !== undefined}
    <ProfileLinkForm
      link={linkFormIndex === null ? null : links[linkFormIndex]}
      otherUrls={links.filter((_link, i) => i !== linkFormIndex).map(link => link.url)}
      {_agent}
      onsave={saveLink}
      onremove={linkFormIndex === null ? undefined : removeLink}
    ></ProfileLinkForm>
  {:else}
  <div class="edit-avatar">
    <dl class="input-group">
      <dt class="input-group__name input-group__name--show">
        {$_('edit_avatar')}
      </dt>

      <dd class="input-group__content">
        <button class="edit-avatar-input-wrap" onclick={(e) => {e.stopPropagation(); avatarInput.click()}}>
          <span class="edit-avatar-previous" style="background-image: url({currentAvatar})"></span>

          {#if (avatarBase64)}
            <img src="{avatarBase64}" alt="" class="edit-avatar-preview">
          {/if}

          <input type="file" accept="image/jpeg, image/png" bind:this={avatarInput} onchange={onAvatarSelected} class="edit-input">
        </button>
      </dd>
    </dl>
  </div>

  <div class="edit-banner">
    <dl class="input-group">
      <dt class="input-group__name input-group__name--show">
        {$_('edit_banner')}
      </dt>

      <dd class="input-group__content">
        <button class="edit-banner-input-wrap" onclick={(e) => {e.stopPropagation(); bannerInput.click()}}>
          <span class="edit-banner-previous" style="background-image: url({currentBanner})"></span>

          {#if (bannerBase64)}
            <img src="{bannerBase64}" alt="" class="edit-banner-preview">
          {/if}

          <input type="file" accept="image/jpeg, image/png" bind:this={bannerInput} onchange={onBannerSelected} class="edit-input">
        </button>
      </dd>
    </dl>
  </div>

  <div class="edit-wrap">
    <dl class="input-group">
      <dt class="input-group__name input-group__name--show">
        <label for="display_name">{$_('edit_display_name')}</label>
      </dt>

      <dd class="input-group__content">
        <input class="input-group__input" type="text" name="displayName" id="display_name" placeholder="" bind:value={displayName} required>
      </dd>
    </dl>

    <dl class="input-group">
      <dt class="input-group__name input-group__name--show">
        <label for="description">{$_('edit_description')}</label>
      </dt>

      <dd class="input-group__content">
        <textarea name="description" id="description" cols="30" rows="10" bind:value={description}  required></textarea>
      </dd>
    </dl>

    <dl class="input-group">
      <dt class="input-group__name input-group__name--show">
        <label for="pronouns">{$_('edit_pronouns')}</label>
      </dt>

      <dd class="input-group__content">
        <input class="input-group__input" type="text" name="pronouns" id="pronouns" placeholder="" bind:value={pronouns}>
      </dd>
    </dl>

    <ProfileLinksEditor bind:links did={profile.did} status={linksStatus} onedit={(index) => { linkFormIndex = index; }}></ProfileLinksEditor>
  </div>

  <div class="edit-buttons">
    <button class="button" onclick={submit} disabled={isSubmitDisabled}>{submitButtonText}</button>
    <button class="button button--border" onclick={onclose}>{$_('edit_cancel_button')}</button>
  </div>
  {/if}
</Modal>

{#if cropFile && cropTarget}
  <dialog class="crop-dialog" {@attach (el: HTMLDialogElement) => { if (!el.open) el.showModal(); }} onclose={handleCropCancel}>
    <ImageEditor
        initialImage={cropFile}
        width={1200}
        height={700}
        theme={$settings?.design?.darkmode ? 'dark' : 'light'}
        isStandalone={false}
        cropOptions={{
            cropOnly: true,
            aspectRatio: cropTarget === 'avatar' ? 1 : 3,
            circularGuide: cropTarget === 'avatar',
        }}
        onComplete={handleCropComplete}
        onCancel={handleCropCancel}
    ></ImageEditor>
  </dialog>
{/if}

<style lang="postcss">
  .edit-buttons {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      margin-top: 32px;
  }

  .input-group {
      input {
          border: 1px solid var(--border-color-1);
          color: var(--text-color-1);
          background-color: var(--bg-color-1);
      }

      textarea {
          resize: none;
          color: var(--text-color-1);
      }
  }

  .edit-avatar-input-wrap {
      width: 150px;
      aspect-ratio: 1 / 1;
      border-radius: var(--avatar-border-radius, 50%);
      position: relative;
      overflow: hidden;
  }

  .edit-banner-input-wrap {
      width: 100%;
      border-radius: 6px;
      aspect-ratio: 3 / 1;
      position: relative;
      overflow: hidden;
  }

  .edit-avatar-previous {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      right: 0;
      background-size: contain;
  }

  .edit-banner-previous {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      right: 0;
      background-size: contain;
  }

  .edit-avatar-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
      position: absolute;
      left: 0;
      bottom: 0;
      top: 0;
      right: 0;
  }

  .edit-banner-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
      position: absolute;
      left: 0;
      bottom: 0;
      top: 0;
      right: 0;
  }

  .edit-input {
    display: none;
  }

  .crop-dialog {
      width: 100dvw;
      height: 100dvh;
      max-width: none;
      max-height: none;
      margin: 0;
      padding: 0;
      border: none;
      background-color: #1a1a1af2;
      backdrop-filter: blur(10px);

      &[open] {
          display: grid;
          place-items: center;
      }

      &::backdrop {
          background-color: transparent;
      }
  }
</style>