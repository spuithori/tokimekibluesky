import { RICE_API_VERSION, type RiceModuleManifest } from '../types';

export const keymodeManifest: RiceModuleManifest = {
    id: 'keymode',
    name: 'rice_module_keymode',
    version: '1.0.0',
    apiVersion: RICE_API_VERSION,
    contributes: {
        statusbarItems: [
            { id: 'keymode', loader: () => import('./KeymodeItem.svelte') },
        ],
    },
};
