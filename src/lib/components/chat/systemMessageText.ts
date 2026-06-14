type NameResolver = (did?: string) => string;

export type SystemMessageContent = {
    key: string;
    values?: Record<string, string>;
};

export function getSystemMessageContent(data: any, resolveName: NameResolver): SystemMessageContent {
    switch (data?.$type) {
        case 'chat.bsky.convo.defs#systemMessageDataAddMember':
            return {
                key: 'chat_system_add_member',
                values: { actor: resolveName(data.addedBy?.did), member: resolveName(data.member?.did) },
            };
        case 'chat.bsky.convo.defs#systemMessageDataRemoveMember':
            return {
                key: 'chat_system_remove_member',
                values: { actor: resolveName(data.removedBy?.did), member: resolveName(data.member?.did) },
            };
        case 'chat.bsky.convo.defs#systemMessageDataMemberJoin':
            return {
                key: 'chat_system_member_join',
                values: { member: resolveName(data.member?.did) },
            };
        case 'chat.bsky.convo.defs#systemMessageDataMemberLeave':
            return {
                key: 'chat_system_member_leave',
                values: { member: resolveName(data.member?.did) },
            };
        case 'chat.bsky.convo.defs#systemMessageDataLockConvo':
            return {
                key: 'chat_system_lock',
                values: { actor: resolveName(data.lockedBy?.did) },
            };
        case 'chat.bsky.convo.defs#systemMessageDataUnlockConvo':
            return {
                key: 'chat_system_unlock',
                values: { actor: resolveName(data.unlockedBy?.did) },
            };
        case 'chat.bsky.convo.defs#systemMessageDataLockConvoPermanently':
            return {
                key: 'chat_system_lock_permanently',
                values: { actor: resolveName(data.lockedBy?.did) },
            };
        case 'chat.bsky.convo.defs#systemMessageDataEditGroup':
            return {
                key: 'chat_system_edit_group',
                values: { name: data.newName ?? '' },
            };
        case 'chat.bsky.convo.defs#systemMessageDataCreateJoinLink':
            return { key: 'chat_system_create_join_link' };
        case 'chat.bsky.convo.defs#systemMessageDataEditJoinLink':
            return { key: 'chat_system_edit_join_link' };
        case 'chat.bsky.convo.defs#systemMessageDataEnableJoinLink':
            return { key: 'chat_system_enable_join_link' };
        case 'chat.bsky.convo.defs#systemMessageDataDisableJoinLink':
            return { key: 'chat_system_disable_join_link' };
        default:
            return { key: 'chat_system_unknown' };
    }
}
