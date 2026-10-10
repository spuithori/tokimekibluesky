export const PROGRAM_CONTRACT = 1;

export const PROGRAM_LIMITS = {
    source: 128_000,
    passes: 32,
    inputs: 8,
    params: 32,
    count: 1_000_000,
    grid: 2048,
    size: 4096,
} as const;

export type PassType = 'fullscreen' | 'feedback' | 'mesh' | 'instances';
export type PassUpdate = 'once' | 'resize' | 'frame';
export type PassFormat = 'rgba8' | 'rgba16f' | 'rgba32f';
export type PassBlend = 'none' | 'add' | 'alpha';
export type PassPrimitive = 'triangles' | 'lines' | 'points';
export type ProgramUse = 'pointer' | 'scroll';

export interface ProgramParam {
    key: string;
    token: string;
    default: number;
    min?: number;
    max?: number;
}

export interface ProgramPass {
    key: string;
    type: PassType;
    glsl: string;
    vertex?: string;
    update: PassUpdate;
    scale?: number;
    size?: [number, number];
    format?: PassFormat;
    inputs?: string[];
    mipmaps?: boolean;
    grid?: [number, number];
    count?: number;
    vertices?: number;
    primitive?: PassPrimitive;
    blend?: PassBlend;
    depth?: boolean;
    clear?: [number, number, number, number];
}

export interface ProgramStage {
    glsl: string;
    inputs?: string[];
}

export interface ThemeProgram {
    contract: number;
    animated?: boolean;
    frameRate?: number;
    uses?: ProgramUse[];
    params?: ProgramParam[];
    passes?: ProgramPass[];
    wallpaper?: ProgramStage;
    material?: ProgramStage;
}

const KEY = /^[a-zA-Z][a-zA-Z0-9_]{0,31}$/;
const TOKEN = /^--[a-zA-Z0-9_-]{1,94}$/;
const RESERVED = /^(u[A-Z]|gl_|o$|main$)/;
const TYPES: PassType[] = ['fullscreen', 'feedback', 'mesh', 'instances'];
const UPDATES: PassUpdate[] = ['once', 'resize', 'frame'];
const FORMATS: PassFormat[] = ['rgba8', 'rgba16f', 'rgba32f'];
const BLENDS: PassBlend[] = ['none', 'add', 'alpha'];
const PRIMITIVES: PassPrimitive[] = ['triangles', 'lines', 'points'];
const USES: ProgramUse[] = ['pointer', 'scroll'];
const FRAME_RATES = [15, 30, 60];

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const pair = (v: unknown, min: number, max: number): [number, number] | undefined =>
    Array.isArray(v) && v.length === 2 && isInt(v[0], min, max) && isInt(v[1], min, max) ? [v[0], v[1]] : undefined;

export function inputName(input: string): string {
    return input.startsWith('image:') ? input.slice(6) : input;
}

export function programOrder(passes: readonly ProgramPass[]): ProgramPass[] | null {
    const byKey = new Map(passes.map((p) => [p.key, p]));
    const done = new Set<string>();
    const visiting = new Set<string>();
    const out: ProgramPass[] = [];
    const visit = (pass: ProgramPass): boolean => {
        if (done.has(pass.key)) return true;
        if (visiting.has(pass.key)) return false;
        visiting.add(pass.key);
        for (const input of pass.inputs ?? []) {
            if (input === pass.key && pass.type === 'feedback') continue;
            const dep = byKey.get(input);
            if (dep && !visit(dep)) return false;
        }
        visiting.delete(pass.key);
        done.add(pass.key);
        out.push(pass);
        return true;
    };
    for (const pass of passes) if (!visit(pass)) return null;
    return out;
}

