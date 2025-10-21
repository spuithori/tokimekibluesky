import {parseISO} from "date-fns";

const soundUrls = new Map<string, string>([
    ['sound1', 'https://zkcpydmrzurbuoebrhqu.supabase.co/storage/v1/object/public/sounds/sound1.mp3'],
    ['sound2', 'https://zkcpydmrzurbuoebrhqu.supabase.co/storage/v1/object/public/sounds/sound2.mp3'],
    ['sound3', 'https://zkcpydmrzurbuoebrhqu.supabase.co/storage/v1/object/public/sounds/sound3.mp3'],
    ['sound4', 'https://zkcpydmrzurbuoebrhqu.supabase.co/storage/v1/object/public/sounds/sound4.mp3'],
    ['sound5', 'https://zkcpydmrzurbuoebrhqu.supabase.co/storage/v1/object/public/sounds/sound5.mp3'],
    ['notification1', 'https://zkcpydmrzurbuoebrhqu.supabase.co/storage/v1/object/public/sounds/notification-1.ogg'],
    ['notification2', 'https://zkcpydmrzurbuoebrhqu.supabase.co/storage/v1/object/public/sounds/notification-2.ogg'],
    ['notification3', 'https://zkcpydmrzurbuoebrhqu.supabase.co/storage/v1/object/public/sounds/notification-3.ogg']
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

export function playSound(indexedAt: string, lastRefresh: string, playSound: string) {
    try {
        if (indexedAt && parseISO(indexedAt).getTime() > parseISO(lastRefresh).getTime()) {
            const sound = getSound(playSound);
            if (sound) {
                sound.volume = 0.5;
                sound.play();
            }
        }
    } catch (e) {
        console.error(e);
    }
}

export function instantPlaySound(playSound = 'notification1') {
    try {
        const sound = getSound(playSound);
        if (sound) {
            sound.volume = 0.5;
            sound.play();
        }
    } catch (e) {
        console.error(e);
    }
}