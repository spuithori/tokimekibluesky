type Background = {
    name: string,
    baseColor: 'both' | 'dark' | 'light',
    url: string,
}

import Blue from '$lib/images/blue.jpg';
import Pink from '$lib/images/pink.jpg';
import Summer1 from '$lib/images/summer1.jpg';
import Summer2 from '$lib/images/summer2.jpg';
import Summer3 from '$lib/images/summer3.jpg';


export const backgroundsMap: Map<string, Background> = new Map();

backgroundsMap.set('', {
        name: 'Default',
        baseColor: 'both',
        url: '',
    })
    .set('blue', {
        name: 'Blue',
        baseColor: 'dark',
        url: Blue,
    })
    .set('pink', {
        name: 'Pink',
        baseColor: 'dark',
        url: Pink,
    })
    .set('summer1', {
        name: 'Natsu',
        baseColor: 'dark',
        url: Summer1,
    })
    .set('summer2', {
        name: 'Sunflower',
        baseColor: 'dark',
        url: Summer2,
    })
    .set('summer3', {
        name: 'Railway',
        baseColor: 'dark',
        url: Summer3,
    });