import { describe, expect, it } from 'vitest';
import { parse } from './parser';
import { compile } from './compile';
import { getValueInText, setValueInText } from './edit';

const SAMPLE = `# my rice
$accent = #7a35f1

theme {
    tokens {
        deck-border-radius = 20px
        primary-color = $accent
    }
}

columnrule {
    match = type:notification
    opacity = 0.85
    rounding = 16px
}

columnrule {
    match = name:/^Home/ did:did:plc:abc
    blur = 8px
}

module "clock" {
    enable = true
    format = HH:mm
}

statusbar {
    position = top
    modules = clock, spacer, notifications
}

set design.skin = ochame
`;

describe('rice config parser', () => {
    it('サンプル全文をエラーなくパースする', () => {
        const doc = parse(SAMPLE);
        expect(doc.diagnostics).toEqual([]);
        const kinds = doc.statements.map((s) => (s.kind === 'section' ? s.name : s.kind));
        expect(kinds).toEqual(['var', 'theme', 'columnrule', 'columnrule', 'module', 'statusbar', 'set']);
    });

    it('壊れた行は診断に落とし、残りの文は保持する', () => {
        const doc = parse('!!!bad\ntheme {\n    tokens {\n        a = 1\n    }\n}');
        expect(doc.diagnostics).toHaveLength(1);
        expect(doc.diagnostics[0].line).toBe(1);
        expect(doc.statements).toHaveLength(1);
    });

    it('閉じられていないセクションを報告する', () => {
        const doc = parse('theme {\n');
        expect(doc.diagnostics.some((d) => d.message.includes('閉じられていません'))).toBe(true);
    });

    it('ネスト外の "}" を報告する', () => {
        const doc = parse('}');
        expect(doc.diagnostics).toHaveLength(1);
    });

    it('ラベル付きセクションを認識する', () => {
        const doc = parse('module "clock" {\n    enable = true\n}');
        const section = doc.statements[0];
        expect(section.kind).toBe('section');
        if (section.kind === 'section') {
            expect(section.label).toBe('clock');
        }
    });
});

