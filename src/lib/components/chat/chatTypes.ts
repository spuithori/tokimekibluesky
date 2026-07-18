import type {Extensible, ViewerState} from "$lib/types/atproto";

export type ConvoMemberKind = {
    $type: string;
    role?: 'owner' | 'standard';
} & Extensible;

export type ConvoMember = {
    did: string;
    handle?: string;
    displayName?: string;
    avatar?: string;
    viewer?: ViewerState;
    kind?: ConvoMemberKind;
} & Extensible;

export type GroupConvoKind = {
    $type: string;
    name?: string;
    avatar?: string;
    memberCount?: number;
    lockStatus?: string;
} & Extensible;

export type ChatMessageView = {
    $type?: string;
    id?: string;
    rev?: string;
    text?: string;
    facets?: Extensible[];
    embed?: Extensible;
    sender?: { did: string } & Extensible;
    sentAt?: string;
    replyTo?: Extensible;
    data?: any;
} & Extensible;

export type ConvoView = {
    id: string;
    rev?: string;
    kind?: GroupConvoKind;
    members?: ConvoMember[];
    lastMessage?: ChatMessageView;
    muted?: boolean;
    status?: string;
    unreadCount?: number;
} & Extensible;
