import { inputName, programOrder, type ProgramPass, type ThemeProgram } from '../program';
import { uniformName } from './shader';

export interface FrameState {
    time: number;
    delta: number;
    frame: number;
    width: number;
    height: number;
    dpr: number;
    dark: boolean;
    pointer: [number, number];
    scroll: number;
    values: Record<string, number>;
    images: Record<string, WebGLTexture>;
}

export interface PassRunner {
    render(state: FrameState): Record<string, WebGLTexture>;
    dispose(): void;
}

type Target = { tex: WebGLTexture; fb: WebGLFramebuffer; depth: WebGLRenderbuffer | null; w: number; h: number };
type Compiled = { pass: ProgramPass; program: WebGLProgram; uniforms: Map<string, WebGLUniformLocation | null> };

export function programHeader(program: ThemeProgram, inputs: readonly string[] = []): string {
    const params = (program.params ?? []).map((p) => `uniform float ${uniformName(p.key)};\n`).join('');
    const samplers = inputs.map((i) => `uniform sampler2D ${inputName(i)};\n`).join('');
    return params + samplers;
}

const COMMON = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform vec2 uRes, uScreen, uPointer, uGrid;
uniform float uDpr, uTime, uDelta, uFrame, uDark, uScroll;
`;

const FULLSCREEN_VS = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2. - 1., 0., 1.);
}`;

const VERTEX_HELPERS = `
vec2 meshUV() {
  int cell = gl_VertexID / 6;
  int c = gl_VertexID % 6;
  int gx = int(uGrid.x);
  vec2 corner = c == 0 ? vec2(0., 0.) : c == 1 ? vec2(1., 0.) : c == 2 ? vec2(0., 1.) : c == 3 ? vec2(1., 0.) : c == 4 ? vec2(1., 1.) : vec2(0., 1.);
  return (vec2(float(cell % gx), float(cell / gx)) + corner) / uGrid;
}
vec2 quadCorner() {
  int c = gl_VertexID % 6;
  return c == 0 ? vec2(-1., -1.) : c == 1 ? vec2(1., -1.) : c == 2 ? vec2(-1., 1.) : c == 3 ? vec2(1., -1.) : c == 4 ? vec2(1., 1.) : vec2(-1., 1.);
}
`;

