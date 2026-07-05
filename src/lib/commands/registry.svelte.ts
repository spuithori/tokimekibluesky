import type { Component } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

export interface CommandContext {
    anchor?: HTMLElement;
}

export interface CommandDef {
    id: string;
    title: string;
    icon?: Component;
    run: (arg?: string, ctx?: CommandContext) => void | Promise<void>;
    when?: () => boolean;
    hidden?: boolean;
}

export const commandRegistry = new SvelteMap<string, CommandDef>();

export function registerCommand(def: CommandDef): () => void {
    commandRegistry.set(def.id, def);
    return () => {
        if (commandRegistry.get(def.id) === def) {
            commandRegistry.delete(def.id);
        }
    };
}

export function registerCommands(defs: CommandDef[]): () => void {
    const unregisters = defs.map(registerCommand);
    return () => {
        for (const unregister of unregisters) {
            unregister();
        }
    };
}

export function runCommand(id: string, arg?: string, ctx?: CommandContext): boolean {
    const def = commandRegistry.get(id);
    if (!def) {
        console.warn(`[rice] unknown command: ${id}`);
        return false;
    }
    if (def.when && !def.when()) {
        return false;
    }
    void def.run(arg, ctx);
    return true;
}

export function parseCommandLine(line: string): { id: string; arg?: string } {
    const trimmed = line.trim();
    const space = trimmed.indexOf(' ');
    if (space === -1) {
        return { id: trimmed };
    }
    return { id: trimmed.slice(0, space), arg: trimmed.slice(space + 1).trim() };
}
