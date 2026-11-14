export interface ProfileTabOption {
    key: string;
    label: string;
    selected: boolean;
    href?: string;
    select?: () => void;
}

export interface ProfileTabAction {
    key: 'refresh' | 'add';
    label: string;
    disabled?: boolean;
    run: () => void;
}

export interface ProfileTabMenu {
    options: ProfileTabOption[];
    actions: ProfileTabAction[];
}

export interface ProfileTabItem {
    key: string;
    label: string;
    href: string;
    menu?: ProfileTabMenu;
}

export type ProfileTabKey = 'posts' | 'follow' | 'media' | 'blog' | 'likes' | 'feed' | 'lists' | 'starterpack';

interface TabSource {
    associated?: { feedgens?: number; lists?: number; starterPacks?: number };
}

interface TabOptions {
    profile: TabSource | undefined;
    current: string;
    isLabeler: boolean;
    isMe: boolean;
    hasBlog: boolean;
}

const TAB_OF_PAGE: Record<string, ProfileTabKey> = {
    video: 'media',
    follower: 'follow',
};

export function profileTabOf(page: string): string {
    return TAB_OF_PAGE[page] ?? page;
}

export function profileTabKeys({ profile, current, isLabeler, isMe, hasBlog }: TabOptions): ProfileTabKey[] {
    if (isLabeler) {
        return ['posts'];
    }

    const tab = profileTabOf(current);
    const counts = profile?.associated;
    const has = (key: ProfileTabKey, count: number | undefined) => tab === key || (!!profile && (!counts || (count ?? 0) > 0));
    const keys: ProfileTabKey[] = tab === 'follow' ? ['posts', 'follow', 'media'] : ['posts', 'media'];

    if (tab === 'blog' || hasBlog) {
        keys.push('blog');
    }
    keys.push('likes');
    if (has('feed', counts?.feedgens)) {
        keys.push('feed');
    }
    if (has('lists', counts?.lists)) {
        keys.push('lists');
    }
    if (has('starterpack', counts?.starterPacks) || (isMe && !!profile)) {
        keys.push('starterpack');
    }
    return keys;
}

export function fitTabCount(widths: number[], available: number, currentIndex: number, moreWidth: number, caretWidth: number): number {
    const total = widths.reduce((sum, width) => sum + width, 0);
    if (total <= available) {
        return widths.length;
    }

    const count = (reserved: number) => {
        let used = reserved;
        let fit = 0;
        while (fit < widths.length && used + widths[fit] <= available) {
            used += widths[fit];
            fit++;
        }
        return fit;
    };

    const fit = count(moreWidth);
    return currentIndex >= fit ? count(widths[currentIndex] + caretWidth) : fit;
}