export function createPassRunner(gl: WebGL2RenderingContext, program: ThemeProgram): PassRunner {
    const order = programOrder(program.passes ?? []) ?? [];
    const float16 = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
    const float32 = !!gl.getExtension('EXT_color_buffer_float') && !!gl.getExtension('OES_texture_float_linear');
    gl.getExtension('EXT_float_blend');

    const shader = (type: number, source: string, label: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`${label}: ${gl.getShaderInfoLog(s) ?? 'compile'}`);
        return s;
    };
    const compiled: Compiled[] = order.map((pass) => {
        const header = COMMON + programHeader(program, pass.inputs ?? []);
        const vertexSource = pass.type === 'mesh' || pass.type === 'instances' ? header + VERTEX_HELPERS + pass.vertex : FULLSCREEN_VS;
        const prog = gl.createProgram()!;
        gl.attachShader(prog, shader(gl.VERTEX_SHADER, vertexSource, `${pass.key}.vertex`));
        gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, header + pass.glsl, pass.key));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`${pass.key}: ${gl.getProgramInfoLog(prog) ?? 'link'}`);
        return { pass, program: prog, uniforms: new Map() };
    });
    const vao = gl.createVertexArray()!;

    const targets = new Map<string, Target[]>();
    const rendered = new Map<string, string>();
    const front = new Map<string, number>();

    const internalFormat = (pass: ProgramPass) => {
        if (pass.format === 'rgba8') return { internal: gl.RGBA8, filterable: true };
        if (pass.format === 'rgba32f' && float32) return { internal: gl.RGBA32F, filterable: true };
        return float16 ? { internal: gl.RGBA16F, filterable: true } : { internal: gl.RGBA8, filterable: true };
    };

    const makeTarget = (pass: ProgramPass, w: number, h: number): Target => {
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        const levels = pass.mipmaps ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1;
        gl.texStorage2D(gl.TEXTURE_2D, levels, internalFormat(pass).internal, w, h);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, pass.mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const fb = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        let depth: WebGLRenderbuffer | null = null;
        if (pass.depth) {
            depth = gl.createRenderbuffer()!;
            gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
        }
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return { tex, fb, depth, w, h };
    };
    const freeTarget = (t: Target) => {
        gl.deleteTexture(t.tex);
        gl.deleteFramebuffer(t.fb);
        if (t.depth) gl.deleteRenderbuffer(t.depth);
    };

    const sizeOf = (pass: ProgramPass, width: number, height: number): [number, number] =>
        pass.size ?? [Math.max(1, Math.round(width * (pass.scale ?? 1))), Math.max(1, Math.round(height * (pass.scale ?? 1)))];

    const current = (key: string): WebGLTexture | undefined => {
        const list = targets.get(key);
        return list ? list[front.get(key) ?? 0].tex : undefined;
    };

    return {
        render(state) {
            gl.bindVertexArray(vao);
            const resizeKey = `${state.width}x${state.height}:${state.dark ? 1 : 0}:${JSON.stringify(state.values)}`;
            for (const c of compiled) {
                const { pass } = c;
                const [w, h] = sizeOf(pass, state.width, state.height);
                let list = targets.get(pass.key);
                if (!list || list[0].w !== w || list[0].h !== h) {
                    list?.forEach(freeTarget);
                    list = pass.type === 'feedback' ? [makeTarget(pass, w, h), makeTarget(pass, w, h)] : [makeTarget(pass, w, h)];
                    targets.set(pass.key, list);
                    front.set(pass.key, 0);
                    rendered.delete(pass.key);
                }
                const due = pass.update === 'frame' || !rendered.has(pass.key) || (pass.update === 'resize' && rendered.get(pass.key) !== resizeKey);
                if (!due) continue;
                rendered.set(pass.key, resizeKey);
                const readIndex = front.get(pass.key) ?? 0;
                const writeIndex = pass.type === 'feedback' ? 1 - readIndex : 0;
                const target = list[writeIndex];

                gl.useProgram(c.program);
                const u = (name: string) => {
                    if (!c.uniforms.has(name)) c.uniforms.set(name, gl.getUniformLocation(c.program, name));
                    return c.uniforms.get(name)!;
                };
                const scale = pass.size ? w / state.width : (pass.scale ?? 1);
                gl.uniform2f(u('uRes'), w, h);
                gl.uniform2f(u('uScreen'), state.width, state.height);
                gl.uniform2f(u('uPointer'), state.pointer[0] * scale, state.pointer[1] * scale);
                gl.uniform1f(u('uDpr'), state.dpr * scale);
                gl.uniform1f(u('uTime'), state.time);
                gl.uniform1f(u('uDelta'), state.delta);
                gl.uniform1f(u('uFrame'), state.frame);
                gl.uniform1f(u('uDark'), state.dark ? 1 : 0);
                gl.uniform1f(u('uScroll'), state.scroll);
                for (const [key, value] of Object.entries(state.values)) gl.uniform1f(u(uniformName(key)), value);
                (pass.inputs ?? []).forEach((input, i) => {
                    const tex = input === pass.key ? list[readIndex].tex : input.startsWith('image:') ? state.images[inputName(input)] : current(input);
                    gl.activeTexture(gl.TEXTURE0 + 8 + i);
                    gl.bindTexture(gl.TEXTURE_2D, tex ?? null);
                    gl.uniform1i(u(inputName(input)), 8 + i);
                });

                gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
                gl.viewport(0, 0, w, h);
                const geometry = pass.type === 'mesh' || pass.type === 'instances';
                if (geometry) {
                    const [r, g, b, a] = pass.clear ?? [0, 0, 0, 0];
                    gl.clearColor(r, g, b, a);
                    gl.clear(gl.COLOR_BUFFER_BIT | (pass.depth ? gl.DEPTH_BUFFER_BIT : 0));
                }
                if (pass.depth) gl.enable(gl.DEPTH_TEST);
                if (pass.blend === 'add') {
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.ONE, gl.ONE);
                } else if (pass.blend === 'alpha') {
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                }
                const mode = pass.primitive === 'lines' ? gl.LINES : pass.primitive === 'points' ? gl.POINTS : gl.TRIANGLES;
                if (pass.type === 'mesh') {
                    const [gx, gy] = pass.grid ?? [64, 64];
                    gl.uniform2f(u('uGrid'), gx, gy);
                    gl.drawArrays(mode, 0, gx * gy * 6);
                } else if (pass.type === 'instances') {
                    gl.drawArraysInstanced(mode, 0, pass.vertices ?? 6, pass.count ?? 1);
                } else {
                    gl.drawArrays(gl.TRIANGLES, 0, 3);
                }
                gl.disable(gl.BLEND);
                gl.disable(gl.DEPTH_TEST);
                if (pass.mipmaps) {
                    gl.bindTexture(gl.TEXTURE_2D, target.tex);
                    gl.generateMipmap(gl.TEXTURE_2D);
                }
                if (pass.type === 'feedback') front.set(pass.key, writeIndex);
            }
            gl.bindVertexArray(null);
            const out: Record<string, WebGLTexture> = {};
            for (const c of compiled) {
                const tex = current(c.pass.key);
                if (tex) out[c.pass.key] = tex;
            }
            return out;
        },
        dispose() {
            for (const list of targets.values()) list.forEach(freeTarget);
            targets.clear();
            for (const c of compiled) gl.deleteProgram(c.program);
            gl.deleteVertexArray(vao);
        },
    };
}