function checkInputs(value: unknown, label: string, passKeys: ReadonlySet<string>, imageKeys: ReadonlySet<string>, errors: string[], self?: string): string[] | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.length > PROGRAM_LIMITS.inputs) {
        errors.push(`${label}: inputs が不正`);
        return undefined;
    }
    const names = new Set<string>();
    const out: string[] = [];
    for (const input of value) {
        const ok = typeof input === 'string' && (input.startsWith('image:') ? imageKeys.has(input.slice(6)) : passKeys.has(input) || input === self);
        if (!ok || names.has(inputName(input as string))) {
            errors.push(`${label}: 解決できない入力 ${String(input).slice(0, 80)}`);
            continue;
        }
        names.add(inputName(input as string));
        out.push(input as string);
    }
    return out;
}

function checkStage(value: unknown, label: string, passKeys: ReadonlySet<string>, imageKeys: ReadonlySet<string>, errors: string[]): ProgramStage | undefined {
    if (value === undefined) return undefined;
    const v = value as Record<string, unknown> | null;
    if (!v || typeof v !== 'object' || typeof v.glsl !== 'string' || !v.glsl.trim()) {
        errors.push(`${label} が不正`);
        return undefined;
    }
    const stage: ProgramStage = { glsl: v.glsl };
    const inputs = checkInputs(v.inputs, label, passKeys, imageKeys, errors);
    if (inputs?.length) stage.inputs = inputs;
    return stage;
}

