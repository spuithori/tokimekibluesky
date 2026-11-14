<script lang="ts">
  import { ImageEditor } from 'tokimeki-image-editor';
  import { settings } from '$lib/stores';
  import type { ImageTarget } from '$lib/profile/profileEdit.svelte';

  interface Props {
    file: File;
    target: ImageTarget;
    oncomplete: (blob: Blob) => void;
    oncancel: () => void;
  }

  let { file, target, oncomplete, oncancel }: Props = $props();

  function open(el: HTMLDialogElement) {
      if (!el.open) {
          el.showModal();
      }
  }
</script>

<dialog class="crop-dialog" {@attach open} onclose={oncancel}>
  <ImageEditor
      initialImage={file}
      width={1200}
      height={700}
      theme={$settings?.design?.darkmode ? 'dark' : 'light'}
      isStandalone={false}
      cropOptions={{
          cropOnly: true,
          aspectRatio: target === 'avatar' ? 1 : 3,
          circularGuide: target === 'avatar',
      }}
      onComplete={(_dataUrl, result) => oncomplete(result.blob)}
      onCancel={oncancel}
  ></ImageEditor>
</dialog>

<style lang="postcss">
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
