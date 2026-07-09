import { describe, expect, it, vi } from 'vitest';
import { RiceModuleHost } from './host.svelte';
import { statusbarItemRegistry, moduleThemeTokens, widgetRegistry } from './registries.svelte';
import { RICE_API_VERSION, type RiceModuleManifest } from './types';
import { capabilityOf } from '$lib/columnKinds';
import { getColumnKind } from '$lib/columnKindRegistry.svelte';
import { commandRegistry, runCommand } from '$lib/commands/registry.svelte';

function fakeManifest(overrides: Partial<RiceModuleManifest> = {}): RiceModuleManifest {
    return {
        id: 'fake',
        name: 'fake',
        version: '1.0.0',
        apiVersion: RICE_API_VERSION,
        contributes: {
            statusbarItems: [{ id: 'fake-item', loader: async () => ({ default: {} as any }) }],
            columnKinds: [
                {
                    type: 'module:fake',
                    capability: { singleton: true },
                    loader: async () => ({ default: {} as any }),
                },
            ],
            themeTokens: { 'fake-token': '1px' },
        },
        ...overrides,
    };
}

async function flush() {
    await Promise.resolve();
    await Promise.resolve();
}

describe('RiceModuleHost 状態機械', () => {
    it('enable で contribution が全レジストリへ登録され、disable で解除される', async () => {
        const host = new RiceModuleHost();
        host.register(fakeManifest());

        host.setWanted('fake', true);
        await flush();
        expect(host.entries.get('fake')?.status).toBe('enabled');
        expect(statusbarItemRegistry.has('fake-item')).toBe(true);
        expect(getColumnKind('module:fake')).toBeDefined();
        expect(capabilityOf('module:fake').singleton).toBe(true);
        expect(moduleThemeTokens.get('fake')).toEqual({ 'fake-token': '1px' });

        host.setWanted('fake', false);
        await flush();
        expect(host.entries.get('fake')?.status).toBe('disabled');
        expect(statusbarItemRegistry.has('fake-item')).toBe(false);
        expect(getColumnKind('module:fake')).toBeUndefined();
        expect(capabilityOf('module:fake').singleton).toBe(false);
        expect(moduleThemeTokens.has('fake')).toBe(false);
    });

    it('widgets contribution は widgetRegistry へ登録され、disable で解除される', async () => {
        const host = new RiceModuleHost();
        host.register(fakeManifest({
            contributes: {
                widgets: [{ id: 'fake-widget', loader: async () => ({ default: {} as any }) }],
            },
        }));

        host.setWanted('fake', true);
        await flush();
        expect(host.entries.get('fake')?.status).toBe('enabled');
        expect(widgetRegistry.has('fake-widget')).toBe(true);

        host.setWanted('fake', false);
        await flush();
        expect(widgetRegistry.has('fake-widget')).toBe(false);
    });

    it('commands contribution は moduleId プレフィックスで登録され、disable で解除される', async () => {
        const host = new RiceModuleHost();
        const run = vi.fn();
        host.register(fakeManifest({
            id: 'cmd',
            contributes: { commands: [{ id: 'do-thing', title: 't', run }] },
        }));

        host.setWanted('cmd', true);
        await flush();
        expect(commandRegistry.has('cmd.do-thing')).toBe(true);
        expect(runCommand('cmd.do-thing', 'x')).toBe(true);
        expect(run).toHaveBeenCalledWith('x', undefined);

        host.setWanted('cmd', false);
        await flush();
        expect(commandRegistry.has('cmd.do-thing')).toBe(false);
    });

    it('activate の dispose が disable 時に呼ばれる', async () => {
        const host = new RiceModuleHost();
        let disposed = 0;
        host.register(fakeManifest({ id: 'd', contributes: {}, activate: () => ({ dispose: () => { disposed += 1; } }) }));

        host.setWanted('d', true);
        await flush();
        expect(host.entries.get('d')?.status).toBe('enabled');

        host.setWanted('d', false);
        await flush();
        expect(disposed).toBe(1);
        expect(host.entries.get('d')?.status).toBe('disabled');
    });

    it('activate が throw すると error 状態になり contribution は残らない', async () => {
        const host = new RiceModuleHost();
        host.register(fakeManifest({
            id: 'broken',
            contributes: { statusbarItems: [{ id: 'broken-item', loader: async () => ({ default: {} as any }) }] },
            activate: () => {
                throw new Error('boom');
            },
        }));

        host.setWanted('broken', true);
        await flush();
        const entry = host.entries.get('broken');
        expect(entry?.status).toBe('error');
        expect(entry?.errorMessage).toContain('boom');
        expect(statusbarItemRegistry.has('broken-item')).toBe(false);
    });

    it('error 状態は wanted=false で disabled に戻り、再度 wanted=true で再試行する', async () => {
        const host = new RiceModuleHost();
        let attempts = 0;
        host.register(fakeManifest({
            id: 'retry',
            contributes: {},
            activate: () => {
                attempts += 1;
                if (attempts === 1) throw new Error('first failure');
            },
        }));

        host.setWanted('retry', true);
        await flush();
        expect(host.entries.get('retry')?.status).toBe('error');

        host.setWanted('retry', true);
        await flush();
        expect(host.entries.get('retry')?.status).toBe('error');
        expect(attempts).toBe(1);

        host.setWanted('retry', false);
        await flush();
        expect(host.entries.get('retry')?.status).toBe('disabled');

        host.setWanted('retry', true);
        await flush();
        expect(host.entries.get('retry')?.status).toBe('enabled');
        expect(attempts).toBe(2);
    });

    it('apiVersion 不一致は register 時点で error になり enable されない', async () => {
        const host = new RiceModuleHost();
        host.register(fakeManifest({ id: 'old', apiVersion: 0 }));
        expect(host.entries.get('old')?.status).toBe('error');

        host.setWanted('old', true);
        await flush();
        expect(host.entries.get('old')?.status).toBe('error');
    });

    it('unregister は disabled のエントリを削除する', () => {
        const host = new RiceModuleHost();
        host.register(fakeManifest({ id: 'gone', contributes: {} }));
        expect(host.unregister('gone')).toBe(true);
        expect(host.entries.has('gone')).toBe(false);
    });

    it('unregister は enabled 中を拒否し、disable 後に成功する', async () => {
        const host = new RiceModuleHost();
        host.register(fakeManifest({ id: 'busy', contributes: { themeTokens: { t: '1' } } }));
        host.setWanted('busy', true);
        await flush();
        expect(host.entries.get('busy')?.status).toBe('enabled');
        expect(host.unregister('busy')).toBe(false);
        expect(host.entries.has('busy')).toBe(true);

        host.setWanted('busy', false);
        await flush();
        expect(host.unregister('busy')).toBe(true);
        expect(host.entries.has('busy')).toBe(false);
    });

    it('unregister は error 状態と未知 id を許容する', async () => {
        const host = new RiceModuleHost();
        host.register(fakeManifest({ id: 'broken', apiVersion: 0 }));
        expect(host.unregister('broken')).toBe(true);
        expect(host.unregister('never-registered')).toBe(true);
    });
});
