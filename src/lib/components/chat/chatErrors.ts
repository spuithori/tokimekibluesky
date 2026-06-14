const ERROR_KEY_MAP: Record<string, string> = {
    ConvoLocked: 'chat_error_convo_locked',
    InsufficientRole: 'chat_error_insufficient_role',
    MemberLimitReached: 'chat_error_member_limit',
    OwnerCannotLeave: 'chat_error_owner_cannot_leave',
    NewAccountCannotCreateGroup: 'chat_error_new_account_group',
    NotFollowedBySender: 'chat_error_not_followed',
    UserForbidsGroups: 'chat_error_user_forbids_groups',
    BlockedActor: 'chat_error_blocked_actor',
    BlockedSubject: 'chat_error_blocked_actor',
    FollowRequired: 'chat_error_follow_required',
    InvalidCode: 'chat_error_invalid_code',
    LinkDisabled: 'chat_error_link_disabled',
    UserKicked: 'chat_error_user_kicked',
    EnabledJoinLinkAlreadyExists: 'chat_error_join_link_exists',
    ConvoLockedByModeration: 'chat_error_convo_locked_moderation',
    NoJoinLink: 'chat_error_no_join_link',
    MessageDeleteNotAllowed: 'chat_error_message_delete_not_allowed',
};

export function chatErrorKey(e: any): string {
    return ERROR_KEY_MAP[e?.error] || 'error_chat_generic';
}
