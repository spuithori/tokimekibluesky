<script lang="ts">
    import {_} from 'svelte-i18n';
    import imageCompression from 'browser-image-compression';
    import Modal from "$lib/components/ui/Modal.svelte";

    let { profile, _agent, onclose, onupdate } = $props();

    let isEditOpen = $state(false);
    let displayName = $state(profile.displayName);
    let description = $state(profile.description);
    let currentAvatar = $state(profile.avatar);
    let currentBanner = $state(profile.banner);
    let avatar;
    let banner;
    let errorMessage = '';

    let isSubmitDisabled = $state(false);
    let submitButtonText = $state($_('submit_button_submit'));

    let avatarInput = $state();
    let bannerInput = $state();
    let avatarBase64 = $state('');
    let bannerBase64 = $state('');

    async function onAvatarSelected(e) {
        const file = e.target?.files[0] || undefined;

        if (!file) {
            return false;
        }

        avatar = await fileUpload(file, 'avatar');
    }

    async function onAvatarDeleted(error, file) {
        avatar = null;
        currentAvatar = null;
    }

    async function onBannerSelected(e) {
        const file = e.target?.files[0] || undefined;

        if (!file) {
            return false;
        }

        banner = await fileUpload(file, 'banner');
    }

    async function onBannerDeleted(error, file) {
        banner = null;
        currentBanner = null;
    }

    async function fileUpload(file, from: 'avatar' | 'banner') {
        const image = await imageCompression(file, {
            maxSizeMB: 0.92,
            maxWidthOrHeight: 2000,
            useWebWorker: true,
        });

        if (from === 'avatar') {
            avatarBase64 = await imageCompression.getDataUrlFromFile(image);
        } else {
            bannerBase64 = await imageCompression.getDataUrlFromFile(image);
        }

        const fileBlob = await _agent.agent.api.com.atproto.repo.uploadBlob(image, {
            encoding: 'image/jpeg',
        });
        isSubmitDisabled = false;
        submitButtonText = $_('submit_button_submit');
        return fileBlob.data.blob
    }

    async function submit() {
        isSubmitDisabled = true;
        let currentProfile;
        try {
            currentProfile = await _agent.agent.api.app.bsky.actor.profile.get({ repo: _agent.did(), rkey: 'self' });
        } catch(e) {
           console.log(e)
        }

        let profileObj = {
            displayName: displayName,
            description: description,
            avatar: currentProfile?.value.avatar,
            banner: currentProfile?.value.banner,
        }
        if (avatar) {
            profileObj.avatar = avatar;
        }
        if (banner) {
            profileObj.banner = banner;
        }

        try {
            await _agent.agent.upsertProfile(_profile => {
                const profile = _profile || {};

                return {
                    ...profile,
                    ...profileObj,
                };
            });
            isEditOpen = false;
            onupdate();
        } catch (e) {
            console.error(e)
            errorMessage = e.message;
            isSubmitDisabled = false;
        }
    }
</script>

<Modal title={$_('edit_profile_button')} size="small" {onclose}>
  <div class="edit-avatar">
    <dl class="input-group">
      <dt class="input-group__name input-group__name--show">
        {$_('edit_avatar')}
      </dt>

      <dd class="input-group__content">
        <button class="edit-avatar-input-wrap" onclick={() => {avatarInput.click()}}>
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
        <button class="edit-banner-input-wrap" onclick={() => {bannerInput.click()}}>
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
        <input class="input-group__input" type="text" name="displayName" id="display_name" placeholder="" bind:value="{displayName}" required />
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
  </div>

  <div class="edit-buttons">
    <button class="button" onclick={submit} disabled={isSubmitDisabled}>{submitButtonText}</button>
    <button class="button button--border" onclick={onclose}>{$_('edit_cancel_button')}</button>
  </div>
</Modal>

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
      border-radius: 50%;
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
</style>