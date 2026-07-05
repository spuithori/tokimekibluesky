import { RICE_API_VERSION, type RiceModuleManifest } from '../types';

export const workspaceManifest: RiceModuleManifest = {
    id: 'workspace',
    name: 'rice_module_workspace',
    version: '1.0.0',
    apiVersion: RICE_API_VERSION,
    contributes: {
        statusbarItems: [
            { id: 'workspace', loader: () => import('./WorkspaceItem.svelte') },
        ],
    },
};
