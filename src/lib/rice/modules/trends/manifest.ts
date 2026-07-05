import { RICE_API_VERSION, type RiceModuleManifest } from '../types';

export const trendsManifest: RiceModuleManifest = {
    id: 'trends',
    name: 'rice_module_trends',
    version: '1.0.0',
    apiVersion: RICE_API_VERSION,
    contributes: {
        widgets: [
            { id: 'trends', loader: () => import('./TrendsWidget.svelte') },
        ],
    },
};