describe('rice config compile', () => {
    it('サンプル全文を正しくコンパイルする', () => {
        const out = compile(SAMPLE);
        expect(out.diagnostics).toEqual([]);
        expect(out.themeTokens).toEqual({
            'deck-border-radius': '20px',
            'primary-color': '#7a35f1',
        });
        expect(out.columnRules).toHaveLength(2);
        expect(out.columnRules[0].match).toEqual({ type: 'notification' });
        expect(out.columnRules[0].props).toEqual({ opacity: '0.85', rounding: '16px' });
        expect(out.columnRules[1].match).toEqual({ name: '/^Home/', did: 'did:plc:abc' });
        expect(out.modules).toEqual({ clock: { enable: true, options: { format: 'HH:mm' } } });
        expect(out.bars.top).toEqual({
            kind: 'rice',
            position: 'top',
            style: 'bar',
            items: ['clock', 'spacer', 'notifications'],
            itemSpecs: [
                { id: 'clock', base: 'clock', options: {} },
                { id: 'spacer', base: 'spacer', options: {} },
                { id: 'notifications', base: 'notifications', options: {} },
            ],
            groups: null,
            tabSets: null,
            float: false,
            props: {},
            showPublish: true,
            showAdd: true,
            showSettings: true,
        });
        expect(out.sets).toEqual([{ path: 'design.skin', value: 'ochame' }]);
    });

    it('未定義変数は警告してそのまま残す', () => {
        const out = compile('theme {\n    tokens {\n        a = $nope\n    }\n}');
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('$nope'))).toBe(true);
        expect(out.themeTokens['a']).toBe('$nope');
    });

    it('style脱出につながる文字を含むトークン値を拒否する', () => {
        const out = compile('theme {\n    tokens {\n        a = red; background: url(x)\n    }\n}');
        expect(out.themeTokens['a']).toBeUndefined();
        expect(out.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    });

    it('match の無い columnrule はエラー', () => {
        const out = compile('columnrule {\n    opacity = 0.5\n}');
        expect(out.columnRules).toHaveLength(0);
        expect(out.diagnostics.some((d) => d.message.includes('match'))).toBe(true);
    });

    it('statusbar のスタイルプロパティと float を受け付ける(bars.bottom へ正規化)', () => {
        const out = compile('statusbar {\n    position = bottom\n    modules = clock\n    float = true\n    height = 40px\n    background = #101010\n    blur = 8px\n    rounding = 16px\n    font-size = 14px\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.bars.bottom).toMatchObject({
            kind: 'rice',
            position: 'bottom',
            style: 'bar',
            items: ['clock'],
            float: true,
            props: { height: '40px', background: '#101010', blur: '8px', rounding: '16px', 'font-size': '14px' },
        });
    });

    it('bar セクションで縦バーを定義できる', () => {
        const out = compile('bar "left" {\n    position = left\n    style = menu\n    items = account, home, spacer, publish\n    width = 220px\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.bars.left).toMatchObject({
            kind: 'rice',
            position: 'left',
            style: 'menu',
            items: ['account', 'home', 'spacer', 'publish'],
            props: { width: '220px' },
        });
    });

    it('縦バーの style = menu で width 未指定は warning', () => {
        const out = compile('bar "left" {\n    position = left\n    style = menu\n    items = home\n}');
        expect(out.bars.left?.style).toBe('menu');
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('width'))).toBe(true);
    });

    it('bar の position 省略・不正値・重複を診断する', () => {
        const missing = compile('bar "x" {\n    items = clock\n}');
        expect(missing.diagnostics.some((d) => d.severity === 'error' && d.message.includes('position'))).toBe(true);

        const invalid = compile('bar "x" {\n    position = middle\n}');
        expect(invalid.diagnostics.some((d) => d.severity === 'error' && d.message.includes('position'))).toBe(true);

        const dup = compile('statusbar {\n    modules = clock\n}\n\nbar "x" {\n    position = top\n    items = account\n}');
        expect(dup.bars.top?.items).toEqual(['account']);
        expect(dup.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('複数定義'))).toBe(true);
    });

    it('bar の position = right を受理する', () => {
        const out = compile('bar "r" {\n    position = right\n    items = home, search\n    width = 72px\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.bars.right).toMatchObject({
            kind: 'rice',
            position: 'right',
            style: 'icons',
            items: ['home', 'search'],
            props: { width: '72px' },
        });
    });

    it('右バーの重複はwarning・floatはwarning+強制off', () => {
        const dup = compile('bar "a" {\n    position = right\n    items = home\n    width = 64px\n}\n\nbar "b" {\n    position = right\n    items = search\n    width = 64px\n}');
        expect(dup.bars.right?.items).toEqual(['search']);
        expect(dup.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('複数定義'))).toBe(true);

        const float = compile('bar "r" {\n    position = right\n    items = home\n    float = true\n    width = 64px\n}');
        expect(float.bars.right?.float).toBe(false);
        expect(float.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('float'))).toBe(true);
    });

    it('layout セクションで align をコンパイルする', () => {
        const out = compile('layout {\n    align = center\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.layout).toEqual({ align: 'center' });
    });

    it('layout の不正な align は error・未知キーは warning', () => {
        const invalid = compile('layout {\n    align = middle\n}');
        expect(invalid.diagnostics.some((d) => d.severity === 'error' && d.message.includes('align'))).toBe(true);

        const unknown = compile('layout {\n    align = right\n    gap = 8px\n}');
        expect(unknown.layout).toEqual({ align: 'right' });
        expect(unknown.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('gap'))).toBe(true);
    });

    it('focus セクションで outline / dim / outlineWidth をコンパイルする', () => {
        const out = compile('focus {\n    outline = 3px solid #7aa2f7\n    dim = 0.85\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.focus).toEqual({ outline: '3px solid #7aa2f7', outlineWidth: '3px', dim: '0.85' });
    });

    it('focus の dim は 0<dim<=1 の数値のみ受理する', () => {
        for (const bad of ['0', '1.5', '-0.2', 'abc']) {
            const out = compile(`focus {\n    dim = ${bad}\n}`);
            expect(out.diagnostics.some((d) => d.severity === 'error' && d.message.includes('dim'))).toBe(true);
            expect(out.focus?.dim).toBeUndefined();
        }
        for (const good of ['1', '0.01']) {
            const out = compile(`focus {\n    dim = ${good}\n}`);
            expect(out.diagnostics).toEqual([]);
            expect(out.focus?.dim).toBe(good);
        }
    });

    it('theme の reset をコンパイルする(既定false・不正値error・後勝ち)', () => {
        expect(compile('').themeReset).toBe(false);
        expect(compile('theme {\n    reset = true\n}').themeReset).toBe(true);
        expect(compile('theme {\n    reset = true\n}\n\ntheme {\n    reset = false\n}').themeReset).toBe(false);

        const bad = compile('theme {\n    reset = maybe\n}');
        expect(bad.diagnostics.some((d) => d.severity === 'error' && d.message.includes('reset'))).toBe(true);
        expect(bad.themeReset).toBe(false);

        const withTokens = compile('theme {\n    reset = true\n    tokens {\n        primary-color = #fff\n    }\n}');
        expect(withTokens.themeReset).toBe(true);
        expect(withTokens.themeTokens['primary-color']).toBe('#fff');
    });

    it('閉じていない括弧を含む値は error(inline style尾切れの遮断)', () => {
        const token = compile('theme {\n    tokens {\n        app-bg-image = radial-gradient(ellipse at top, #000 0%\n    }\n}');
        expect(token.diagnostics.some((d) => d.severity === 'error')).toBe(true);
        expect(token.themeTokens['app-bg-image']).toBeUndefined();

        const prop = compile('bar "l" {\n    position = left\n    items = home\n    background = rgba(0, 0, 0\n}');
        expect(prop.diagnostics.some((d) => d.severity === 'error')).toBe(true);
        expect(prop.bars.left?.props.background).toBeUndefined();

        const balanced = compile('theme {\n    tokens {\n        x = calc(100dvh - var(--a, 0px))\n    }\n}');
        expect(balanced.diagnostics).toEqual([]);
    });

    it('focus の outline に危険文字が含まれると error', () => {
        const out = compile('focus {\n    outline = 2px solid red; color: blue\n}');
        expect(out.diagnostics.some((d) => d.severity === 'error')).toBe(true);
        expect(out.focus?.outline).toBeUndefined();
    });

    it('focus の不明キーは warning・セクション無しは null', () => {
        const out = compile('focus {\n    glow = 4px\n}');
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('glow'))).toBe(true);
        expect(compile('').focus).toBeNull();
    });

    it('animation の bezier 定義を target の curve として解決する(順序非依存・タプル保持)', () => {
        const out = compile('animation {\n    panel = 180ms, smooth\n    bezier = smooth, 0.2, 0, 0, 1\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.animations?.targets.panel).toEqual({ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)', bezier: [0.2, 0, 0, 1] });
    });

    it('animation の bezier 不正(引数不足/非数値/x範囲外)は error', () => {
        for (const bad of ['bezier = smooth, 0.2, 0', 'bezier = smooth, a, 0, 0, 1', 'bezier = smooth, 2, 0, 0, 1']) {
            const out = compile(`animation {\n    ${bad}\n}`);
            expect(out.diagnostics.some((d) => d.severity === 'error' && d.message.includes('bezier'))).toBe(true);
        }
    });

    it('animation の duration 3形式を受理しゴミは error', () => {
        const out = compile('animation {\n    panel = 250ms\n    menu = 0.25s, ease-out\n    modal = 250\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.animations?.targets.panel?.duration).toBe(250);
        expect(out.animations?.targets.menu).toEqual({ duration: 250, easing: 'ease-out' });
        expect(out.animations?.targets.modal?.duration).toBe(250);

        const bad = compile('animation {\n    panel = fast\n}');
        expect(bad.diagnostics.some((d) => d.severity === 'error' && d.message.includes('duration'))).toBe(true);
    });

    it('animation の不明 curve は error(既知名を列挙)', () => {
        const out = compile('animation {\n    panel = 250ms, bouncy\n}');
        expect(out.diagnostics.some((d) => d.severity === 'error' && d.message.includes('bouncy'))).toBe(true);
        expect(out.animations?.targets.panel).toBeUndefined();
    });

    it('animation の target = off は duration 0', () => {
        const out = compile('animation {\n    tooltip = off\n}');
        expect(out.animations?.targets.tooltip?.duration).toBe(0);
    });

    it('animation の enabled=false / 不明キー warning / セクション無し null', () => {
        const off = compile('animation {\n    enabled = false\n    panel = 250ms\n}');
        expect(off.animations?.enabled).toBe(false);
        expect(off.animations?.targets.panel?.duration).toBe(250);

        const unknown = compile('animation {\n    fade = 100ms\n}');
        expect(unknown.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('fade'))).toBe(true);
        expect(compile('').animations).toBeNull();
    });

    it('animation の同 target 再指定は後勝ち', () => {
        const out = compile('animation {\n    panel = 250ms\n}\n\nanimation {\n    panel = 100ms, linear\n}');
        expect(out.animations?.targets.panel).toEqual({ duration: 100, easing: 'linear' });
    });

    it('animation の style: slide のフル形式と順不同', () => {
        const out = compile('animation {\n    panel = 240ms, ease-out, slide left 24px\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.animations?.targets.panel).toEqual({
            duration: 240,
            easing: 'ease-out',
            styles: [{ kind: 'slide', direction: 'left', distance: 24 }],
        });

        const swapped = compile('animation {\n    panel = 240ms, slide left 24px, ease-out\n}');
        expect(swapped.diagnostics).toEqual([]);
        expect(swapped.animations?.targets.panel).toEqual(out.animations?.targets.panel);
    });

    it('animation の style: slide の方向のみ/距離のみ/単位省略', () => {
        const dirOnly = compile('animation {\n    panel = 250ms, slide top\n}');
        expect(dirOnly.animations?.targets.panel?.styles).toEqual([{ kind: 'slide', direction: 'top' }]);

        const distOnly = compile('animation {\n    panel = 250ms, slide 24\n}');
        expect(distOnly.diagnostics).toEqual([]);
        expect(distOnly.animations?.targets.panel?.styles).toEqual([{ kind: 'slide', distance: 24 }]);
    });

    it('animation の style: popin の既定95%とパーセント指定・範囲外 error', () => {
        const bare = compile('animation {\n    menu = 200ms, popin\n}');
        expect(bare.animations?.targets.menu).toEqual({ duration: 200, easing: 'ease', styles: [{ kind: 'popin', scale: 0.95 }] });

        const percent = compile('animation {\n    menu = 200ms, popin 80%\n}');
        expect(percent.animations?.targets.menu?.styles).toEqual([{ kind: 'popin', scale: 0.8 }]);

        for (const bad of ['popin 0%', 'popin 150%', 'popin x']) {
            const out = compile(`animation {\n    menu = 200ms, ${bad}\n}`);
            expect(out.diagnostics.some((d) => d.severity === 'error')).toBe(true);
            expect(out.animations?.targets.menu).toBeUndefined();
        }
    });

    it('animation の style: fade は引数を取らない', () => {
        const out = compile('animation {\n    modal = 250ms, fade\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.animations?.targets.modal?.styles).toEqual([{ kind: 'fade' }]);

        const bad = compile('animation {\n    modal = 250ms, fade fast\n}');
        expect(bad.diagnostics.some((d) => d.severity === 'error' && d.message.includes('fade'))).toBe(true);
    });

    it('animation の style: blur の既定8pxと半径指定・不正は error', () => {
        const bare = compile('animation {\n    panel = 250ms, blur\n}');
        expect(bare.diagnostics).toEqual([]);
        expect(bare.animations?.targets.panel?.styles).toEqual([{ kind: 'blur' }]);

        const radius = compile('animation {\n    panel = 250ms, blur 6px\n}');
        expect(radius.animations?.targets.panel?.styles).toEqual([{ kind: 'blur', radius: 6 }]);

        for (const bad of ['blur x', 'blur 4 8']) {
            const out = compile(`animation {\n    panel = 250ms, ${bad}\n}`);
            expect(out.diagnostics.some((d) => d.severity === 'error' && d.message.includes('blur'))).toBe(true);
            expect(out.animations?.targets.panel).toBeUndefined();
        }
    });

    it('animation の style 合成: 複数フィールドを配列で保持し同種は error', () => {
        const out = compile('animation {\n    panel = 300ms, bounce, slide right 24px, popin 90%, blur 6px\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.animations?.targets.panel).toEqual({
            duration: 300,
            easing: 'ease-out',
            easingFn: 'bounce',
            styles: [
                { kind: 'slide', direction: 'right', distance: 24 },
                { kind: 'popin', scale: 0.9 },
                { kind: 'blur', radius: 6 },
            ],
        });

        const dup = compile('animation {\n    panel = 250ms, slide left, slide right\n}');
        expect(dup.diagnostics.some((d) => d.severity === 'error' && d.message.includes('slide'))).toBe(true);
        expect(dup.animations?.targets.panel).toBeUndefined();
    });

    it('animation の JS easing キーワードは easing を CSS 近似に保ち easingFn を持つ', () => {
        for (const keyword of ['bounce', 'elastic', 'back']) {
            const out = compile(`animation {\n    panel = 250ms, ${keyword}\n}`);
            expect(out.diagnostics).toEqual([]);
            expect(out.animations?.targets.panel).toEqual({ duration: 250, easing: 'ease-out', easingFn: keyword });
        }
    });

    it('animation の style: slide の不正トークン/方向重複は error', () => {
        for (const bad of ['slide diagonal', 'slide left right', 'slide 10 20']) {
            const out = compile(`animation {\n    panel = 250ms, ${bad}\n}`);
            expect(out.diagnostics.some((d) => d.severity === 'error')).toBe(true);
            expect(out.animations?.targets.panel).toBeUndefined();
        }
    });

    it('animation の curve / 同種 style の重複と余剰トークンは error', () => {
        const dupStyle = compile('animation {\n    panel = 250ms, fade, fade\n}');
        expect(dupStyle.diagnostics.some((d) => d.severity === 'error' && d.message.includes('fade'))).toBe(true);

        const dupCurve = compile('animation {\n    panel = 250ms, ease, linear\n}');
        expect(dupCurve.diagnostics.some((d) => d.severity === 'error' && d.message.includes('curve'))).toBe(true);

        const extra = compile('animation {\n    panel = 250ms, ease-out now\n}');
        expect(extra.diagnostics.some((d) => d.severity === 'error' && d.message.includes('curve'))).toBe(true);

        const empty = compile('animation {\n    panel = 250ms,\n}');
        expect(empty.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    });

    it('animation の style 非対応 target は warning で style のみ落ちる', () => {
        const out = compile('animation {\n    hover = 100ms, fade\n}');
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('hover'))).toBe(true);
        expect(out.animations?.targets.hover).toEqual({ duration: 100, easing: 'ease' });
    });

    it('panel の dim は 0 より大きく 1 以下を検証する', () => {
        expect(compile('panel {\n    dim = 0.3\n}').panel?.dim).toBe('0.3');
        expect(compile('panel {\n    position = left\n}').panel?.dim).toBeUndefined();

        for (const bad of ['dim = 0', 'dim = 1.5', 'dim = x']) {
            const out = compile(`panel {\n    ${bad}\n}`);
            expect(out.diagnostics.some((d) => d.severity === 'error' && d.message.includes('dim'))).toBe(true);
            expect(out.panel?.dim).toBeUndefined();
        }
    });

    it('panel の position は auto / anchor / left / right / center を受理し side は left の別名・既定は auto', () => {
        expect(compile('panel {\n    position = right\n}').panel?.position).toBe('right');
        expect(compile('panel {\n    position = left\n}').panel?.position).toBe('left');
        expect(compile('panel {\n    position = side\n}').panel?.position).toBe('left');
        expect(compile('panel {\n    position = anchor\n}').panel?.position).toBe('anchor');
        expect(compile('panel {\n    position = auto\n}').panel?.position).toBe('auto');
        expect(compile('panel {\n    width = 300px\n}').panel?.position).toBe('auto');

        const bad = compile('panel {\n    position = up\n}');
        expect(bad.diagnostics.some((d) => d.severity === 'error' && d.message.includes('position'))).toBe(true);
        expect(bad.panel?.position).toBe('auto');
    });

    it('animation の bezier 名に style キーワードは予約 error', () => {
        const out = compile('animation {\n    bezier = slide, 0.2, 0, 0, 1\n    panel = 250ms, slide left\n}');
        expect(out.diagnostics.some((d) => d.severity === 'error' && d.message.includes('slide'))).toBe(true);
        expect(out.animations?.targets.panel?.styles).toEqual([{ kind: 'slide', direction: 'left' }]);
    });

    it('bar(left) と sidebar の競合は bar が勝つ', () => {
        const out = compile('bar "l" {\n    position = left\n    items = home\n}\n\nsidebar {\n    items = search\n}');
        expect(out.bars.left?.kind).toBe('rice');
        expect(out.bars.left?.items).toEqual(['home']);
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('競合'))).toBe(true);
    });

    it('statusbar の危険な値と未知キーを診断する', () => {
        const out = compile('statusbar {\n    modules = clock\n    background = red; padding: 0\n    unknownKey = 1\n}');
        expect(out.bars.top?.props.background).toBeUndefined();
        expect(out.diagnostics.some((d) => d.severity === 'error')).toBe(true);
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('unknownKey'))).toBe(true);
    });

    it('bind セクションをコンパイルする(数字キー・+付きキー対応)', () => {
        const out = compile('bind {\n    ctrl+k = palette.toggle\n    mod+shift+l = orbit.toggle\n    alt+1 = column.focus 1\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.binds).toEqual([
            { combo: 'ctrl+k', command: 'palette.toggle' },
            { combo: 'mod+shift+l', command: 'orbit.toggle' },
            { combo: 'alt+1', command: 'column.focus 1' },
        ]);
    });

    it('不正なキーコンボは診断エラーになる', () => {
        const out = compile('bind {\n    ctrl+k+j = palette.toggle\n}');
        expect(out.binds).toEqual([]);
        expect(out.diagnostics.some((d) => d.severity === 'error' && d.message.includes('ctrl+k+j'))).toBe(true);
    });

    it('panel セクションをコンパイルする', () => {
        const out = compile('panel {\n    position = anchor\n    width = 420px\n    blur = 8px\n    offset = 16px\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.panel).toEqual({
            position: 'anchor',
            props: { width: '420px', blur: '8px', offset: '16px' },
        });
    });

    it('panel の不正な position と未知キーを診断する', () => {
        const out = compile('panel {\n    position = floating\n    unknown = 1\n}');
        expect(out.panel?.position).toBe('auto');
        expect(out.diagnostics.some((d) => d.severity === 'error' && d.message.includes('position'))).toBe(true);
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('unknown'))).toBe(true);
    });

    it('sidebar セクションをコンパイルする', () => {
        const out = compile('sidebar {\n    items = workspace, my-item\n    width = 72px\n    publish-button = false\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.bars.left).toMatchObject({
            kind: 'native',
            position: 'left',
            items: ['workspace', 'my-item'],
            props: { width: '72px' },
            showPublish: false,
            showAdd: true,
            showSettings: true,
        });
    });

    it('sidebar 未記述時は bars.left なし(localStorage フォールバック用)', () => {
        expect(compile('theme {\n}').bars.left).toBeUndefined();
    });

    it('sidebar の未知キーは警告になる', () => {
        const out = compile('sidebar {\n    unknown = 1\n}');
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('unknown'))).toBe(true);
    });

    it('enable = false でモジュールを無効化できる', () => {
        const out = compile('module "clock" {\n    enable = false\n}');
        expect(out.modules['clock'].enable).toBe(false);
    });

    it('source を展開し、変数を跨いで解決する', () => {
        const sources: Record<string, string> = {
            'preset:vars': '$accent = blue',
        };
        const out = compile('source = preset:vars\ntheme {\n    tokens {\n        primary-color = $accent\n    }\n}', (ref) => sources[ref]);
        expect(out.diagnostics).toEqual([]);
        expect(out.themeTokens['primary-color']).toBe('blue');
    });

    it('見つからない source と循環 source を報告する', () => {
        const missing = compile('source = preset:nope', () => undefined);
        expect(missing.diagnostics.some((d) => d.message.includes('見つかりません'))).toBe(true);

        const cyclic = compile('source = a', (ref) => (ref === 'a' ? 'source = a' : undefined));
        expect(cyclic.diagnostics.some((d) => d.message.includes('循環'))).toBe(true);
    });

    it('後の columnrule が後に評価される(後勝ちの前提)', () => {
        const out = compile('columnrule {\n    match = type:default\n    opacity = 0.5\n}\ncolumnrule {\n    match = type:default\n    opacity = 0.9\n}');
        expect(out.columnRules.map((r) => r.props.opacity)).toEqual(['0.5', '0.9']);
    });
});

