import { RICE_API_VERSION, type RiceModuleManifest } from '../types';

export const notificationsManifest: RiceModuleManifest = {
    id: 'notifications',
    name: 'rice_module_notifications',
    version: '1.0.0',
    apiVersion: RICE_API_VERSION,
    contributes: {
        statusbarItems: [
            { id: 'notifications', loader: () => import('./NotificationsItem.svelte') },
        ],
    },
};
