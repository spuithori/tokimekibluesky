import { beforeEach, describe, expect, it } from 'vitest';
import { pluginState } from './state.svelte';
import { settingsStore } from '$lib/settings/settings.svelte';
import { pluginSettingsRegistry } from '$lib/rice/modules/registries.svelte';
import { resetSettings } from '$lib/test-fixtures/settingsTestUtils';

describe('pluginState', () => {
    beforeEach(() => {
        resetSettings();
        pluginSettingsRegistry.clear();
    });

    it('isEnabled は既定で false、state に従う', () => {
        expect(pluginState.isEnabled('fixture')).toBe(false);
        pluginState.setEnabled('fixture', true);
        expect(pluginState.isEnabled('fixture')).toBe(true);
        pluginState.setEnabled('fixture', false);
        expect(pluginState.isEnabled('fixture')).toBe(false);
    });

    it('config は schema の default をマージし options が上書きする', () => {
        pluginSettingsRegistry.set('fixture', [
            { key: 'label', type: 'string', label: 'Label', default: 'hi' },
            { key: 'mode', type: 'enum', label: 'Mode', default: 'a', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
        ]);
        expect(pluginState.config('fixture')).toEqual({ enabled: false, options: { label: 'hi', mode: 'a' } });

        pluginState.setEnabled('fixture', true);
        pluginState.setOption('fixture', 'mode', 'b');
        expect(pluginState.config('fixture')).toEqual({ enabled: true, options: { label: 'hi', mode: 'b' } });
    });

    it('schema が無くても config は定義済みオブジェクトを返す', () => {
        expect(pluginState.config('unknown')).toEqual({ enabled: false, options: {} });
    });

    it('setOption は enabled を立てない', () => {
        pluginState.setOption('fixture', 'label', 'x');
        expect(pluginState.isEnabled('fixture')).toBe(false);
        expect(settingsStore.plugins.state['fixture']).toEqual({ enabled: false, options: { label: 'x' } });
    });

    it('set はエントリを丸ごと置き換え、clear で消える', () => {
        pluginState.set('fixture', { enabled: true, options: { intensity: '0.5' } });
        expect(settingsStore.plugins.state['fixture']).toEqual({ enabled: true, options: { intensity: '0.5' } });
        pluginState.clear('fixture');
        expect(settingsStore.plugins.state['fixture']).toBeUndefined();
        expect(pluginState.isEnabled('fixture')).toBe(false);
    });
});
