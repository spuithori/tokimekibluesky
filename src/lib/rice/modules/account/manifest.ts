import { RICE_API_VERSION, type RiceModuleManifest } from '../types';

export const accountManifest: RiceModuleManifest = {
    id: 'account',
    name: 'rice_module_account',
    version: '1.0.0',
    apiVersion: RICE_API_VERSION,
    contributes: {
        statusbarItems: [
            { id: 'account', loader: () => import('./AccountItem.svelte') },
        ],
    },
};
