import Clock from '@lucide/svelte/icons/clock';
import { RICE_API_VERSION, type RiceModuleManifest } from '../types';

export const clockManifest: RiceModuleManifest = {
    id: 'clock',
    name: 'rice_module_clock',
    version: '1.0.0',
    apiVersion: RICE_API_VERSION,
    contributes: {
        statusbarItems: [
            { id: 'clock', loader: () => import('./Clock.svelte') },
        ],
        columnKinds: [
            {
                type: 'module:clock',
                icon: Clock,
                capability: {
                    feedStorage: 'none',
                    hasAgent: false,
                    refreshable: false,
                    splittable: true,
                    singleton: false,
                },
                loader: () => import('./ClockColumn.svelte'),
            },
        ],
    },
};
