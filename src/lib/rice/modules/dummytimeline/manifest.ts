import Newspaper from '@lucide/svelte/icons/newspaper';
import { RICE_API_VERSION, type RiceModuleManifest } from '../types';

export const dummyTimelineManifest: RiceModuleManifest = {
    id: 'dummytimeline',
    name: 'rice_module_dummytimeline',
    version: '1.0.0',
    apiVersion: RICE_API_VERSION,
    contributes: {
        columnKinds: [
            {
                type: 'module:dummytimeline',
                icon: Newspaper,
                capability: {
                    feedStorage: 'none',
                    hasAgent: false,
                    refreshable: false,
                    splittable: true,
                    singleton: false,
                },
                loader: () => import('./DummyTimelineColumn.svelte'),
            },
        ],
    },
};
