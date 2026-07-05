import { RICE_API_VERSION, type RiceModuleManifest } from '../types';

export const auroraManifest: RiceModuleManifest = {
    id: 'aurora',
    name: 'rice_module_aurora',
    version: '1.0.0',
    apiVersion: RICE_API_VERSION,
    contributes: {
        effectLayers: [
            { id: 'aurora', zIndex: 999, loader: () => import('./AuroraLayer.svelte') },
        ],
    },
};