describe('rice config edit (targeted, comment-preserving)', () => {
    it('既存キーの値だけを置換し、コメント・整形を保持する', () => {
        const next = setValueInText(SAMPLE, [{ name: 'module', label: 'clock' }], 'format', 'HH:mm:ss');
        expect(next).toContain('format = HH:mm:ss');
        expect(next).toContain('# my rice');
        expect(next.split('\n').length).toBe(SAMPLE.split('\n').length);
        expect(getValueInText(next, [{ name: 'module', label: 'clock' }], 'format')).toBe('HH:mm:ss');
    });

    it('ネストしたセクションの値を置換できる', () => {
        const next = setValueInText(SAMPLE, [{ name: 'theme' }, { name: 'tokens' }], 'deck-border-radius', '8px');
        expect(getValueInText(next, [{ name: 'theme' }, { name: 'tokens' }], 'deck-border-radius')).toBe('8px');
        expect(next).toContain('primary-color = $accent');
    });

    it('キーが無ければセクション末尾に挿入する', () => {
        const next = setValueInText(SAMPLE, [{ name: 'statusbar' }], 'height', '32px');
        expect(getValueInText(next, [{ name: 'statusbar' }], 'height')).toBe('32px');
        const compiled = compile(next);
        expect(compiled.bars.top?.position).toBe('top');
    });

    it('セクションが無ければ末尾にブロックを生成する', () => {
        const next = setValueInText('# empty\n', [{ name: 'module', label: 'aurora' }], 'enable', 'true');
        expect(getValueInText(next, [{ name: 'module', label: 'aurora' }], 'enable')).toBe('true');
        expect(next).toContain('# empty');
        expect(compile(next).modules['aurora']?.enable).toBe(true);
    });

    it('親セクションだけ存在する場合は親の中に子ブロックを生成する', () => {
        const text = 'theme {\n}\n';
        const next = setValueInText(text, [{ name: 'theme' }, { name: 'tokens' }], 'a', '1');
        expect(getValueInText(next, [{ name: 'theme' }, { name: 'tokens' }], 'a')).toBe('1');
        expect(compile(next).themeTokens['a']).toBe('1');
    });

    it('編集→パース→編集のラウンドトリップが安定している', () => {
        let text = SAMPLE;
        text = setValueInText(text, [{ name: 'module', label: 'clock' }], 'enable', 'false');
        text = setValueInText(text, [{ name: 'module', label: 'clock' }], 'enable', 'true');
        expect(text).toBe(SAMPLE);
    });
});

