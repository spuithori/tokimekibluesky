import { goto } from '$app/navigation';
import { refreshSignal } from '$lib/refreshSignal.svelte';
import { blurPost, columnTop, moveColumn, movePost } from './postNav';
import { openImages, openMenu, openProfile, openThread, react, translate } from './postActions';

export type CommandCategory = 'navigation' | 'post' | 'global';

export const CATEGORY_ORDER: readonly CommandCategory[] = ['navigation', 'post', 'global'];

export const CATEGORY_LABELS: Record<CommandCategory, string> = {
    navigation: 'kb_category_navigation',
    post: 'kb_category_post',
    global: 'kb_category_global',
};

export interface CommandContext {
    combo: string;
    keys: readonly string[];
    event: KeyboardEvent;
    post: HTMLElement | null;
    invoke: (providerId: string, arg?: unknown) => boolean;
    toggleHelp: () => void;
}

export interface Command {
    id: string;
    label: string;
    category: CommandCategory;
    keys: readonly string[];
    when?: (ctx: CommandContext) => boolean;
    run: (ctx: CommandContext) => boolean | void | Promise<boolean | void>;
    repeat?: boolean;
    inEditable?: boolean;
    group?: string;
    hidden?: boolean;
}

const hasPost = (ctx: CommandContext) => ctx.post !== null;
const onHome = () => typeof location !== 'undefined' && location.pathname === '/';

function searchSelection(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        return false;
    }
    const container = selection.getRangeAt(0).commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
    if (!element?.closest('[data-timeline-text]')) {
        return false;
    }
    const text = selection.toString().trim();
    if (!text) {
        return false;
    }
    goto(`/search?q=${encodeURIComponent(text)}`);
    return true;
}

export const commands: readonly Command[] = [
    { id: 'post.next', label: 'kb_next_post', category: 'navigation', keys: ['ArrowDown', 'j'], repeat: true, run: () => movePost(1) },
    { id: 'post.prev', label: 'kb_prev_post', category: 'navigation', keys: ['ArrowUp', 'k'], repeat: true, run: () => movePost(-1) },
    { id: 'column.next', label: 'kb_next_column', category: 'navigation', keys: ['ArrowRight'], repeat: true, run: () => moveColumn(1) },
    { id: 'column.prev', label: 'kb_prev_column', category: 'navigation', keys: ['ArrowLeft'], repeat: true, run: () => moveColumn(-1) },
    { id: 'column.top', label: 'kb_column_top', category: 'navigation', keys: ['Home'], run: () => columnTop() },
    {
        id: 'column.jump',
        label: 'kb_jump_column',
        category: 'navigation',
        keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
        when: onHome,
        run: (ctx) => ctx.invoke('column.jump', ctx.keys.indexOf(ctx.combo)),
    },
    { id: 'post.open', label: 'kb_open_thread', category: 'post', keys: ['Enter', 'o'], when: hasPost, run: (ctx) => openThread(ctx.post!) },
    { id: 'post.like', label: 'kb_like', category: 'post', keys: ['l'], when: hasPost, run: (ctx) => react(ctx.post!, 'like') },
    { id: 'post.repost', label: 'kb_repost', category: 'post', keys: ['r'], when: hasPost, run: (ctx) => react(ctx.post!, 'repost') },
    { id: 'post.quote', label: 'kb_quote', category: 'post', keys: ['q'], when: hasPost, run: (ctx) => react(ctx.post!, 'quote') },
    { id: 'post.reply', label: 'kb_reply', category: 'post', keys: ['c'], when: hasPost, run: (ctx) => react(ctx.post!, 'reply') },
    { id: 'post.bookmark', label: 'kb_bookmark', category: 'post', keys: ['b'], when: hasPost, run: (ctx) => react(ctx.post!, 'bookmark') },
    { id: 'post.menu', label: 'kb_menu', category: 'post', keys: ['m'], when: hasPost, run: (ctx) => openMenu(ctx.post!) },
    { id: 'post.translate', label: 'kb_translate', category: 'post', keys: ['t'], when: hasPost, run: (ctx) => translate(ctx.post!) },
    { id: 'post.profile', label: 'kb_profile', category: 'post', keys: ['p'], when: hasPost, run: (ctx) => openProfile(ctx.post!) },
    { id: 'post.images', label: 'kb_images', category: 'post', keys: ['i'], when: hasPost, run: (ctx) => openImages(ctx.post!) },
    { id: 'publish.open', label: 'kb_new_post', category: 'global', keys: ['n'], run: (ctx) => ctx.invoke('publish.open') },
    { id: 'search.open', label: 'kb_search', category: 'global', keys: ['/'], run: () => { goto('/search'); return true; } },
    { id: 'search.selection', label: 'kb_search_selection', category: 'global', keys: ['shift+s'], run: () => searchSelection() },
    { id: 'refresh.all', label: 'kb_refresh_all', category: 'global', keys: ['.'], run: () => { refreshSignal.bump(); return true; } },
    { id: 'help.toggle', label: 'kb_help', category: 'global', keys: ['?'], run: (ctx) => { ctx.toggleHelp(); return true; } },
    { id: 'publish.close', label: 'kb_close_composer', category: 'global', keys: ['Escape'], group: 'escape', inEditable: true, run: (ctx) => ctx.invoke('publish.close') },
    { id: 'page.close', label: 'kb_close_page', category: 'global', keys: ['Escape'], group: 'escape', run: (ctx) => ctx.invoke('page.close') },
    { id: 'post.deselect', label: 'kb_deselect', category: 'global', keys: ['Escape'], group: 'escape', when: hasPost, run: () => blurPost() },
];

export const commandById: ReadonlyMap<string, Command> = new Map(commands.map((command) => [command.id, command]));

export type BindingOverrides = Readonly<Record<string, readonly string[]>>;

export function effectiveKeys(command: Command, overrides: BindingOverrides): readonly string[] {
    const override = overrides[command.id];
    return Array.isArray(override) ? override : command.keys;
}

export function resolveBindings(list: readonly Command[], overrides: BindingOverrides): Map<string, Command[]> {
    const table = new Map<string, Command[]>();
    for (const command of list) {
        for (const combo of effectiveKeys(command, overrides)) {
            const bucket = table.get(combo);
            if (bucket) {
                bucket.push(command);
            } else {
                table.set(combo, [command]);
            }
        }
    }
    return table;
}

export function findConflict(list: readonly Command[], overrides: BindingOverrides, combo: string, subject: Command): Command | null {
    for (const command of list) {
        if (command === subject) {
            continue;
        }
        if (subject.group && command.group === subject.group) {
            continue;
        }
        if (effectiveKeys(command, overrides).includes(combo)) {
            return command;
        }
    }
    return null;
}
