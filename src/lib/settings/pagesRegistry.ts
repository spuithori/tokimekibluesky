export const SETTINGS_PAGE_IDS = [
    'profiles',
    'general',
    'design',
    'design/embed',
    'timeline',
    'timeline/reaction',
    'moderation',
    'moderation/chat',
    'moderation/labeler',
    'moderation/lang-filter',
    'moderation/modlist',
    'moderation/repost-mute',
    'keyword-mutes',
    'push-notification',
    'schedule',
    'data',
    'data/workspace-import-export',
    'about',
    'support',
    'translation',
    'rice',
] as const;

export type SettingsPageId = (typeof SETTINGS_PAGE_IDS)[number];

export const SETTINGS_COLUMN_HOST = Symbol('settingsColumnHost');

export const SETTINGS_PAGE_TITLES: Record<SettingsPageId, string> = {
    'profiles': 'settings_profiles',
    'general': 'settings_general',
    'design': 'settings_design',
    'design/embed': 'settings_embed',
    'timeline': 'settings_timeline',
    'timeline/reaction': 'reaction_button_settings',
    'moderation': 'settings_moderation',
    'moderation/chat': 'settings_chat',
    'moderation/labeler': 'settings_labeler',
    'moderation/lang-filter': 'settings_lang_filter',
    'moderation/modlist': 'settings_mod_list',
    'moderation/repost-mute': 'settings_repost_mute',
    'keyword-mutes': 'settings_keyword_mutes',
    'push-notification': 'settings_push_notification',
    'schedule': 'schedule_settings_title',
    'data': 'settings_data_management',
    'data/workspace-import-export': 'workspace_import_export',
    'about': 'settings_about',
    'support': 'settings_support',
    'translation': 'settings_translation',
    'rice': 'settings_rice',
};

export function isSettingsPageId(id: string): id is SettingsPageId {
    return (SETTINGS_PAGE_IDS as readonly string[]).includes(id);
}

export function pathToCategoryId(path: string): SettingsPageId | 'root' {
    try {
        const pathname = path.split('#')[0].split('?')[0];
        const match = pathname.match(/^\/settings(?:\/(.*))?$/);
        if (!match) return 'root';
        const id = (match[1] ?? '').replace(/\/+$/, '');
        return isSettingsPageId(id) ? id : 'root';
    } catch {
        return 'root';
    }
}

export function parentCategoryId(id: string): SettingsPageId | 'root' {
    if (!id.includes('/')) return 'root';
    const parent = id.split('/').slice(0, -1).join('/');
    return isSettingsPageId(parent) ? parent : 'root';
}
