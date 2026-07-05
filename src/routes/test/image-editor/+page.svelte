<script lang="ts">
    import { ImageEditor } from 'tokimeki-image-editor';
    import { getLocale } from 'tokimeki-i18n';

    (window as { __imageEditorI18nTest?: unknown }).__imageEditorI18nTest = {
        ready: true,
        getLocale: () => getLocale(),
    };
</script>

<div class="editor-harness">
    <ImageEditor isStandalone={true} width={800} height={500} />
</div>

<style>
    .editor-harness {
        width: 800px;
        height: 500px;
    }
</style>
