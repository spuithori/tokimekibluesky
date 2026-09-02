import { presetScreenshots } from './presetScreenshots';
import type { DetailView } from './registry';

export interface AtmospherePreset {
    id: string;
    name: string;
    taglineKey: string;
    descriptionKey: string;
    url: string;
    icon: string;
    category: string;
}

export const ATMOSPHERE_OFFICIAL_HANDLE = 'tokimeki.blue';

export const atmospherePresets: AtmospherePreset[] = [
    { id: 'mochott', name: 'mochott', taglineKey: 'atmosphere_preset_mochott', descriptionKey: 'atmosphere_preset_mochott_long', url: 'https://mochott.site/', icon: '/atmosphere/mochott.webp', category: 'blog' },
    { id: 'diary', name: 'TOKIMEKI Diary', taglineKey: 'atmosphere_preset_diary', descriptionKey: 'atmosphere_preset_diary_long', url: 'https://diary.tokimeki.blue/', icon: '/atmosphere/diary.webp', category: 'bookmarks' },
    { id: 'tomarigi', name: 'tomarigi', taglineKey: 'atmosphere_preset_tomarigi', descriptionKey: 'atmosphere_preset_tomarigi_long', url: 'https://tomarigi.app/', icon: '/atmosphere/tomarigi.webp', category: 'social' },
    { id: 'poll', name: 'TOKIMEKI Poll', taglineKey: 'atmosphere_preset_poll', descriptionKey: 'atmosphere_preset_poll_long', url: 'https://poll.tokimeki.tech/', icon: '/atmosphere/poll.webp', category: 'polls' },
    { id: 'kaku', name: 'KAKU TOKIMEKI', taglineKey: 'atmosphere_preset_kaku', descriptionKey: 'atmosphere_preset_kaku_long', url: 'https://kaku.tokimeki.tech/', icon: '/atmosphere/kaku.webp', category: 'art' },
];

export function presetPath(id: string): string {
    return `/atmosphere/app/${id}`;
}

export function findPreset(id: string): AtmospherePreset | undefined {
    return atmospherePresets.find((preset) => preset.id === id);
}

export function presetDetailView(preset: AtmospherePreset, translate: (key: string) => string): DetailView {
    const shots = presetScreenshots[preset.id] ?? [];
    return {
        name: preset.name,
        tagline: translate(preset.taglineKey),
        description: translate(preset.descriptionKey),
        url: preset.url,
        iconUrl: preset.icon,
        developerLabel: 'TOKIMEKI',
        developerHref: `/profile/${ATMOSPHERE_OFFICIAL_HANDLE}`,
        category: preset.category,
        screenshots: shots.map((shot, index) => ({
            url: shot.src,
            alt: `${preset.name} ${index + 1}`,
            width: shot.width,
            height: shot.height,
        })),
        recordHref: null,
    };
}
