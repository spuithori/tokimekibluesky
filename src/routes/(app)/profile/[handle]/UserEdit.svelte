<script lang="ts">
    import {_} from 'svelte-i18n';
    import {createEventDispatcher} from 'svelte';
    import {fly} from 'svelte/transition';
    import {agent} from '$lib/stores';
    import FilePond, {registerPlugin} from 'svelte-filepond';
    import FilePondPluginImagePreview from 'filepond-plugin-image-preview'
    import FilePondPluginImageResize from 'filepond-plugin-image-resize';
    import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
    import FilePondPluginImageTransform from 'filepond-plugin-image-transform';
    import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
    import FilePondPluginFilePoster from 'filepond-plugin-file-poster';
    import FilePondPluginImageCrop from 'filepond-plugin-image-crop';

    registerPlugin(FilePondPluginImageResize);
    registerPlugin(FilePondPluginImagePreview);
    registerPlugin(FilePondPluginFileValidateSize);
    registerPlugin(FilePondPluginImageTransform);
    registerPlugin(FilePondPluginFileValidateType);
    registerPlugin(FilePondPluginFilePoster);
    registerPlugin(FilePondPluginImageCrop);

    export let profile;

    const dispatch = createEventDispatcher();

    let isEditOpen = false;
    let displayName = profile.displayName;
    let description = profile.description;
    let currentAvatar = profile.avatar;
    let currentBanner = profile.banner;
    let avatar;
    let banner;
    let errorMessage = '';

    let pondBanner;
    let pondBannerName = 'pondBanner';
    let pondAvatar;
    let pondAvatarName = 'pondAvatar';
    let isSubmitDisabled = false;
    let submitButtonText = $_('submit_button_submit');

    function editToggle() {
        isEditOpen = isEditOpen !== true;
    }

    function onAvatarInit() {

    }

    function onBannerInit() {

    }

    async function onAvatarAdded(file) {
        isSubmitDisabled = true;
        submitButtonText = $_('submit_button_progress');
    }

    async function onAvatarSelected(file, output) {
        avatar = await fileUpload(output);
    }

    async function onAvatarDeleted(error, file) {
        avatar = null;
        currentAvatar = null;
    }

    async function onBannerAdded(file) {
        isSubmitDisabled = true;
        submitButtonText = $_('submit_button_progress');
    }

    async function onBannerSelected(file, output) {
        banner = await fileUpload(output);
    }

    async function onBannerDeleted(error, file) {
        banner = null;
        currentBanner = null;
    }

    async function fileUpload(file) {
        let image = new File([await file], file.name, {
            type: file.type,
        });

        if (image.size > 1000000) {
            console.log('デカすぎ')
        }

        const fileBlob = await $agent.agent.api.com.atproto.repo.uploadBlob(image, {
            encoding: 'image/jpeg',
        });
        isSubmitDisabled = false;
        submitButtonText = $_('submit_button_submit');
        return fileBlob.data.blob
    }

    async function submit() {
        let currentProfile;
        try {
            currentProfile = await $agent.agent.api.app.bsky.actor.profile.get({ repo: $agent.did(), rkey: 'self' });
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
            await $agent.agent.api.com.atproto.repo.putRecord(
                {
                    repo: $agent.did(),
                    rkey: 'self',
                    collection: 'app.bsky.actor.profile',
                    record: profileObj,
                }
            )
            dispatch('update');
        } catch (e) {
            console.error(e)
            errorMessage = e.message;
        }
    }
</script>

