import { describe, expect, it } from 'vitest';
import { shellGeometryVars, verticalBarOffset } from './shellGeometry';
import { emptyBar } from './config/model';
import type { CompiledRice } from './config/model';

function bars(partial: CompiledRice['bars']): CompiledRice['bars'] {
    return partial;
}

describe('shellGeometryVars', () => {
    it('空のbarsは何も発行しない', () => {
        expect(shellGeometryVars(bars({}))).toBe('');
    });

    it('左バーのwidthから--side-widthを発行する(rice/native両方)', () => {
        const rice = emptyBar('left', 'rice');
        rice.props.width = '220px';
        expect(shellGeometryVars(bars({ left: [rice] }))).toBe('--side-width: 220px;');

        const native = emptyBar('left', 'native');
        native.props.width = '90px';
        expect(shellGeometryVars(bars({ left: [native] }))).toBe('--side-width: 90px;');
    });

    it('左バーにwidthが無ければ--side-widthを発行しない', () => {
        const bar = emptyBar('left', 'rice');
        bar.items = ['home'];
        expect(shellGeometryVars(bars({ left: [bar] }))).toBe('');
    });

    it('右riceバーから--side-right-widthを発行する(未指定は64px)', () => {
        const bar = emptyBar('right', 'rice');
        bar.items = ['home'];
        expect(shellGeometryVars(bars({ right: [bar] }))).toBe('--side-right-width: 64px;');

        bar.props.width = '72px';
        expect(shellGeometryVars(bars({ right: [bar] }))).toBe('--side-right-width: 72px;');
    });

    it('itemsが空の右バーは--side-right-widthを発行しない', () => {
        const bar = emptyBar('right', 'rice');
        expect(shellGeometryVars(bars({ right: [bar] }))).toBe('');
    });

    it('横riceバーの高さを--rice-statusbar-*-heightとして発行する', () => {
        const top = emptyBar('top', 'rice');
        top.items = ['clock'];
        expect(shellGeometryVars(bars({ top: [top] }))).toBe('--rice-statusbar-top-height: 32px;');

        top.props.height = '40px';
        const bottom = emptyBar('bottom', 'rice');
        bottom.items = ['clock'];
        expect(shellGeometryVars(bars({ top: [top], bottom: [bottom] }))).toBe(
            '--rice-statusbar-top-height: 40px;--rice-statusbar-bottom-height: 32px;',
        );
    });

    it('floatバーはmargin×2を加算した高さを発行する', () => {
        const top = emptyBar('top', 'rice');
        top.items = ['clock'];
        top.float = true;
        top.props.height = '40px';
        top.props.margin = '10px';
        expect(shellGeometryVars(bars({ top: [top] }))).toBe(
            '--rice-statusbar-top-height: calc(40px + 10px * 2);',
        );
    });

    it('focus未指定なら何も発行しない', () => {
        expect(shellGeometryVars(bars({}), null, null, null)).toBe('');
    });

    it('focusからdeck-focused-outline系とdimを発行する', () => {
        expect(shellGeometryVars(bars({}), null, { outline: '3px solid red', outlineWidth: '3px', dim: '0.8' })).toBe(
            '--deck-focused-outline: 3px solid red;--deck-focused-outline-width: 3px;--deck-unfocused-dim: 0.8;',
        );
        expect(shellGeometryVars(bars({}), null, { dim: '0.5' })).toBe('--deck-unfocused-dim: 0.5;');
    });

    it('設定済みanimation targetのvarを発行する', () => {
        expect(
            shellGeometryVars(bars({}), null, null, {
                enabled: true,
                targets: { panel: { duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' } },
            }),
        ).toBe('--anim-panel-duration: 180ms;--anim-panel-easing: cubic-bezier(0.2, 0, 0, 1);');
    });

    it('enabled=falseで全targetのdurationを0msにする', () => {
        const style = shellGeometryVars(bars({}), null, null, {
            enabled: false,
            targets: { panel: { duration: 180, easing: 'ease' } },
        });
        for (const target of ['panel', 'menu', 'modal', 'tooltip', 'reorder', 'hover']) {
            expect(style).toContain(`--anim-${target}-duration: 0ms;`);
        }
        expect(style).not.toContain('easing');
    });

    it('offターゲットは0msのみ発行しeasingは出さない', () => {
        expect(
            shellGeometryVars(bars({}), null, null, { enabled: true, targets: { tooltip: { duration: 0, easing: 'linear' } } }),
        ).toBe('--anim-tooltip-duration: 0ms;');
    });

    it('styles / bezierタプル / easingFnはCSS varへ漏れない', () => {
        const withStyle = shellGeometryVars(bars({}), null, null, {
            enabled: true,
            targets: {
                panel: {
                    duration: 180,
                    easing: 'ease-out',
                    easingFn: 'bounce',
                    bezier: [0, 0, 0.58, 1],
                    styles: [{ kind: 'slide', direction: 'left', distance: 24 }, { kind: 'blur', radius: 6 }],
                },
            },
        });
        const without = shellGeometryVars(bars({}), null, null, {
            enabled: true,
            targets: { panel: { duration: 180, easing: 'ease-out' } },
        });
        expect(withStyle).toBe(without);
        expect(withStyle).toBe('--anim-panel-duration: 180ms;--anim-panel-easing: ease-out;');
    });

    it('layout.alignに応じて整列varを発行する', () => {
        expect(shellGeometryVars(bars({}), null)).toBe('');
        expect(shellGeometryVars(bars({}), { align: 'center' })).toBe('--deck-justify: safe center;');
        expect(shellGeometryVars(bars({}), { align: 'right' })).toBe(
            '--deck-justify: safe flex-end;--single-align-mr: var(--shell-inset, 0px);',
        );
        expect(shellGeometryVars(bars({}), { align: 'left' })).toBe('--single-align-ml: var(--shell-inset, 0px);');
    });

    it('shell=centeredで--shell-inset/--shell-max-widthを発行する', () => {
        expect(shellGeometryVars(bars({}), { align: 'left', shell: 'centered' })).toBe(
            '--shell-inset: max(0px, calc((100vw - 1280px) / 2));--shell-max-width: 1280px;--single-align-ml: var(--shell-inset, 0px);',
        );
        expect(shellGeometryVars(bars({}), { align: 'center', shell: 'centered', shellWidth: '1240px' })).toBe(
            '--shell-inset: max(0px, calc((100vw - 1240px) / 2));--shell-max-width: 1240px;--deck-justify: safe center;',
        );
    });

    it('shell=noneや未指定ではshell varを発行しない', () => {
        expect(shellGeometryVars(bars({}), { align: 'center', shell: 'none' })).toBe('--deck-justify: safe center;');
        expect(shellGeometryVars(bars({}), { align: 'center' })).toBe('--deck-justify: safe center;');
    });

    it('single+centeredはコンテンツ駆動のcontent-width/insetを発行しshell-max-widthを出さない', () => {
        const single = shellGeometryVars(bars({}), { align: 'center', shell: 'centered' }, null, null, null, 'single');
        expect(single).toBe(
            '--shell-content-width: calc(var(--side-width, 64px) + var(--single-column-width, var(--single-m-width, 528px)) + var(--side-right-width, 0px));'
            + '--shell-inset: max(0px, calc((100vw - var(--shell-content-width)) / 2));'
            + '--deck-justify: safe center;',
        );
        const withWidth = shellGeometryVars(bars({}), { align: 'center', shell: 'centered', shellWidth: '1240px' }, null, null, null, 'single');
        expect(withWidth).toBe(single);
        expect(withWidth).not.toContain('--shell-max-width');
    });

    it('deck+centeredは従来のshellwidth式を維持する', () => {
        expect(shellGeometryVars(bars({}), { align: 'center', shell: 'centered', shellWidth: '1240px' }, null, null, null, 'deck')).toBe(
            '--shell-inset: max(0px, calc((100vw - 1240px) / 2));--shell-max-width: 1240px;--deck-justify: safe center;',
        );
    });

    it('single+非centeredはshell varを発行しない', () => {
        expect(shellGeometryVars(bars({}), { align: 'center', shell: 'none' }, null, null, null, 'single')).toBe('--deck-justify: safe center;');
        expect(shellGeometryVars(bars({}), { align: 'center' }, null, null, null, 'single')).toBe('--deck-justify: safe center;');
    });

    it('itemsが空の横バーやnative横バーは高さを発行しない', () => {
        const empty = emptyBar('top', 'rice');
        expect(shellGeometryVars(bars({ top: [empty] }))).toBe('');

        const native = emptyBar('top', 'native');
        native.items = ['clock'];
        expect(shellGeometryVars(bars({ top: [native] }))).toBe('');
    });
});

describe('複数縦バー', () => {
    it('左バー2本の幅をcalc合算で--side-widthに発行する', () => {
        const dock = emptyBar('left', 'rice');
        dock.items = ['home'];
        dock.props.width = '64px';
        const menu = emptyBar('left', 'rice');
        menu.items = ['settings'];
        menu.props.width = '220px';
        expect(shellGeometryVars(bars({ left: [dock, menu] }))).toBe('--side-width: calc(64px + 220px);');
    });

    it('右バー2本はrice+items有のみ数え幅未指定は64pxで合算する', () => {
        const a = emptyBar('right', 'rice');
        a.items = ['home'];
        const b = emptyBar('right', 'rice');
        b.items = ['search'];
        b.props.width = '320px';
        const ghost = emptyBar('right', 'rice');
        expect(shellGeometryVars(bars({ right: [a, b, ghost] }))).toBe('--side-right-width: calc(64px + 320px);');
    });

    it('verticalBarOffsetは前置バー幅の累積を返す', () => {
        const a = emptyBar('left', 'rice');
        a.props.width = '64px';
        const b = emptyBar('left', 'rice');
        b.props.width = '220px';
        const c = emptyBar('left', 'rice');
        expect(verticalBarOffset([a, b, c], 0)).toBe('0px');
        expect(verticalBarOffset([a, b, c], 1)).toBe('64px');
        expect(verticalBarOffset([a, b, c], 2)).toBe('calc(64px + 220px)');
    });
});

describe('shellGeometryVars footer', () => {
    it('rice footerから--rice-footer-heightを発行する（既定56px）', () => {
        const footer = emptyBar('footer', 'rice');
        footer.items = ['home'];
        expect(shellGeometryVars(bars({ footer: [footer] }))).toBe('--rice-footer-height: 56px;');
        footer.props.height = '64px';
        expect(shellGeometryVars(bars({ footer: [footer] }))).toBe('--rice-footer-height: 64px;');
    });

    it('float footerはheight+margin*2で発行しitemsなしは発行しない', () => {
        const footer = emptyBar('footer', 'rice');
        footer.items = ['home'];
        footer.float = true;
        expect(shellGeometryVars(bars({ footer: [footer] }))).toBe('--rice-footer-height: calc(56px + 8px * 2);');
        footer.props.margin = '12px';
        expect(shellGeometryVars(bars({ footer: [footer] }))).toBe('--rice-footer-height: calc(56px + 12px * 2);');
        const empty = emptyBar('footer', 'rice');
        expect(shellGeometryVars(bars({ footer: [empty] }))).toBe('');
    });
});

describe('shellGeometryVars switcher', () => {
    it('pillまたはbottomのswitcherで--rice-switcher-top-height: 0pxを発行する', () => {
        const pill = { style: 'pill', position: 'bottom', reveal: 'auto', showAdd: false, props: {} } as const;
        expect(shellGeometryVars(bars({}), null, null, null, pill)).toBe('--rice-switcher-top-height: 0px;');
        const bottomStrip = { style: 'strip', position: 'bottom', reveal: 'scroll', showAdd: true, props: {} } as const;
        expect(shellGeometryVars(bars({}), null, null, null, bottomStrip)).toBe('--rice-switcher-top-height: 0px;');
    });

    it('topストリップやswitcher未指定では発行しない', () => {
        const topStrip = { style: 'strip', position: 'top', reveal: 'scroll', showAdd: true, props: {} } as const;
        expect(shellGeometryVars(bars({}), null, null, null, topStrip)).toBe('');
        expect(shellGeometryVars(bars({}), null, null, null, null)).toBe('');
    });
});
