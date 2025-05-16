type Background = {
    name: string,
    baseColor: 'both' | 'dark' | 'light',
    url: string,
}

export const backgroundsMap: Map<string, Background> = new Map();

backgroundsMap.set('', {
        name: 'Default',
        baseColor: 'both',
        url: '',
    })
    .set('blue', {
        name: 'Blue',
        baseColor: 'dark',
        url: '/blue.jpg',
    })
    .set('pink', {
        name: 'Pink',
        baseColor: 'dark',
        url: '/pink.jpg',
    })
    .set('summer1', {
        name: 'Natsu',
        baseColor: 'dark',
        url: '/summer1.jpg',
    })
    .set('summer2', {
        name: 'Sunflower',
        baseColor: 'dark',
        url: '/summer2.jpg',
    })
    .set('summer3', {
        name: 'Railway',
        baseColor: 'dark',
        url: '/summer3.jpg',
    });