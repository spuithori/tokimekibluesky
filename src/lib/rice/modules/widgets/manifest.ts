import { RICE_API_VERSION, type RiceModuleManifest } from '../types';

export const widgetsManifest: RiceModuleManifest = {
    id: 'widgets',
    name: 'rice_module_widgets',
    version: '1.0.0',
    apiVersion: RICE_API_VERSION,
    contributes: {
        widgets: [
            { id: 'text', loader: () => import('./TextWidget.svelte') },
            { id: 'button', loader: () => import('./ButtonWidget.svelte') },
            { id: 'image', loader: () => import('./ImageWidget.svelte') },
            { id: 'calendar', loader: () => import('./CalendarWidget.svelte') },
        ],
    },
};