describe('rice config bar items (per-item / group / instance)', () => {
    it('item ブロックで per-item オプションが itemSpecs に載る', () => {
        const out = compile('bar "r" {\n    position = right\n    style = menu\n    width = 320px\n    items = search, trends\n    item "search" {\n        placeholder = 探す\n    }\n}');
        expect(out.bars.right?.items).toEqual(['search', 'trends']);
        expect(out.bars.right?.itemSpecs).toEqual([
            { id: 'search', base: 'search', options: { placeholder: '探す' } },
            { id: 'trends', base: 'trends', options: {} },
        ]);
        expect(out.bars.right?.groups).toBeNull();
        expect(out.diagnostics).toEqual([]);
    });

    it('# サフィックスで base とインスタンスを分離する', () => {
        const out = compile('bar "r" {\n    position = right\n    width = 64px\n    items = clock#1, clock#2\n    item "clock#2" {\n        date = true\n    }\n}');
        expect(out.bars.right?.itemSpecs).toEqual([
            { id: 'clock#1', base: 'clock', options: {} },
            { id: 'clock#2', base: 'clock', options: { date: 'true' } },
        ]);
    });

    it('group で start/center/end に分かれ items は連結フラットビューになる', () => {
        const out = compile('bar "t" {\n    position = top\n    group "start" {\n        items = workspace\n    }\n    group "center" {\n        items = clock\n    }\n    group "end" {\n        items = notifications, chat\n    }\n}');
        expect(out.bars.top?.groups?.map((g) => g.name)).toEqual(['start', 'center', 'end']);
        expect(out.bars.top?.items).toEqual(['workspace', 'clock', 'notifications', 'chat']);
        expect(out.bars.top?.itemSpecs?.length).toBe(4);
        expect(out.diagnostics).toEqual([]);
    });

    it('group の別名 left/top→start・right/bottom→end を受理する', () => {
        const out = compile('bar "t" {\n    position = top\n    group "left" {\n        items = home\n    }\n    group "right" {\n        items = settings\n    }\n}');
        expect(out.bars.top?.groups?.map((g) => g.name)).toEqual(['start', 'end']);
        expect(out.diagnostics).toEqual([]);
    });

    it('不明な group 名・ラベル無し group / item は error', () => {
        const bad = compile('bar "t" {\n    position = top\n    group "middle" {\n        items = home\n    }\n}');
        expect(bad.diagnostics.some((d) => d.severity === 'error' && d.message.includes('middle'))).toBe(true);

        const unlabeledGroup = compile('bar "t" {\n    position = top\n    group {\n        items = home\n    }\n}');
        expect(unlabeledGroup.diagnostics.some((d) => d.severity === 'error' && d.message.includes('group には名前'))).toBe(true);

        const unlabeledItem = compile('bar "t" {\n    position = top\n    items = home\n    item {\n        a = 1\n    }\n}');
        expect(unlabeledItem.diagnostics.some((d) => d.severity === 'error' && d.message.includes('item にはラベル'))).toBe(true);
    });

    it('items と group の併用は warning で group が優先される', () => {
        const out = compile('bar "t" {\n    position = top\n    items = home, search\n    group "start" {\n        items = clock\n    }\n}');
        expect(out.bars.top?.items).toEqual(['clock']);
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('併用'))).toBe(true);
    });

    it('未参照の item ブロックは warning', () => {
        const out = compile('bar "t" {\n    position = top\n    items = home\n    item "search" {\n        placeholder = x\n    }\n}');
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('含まれていません'))).toBe(true);
    });

    it('同名 group は後勝ち warning', () => {
        const out = compile('bar "t" {\n    position = top\n    group "start" {\n        items = home\n    }\n    group "start" {\n        items = clock\n    }\n}');
        expect(out.bars.top?.items).toEqual(['clock']);
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('複数定義'))).toBe(true);
    });

    it('group 内の item ブロックも options として拾う', () => {
        const out = compile('bar "t" {\n    position = top\n    group "start" {\n        items = clock\n        item "clock" {\n            seconds = true\n        }\n    }\n}');
        expect(out.bars.top?.itemSpecs?.[0]).toEqual({ id: 'clock', base: 'clock', options: { seconds: 'true' } });
        expect(out.diagnostics).toEqual([]);
    });

    it('group の未知キーと bar 内未知セクションは warning', () => {
        const out = compile('bar "t" {\n    position = top\n    group "start" {\n        items = home\n        width = 100px\n    }\n    widget "x" {\n        a = 1\n    }\n}');
        expect(out.diagnostics.filter((d) => d.severity === 'warning').length).toBe(2);
        expect(out.diagnostics.some((d) => d.message.includes('group のキー'))).toBe(true);
        expect(out.diagnostics.some((d) => d.message.includes('bar 内のセクション'))).toBe(true);
    });

    it('statusbar でも item / group / modules 併用が同様に動く', () => {
        const out = compile('statusbar {\n    position = top\n    modules = clock\n    item "clock" {\n        seconds = true\n    }\n}');
        expect(out.bars.top?.itemSpecs).toEqual([{ id: 'clock', base: 'clock', options: { seconds: 'true' } }]);

        const grouped = compile('statusbar {\n    position = top\n    group "center" {\n        items = clock\n    }\n}');
        expect(grouped.bars.top?.groups?.[0]?.name).toBe('center');
        expect(grouped.bars.top?.items).toEqual(['clock']);
    });

    it('横バーへの widget-only id は warning（縦バーは警告なし）', () => {
        const horizontal = compile('statusbar {\n    position = top\n    modules = clock, trends\n}');
        expect(horizontal.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('trends') && d.message.includes('縦バー'))).toBe(true);

        const vertical = compile('bar "r" {\n    position = right\n    width = 320px\n    items = trends, calendar\n}');
        expect(vertical.diagnostics).toEqual([]);

        const searchOk = compile('statusbar {\n    position = top\n    modules = search\n}');
        expect(searchOk.diagnostics).toEqual([]);
    });

    it('新構文を使わないレガシー config はビット同一（itemSpecs は 1:1・groups は null）', () => {
        const legacy = 'bar "left" {\n    position = left\n    style = menu\n    items = account, home, spacer, publish\n    width = 220px\n}\n\nstatusbar {\n    position = top\n    modules = workspace, spacer, clock\n}\n';
        const out = compile(legacy);
        expect(out.diagnostics).toEqual([]);
        expect(out.bars.left?.items).toEqual(['account', 'home', 'spacer', 'publish']);
        expect(out.bars.left?.groups).toBeNull();
        expect(out.bars.left?.itemSpecs).toEqual([
            { id: 'account', base: 'account', options: {} },
            { id: 'home', base: 'home', options: {} },
            { id: 'spacer', base: 'spacer', options: {} },
            { id: 'publish', base: 'publish', options: {} },
        ]);
        expect(out.bars.top?.items).toEqual(['workspace', 'spacer', 'clock']);
        expect(out.bars.top?.itemSpecs?.every((s) => s.id === s.base && Object.keys(s.options).length === 0)).toBe(true);

        const noItems = compile('bar "l" {\n    position = left\n    width = 64px\n}');
        expect(noItems.bars.left?.items).toBeNull();
        expect(noItems.bars.left?.itemSpecs).toBeNull();
    });
});