<div>
  <button class="button button--sm" on:click={editToggle}>{$_('edit_profile_button')}</button>

  {#if (isEditOpen)}
    <div class="modal modal--edit" transition:fly="{{ y: 30, duration: 250 }}">
      <div class="modal__content">
        <div class="edit-avatar">
          <dl class="input-group">
            <dt class="input-group__name input-group__name--show">
              {$_('edit_avatar')}
            </dt>

            <dd class="input-group__content">
              <div class="edit-avatar-input-wrap" style="background-image: url({currentAvatar})">
                <FilePond
                    bind:this={pondAvatar}
                    {pondAvatarName}
                    allowMultiple={false}
                    maxFiles={1}
                    imageResizeTargetWidth={500}
                    imageResizeTargetHeight={500}
                    imageResizeMode={'contain'}
                    acceptedFileTypes={'image/jpeg, image/png'}
                    imageTransformOutputMimeType={'image/jpeg'}
                    imageTransformOutputQuality={'80'}
                    imageCropAspectRatio={'1:1'}
                    oninit={() => {onAvatarInit()}}
                    onpreparefile={(file, output) => {onAvatarSelected(file, output)}}
                    onremovefile="{(error, file) => {onAvatarDeleted(error, file)}}"
                    onaddfilestart={(file) => {onAvatarAdded(file)}}
                    credits={null}
                    labelIdle="<span>{$_('upload_avatar_label1')}<br>{$_('upload_avatar_label2')}</span>"
                    labelMaxFileSizeExceeded="{$_('file_size_too_big')}"
                    labelMaxFileSize="{$_('max_')} {'{'}filesize{'}'}"
                    labelFileTypeNotAllowed="{$_('unsupported_file')}"
                    fileValidateTypeLabelExpectedTypes="対応: JPG/PNG"
                    stylePanelLayout="compact circle"
                    styleLoadIndicatorPosition="center bottom"
                    styleProgressIndicatorPosition="right bottom"
                    styleButtonRemoveItemPosition="left bottom"
                    styleButtonProcessItemPosition="right bottom"
                />
              </div>
            </dd>
          </dl>
        </div>

        <div class="edit-banner">
          <dl class="input-group">
            <dt class="input-group__name input-group__name--show">
              {$_('edit_banner')}
            </dt>

            <dd class="input-group__content">
              <div class="edit-banner-input-wrap" style="background-image: url({currentBanner})">
                <FilePond
                    bind:this={pondBanner}
                    {pondBannerName}
                    allowMultiple={false}
                    maxFiles={1}
                    imageResizeTargetWidth={1500}
                    imageResizeTargetHeight={500}
                    imageResizeMode={'contain'}
                    acceptedFileTypes={'image/jpeg, image/png'}
                    imageTransformOutputMimeType={'image/jpeg'}
                    imageTransformOutputQuality={'80'}
                    imageCropAspectRatio={'3:1'}
                    oninit={() => {onBannerInit()}}
                    onpreparefile={(file, output) => {onBannerSelected(file, output)}}
                    onremovefile="{(error, file) => {onBannerDeleted(error, file)}}"
                    onaddfilestart={(file) => {onBannerAdded(file)}}
                    credits={null}
                    labelIdle="<span>{$_('upload_banner_label1')}<br>{$_('upload_banner_label2')}</span>"
                    labelMaxFileSizeExceeded="{$_('file_size_too_big')}"
                    labelMaxFileSize="{$_('max_')} {'{'}filesize{'}'}"
                    labelFileTypeNotAllowed="{$_('unsupported_file')}"
                    fileValidateTypeLabelExpectedTypes="対応: JPG/PNG"
                    stylePanelLayout="compact"
                />
              </div>
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
          <button class="button" on:click={submit} disabled={isSubmitDisabled}>{submitButtonText}</button>
          <button class="button button--border" on:click={editToggle}>{$_('edit_cancel_button')}</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style lang="postcss">
  .modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, .6);
      z-index: 1000;
      display: grid;
      place-items: center;

      &__content {
          width: calc(100% - 20px);
          height: max-content;
          max-height: 90vh;
          max-width: max-content;
          overflow: auto;
          overscroll-behavior-y: none;
          background-color: var(--bg-color-1);
          border-radius: 6px;
          padding: 30px;
      }
  }

  .edit-buttons {
      display: flex;
      justify-content: center;
      gap: 20px;
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
      border-radius: 50%;
      background-size: contain;
  }

  .edit-banner-input-wrap {
      border-radius: 6px;
      background-size: contain;
  }
</style>