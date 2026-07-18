import {getSystemMessageContent} from "$lib/components/chat/systemMessageText";
import type {ChatMessageView, ConvoMember, ConvoView} from "$lib/components/chat/chatTypes";

export const GROUP_CONVO_TYPE = 'chat.bsky.convo.defs#groupConvo';
export const GROUP_MEMBER_TYPE = 'chat.bsky.actor.defs#groupConvoMember';
export const MESSAGE_VIEW_TYPE = 'chat.bsky.convo.defs#messageView';
export const DELETED_MESSAGE_VIEW_TYPE = 'chat.bsky.convo.defs#deletedMessageView';
export const SYSTEM_MESSAGE_VIEW_TYPE = 'chat.bsky.convo.defs#systemMessageView';
export const JOIN_REQUEST_CONVO_TYPE = 'chat.bsky.group.defs#joinRequestConvoView';
export const JOIN_LINK_EMBED_VIEW_TYPE = 'chat.bsky.embed.joinLink#view';
export const JOIN_LINK_PREVIEW_TYPE = 'chat.bsky.group.defs#joinLinkPreviewView';
export const JOIN_LINK_PREVIEW_DISABLED_TYPE = 'chat.bsky.group.defs#disabledJoinLinkPreviewView';
export const GROUP_NAME_CREATE_MAX_GRAPHEMES = 50;
export const GROUP_NAME_EDIT_MAX_GRAPHEMES = 128;
export const GROUP_MEMBERS_MAX = 49;

export type LastMessagePreview = {
    text?: string;
    key?: string;
    values?: Record<string, string>;
};

export function isGroupConvo(convo: ConvoView | undefined | null): boolean {
    return convo?.kind?.$type === GROUP_CONVO_TYPE;
}

export function getOtherMembers(convo: ConvoView | undefined | null, myDid: string | undefined): ConvoMember[] {
    return convo?.members?.filter(member => member.did !== myDid) || [];
}

export function getConvoName(convo: ConvoView | undefined | null, myDid: string | undefined): string {
    if (isGroupConvo(convo)) {
        return convo?.kind?.name || '';
    }

    const other = getOtherMembers(convo, myDid)[0];
    return other?.displayName || other?.handle || '';
}

export function getConvoAvatarMembers(convo: ConvoView | undefined | null, myDid: string | undefined, max: number = 2): ConvoMember[] {
    return getOtherMembers(convo, myDid).slice(0, max);
}

export function getConvoMemberCount(convo: ConvoView | undefined | null): number {
    return isGroupConvo(convo) ? (convo?.kind?.memberCount ?? 0) : (convo?.members?.length || 0);
}

export function getMyRole(convo: ConvoView | undefined | null, myDid: string | undefined): 'owner' | 'standard' | undefined {
    const me = convo?.members?.find(member => member.did === myDid);
    return me?.kind?.$type === GROUP_MEMBER_TYPE ? me.kind.role : undefined;
}

export function getMemberRole(member: ConvoMember | undefined | null): 'owner' | 'standard' | undefined {
    return member?.kind?.$type === GROUP_MEMBER_TYPE ? member.kind.role : undefined;
}

export function isConvoLocked(convo: ConvoView | undefined | null): boolean {
    return isGroupConvo(convo) && convo?.kind?.lockStatus !== 'unlocked';
}

export function isLockedPermanently(convo: ConvoView | undefined | null): boolean {
    return isGroupConvo(convo) && convo?.kind?.lockStatus === 'locked-permanently';
}

export function isBlockedDirectConvo(convo: ConvoView | undefined | null, myDid: string | undefined): boolean {
    if (isGroupConvo(convo)) {
        return false;
    }

    return !!getOtherMembers(convo, myDid)[0]?.viewer?.blocking;
}

export function resolveMemberName(convo: ConvoView | undefined | null, did: string | undefined): string {
    if (!did) {
        return '';
    }

    const member = convo?.members?.find(member => member.did === did);
    return member?.displayName || member?.handle || '';
}

export function createNameResolver(convo: ConvoView | undefined | null, fallback: string): (did?: string) => string {
    return (did?: string) => resolveMemberName(convo, did) || fallback;
}

export function getLastMessagePreview(convo: ConvoView | undefined | null, resolveName: (did?: string) => string): LastMessagePreview | undefined {
    const last = convo?.lastMessage;

    if (!last) {
        return undefined;
    }

    if (last.$type === SYSTEM_MESSAGE_VIEW_TYPE) {
        return getSystemMessageContent(last.data, resolveName);
    }

    if (last.$type === DELETED_MESSAGE_VIEW_TYPE) {
        return { key: 'chat_message_deleted' };
    }

    return { text: last.text ?? '' };
}

export function createMemberNameResolver(
    members: Record<string, ConvoMember>,
    convo: ConvoView | undefined | null,
    fallback = '',
): (did?: string) => string {
    return (did?: string) => {
        if (!did) {
            return fallback;
        }

        const member = members?.[did] ?? convo?.members?.find((m) => m.did === did);
        return member?.displayName || member?.handle || fallback;
    };
}

export function getReplyPreview(
    replyTo: ChatMessageView | undefined | null,
    resolveName: (did?: string) => string,
): { name: string; text?: string; key?: string } | undefined {
    if (!replyTo) {
        return undefined;
    }

    if (replyTo.$type === DELETED_MESSAGE_VIEW_TYPE) {
        return { name: '', key: 'chat_reply_deleted' };
    }

    const name = resolveName(replyTo.sender?.did);

    if (replyTo.text) {
        return { name, text: replyTo.text };
    }

    if (replyTo.embed) {
        return { name, key: 'chat_reply_attachment' };
    }

    return { name, text: '' };
}