describe('rice presets', () => {
    it('全ビルトインプリセットが診断ゼロでコンパイルされる', async () => {
        const { ricePresets, resolvePresetSource } = await import('../presets');
        for (const name of Object.keys(ricePresets)) {
            const out = compile(`source = preset:${name}\n`, resolvePresetSource);
            expect(out.diagnostics, `preset:${name}`).toEqual([]);
        }
    });

    it('cyberdeck は theme reset・両バー・グループ statusbar・focus・bind を持つ', async () => {
        const { resolvePresetSource } = await import('../presets');
        const out = compile('source = preset:cyberdeck\n', resolvePresetSource);
        expect(out.themeReset).toBe(true);
        expect(out.bars.left?.style).toBe('icons');
        expect(out.bars.right?.tabSets?.map((t) => t.label)).toEqual(['SYSTEM', 'CONSOLE']);
        expect(out.bars.right?.tabSets?.[0]?.items?.find((s) => s.id === 'column#clock')?.options.type).toBe('module:clock');
        expect(out.bars.top?.groups?.map((g) => g.name)).toEqual(['start', 'center', 'end']);
        expect(out.focus?.outline).toContain('#00e5ff');
        expect(out.binds.length).toBe(8);
        expect(out.submaps['resize']?.length).toBe(6);
        expect(out.columnRules.some((r) => r.props.reactions === 'left 28px')).toBe(true);
        expect(out.columnRules.some((r) => r.props.heading === 'hidden')).toBe(true);
        expect(out.modules['aurora']?.enable).toBe(true);
    });
});

