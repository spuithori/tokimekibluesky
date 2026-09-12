import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES = resolve(__dirname, 'locales');

function keysOf(file: string): Set<string> {
    return new Set(Object.keys(JSON.parse(readFileSync(resolve(LOCALES, file), 'utf8'))));
}

describe('dictionary parity for complete locales', () => {
    it('ja contains every key of the fallback en, so ja never needs the fallback for first render', () => {
        const ja = keysOf('ja.json');
        const missing = [...keysOf('en.json')].filter((key) => !ja.has(key));
        expect(missing).toEqual([]);
    });

    it('the supplementary ja dictionaries cover their en counterparts as well', () => {
        for (const dir of ['languageMap', 'labeling', 'labelingInfo']) {
            const ja = keysOf(`${dir}/ja.json`);
            const missing = [...keysOf(`${dir}/en.json`)].filter((key) => !ja.has(key));
            expect(missing, dir).toEqual([]);
        }
    });
});
