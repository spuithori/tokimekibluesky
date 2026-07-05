import { RICE_API_VERSION, type RiceModuleManifest } from '../types';

export const searchManifest: RiceModuleManifest = {
    id: 'search',
    name: 'rice_module_search',
    version: '1.0.0',
    apiVersion: RICE_API_VERSION,
    contributes: {
        widgets: [
            { id: 'search', loader: () => import('./SearchWidget.svelte') },
        ],
    },
};
