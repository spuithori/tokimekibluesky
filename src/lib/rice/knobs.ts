import type { CompiledRice } from './config/model';
import { getValueInText, setValueInText } from './config/edit';

export interface RiceKnob {
    id: string;
    label: string;
    kind: 'length' | 'toggle' | 'color';
    fallback: string;
    min?: number;
    max?: number;
    step?: number;
    onValue?: string;
    offValue?: string;
    read: (compiled: CompiledRice) => string | undefined;
    write: (config: string, value: string) => string;
}

function writeLayout(key: string) {
    return (config: string, value: string) => setValueInText(config, [{ name: 'layout' }], key, value);
}

function writeToken(key: string) {
    return (config: string, value: string) => setValueInText(config, [{ name: 'theme' }, { name: 'tokens' }], key, value);
}

export const appearanceKnobs: RiceKnob[] = [
    {
        id: 'shell-centered',
        label: 'rice_knob_shell_centered',
        kind: 'toggle',
        fallback: 'none',
        onValue: 'centered',
        offValue: 'none',
        read: (compiled) => compiled.layout?.shell,
        write: (config, value) => {
            let next = setValueInText(config, [{ name: 'layout' }], 'shell', value);
            if (value === 'centered' && getValueInText(next, [{ name: 'layout' }], 'align') === undefined) {
                next = setValueInText(next, [{ name: 'layout' }], 'align', 'center');
            }
            return next;
        },
    },
    {
        id: 'shell-width',
        label: 'rice_knob_shell_width',
        kind: 'length',
        fallback: '1280px',
        min: 720,
        max: 2400,
        step: 20,
        read: (compiled) => compiled.layout?.shellWidth,
        write: writeLayout('shellwidth'),
    },
    {
        id: 'tile',
        label: 'rice_knob_tile',
        kind: 'toggle',
        fallback: 'scroll',
        onValue: 'tile',
        offValue: 'scroll',
        read: (compiled) => compiled.layout?.mode,
        write: writeLayout('mode'),
    },
    {
        id: 'deck-radius',
        label: 'rice_knob_deck_radius',
        kind: 'length',
        fallback: '10px',
        min: 0,
        max: 32,
        step: 1,
        read: (compiled) => compiled.themeTokens['deck-border-radius'],
        write: writeToken('deck-border-radius'),
    },
    {
        id: 'decks-gap',
        label: 'rice_knob_decks_gap',
        kind: 'length',
        fallback: '0px',
        min: 0,
        max: 32,
        step: 1,
        read: (compiled) => compiled.themeTokens['decks-gap'],
        write: writeToken('decks-gap'),
    },
    {
        id: 'accent',
        label: 'rice_knob_accent',
        kind: 'color',
        fallback: '#3399ff',
        read: (compiled) => compiled.themeTokens['current-theme-color'],
        write: writeToken('current-theme-color'),
    },
];
