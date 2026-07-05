import type { Component } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import House from '@lucide/svelte/icons/home';
import Bell from '@lucide/svelte/icons/bell';
import Newspaper from '@lucide/svelte/icons/newspaper';
import List from '@lucide/svelte/icons/list';
import Bookmark from '@lucide/svelte/icons/bookmark';
import ListTree from '@lucide/svelte/icons/list-tree';
import Search from '@lucide/svelte/icons/search';
import Heart from '@lucide/svelte/icons/heart';
import Pencil from '@lucide/svelte/icons/pencil';
import Image from '@lucide/svelte/icons/image';
import Clapperboard from '@lucide/svelte/icons/clapperboard';
import UserRound from '@lucide/svelte/icons/user-round';
import MessageCircleMore from '@lucide/svelte/icons/message-circle-more';
import MessagesSquare from '@lucide/svelte/icons/messages-square';
import BookType from '@lucide/svelte/icons/book-type';
import SquarePen from '@lucide/svelte/icons/square-pen';
import Settings from '@lucide/svelte/icons/settings';
import Puzzle from '@lucide/svelte/icons/puzzle';
import type { BuiltinColumnType, Column, ColumnKindId } from '$lib/types/column';
import { capabilityOf, columnKindCapabilities, registerModuleCapability, type ColumnKindCapability } from '$lib/columnKinds';

export interface ColumnKindDef {
    type: ColumnKindId;
    icon?: Component;
    capability: ColumnKindCapability;
    loader?: () => Promise<{ default: Component }>;
    makeColumn?: (ctx: { id: string; did?: string }) => Column;
}

export interface ModuleColumnKindInput {
    type: `module:${string}`;
    icon?: Component;
    capability?: Partial<ColumnKindCapability>;
    loader?: () => Promise<{ default: Component }>;
    makeColumn?: (ctx: { id: string; did?: string }) => Column;
}

const builtinIcons: Partial<Record<BuiltinColumnType, Component>> = {
    default: House,
    realtime: House,
    notification: Bell,
    custom: Newspaper,
    list: List,
    officialList: List,
    bookmark: Bookmark,
    cloudBookmark: Bookmark,
    officialBookmark: Bookmark,
    thread: ListTree,
    search: Search,
    like: Heart,
    myPost: Pencil,
    myMedia: Image,
    authorMedia: Image,
    authorVideo: Clapperboard,
    author: UserRound,
    chat: MessageCircleMore,
    chatList: MessagesSquare,
    networkFeed: BookType,
    mochottTimeline: BookType,
    publish: SquarePen,
    settings: Settings,
};

const builtinKinds = new Map<string, ColumnKindDef>(
    (Object.keys(columnKindCapabilities) as BuiltinColumnType[]).map((type) => [
        type,
        { type, icon: builtinIcons[type], capability: columnKindCapabilities[type] },
    ]),
);

const moduleKinds = new SvelteMap<string, ColumnKindDef>();

export function registerColumnKind(input: ModuleColumnKindInput): () => void {
    const unregisterCapability = registerModuleCapability(input.type, input.capability ?? {});
    moduleKinds.set(input.type, {
        type: input.type,
        icon: input.icon ?? Puzzle,
        capability: capabilityOf(input.type),
        loader: input.loader,
        makeColumn: input.makeColumn,
    });
    return () => {
        moduleKinds.delete(input.type);
        unregisterCapability();
    };
}

export function getColumnKind(type: string | undefined): ColumnKindDef | undefined {
    if (type === undefined) return undefined;
    return builtinKinds.get(type) ?? moduleKinds.get(type);
}

export function listModuleColumnKinds(): ColumnKindDef[] {
    return [...moduleKinds.values()];
}
