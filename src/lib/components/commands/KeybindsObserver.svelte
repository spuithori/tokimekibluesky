<script lang="ts">
    import { riceState } from '$lib/rice/riceState.svelte';
    import { keymodeState } from '$lib/classes/keymodeState.svelte';
    import { revealState } from '$lib/classes/revealState.svelte';
    import { parseCommandLine, runCommand } from '$lib/commands/registry.svelte';
    import { DEFAULT_BINDS, eventMatches, resolveBindList } from '$lib/commands/keymap';

    function isEditableTarget(target: EventTarget | null): boolean {
        if (!(target instanceof HTMLElement)) return false;
        const tag = target.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable || !!target.closest('.tiptap');
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.isComposing || event.repeat) return;
        if (isEditableTarget(event.target)) return;
        const mode = keymodeState.mode;
        if (mode !== null) {
            if (event.key === 'Escape' && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
                event.preventDefault();
                event.stopPropagation();
                keymodeState.exit();
                return;
            }
            for (const bind of resolveBindList(riceState.submaps[mode] ?? [])) {
                if (eventMatches(bind.combo, event)) {
                    event.preventDefault();
                    event.stopPropagation();
                    const { id, arg } = parseCommandLine(bind.command);
                    runCommand(id, arg);
                    return;
                }
            }
            return;
        }
        for (const bind of resolveBindList(riceState.binds, DEFAULT_BINDS)) {
            if (eventMatches(bind.combo, event)) {
                event.preventDefault();
                event.stopPropagation();
                const { id, arg } = parseCommandLine(bind.command);
                runCommand(id, arg);
                return;
            }
        }
    }
    function trackModifier(event: KeyboardEvent) {
        revealState.headings = event.altKey;
    }

    function trackModifierUp(event: KeyboardEvent) {
        if (event.key === 'Alt') event.preventDefault();
        revealState.headings = event.altKey;
    }

    function resetModifier() {
        revealState.headings = false;
    }
</script>

<svelte:window onkeydowncapture={handleKeydown} onkeydown={trackModifier} onkeyup={trackModifierUp} onblur={resetModifier} />
