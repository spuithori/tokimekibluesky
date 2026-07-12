const soundUrls = new Map<string, string>([
    ['sound1', '/se/sound1.mp3'],
    ['sound2', '/se/sound2.mp3'],
    ['sound3', '/se/sound3.mp3'],
    ['sound4', '/se/sound4.mp3'],
    ['sound5', '/se/sound5.mp3'],
    ['notification1', '/se/notification-1.ogg'],
    ['notification2', '/se/notification-2.ogg'],
    ['notification3', '/se/notification-3.ogg']
]);
const soundCache = new Map<string, HTMLAudioElement>();

function getSound(soundName: string): HTMLAudioElement | undefined {
    if (soundCache.has(soundName)) {
        return soundCache.get(soundName);
    }

    const url = soundUrls.get(soundName);
    if (url) {
        const audio = new Audio(url);
        soundCache.set(soundName, audio);
        return audio;
    }

    console.warn(`Sound "${soundName}" not found.`);
    return undefined;
}

export function playSound(indexedAt: string | undefined, lastRefresh: string | undefined, soundName: string) {
    try {
        if (indexedAt && lastRefresh && new Date(indexedAt).getTime() > new Date(lastRefresh).getTime()) {
            const sound = getSound(soundName);
            if (sound) {
                sound.volume = 0.5;
                sound.play().catch(() => {});
            }
        }
    } catch (e) {
        console.error(e);
    }
}

export function instantPlaySound(soundName = 'notification1') {
    try {
        const sound = getSound(soundName);
        if (sound) {
            sound.volume = 0.5;
            sound.play().catch(() => {});
        }
    } catch (e) {
        console.error(e);
    }
}