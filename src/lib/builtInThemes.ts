import type {Theme} from "$lib/types/theme";

export const builtInThemes: Theme[] = [
    {
        id: 'default',
        createdAt: '2023-09-07 04:42:22.128197+00',
        updatedAt: '2023-09-07 04:42:22.128197+00',
        name: 'default',
        description: 'The First Thrill',
        style: '',
        options: {
            colorDisabled: false,
            darkmodeDisabled: false,
            thumbnail: '/skin-default.png',
            cover: '/skin-default.png',
        },
        author: 'TOKIMEKI',
        keyword: 'builtin',
        version: '1.0',
        isBuiltIn: true,
    },
    {
        id: 'twilight',
        createdAt: '2023-09-07 04:42:22.128197+00',
        updatedAt: '2023-09-07 04:42:22.128197+00',
        name: 'twilight',
        description: 'It\'s gonna be sunny tomorrow.',
        style: '',
        options: {
            colorDisabled: false,
            darkmodeDisabled: true,
            thumbnail: '/skin-twilight.png',
            cover: '/skin-twilight.png',
        },
        author: 'TOKIMEKI',
        keyword: 'builtin',
        version: '1.0',
        isBuiltIn: true,
    }
];
