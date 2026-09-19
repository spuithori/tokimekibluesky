import type { Column } from "$lib/types/column";

export const AVATAR_ICON = 'avatar';

export function columnAvatarSrc(avatar: string): string {
    return avatar.replace('/img/avatar/plain/', '/img/avatar_thumbnail/plain/');
}

export function applyDefaultColumnIcon(column: Column, preference: 'icon' | 'avatar'): Column {
    if (preference === 'avatar' && column.algorithm?.type === 'custom' && column.algorithm.avatar) {
        column.settings = { ...column.settings, icon: AVATAR_ICON };
    }
    return column;
}
