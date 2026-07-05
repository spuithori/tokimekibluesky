import { RICE_API_VERSION, type RiceModuleManifest } from '../types';

export const chatManifest: RiceModuleManifest = {
    id: 'chat',
    name: 'rice_module_chat',
    version: '1.0.0',
    apiVersion: RICE_API_VERSION,
    contributes: {
        statusbarItems: [
            { id: 'chat', loader: () => import('./ChatItem.svelte') },
        ],
    },
};
