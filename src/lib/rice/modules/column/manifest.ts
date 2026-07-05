import { RICE_API_VERSION, type RiceModuleManifest } from '../types';

export const columnManifest: RiceModuleManifest = {
    id: 'column',
    name: 'rice_module_column',
    version: '1.0.0',
    apiVersion: RICE_API_VERSION,
    contributes: {
        widgets: [
            { id: 'column', loader: () => import('./ColumnWidget.svelte') },
        ],
    },
};