describe('columnrule reactions', () => {
    it('spread / left [gap] を受理し不正値を error にする', () => {
        const ok = compile('columnrule {\n    match = type:default\n    reactions = left 28px\n}');
        expect(ok.diagnostics).toEqual([]);
        expect(ok.columnRules[0].props.reactions).toBe('left 28px');

        const plain = compile('columnrule {\n    match = type:default\n    reactions = spread\n}');
        expect(plain.diagnostics).toEqual([]);
        expect(plain.columnRules[0].props.reactions).toBe('spread');

        const badMode = compile('columnrule {\n    match = type:default\n    reactions = center\n}');
        expect(badMode.diagnostics.some((d) => d.severity === 'error' && d.message.includes('reactions'))).toBe(true);
        expect(badMode.columnRules[0].props.reactions).toBeUndefined();

        const badGap = compile('columnrule {\n    match = type:default\n    reactions = left 28\n}');
        expect(badGap.diagnostics.some((d) => d.severity === 'error' && d.message.includes('gap'))).toBe(true);

        const spreadArg = compile('columnrule {\n    match = type:default\n    reactions = spread 10px\n}');
        expect(spreadArg.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    });
});

describe('columnrule heading / titlebar', () => {
    it('enum を検証する', () => {
        const ok = compile('columnrule {\n    match = type:publish\n    heading = hidden\n    titlebar = hover\n}');
        expect(ok.diagnostics).toEqual([]);
        expect(ok.columnRules[0].props).toEqual({ heading: 'hidden', titlebar: 'hover' });

        const badHeading = compile('columnrule {\n    match = type:publish\n    heading = auto\n}');
        expect(badHeading.diagnostics.some((d) => d.severity === 'error' && d.message.includes('heading'))).toBe(true);

        const badTitlebar = compile('columnrule {\n    match = type:publish\n    titlebar = hidden\n}');
        expect(badTitlebar.diagnostics.some((d) => d.severity === 'error' && d.message.includes('titlebar'))).toBe(true);
    });
});

describe('rice config bar tabs', () => {
    it('tab セクションが tabSets にコンパイルされ items 正典に連結される', () => {
        const out = compile('bar "r" {\n    position = right\n    style = menu\n    width = 320px\n    items = search, tabs, spacer\n    tab "Feeds" {\n        items = feeds\n    }\n    tab "Info" {\n        items = calendar, column#clock\n        item "column#clock" {\n            type = module:clock\n        }\n    }\n}\n\nmodule "search" {\n    enable = true\n}\n\nmodule "feeds" {\n    enable = true\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.bars.right?.tabSets?.map((t) => t.label)).toEqual(['Feeds', 'Info']);
        expect(out.bars.right?.tabSets?.[1]?.items?.[1]).toEqual({ id: 'column#clock', base: 'column', options: { type: 'module:clock' } });
        expect(out.bars.right?.items).toEqual(['search', 'tabs', 'spacer', 'feeds', 'calendar', 'column#clock']);
        expect(out.bars.right?.itemSpecs?.map((s) => s.id)).toEqual(['search', 'tabs', 'spacer']);
    });

    it('tab の診断: ラベル無し・未参照・tab無し参照・横バー・入れ子', () => {
        const noLabel = compile('bar "r" {\n    position = right\n    width = 64px\n    items = tabs\n    tab {\n        items = home\n    }\n}');
        expect(noLabel.diagnostics.some((d) => d.severity === 'error' && d.message.includes('tab にはラベル'))).toBe(true);

        const unreferenced = compile('bar "r" {\n    position = right\n    width = 64px\n    items = home\n    tab "A" {\n        items = calendar\n    }\n}');
        expect(unreferenced.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('tabs が含まれていません'))).toBe(true);

        const noTabs = compile('bar "r" {\n    position = right\n    width = 64px\n    items = tabs\n}');
        expect(noTabs.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('tab セクションがありません'))).toBe(true);

        const horizontal = compile('statusbar {\n    position = top\n    modules = clock, tabs\n    tab "A" {\n        items = workspace\n    }\n}');
        expect(horizontal.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('横バー'))).toBe(true);

        const nested = compile('bar "r" {\n    position = right\n    width = 64px\n    items = tabs\n    tab "A" {\n        items = home, tabs\n    }\n}');
        expect(nested.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('入れ子'))).toBe(true);
        expect(nested.bars.right?.tabSets?.[0]?.items?.map((s) => s.id)).toEqual(['home']);
    });

    it('tab を使わないレガシー config は tabSets が null のまま', () => {
        const out = compile('bar "r" {\n    position = right\n    width = 64px\n    items = home\n}');
        expect(out.bars.right?.tabSets).toBeNull();
        expect(out.bars.right?.items).toEqual(['home']);
    });
});

describe('columnrule match = all', () => {
    it('all は全カラムマッチ(空 match)にコンパイルされ、併用は error', () => {
        const out = compile('columnrule {\n    match = all\n    reactions = left\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.columnRules[0].match).toEqual({});

        const mixed = compile('columnrule {\n    match = all type:default\n    opacity = 0.9\n}');
        expect(mixed.diagnostics.some((d) => d.severity === 'error' && d.message.includes('併用'))).toBe(true);
        expect(mixed.columnRules).toHaveLength(0);
    });
});

describe('columnrule width / dim / background 系', () => {
    it('width の preset/px を受理し不正値は error', () => {
        const ok = compile('columnrule {\n    match = all\n    width = large\n    background = #101010\n    dim = 0.6\n    padding = 12px\n    heading-bg = #202020\n}');
        expect(ok.diagnostics).toEqual([]);
        expect(ok.columnRules[0].props).toEqual({ width: 'large', background: '#101010', dim: '0.6', padding: '12px', 'heading-bg': '#202020' });

        const badWidth = compile('columnrule {\n    match = all\n    width = 50vw\n}');
        expect(badWidth.diagnostics.some((d) => d.severity === 'error' && d.message.includes('width'))).toBe(true);

        const badDim = compile('columnrule {\n    match = all\n    dim = 1.5\n}');
        expect(badDim.diagnostics.some((d) => d.severity === 'error' && d.message.includes('dim'))).toBe(true);

        const zeroDim = compile('columnrule {\n    match = all\n    dim = 0\n}');
        expect(zeroDim.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    });
});

describe('rice config submap', () => {
    it('submap がコンパイルされ同名は連結される', () => {
        const out = compile('submap "resize" {\n    h = column.width -50\n    l = column.width +50\n}\n\nsubmap "resize" {\n    j = column.focus next\n}\n\nbind {\n    mod+r = submap.enter resize\n}');
        expect(out.diagnostics).toEqual([]);
        expect(out.submaps['resize']).toEqual([
            { combo: 'h', command: 'column.width -50' },
            { combo: 'l', command: 'column.width +50' },
            { combo: 'j', command: 'column.focus next' },
        ]);
    });

    it('ラベル無し error・esc バインド warning・未定義 submap 参照 warning', () => {
        const noLabel = compile('submap {\n    h = column.width -50\n}');
        expect(noLabel.diagnostics.some((d) => d.severity === 'error' && d.message.includes('ラベル'))).toBe(true);

        const escBind = compile('submap "x" {\n    esc = submap.exit\n    h = column.width -50\n}');
        expect(escBind.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('esc'))).toBe(true);
        expect(escBind.submaps['x']).toEqual([{ combo: 'h', command: 'column.width -50' }]);

        const undefinedRef = compile('bind {\n    mod+r = submap.enter nope\n}');
        expect(undefinedRef.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('nope'))).toBe(true);
    });
});

