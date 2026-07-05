<script lang="ts">
    import { highlightLine } from '$lib/rice/config/highlight';
    import {
        autoClosePair,
        enterAutoIndent,
        indentTab,
        smartBackspace,
        toggleComment,
        typeThroughBrace,
        type EditOp,
    } from '$lib/rice/config/editorOps';

    interface Props {
        value: string;
        errorLines?: Set<number>;
    }

    let { value = $bindable(''), errorLines = new Set() }: Props = $props();

    let textareaEl = $state<HTMLTextAreaElement>();
    let highlightEl = $state<HTMLElement>();
    let gutterEl = $state<HTMLElement>();

    let lastUserValue = value;
    let savedSelection: { start: number; end: number } | null = null;

    const highlighted = $derived.by(() => {
        return value
            .split('\n')
            .map((raw, i) => {
                const line = highlightLine(raw, i + 1);
                return errorLines.has(i + 1) ? `<span class="rc-error-line">${line}</span>` : line;
            })
            .join('\n') + '\n';
    });

    const lineCount = $derived(value.split('\n').length);

    $effect.pre(() => {
        value;
        if (textareaEl && value !== lastUserValue && document.activeElement === textareaEl) {
            savedSelection = { start: textareaEl.selectionStart, end: textareaEl.selectionEnd };
        }
    });

    $effect(() => {
        value;
        if (savedSelection && textareaEl) {
            textareaEl.setSelectionRange(
                Math.min(savedSelection.start, value.length),
                Math.min(savedSelection.end, value.length),
            );
        }
        savedSelection = null;
        lastUserValue = value;
        syncScroll();
    });

    function syncScroll() {
        if (!textareaEl) return;
        if (highlightEl) {
            highlightEl.scrollTop = textareaEl.scrollTop;
            highlightEl.scrollLeft = textareaEl.scrollLeft;
        }
        if (gutterEl) {
            gutterEl.scrollTop = textareaEl.scrollTop;
        }
    }

    function handleInput(event: Event) {
        lastUserValue = (event.currentTarget as HTMLTextAreaElement).value;
    }

    function commitDomValue(el: HTMLTextAreaElement) {
        lastUserValue = el.value;
        value = el.value;
    }

    function applyOp(el: HTMLTextAreaElement, op: EditOp) {
        el.setRangeText(op.insert, op.replaceStart, op.replaceEnd);
        el.setSelectionRange(op.selStart, op.selEnd);
        commitDomValue(el);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.isComposing) return;
        const el = event.currentTarget as HTMLTextAreaElement;
        const start = el.selectionStart;
        const end = el.selectionEnd;

        let op: EditOp | null = null;
        if (event.key === 'Tab') {
            op = indentTab(el.value, start, end, event.shiftKey);
        } else if (event.key === 'Enter') {
            op = enterAutoIndent(el.value, start, end);
        } else if (event.key === '{' || event.key === '"') {
            op = autoClosePair(el.value, start, end, event.key);
        } else if (event.key === '}') {
            op = typeThroughBrace(el.value, start, end);
        } else if (event.key === 'Backspace' && !event.ctrlKey && !event.metaKey && !event.altKey) {
            op = smartBackspace(el.value, start, end);
        } else if (event.key === '/' && (event.ctrlKey || event.metaKey)) {
            op = toggleComment(el.value, start, end);
        }

        if (op) {
            event.preventDefault();
            applyOp(el, op);
        } else if (event.key === 'Tab') {
            event.preventDefault();
        }
    }
</script>

<div class="rice-editor">
    <div class="rice-editor__gutter" bind:this={gutterEl} aria-hidden="true">
        <div class="rice-editor__gutter-inner">
            {#each { length: lineCount } as _, i}
                <div
                    class="rice-editor__line-number"
                    class:rice-editor__line-number--error={errorLines.has(i + 1)}
                >{i + 1}</div>
            {/each}
        </div>
    </div>

    <div class="rice-editor__body">
        <pre class="rice-editor__highlight" aria-hidden="true" bind:this={highlightEl}><code>{@html highlighted}</code></pre>
        <textarea
            class="rice-editor__input"
            bind:value
            bind:this={textareaEl}
            onscroll={syncScroll}
            oninput={handleInput}
            onkeydown={handleKeydown}
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            wrap="off"
        ></textarea>
    </div>
</div>

<style>
    .rice-editor {
        display: flex;
        height: 100%;
        min-height: 320px;
        border: 1px solid var(--border-color-1);
        border-radius: var(--border-radius-3);
        background-color: var(--bg-color-2);
        overflow: hidden;
    }

    .rice-editor__gutter {
        flex-shrink: 0;
        overflow: hidden;
        padding: 12px 0;
        border-right: 1px solid var(--border-color-1);
        background-color: var(--bg-color-3);
        font-family: ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, monospace;
        font-size: 13px;
        line-height: 1.6;
        color: var(--text-color-3);
        user-select: none;
    }

    .rice-editor__gutter-inner {
        padding-bottom: 24px;
    }

    .rice-editor__line-number {
        min-width: 3ch;
        padding: 0 8px;
        text-align: right;
    }

    .rice-editor__line-number--error {
        color: var(--danger-color);
        font-weight: bold;
    }

    .rice-editor__body {
        position: relative;
        flex: 1;
        min-width: 0;
    }

    .rice-editor__highlight,
    .rice-editor__input {
        position: absolute;
        inset: 0;
        margin: 0;
        padding: 12px;
        font-family: ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, monospace;
        font-size: 13px;
        line-height: 1.6;
        tab-size: 4;
        white-space: pre;
        overflow: auto;
        border: none;
    }

    .rice-editor__highlight {
        pointer-events: none;
        color: var(--text-color-1);
        overflow: hidden;
    }

    .rice-editor__highlight code {
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
    }

    .rice-editor__input {
        width: 100%;
        height: 100%;
        resize: none;
        background: transparent;
        color: transparent;
        caret-color: var(--text-color-1);
        outline: none;
    }

    .rice-editor__highlight :global(.rc-comment) {
        color: var(--text-color-3);
    }

    .rice-editor__highlight :global(.rc-section) {
        color: var(--primary-color);
        font-weight: bold;
    }

    .rice-editor__highlight :global(.rc-label) {
        color: var(--success-color, #22a06b);
    }

    .rice-editor__highlight :global(.rc-var) {
        color: var(--link-color);
    }

    .rice-editor__highlight :global(.rc-keyword) {
        color: var(--primary-color);
    }

    .rice-editor__highlight :global(.rc-key) {
        color: var(--text-color-2);
    }

    .rice-editor__highlight :global(.rc-value) {
        color: var(--link-color);
    }

    .rice-editor__highlight :global(.rc-invalid),
    .rice-editor__highlight :global(.rc-error-line) {
        text-decoration: underline wavy var(--danger-color);
        text-underline-offset: 3px;
    }
</style>