export function validateProgram(value: unknown, imageKeys: ReadonlySet<string>, errors: string[]): ThemeProgram | undefined {
    const before = errors.length;
    const v = value as Record<string, unknown> | null;
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
        errors.push('program がオブジェクトではない');
        return undefined;
    }
    if (!isInt(v.contract, 1, 1000)) errors.push('program.contract が不正');
    const program: ThemeProgram = { contract: v.contract as number };
    if (v.animated !== undefined) {
        if (typeof v.animated !== 'boolean') errors.push('program.animated が不正');
        else program.animated = v.animated;
    }
    if (v.frameRate !== undefined) {
        if (!FRAME_RATES.includes(v.frameRate as number)) errors.push('program.frameRate は 15 / 30 / 60');
        else program.frameRate = v.frameRate as number;
    }
    if (v.uses !== undefined) {
        if (!Array.isArray(v.uses) || v.uses.some((u) => !USES.includes(u as ProgramUse))) errors.push('program.uses が不正');
        else if (v.uses.length) program.uses = [...new Set(v.uses as ProgramUse[])];
    }

    const paramKeys = new Set<string>();
    if (v.params !== undefined) {
        if (!Array.isArray(v.params) || v.params.length > PROGRAM_LIMITS.params) errors.push('program.params が不正');
        else {
            program.params = [];
            for (const item of v.params as Array<Record<string, unknown>>) {
                const key = item?.key;
                const ok = typeof key === 'string' && KEY.test(key) && !paramKeys.has(key)
                    && typeof item.token === 'string' && TOKEN.test(item.token)
                    && isNumber(item.default)
                    && (item.min === undefined || isNumber(item.min))
                    && (item.max === undefined || isNumber(item.max));
                if (!ok) {
                    errors.push(`program.params が不正: ${String(key).slice(0, 40)}`);
                    continue;
                }
                paramKeys.add(key as string);
                const param: ProgramParam = { key: key as string, token: item.token as string, default: item.default as number };
                if (item.min !== undefined) param.min = item.min as number;
                if (item.max !== undefined) param.max = item.max as number;
                program.params.push(param);
            }
            if (!program.params.length) delete program.params;
        }
    }

    const passKeys = new Set<string>();
    if (v.passes !== undefined) {
        if (!Array.isArray(v.passes) || v.passes.length > PROGRAM_LIMITS.passes) errors.push('program.passes が不正');
        else for (const item of v.passes as Array<Record<string, unknown>>) {
            const key = item?.key;
            if (typeof key === 'string' && KEY.test(key) && !RESERVED.test(key) && !passKeys.has(key) && !imageKeys.has(key)) passKeys.add(key);
            else errors.push(`program.passes のキーが不正: ${String(key).slice(0, 40)}`);
        }
    }
    if (Array.isArray(v.passes) && errors.length === before) {
        program.passes = [];
        for (const item of v.passes as Array<Record<string, unknown>>) {
            const key = item.key as string;
            const label = `program.passes.${key}`;
            const type = item.type as PassType;
            if (!TYPES.includes(type)) errors.push(`${label}.type が不正`);
            if (typeof item.glsl !== 'string' || !item.glsl.trim()) errors.push(`${label}.glsl が無い`);
            const vertex = (type === 'mesh' || type === 'instances') ? item.vertex : undefined;
            if ((type === 'mesh' || type === 'instances') && (typeof vertex !== 'string' || !vertex.trim())) errors.push(`${label}.vertex が無い`);
            if (!UPDATES.includes(item.update as PassUpdate)) errors.push(`${label}.update が不正`);
            const pass: ProgramPass = { key, type, glsl: item.glsl as string, update: item.update as PassUpdate };
            if (typeof vertex === 'string') pass.vertex = vertex;
            if (item.size !== undefined) {
                const size = pair(item.size, 1, PROGRAM_LIMITS.size);
                if (!size) errors.push(`${label}.size が不正`);
                else pass.size = size;
            } else if (item.scale !== undefined) {
                if (!isNumber(item.scale) || item.scale < 1 / 16 || item.scale > 1) errors.push(`${label}.scale は 1/16〜1`);
                else pass.scale = item.scale;
            }
            if (item.format !== undefined) {
                if (!FORMATS.includes(item.format as PassFormat)) errors.push(`${label}.format が不正`);
                else pass.format = item.format as PassFormat;
            }
            const inputs = checkInputs(item.inputs, label, passKeys, imageKeys, errors, type === 'feedback' ? key : undefined);
            if (inputs?.length) pass.inputs = inputs;
            if (item.mipmaps !== undefined) pass.mipmaps = item.mipmaps === true;
            if (type === 'mesh') {
                const grid = pair(item.grid ?? [64, 64], 1, PROGRAM_LIMITS.grid);
                if (!grid) errors.push(`${label}.grid が不正`);
                else pass.grid = grid;
            }
            if (type === 'instances') {
                if (!isInt(item.count, 1, PROGRAM_LIMITS.count)) errors.push(`${label}.count が不正`);
                else pass.count = item.count as number;
                if (item.vertices !== undefined) {
                    if (!isInt(item.vertices, 1, 4096)) errors.push(`${label}.vertices が不正`);
                    else pass.vertices = item.vertices as number;
                }
            }
            if (item.primitive !== undefined) {
                if (!PRIMITIVES.includes(item.primitive as PassPrimitive)) errors.push(`${label}.primitive が不正`);
                else pass.primitive = item.primitive as PassPrimitive;
            }
            if (item.blend !== undefined) {
                if (!BLENDS.includes(item.blend as PassBlend)) errors.push(`${label}.blend が不正`);
                else pass.blend = item.blend as PassBlend;
            }
            if (item.depth !== undefined) pass.depth = item.depth === true;
            if (item.clear !== undefined) {
                const c = item.clear;
                if (!Array.isArray(c) || c.length !== 4 || !c.every(isNumber)) errors.push(`${label}.clear が不正`);
                else pass.clear = c as [number, number, number, number];
            }
            program.passes.push(pass);
        }
        if (!program.passes.length) delete program.passes;
        else if (!programOrder(program.passes)) errors.push('program.passes が循環している');
    }

    const wallpaper = checkStage(v.wallpaper, 'program.wallpaper', passKeys, imageKeys, errors);
    if (wallpaper) program.wallpaper = wallpaper;
    const material = checkStage(v.material, 'program.material', passKeys, imageKeys, errors);
    if (material) program.material = material;

    const size = [...(program.passes ?? []).flatMap((p) => [p.glsl, p.vertex ?? '']), wallpaper?.glsl ?? '', material?.glsl ?? ''].reduce((n, s) => n + s.length, 0);
    if (size > PROGRAM_LIMITS.source) errors.push(`program の GLSL が大きすぎる(${size} 文字・上限 ${PROGRAM_LIMITS.source})`);
    return errors.length === before ? program : undefined;
}