describe('media', () => {
    const mobileTokens = 'media "mobile" {\n    theme {\n        tokens {\n            deck-border-radius = 4px\n        }\n    }\n}\n';

    it('ラベルなしは error になる', () => {
        const out = compile('media {\n    theme {\n        tokens {\n            deck-border-radius = 4px\n        }\n    }\n}\n');
        expect(out.diagnostics.some((d) => d.severity === 'error' && d.message.includes('条件が必要'))).toBe(true);
        expect(out.mediaQueries).toEqual([]);
    });

    it('isActive が true なら子セクションが適用され mediaQueries に登録される', () => {
        const out = compile(mobileTokens, undefined, () => true);
        expect(out.themeTokens['deck-border-radius']).toBe('4px');
        expect(out.mediaQueries).toEqual(['(max-width: 767px)']);
        expect(out.diagnostics).toEqual([]);
    });

    it('isActive 省略時は非適用だが mediaQueries には登録され診断もゼロ', () => {
        const out = compile(mobileTokens);
        expect(out.themeTokens['deck-border-radius']).toBeUndefined();
        expect(out.mediaQueries).toEqual(['(max-width: 767px)']);
        expect(out.diagnostics).toEqual([]);
    });

    it('アクティブな media は文書順の後勝ちでベースを上書きする', () => {
        const base = 'theme {\n    tokens {\n        deck-border-radius = 20px\n    }\n}\n';
        const after = compile(base + mobileTokens, undefined, () => true);
        expect(after.themeTokens['deck-border-radius']).toBe('4px');
        const before = compile(mobileTokens + base, undefined, () => true);
        expect(before.themeTokens['deck-border-radius']).toBe('20px');
    });

    it('非アクティブ枝の診断は出るが実出力へは漏れない', () => {
        const out = compile('media "mobile" {\n    columnrule {\n        opacity = 0.5\n    }\n    bar "left" {\n        position = left\n    }\n    module "clock" {\n        enable = true\n    }\n}\n');
        expect(out.diagnostics.some((d) => d.severity === 'error' && d.message.includes('match がありません'))).toBe(true);
        expect(out.columnRules).toEqual([]);
        expect(out.bars).toEqual({});
        expect(out.modules).toEqual({});
    });

    it('media のネストは error になる', () => {
        const out = compile('media "mobile" {\n    media "desktop" {\n        theme {\n            tokens {\n                primary-color = red\n            }\n        }\n    }\n}\n', undefined, () => true);
        expect(out.diagnostics.some((d) => d.severity === 'error' && d.message.includes('ネスト'))).toBe(true);
        expect(out.themeTokens['primary-color']).toBeUndefined();
    });

    it('media 直下のキーは error になる', () => {
        const out = compile('media "mobile" {\n    foo = bar\n}\n', undefined, () => true);
        expect(out.diagnostics.some((d) => d.severity === 'error' && d.message.includes('media 直下'))).toBe(true);
    });

    it('条件ラベルが正規化される（ラップ / raw / キーワード / エイリアス）', () => {
        const queries = (label: string) => compile(`media "${label}" {\n    layout {\n        align = center\n    }\n}\n`).mediaQueries;
        expect(queries('max-width: 500px')).toEqual(['(max-width: 500px)']);
        expect(queries('(min-width: 500px) and (max-width: 900px)')).toEqual(['(min-width: 500px) and (max-width: 900px)']);
        expect(queries('print')).toEqual(['print']);
        expect(queries('desktop')).toEqual(['(min-width: 768px)']);
    });

    it('同一クエリは dedup され isActive は正規化後の文字列で呼ばれる', () => {
        const seen: string[] = [];
        const out = compile('media "mobile" {\n    layout {\n        align = center\n    }\n}\nmedia "max-width: 767px" {\n    layout {\n        align = right\n    }\n}\n', undefined, (q) => {
            seen.push(q);
            return false;
        });
        expect(out.mediaQueries).toEqual(['(max-width: 767px)']);
        expect(seen).toEqual(['(max-width: 767px)', '(max-width: 767px)']);
    });

    it('media 内の set はパーサが拒否する', () => {
        const out = compile('media "mobile" {\n    set design.skin = ochame\n}\n', undefined, () => true);
        expect(out.diagnostics.some((d) => d.severity === 'error' && d.message.includes('トップレベル'))).toBe(true);
        expect(out.sets).toEqual([]);
    });

    it('アクティブな media によるバー上書きは複数定義 warning を出さない', () => {
        const barPair = 'bar "main" {\n    position = left\n    width = 64px\n}\nmedia "mobile" {\n    bar "main" {\n        position = left\n        width = 200px\n    }\n}\n';
        const active = compile(barPair, undefined, () => true);
        expect(active.diagnostics.some((d) => d.message.includes('複数定義'))).toBe(false);
        expect(active.bars.left?.props.width).toBe('200px');
        const topLevel = compile('bar "a" {\n    position = left\n}\nbar "b" {\n    position = left\n}\n');
        expect(topLevel.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('複数定義'))).toBe(true);
    });

    it('source 経由の media も動作する', () => {
        const sources: Record<string, string> = { frag: 'media "mobile" {\n    theme {\n        tokens {\n            primary-color = tomato\n        }\n    }\n}\n' };
        const out = compile('source = frag\n', (ref) => sources[ref], () => true);
        expect(out.themeTokens['primary-color']).toBe('tomato');
        expect(out.mediaQueries).toEqual(['(max-width: 767px)']);
    });
});

describe('footer section', () => {
    it('itemsとpropsがbars.footerにコンパイルされる', () => {
        const out = compile('footer {\n    items = home, search, menu\n    height = 60px\n    background = #111\n}\n');
        expect(out.bars.footer?.kind).toBe('rice');
        expect(out.bars.footer?.position).toBe('footer');
        expect(out.bars.footer?.style).toBe('icons');
        expect(out.bars.footer?.items).toEqual(['home', 'search', 'menu']);
        expect(out.bars.footer?.props.height).toBe('60px');
        expect(out.diagnostics).toEqual([]);
    });

    it('revealはalways/scrollのみ受理する', () => {
        const ok = compile('footer {\n    items = home\n    reveal = always\n}\n');
        expect(ok.bars.footer?.props.reveal).toBe('always');
        const bad = compile('footer {\n    items = home\n    reveal = hover\n}\n');
        expect(bad.diagnostics.some((d) => d.severity === 'error' && d.message.includes('reveal'))).toBe(true);
        expect(bad.bars.footer?.props.reveal).toBeUndefined();
    });

    it('itemsが無いfooterは割り当てられずwarningになる', () => {
        const out = compile('footer {\n    height = 60px\n}\n');
        expect(out.bars.footer).toBeUndefined();
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('items がありません'))).toBe(true);
    });

    it('groupとper-itemオプションが効く', () => {
        const out = compile('footer {\n    group "start" {\n        items = home\n    }\n    group "end" {\n        items = notifications\n        item "notifications" {\n            hide-zero = false\n        }\n    }\n}\n');
        expect(out.bars.footer?.groups?.map((g) => g.name)).toEqual(['start', 'end']);
        expect(out.bars.footer?.itemSpecs?.find((s) => s.base === 'notifications')?.options['hide-zero']).toBe('false');
        expect(out.diagnostics).toEqual([]);
    });

    it('widgetとtabsはfooterで警告されドロップ相当になる', () => {
        const out = compile('footer {\n    items = home, calendar, tabs\n}\n');
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('calendar'))).toBe(true);
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('tabs は'))).toBe(true);
    });

    it('media "mobile" 内のfooterはアクティブ時のみ割り当たる', () => {
        const text = 'media "mobile" {\n    footer {\n        items = home\n    }\n}\n';
        expect(compile(text, undefined, () => true).bars.footer?.items).toEqual(['home']);
        expect(compile(text).bars.footer).toBeUndefined();
    });

    it('footer二重定義はトップレベルではwarning・media内では抑制', () => {
        const top = compile('footer {\n    items = home\n}\nfooter {\n    items = search\n}\n');
        expect(top.diagnostics.some((d) => d.message.includes('複数定義'))).toBe(true);
        expect(top.bars.footer?.items).toEqual(['search']);
        const viaMedia = compile('footer {\n    items = home\n}\nmedia "mobile" {\n    footer {\n        items = search\n    }\n}\n', undefined, () => true);
        expect(viaMedia.diagnostics.some((d) => d.message.includes('複数定義'))).toBe(false);
        expect(viaMedia.bars.footer?.items).toEqual(['search']);
    });
});

