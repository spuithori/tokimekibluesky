import { describe, expect, it, vi } from 'vitest';
import { commandRegistry, parseCommandLine, registerCommand, registerCommands, runCommand } from './registry.svelte';

describe('command registry', () => {
    it('登録したコマンドを実行でき、unregister で消える', () => {
        const run = vi.fn();
        const unregister = registerCommand({ id: 'test.hello', title: 't', run });
        expect(runCommand('test.hello', 'world')).toBe(true);
        expect(run).toHaveBeenCalledWith('world', undefined);
        unregister();
        expect(commandRegistry.has('test.hello')).toBe(false);
    });

    it('未知のコマンドは false を返し throw しない', () => {
        expect(runCommand('test.unknown')).toBe(false);
    });

    it('when が false のコマンドは実行されない', () => {
        const run = vi.fn();
        const unregister = registerCommand({ id: 'test.gated', title: 't', run, when: () => false });
        expect(runCommand('test.gated')).toBe(false);
        expect(run).not.toHaveBeenCalled();
        unregister();
    });

    it('registerCommands は一括登録・一括解除する', () => {
        const unregister = registerCommands([
            { id: 'test.a', title: 'a', run: () => {} },
            { id: 'test.b', title: 'b', run: () => {} },
        ]);
        expect(commandRegistry.has('test.a')).toBe(true);
        expect(commandRegistry.has('test.b')).toBe(true);
        unregister();
        expect(commandRegistry.has('test.a')).toBe(false);
        expect(commandRegistry.has('test.b')).toBe(false);
    });

    it('同一IDの再登録後に古い unregister を呼んでも新しい登録は消えない', () => {
        const first = registerCommand({ id: 'test.dup', title: '1', run: () => {} });
        registerCommand({ id: 'test.dup', title: '2', run: () => {} });
        first();
        expect(commandRegistry.get('test.dup')?.title).toBe('2');
        commandRegistry.delete('test.dup');
    });
});

describe('parseCommandLine', () => {
    it('id のみ', () => {
        expect(parseCommandLine('palette.toggle')).toEqual({ id: 'palette.toggle' });
    });

    it('id + arg(空白以降すべてが arg)', () => {
        expect(parseCommandLine('column.focus 3')).toEqual({ id: 'column.focus', arg: '3' });
        expect(parseCommandLine('settings.open moderation/labeler')).toEqual({ id: 'settings.open', arg: 'moderation/labeler' });
        expect(parseCommandLine('  side.toggle  workspace  ')).toEqual({ id: 'side.toggle', arg: 'workspace' });
    });
});
