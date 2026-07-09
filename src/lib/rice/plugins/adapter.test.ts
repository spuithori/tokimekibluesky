import { describe, expect, it } from 'vitest';
import { HOST_SVELTE_VERSION as VERSION } from './hostVersion';
import { pluginEntryId, synthesizeManifest } from './adapter';
import { validatePluginManifest, type RicePluginManifestJson } from './types';

function baseManifest(overrides: Partial<RicePluginManifestJson> = {}): RicePluginManifestJson {
    return {
        id: 'aurora',
        name: 'Aurora Effect',
        version: '1.0.0',
        apiVersion: 1,
        svelteVersion: VERSION,
        entry: 'main.js',
        integrity: 'sha256-LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=',
        ...overrides,
    };
}

describe('synthesizeManifest', () => {
    it('ホストエントリ id は plugin:<id> になる', () => {
        const manifest = synthesizeManifest(baseManifest());
        expect(manifest.id).toBe('plugin:aurora');
        expect(manifest.name).toBe('Aurora Effect');
        expect(manifest.apiVersion).toBe(1);
        expect(pluginEntryId('aurora')).toBe('plugin:aurora');
    });

    it('contribution id にプレフィックスを付与する(commands は host 側で付くため素通し)', () => {
        const manifest = synthesizeManifest(baseManifest({
            contributes: {
                effectLayers: [{ id: 'aurora', zIndex: 999 }],
                statusbarItems: [{ id: 'badge' }],
                widgets: [{ id: 'panel' }],
                columnKinds: [{ kind: 'timeline', capability: { hasAgent: true } }],
                sidebarItems: [{ id: 'open', title: 'Open', command: 'plugin:aurora.cmd' }],
                commands: [{ id: 'cmd', title: 'Do' }],
                themeTokens: { 'aurora-tint': '#88ffcc' },
            },
        }));
        const c = manifest.contributes!;
        expect(c.effectLayers?.[0].id).toBe('plugin:aurora.aurora');
        expect(c.effectLayers?.[0].zIndex).toBe(999);
        expect(typeof c.effectLayers?.[0].getOptions).toBe('function');
        expect(c.statusbarItems?.[0].id).toBe('plugin:aurora.badge');
        expect(c.widgets?.[0].id).toBe('plugin:aurora.panel');
        expect(c.columnKinds?.[0].type).toBe('plugin:aurora:timeline');
        expect(c.columnKinds?.[0].capability).toEqual({ hasAgent: true });
        expect(c.sidebarItems?.[0].id).toBe('plugin:aurora.open');
        expect(c.commands?.[0].id).toBe('cmd');
        expect(c.themeTokens).toEqual({ 'aurora-tint': '#88ffcc' });
    });

    it('activate 指定も quickActions も無ければ activate は undefined', () => {
        const manifest = synthesizeManifest(baseManifest({ contributes: { effectLayers: [{ id: 'x' }] } }));
        expect(manifest.activate).toBeUndefined();
    });

    it('quickActions 宣言があると eager activate が生える', () => {
        const manifest = synthesizeManifest(baseManifest({
            contributes: { quickActions: [{ id: 'qa', title: 'Toggle', kind: 'toggle' }] },
        }));
        expect(typeof manifest.activate).toBe('function');
        expect(manifest.contributes?.quickActions?.[0].get?.()).toBe(false);
    });

    it('svelte メジャー不一致は activate が svelte-major-mismatch で失敗する', async () => {
        const manifest = synthesizeManifest(baseManifest({ svelteVersion: '6.0.0' }));
        expect(typeof manifest.activate).toBe('function');
        await expect(async () => await manifest.activate!()).rejects.toMatchObject({ code: 'svelte-major-mismatch' });
    });

    it('svelte メジャー不一致では loader も同エラーで失敗する', async () => {
        const manifest = synthesizeManifest(baseManifest({
            svelteVersion: '6.0.0',
            contributes: { effectLayers: [{ id: 'x' }] },
        }));
        await expect(manifest.contributes!.effectLayers![0].loader()).rejects.toMatchObject({ code: 'svelte-major-mismatch' });
    });
});

describe('validatePluginManifest', () => {
    it('妥当な manifest を受理する', () => {
        const result = validatePluginManifest(baseManifest({ contributes: { effectLayers: [{ id: 'aurora' }] } }));
        expect('ok' in result).toBe(true);
    });

    it.each([
        ['id 不正', { id: 'Aurora' }],
        ['integrity 形式不正', { integrity: 'md5-abc' }],
        ['entry 欠落', { entry: '' }],
        ['apiVersion 型不正', { apiVersion: '1' as unknown as number }],
        ['contributes 配列不正', { contributes: { effectLayers: [{}] } as never }],
    ])('%s を拒否する', (_label, overrides) => {
        const result = validatePluginManifest({ ...baseManifest(), ...overrides });
        expect('error' in result).toBe(true);
    });

    it('オブジェクト以外を拒否する', () => {
        expect('error' in validatePluginManifest(null)).toBe(true);
        expect('error' in validatePluginManifest('x')).toBe(true);
    });
});
