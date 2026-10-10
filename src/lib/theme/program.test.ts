import { describe, expect, it } from 'vitest';
import { PROGRAM_LIMITS, programOrder, validateProgram, type ProgramPass } from './program';

const pass = (key: string, inputs?: string[], type: ProgramPass['type'] = 'fullscreen'): ProgramPass => ({ key, type, glsl: 'void main() {}', update: 'frame', ...(inputs ? { inputs } : {}) });

function check(program: unknown, images: string[] = []) {
    const errors: string[] = [];
    return { program: validateProgram(program, new Set(images), errors), errors };
}

describe('programOrder', () => {
    it('入力が先に描かれる順に並べる', () => {
        const order = programOrder([pass('c', ['b']), pass('a'), pass('b', ['a'])]);
        expect(order?.map((p) => p.key)).toEqual(['a', 'b', 'c']);
    });

    it('循環していれば null。前のフレームを読む段の自分自身は循環に数えない', () => {
        expect(programOrder([pass('a', ['b']), pass('b', ['a'])])).toBeNull();
        expect(programOrder([pass('t', ['t'], 'feedback')])?.map((p) => p.key)).toEqual(['t']);
    });
});

describe('validateProgram', () => {
    it('段・壁紙・材質・パラメーターを持つプログラムを通す', () => {
        const { program, errors } = check({
            contract: 1,
            animated: true,
            params: [{ key: 'amount', token: '--x-amount', default: 0.5, min: 0, max: 1 }],
            passes: [pass('scene'), { ...pass('trail', ['trail', 'scene', 'image:map'], 'feedback') }, { key: 'dots', type: 'instances', vertex: 'void main() {}', glsl: 'void main() {}', count: 100, update: 'frame' }],
            wallpaper: { glsl: 'vec3 wallpaper(vec2 p, float s) { return vec3(0.); }', inputs: ['trail'] },
        }, ['map']);
        expect(errors).toEqual([]);
        expect(program?.passes?.map((p) => p.key)).toEqual(['scene', 'trail', 'dots']);
    });

    it('解決できない入力・自分以外を読む前のフレームの段・循環を拒む', () => {
        expect(check({ contract: 1, passes: [pass('a', ['missing'])] }).program).toBeUndefined();
        expect(check({ contract: 1, passes: [pass('a', ['a'])] }).program).toBeUndefined();
        expect(check({ contract: 1, passes: [pass('a', ['b']), pass('b', ['a'])] }).program).toBeUndefined();
        expect(check({ contract: 1, wallpaper: { glsl: 'x', inputs: ['image:none'] } }).program).toBeUndefined();
    });

    it('アプリの名前(u で始まる大文字・gl_)と画像のキーと重なる段の名前を拒む', () => {
        expect(check({ contract: 1, passes: [pass('uTime')] }).program).toBeUndefined();
        expect(check({ contract: 1, passes: [pass('gl_x')] }).program).toBeUndefined();
        expect(check({ contract: 1, passes: [pass('map')] }, ['map']).program).toBeUndefined();
    });

    it('頂点の段は頂点シェーダーが必要で、GLSL の合計は上限まで', () => {
        expect(check({ contract: 1, passes: [{ key: 'm', type: 'mesh', glsl: 'void main() {}', update: 'frame' }] }).program).toBeUndefined();
        const big = 'x'.repeat(PROGRAM_LIMITS.source + 1);
        expect(check({ contract: 1, material: { glsl: big } }).errors.some((e) => e.includes('大きすぎる'))).toBe(true);
    });
});

describe('AT Protocol のデータ', () => {
    it('小数は文字列にそろえる(レコードに小数を書けない)。数値で書かれていても受け取る', () => {
        const { program, errors } = check({
            contract: 1,
            params: [{ key: 'a', token: '--a', default: 1.33, min: '0', max: 2 }],
            passes: [{ ...pass('p'), scale: 0.5, clear: [0, 0.25, 1, 1] }],
        });
        expect(errors).toEqual([]);
        expect(program?.params?.[0]).toEqual({ key: 'a', token: '--a', default: '1.33', min: '0', max: '2' });
        expect(program?.passes?.[0].scale).toBe('0.5');
        expect(program?.passes?.[0].clear).toEqual(['0', '0.25', '1', '1']);
        const floats: number[] = [];
        JSON.stringify(program, (_k, v) => (typeof v === 'number' && !Number.isInteger(v) && floats.push(v), v));
        expect(floats).toEqual([]);
    });

    it('数として読めない値は拒む', () => {
        expect(check({ contract: 1, params: [{ key: 'a', token: '--a', default: 'abc' }] }).program).toBeUndefined();
        expect(check({ contract: 1, passes: [{ ...pass('p'), scale: '2' }] }).program).toBeUndefined();
    });
});