describe('switcher section', () => {
    it('strip既定はtop/scroll/add-button有効', () => {
        const out = compile('switcher {\n    style = strip\n}\n');
        expect(out.switcher).toEqual({ style: 'strip', position: 'top', reveal: 'scroll', showAdd: true, props: {} });
        expect(out.diagnostics).toEqual([]);
    });

    it('pill既定はbottom/auto/add-button無効', () => {
        const out = compile('switcher {\n    style = pill\n}\n');
        expect(out.switcher).toEqual({ style: 'pill', position: 'bottom', reveal: 'auto', showAdd: false, props: {} });
    });

    it('明示キーが既定に勝つ（キー順序非依存）', () => {
        const out = compile('switcher {\n    position = top\n    reveal = scroll\n    style = pill\n    add-button = true\n    rounding = 20px\n}\n');
        expect(out.switcher).toEqual({ style: 'pill', position: 'top', reveal: 'scroll', showAdd: true, props: { rounding: '20px' } });
    });

    it('enum不正はerrorになり後勝ち置換が成立する', () => {
        const bad = compile('switcher {\n    style = bubble\n    reveal = hover\n    position = center\n}\n');
        expect(bad.diagnostics.filter((d) => d.severity === 'error').length).toBe(3);
        expect(bad.switcher?.style).toBe('strip');
        const replaced = compile('switcher {\n    style = pill\n}\nswitcher {\n    style = strip\n}\n');
        expect(replaced.switcher?.style).toBe('strip');
        expect(replaced.switcher?.position).toBe('top');
    });
});

describe('fab section', () => {
    it('既定はshow/right、キーで上書きできる', () => {
        const out = compile('fab {\n    position = left\n    size = 44px\n    rounding = 50%\n    offset = 12px\n}\n');
        expect(out.fab).toEqual({ show: true, position: 'left', props: { size: '44px', rounding: '50%', offset: '12px' } });
        expect(out.diagnostics).toEqual([]);
    });

    it('show = falseとon-clickが取れる', () => {
        const out = compile('fab {\n    show = false\n    on-click = side.toggle workspace\n}\n');
        expect(out.fab?.show).toBe(false);
        expect(out.fab?.onClick).toBe('side.toggle workspace');
    });

    it('position不正はerror', () => {
        const out = compile('fab {\n    position = center\n}\n');
        expect(out.diagnostics.some((d) => d.severity === 'error' && d.message.includes('fab の position'))).toBe(true);
        expect(out.fab?.position).toBe('right');
    });

    it('不明キーはwarning・unsafe値はerror', () => {
        const out = compile('fab {\n    color = red\n}\n');
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('fab のキー'))).toBe(true);
        const unsafe = compile('fab {\n    size = 44px;background:red\n}\n');
        expect(unsafe.diagnostics.some((d) => d.severity === 'error')).toBe(true);
        expect(unsafe.fab?.props.size).toBeUndefined();
    });
});

describe('mobile shell defaults', () => {
    it('空configではfooter/switcher/fabが全て不在', () => {
        const out = compile('');
        expect(out.bars.footer).toBeUndefined();
        expect(out.switcher).toBeNull();
        expect(out.fab).toBeNull();
    });
});

describe('menu item', () => {
    it('footer/bar の items に menu を置いても診断ゼロで itemSpecs に載る', () => {
        const out = compile('footer {\n    items = home, menu\n    item "menu" {\n        items = home, search, settings\n    }\n}\n');
        expect(out.diagnostics).toEqual([]);
        const spec = out.bars.footer?.itemSpecs?.find((s) => s.base === 'menu');
        expect(spec?.options.items).toBe('home, search, settings');
    });
});

describe('drawer section', () => {
    it('itemsとpropsがbars.drawerにコンパイルされstyleはmenu', () => {
        const out = compile('drawer {\n    items = account, separator, home, feeds\n    width = 320px\n    background = #111\n}\n');
        expect(out.bars.drawer?.kind).toBe('rice');
        expect(out.bars.drawer?.style).toBe('menu');
        expect(out.bars.drawer?.items).toEqual(['account', 'separator', 'home', 'feeds']);
        expect(out.bars.drawer?.props.width).toBe('320px');
        expect(out.diagnostics).toEqual([]);
    });

    it('widgetとper-itemオプションが許可される（縦扱い）', () => {
        const out = compile('drawer {\n    items = home, calendar\n    item "calendar" {\n        rounding = 12px\n    }\n}\n');
        expect(out.diagnostics).toEqual([]);
        expect(out.bars.drawer?.itemSpecs?.find((s) => s.base === 'calendar')?.options.rounding).toBe('12px');
    });

    it('itemsが無いdrawerは割り当てられずwarning', () => {
        const out = compile('drawer {\n    width = 320px\n}\n');
        expect(out.bars.drawer).toBeUndefined();
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('items がありません'))).toBe(true);
    });

    it('media "mobile" 内のdrawerはアクティブ時のみ割り当たる', () => {
        const text = 'media "mobile" {\n    drawer {\n        items = home\n    }\n}\n';
        expect(compile(text, undefined, () => true).bars.drawer?.items).toEqual(['home']);
        expect(compile(text).bars.drawer).toBeUndefined();
    });

    it('不明キーはwarning', () => {
        const out = compile('drawer {\n    items = home\n    float = true\n}\n');
        expect(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('drawer のキー'))).toBe(true);
    });
});

describe('animation drawer target', () => {
    it('drawerターゲットがstyle合成込みで受理される', () => {
        const out = compile('animation {\n    drawer = 260ms, slide left 60px, fade\n}\n');
        expect(out.diagnostics).toEqual([]);
        const target = out.animations?.targets['drawer'];
        expect(target?.duration).toBe(260);
        expect(target?.styles?.map((s) => s.kind).sort()).toEqual(['fade', 'slide']);
    });

    it('enabled = falseで全ターゲット0ms化にdrawerも含まれる', () => {
        const out = compile('animation {\n    enabled = false\n}\n');
        expect(out.animations?.enabled).toBe(false);
    });
});
