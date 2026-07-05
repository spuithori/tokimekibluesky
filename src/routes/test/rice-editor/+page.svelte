<script lang="ts">
    import '../../styles.css';
    import RiceConfigEditor from '$lib/components/rice/RiceConfigEditor.svelte';
    import { compile } from '$lib/rice/config/compile';

    let value = $state('');

    const errorLines = $derived(
        new Set(compile(value).diagnostics.filter((d) => d.severity === 'error').map((d) => d.line)),
    );

    if (typeof window !== 'undefined') {
        (window as any).__riceEditorTest = {
            ready: true,
            setValue(next: string) {
                value = next;
            },
            externalReplace(next: string) {
                value = next;
            },
            getValue() {
                return value;
            },
            getOverlayText() {
                return document.querySelector('.rice-editor__highlight')?.textContent ?? null;
            },
            getSelection() {
                const el = document.querySelector('.rice-editor__input') as HTMLTextAreaElement | null;
                return el ? { start: el.selectionStart, end: el.selectionEnd } : null;
            },
            setSelection(start: number, end: number) {
                const el = document.querySelector('.rice-editor__input') as HTMLTextAreaElement | null;
                el?.focus();
                el?.setSelectionRange(start, end);
            },
            getScrollSync() {
                const textarea = document.querySelector('.rice-editor__input') as HTMLElement | null;
                const highlight = document.querySelector('.rice-editor__highlight') as HTMLElement | null;
                const gutter = document.querySelector('.rice-editor__gutter') as HTMLElement | null;
                return {
                    textarea: textarea?.scrollTop ?? null,
                    highlight: highlight?.scrollTop ?? null,
                    gutter: gutter?.scrollTop ?? null,
                };
            },
            getGutter() {
                return [...document.querySelectorAll('.rice-editor__line-number')].map((el) => ({
                    text: el.textContent,
                    error: el.classList.contains('rice-editor__line-number--error'),
                }));
            },
        };
    }
</script>

<div class="editor-mock">
    <RiceConfigEditor bind:value {errorLines}></RiceConfigEditor>
</div>

<style>
    :global(body) {
        margin: 0;
    }

    .editor-mock {
        height: 400px;
        padding: 16px;
    }
</style>
