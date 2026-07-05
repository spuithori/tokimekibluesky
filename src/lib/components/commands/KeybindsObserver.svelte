<script lang="ts">
    import { riceState } from '$lib/rice/riceState.svelte';
    import { keymodeState } from '$lib/classes/keymodeState.svelte';
    import { parseCommandLine, runCommand } from '$lib/commands/registry.svelte';
    import { comboKey, DEFAULT_BINDS, eventMatches, parseCombo, type KeyCombo } from '$lib/commands/keymap';

    const submapBinds = $derived.by(() => {
        if (keymodeState.mode === null) return null;
        const defs = riceState.submaps[keymodeState.mode] ?? [];
        const seen = new Set<string>();
        const result: { combo: KeyCombo; command: string }[] = [];
        for (const bind of [...defs].reverse()) {
            const combo = parseCombo(bind.combo);
            if (!combo) continue;
            const key = comboKey(combo);
            if (seen.has(key)) continue;
            seen.add(key);
            result.push({ combo, command: bind.command });
        }
        return result;
    });

    const parsedBinds = $derived.by(() => {
        const seen = new Set<string>();
        const result: { combo: KeyCombo; command: string }[] = [];
        for (const bind of [...riceState.binds].reverse()) {
            const combo = parseCombo(bind.combo);
            if (!combo) continue;
            const key = comboKey(combo);
            if (seen.has(key)) continue;
            seen.add(key);
            result.push({ combo, command: bind.command });
        }
        for (const def of DEFAULT_BINDS) {
            const combo = parseCombo(def.combo);
            if (!combo) continue;
            const key = comboKey(combo);
            if (seen.has(key)) continue;
            seen.add(key);
            result.push({ combo, command: def.command });
        }
        return result;
    });

    function isEditableTarget(target: EventTarget | null): boolean {
        if (!(target instanceof HTMLElement)) return false;
        const tag = target.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable || !!target.closest('.tiptap');
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.isComposing || event.repeat) return;
        if (isEditableTarget(event.target)) return;
        if (submapBinds !== null) {
            if (event.key === 'Escape' && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
                event.preventDefault();
                event.stopPropagation();
                keymodeState.exit();
                return;
            }
            for (const bind of submapBinds) {
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
        for (const bind of parsedBinds) {
            if (eventMatches(bind.combo, event)) {
                event.preventDefault();
                event.stopPropagation();
                const { id, arg } = parseCommandLine(bind.command);
                runCommand(id, arg);
                return;
            }
        }
    }
</script>

<svelte:window onkeydowncapture={handleKeydown} />
