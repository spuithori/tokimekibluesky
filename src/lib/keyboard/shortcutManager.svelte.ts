import { on } from 'svelte/events';
import { settingsStore } from '$lib/settings/settings.svelte';
import { eventToCombo } from './keys';
import { commands, commandById, effectiveKeys, findConflict, resolveBindings, type Command, type CommandContext } from './commands';
import { focusedPost } from './postNav';

type Provider = (arg?: unknown) => boolean | void;

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), .tiptap';
const INTERACTIVE_SELECTOR = 'button, a[href], input, select, textarea, summary, video, audio, [role="button"], [role="link"]';
const MODAL_SELECTOR = 'dialog[open], [role="dialog"][aria-modal="true"]';
const ACTIVATION_COMBOS = new Set(['Enter', 'Space']);

export function isEditableTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null;
}

export function hasOpenModal(doc: Document): boolean {
    return doc.querySelector(MODAL_SELECTOR) !== null;
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null;
}

export class ShortcutManager {
    helpOpen = $state(false);
    #providers = new Map<string, Provider>();
    #off: (() => void) | null = null;
    #table = $derived.by(() => resolveBindings(commands, settingsStore.keyboard.bindings));

    get attached(): boolean {
        return this.#off !== null;
    }

    keysFor(commandId: string): readonly string[] {
        const command = commandById.get(commandId);
        return command ? effectiveKeys(command, settingsStore.keyboard.bindings) : [];
    }

    isOverridden(commandId: string): boolean {
        return Array.isArray(settingsStore.keyboard.bindings[commandId]);
    }

    setKeys(commandId: string, keys: readonly string[]): void {
        if (!commandById.has(commandId)) {
            return;
        }
        settingsStore.keyboard.bindings[commandId] = [...keys];
    }

    setKey(commandId: string, index: number, combo: string): void {
        const keys = [...this.keysFor(commandId)];
        if (index < 0 || index >= keys.length) {
            keys.push(combo);
        } else {
            keys[index] = combo;
        }
        this.setKeys(commandId, keys);
    }

    removeKey(commandId: string, index: number): void {
        const keys = [...this.keysFor(commandId)];
        if (index < 0 || index >= keys.length) {
            return;
        }
        keys.splice(index, 1);
        this.setKeys(commandId, keys);
    }

    resetKeys(commandId: string): void {
        delete settingsStore.keyboard.bindings[commandId];
    }

    conflictFor(combo: string, commandId: string): Command | null {
        const subject = commandById.get(commandId);
        return subject ? findConflict(commands, settingsStore.keyboard.bindings, combo, subject) : null;
    }

    provide(id: string, provider: Provider): () => void {
        this.#providers.set(id, provider);
        return () => {
            if (this.#providers.get(id) === provider) {
                this.#providers.delete(id);
            }
        };
    }

    invoke = (id: string, arg?: unknown): boolean => {
        const provider = this.#providers.get(id);
        if (!provider) {
            return false;
        }
        return provider(arg) !== false;
    };

    toggleHelp = (): void => {
        this.helpOpen = !this.helpOpen;
    };

    attach(target: Window = window): () => void {
        if (this.#off) {
            return this.detach;
        }
        this.#off = on(target, 'keydown', this.handle);
        return this.detach;
    }

    detach = (): void => {
        this.#off?.();
        this.#off = null;
    };

    handle = (event: KeyboardEvent): void => {
        if (event.defaultPrevented) {
            return;
        }
        const combo = eventToCombo(event);
        if (!combo) {
            return;
        }
        const candidates = this.#table.get(combo);
        if (!candidates) {
            return;
        }
        const doc = event.view?.document ?? document;
        if (hasOpenModal(doc)) {
            return;
        }
        const target = event.target;
        if (ACTIVATION_COMBOS.has(combo) && isInteractiveTarget(target)) {
            return;
        }
        const editable = isEditableTarget(target);
        const ctx: CommandContext = {
            combo,
            keys: [],
            event,
            post: focusedPost(doc),
            invoke: this.invoke,
            toggleHelp: this.toggleHelp,
        };
        for (const command of candidates) {
            if (editable && !command.inEditable) {
                continue;
            }
            if (event.repeat && !command.repeat) {
                continue;
            }
            ctx.keys = effectiveKeys(command, settingsStore.keyboard.bindings);
            if (command.when && !command.when(ctx)) {
                continue;
            }
            const result = command.run(ctx);
            if (result === false) {
                continue;
            }
            event.preventDefault();
            return;
        }
    };
}

export const shortcutManager = new ShortcutManager();
