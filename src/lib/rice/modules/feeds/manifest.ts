import { RICE_API_VERSION, type RiceModuleManifest } from '../types';

export const feedsManifest: RiceModuleManifest = {
    id: 'feeds',
    name: 'rice_module_feeds',
    version: '1.0.0',
    apiVersion: RICE_API_VERSION,
    contributes: {
        widgets: [
            { id: 'feeds', loader: () => import('./FeedsWidget.svelte') },
        ],
    },
};
