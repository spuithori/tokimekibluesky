import { programNumber, type ThemeProgram } from '../program';
import { loadMaterial, readMaterialName } from './materials';
import { createPassRunner, programHeader, type PassRunner } from './passes';
import { BLUR, DOWN, GLASS_PARAMS, IMAGE_SOURCE, LIQUID, MAP, MAX_SURFACES, PYRAMID_LEVELS, VERTEX, glassShader, uniformName, type GlassMaterial, type GlassParam, type GlassSource, type MaterialParams } from './shader';

export const SURFACE_SELECTOR = '[data-glass-surface]';
export const COVER_SELECTOR = '[data-glass-cover]';
export const OVERLAY_SELECTOR = '[data-glass-overlay]';
export const ACTIVE_CLASS = 'glass-webgl';

type Program = { program: WebGLProgram; uniform: (name: string) => WebGLUniformLocation | null };
type Target = { texture: WebGLTexture; framebuffer: WebGLFramebuffer; width: number; height: number };
type Level = Target & { scratch: Target };

const SETTLE_FRAMES = 6;

function readParams(style: CSSStyleDeclaration, defs: MaterialParams): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [key, { token, value }] of Object.entries(defs)) {
        const raw = Number.parseFloat(style.getPropertyValue(token));
        out[key] = Number.isFinite(raw) ? raw : value;
    }
    return out;
}

export function readGlassParams(style: CSSStyleDeclaration): Record<GlassParam, number> {
    return readParams(style, GLASS_PARAMS) as Record<GlassParam, number>;
}

export function readWallpaperUrl(style: CSSStyleDeclaration): string | null {
    const raw = style.getPropertyValue('--glass-wallpaper').trim();
    const match = raw.match(/^url\(\s*(["']?)(.+?)\1\s*\)$/);
    return match ? match[2] : null;
}

function compile(gl: WebGL2RenderingContext, fragment: string): Program {
    const shader = (type: number, source: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
        return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
    gl.bindAttribLocation(program, 0, 'a');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link');
    const cache = new Map<string, WebGLUniformLocation | null>();
    return {
        program,
        uniform: (name) => {
            if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name));
            return cache.get(name)!;
        },
    };
}
export interface GlassOptions {
    program?: ThemeProgram;
    images?: Readonly<Record<string, string>>;
}

export function startGlass(app: HTMLElement, options: GlassOptions = {}): () => void {
    const program = options.program;
    const canvas = document.createElement('canvas');
    canvas.className = 'glass-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const contextOptions: WebGLContextAttributes = { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'low-power' };
    let offscreen: OffscreenCanvas | null = null;
    let presenter: ImageBitmapRenderingContext | null = null;
    let context: WebGL2RenderingContext | null = null;
    if (typeof OffscreenCanvas === 'function') {
        const candidate = new OffscreenCanvas(1, 1);
        const offscreenGl = candidate.getContext('webgl2', contextOptions) as WebGL2RenderingContext | null;
        const bitmap = offscreenGl ? canvas.getContext('bitmaprenderer', { alpha: false }) : null;
        if (offscreenGl && bitmap) {
            offscreen = candidate;
            presenter = bitmap;
            context = offscreenGl;
        } else offscreenGl?.getExtension('WEBGL_lose_context')?.loseContext();
    }
    context ??= canvas.getContext('webgl2', contextOptions);
    const gl = context;
    if (!gl) return () => {};
    const surface: HTMLCanvasElement | OffscreenCanvas = offscreen ?? canvas;
    const hdr = !!gl.getExtension('EXT_color_buffer_float');

    let mapProgram: Program, downProgram: Program, blurProgram: Program;
    try {
        mapProgram = compile(gl, MAP);
        downProgram = compile(gl, DOWN);
        blurProgram = compile(gl, BLUR);
    } catch (error) {
        console.error(error);
        return () => {};
    }
    const vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    let wallpaper: WebGLTexture | null = null;
    let wallpaperUrl: string | null = null;
    let imageSize: [number, number] = [1, 1];
    let pyramid: Level[] = [];
    let pyramidKey = '';
    let params = readGlassParams(getComputedStyle(app));
    let glassProgram: Program | null = null;
    let material: GlassMaterial = LIQUID;
    let materialValues: Record<string, number> = {};
    let requestedMaterial = '';
    let source: GlassSource = program?.wallpaper ? { glsl: program.wallpaper.glsl, params: {}, animated: !!program.animated, image: false } : IMAGE_SOURCE;
    const programInputs = [...new Set([...(program?.wallpaper?.inputs ?? []), ...(program?.material?.inputs ?? [])])];
    const programParams: MaterialParams = Object.fromEntries((program?.params ?? []).map((p) => [p.key, { token: p.token, value: programNumber(p.default, 0) }]));
    let programValues: Record<string, number> = {};
    let runner: PassRunner | null = null;
    const inputImages: Record<string, WebGLTexture> = {};
    const startTime = performance.now();
    let lastDraw = 0;
    let lastTime = 0;
    let frameCount = 0;
    let lastAdvance = 0;
    let passTime = 0;
    let passFrame = 0;
    const FRAME_MS = 1000 / (program?.frameRate ?? 30);
    const throttlePasses = !!program?.animated && !program.uses?.includes('scroll');
    const rectData = new Float32Array(MAX_SURFACES * 4);
    const clipData = new Float32Array(MAX_SURFACES * 4);
    const radiusData = new Float32Array(MAX_SURFACES);
    const anchorData = new Float32Array(MAX_SURFACES * 2);
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let dark = app.classList.contains('darkmode');
    let pointer: [number, number] | null = null;
    let frame = 0;
    let settle = 0;
    let lastSignature = '';
    let active = false;
    let disposed = false;

    const blocked = [matchMedia('(prefers-reduced-transparency: reduce)')];

    function makeTarget(width: number, height: number): Target {
        const texture = gl!.createTexture()!;
        gl!.bindTexture(gl!.TEXTURE_2D, texture);
        gl!.texImage2D(gl!.TEXTURE_2D, 0, hdr ? gl!.RGBA16F : gl!.RGBA8, width, height, 0, gl!.RGBA, hdr ? gl!.HALF_FLOAT : gl!.UNSIGNED_BYTE, null);
        for (const [k, v] of [[gl!.TEXTURE_MIN_FILTER, gl!.LINEAR], [gl!.TEXTURE_MAG_FILTER, gl!.LINEAR], [gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE], [gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE]]) gl!.texParameteri(gl!.TEXTURE_2D, k, v);
        const framebuffer = gl!.createFramebuffer()!;
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, framebuffer);
        gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, texture, 0);
        return { texture, framebuffer, width, height };
    }

    function freeTarget(t: Target) {
        gl!.deleteTexture(t.texture);
        gl!.deleteFramebuffer(t.framebuffer);
    }

    function pass(program: Program, target: Target | null, setup: (u: Program['uniform']) => void) {
        gl!.useProgram(program.program);
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, target ? target.framebuffer : null);
        gl!.viewport(0, 0, target ? target.width : surface.width, target ? target.height : surface.height);
        setup(program.uniform);
        gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    function bind(unit: number, texture: WebGLTexture) {
        gl!.activeTexture(gl!.TEXTURE0 + unit);
        gl!.bindTexture(gl!.TEXTURE_2D, texture);
    }

    function buildPyramid(width: number, height: number) {
        const key = `${width}x${height}:${wallpaperUrl}`;
        if (key === pyramidKey || !wallpaper) return;
        pyramidKey = key;
        for (const level of pyramid) {
            freeTarget(level);
            freeTarget(level.scratch);
        }
        pyramid = [];
        let w = Math.max(1, Math.round(width / 2));
        let h = Math.max(1, Math.round(height / 2));
        for (let i = 0; i < PYRAMID_LEVELS; i++) {
            const level: Level = { ...makeTarget(w, h), scratch: makeTarget(w, h) };
            const prev = pyramid[i - 1];
            const lw = w, lh = h;
            if (prev) pass(downProgram, level.scratch, (u) => { bind(0, prev.texture); gl!.uniform1i(u('uSrc'), 0); gl!.uniform2f(u('uSize'), lw, lh); });
            else pass(mapProgram, level.scratch, (u) => { bind(0, wallpaper!); gl!.uniform1i(u('uSharp'), 0); gl!.uniform2f(u('uRes'), width, height); gl!.uniform2f(u('uImg'), imageSize[0], imageSize[1]); gl!.uniform2f(u('uSize'), lw, lh); });
            pass(blurProgram, level, (u) => { bind(0, level.scratch.texture); gl!.uniform1i(u('uSrc'), 0); gl!.uniform2f(u('uSize'), lw, lh); gl!.uniform2f(u('uDir'), 1, 0); });
            pass(blurProgram, level.scratch, (u) => { bind(0, level.texture); gl!.uniform1i(u('uSrc'), 0); gl!.uniform2f(u('uSize'), lw, lh); gl!.uniform2f(u('uDir'), 0, 1); });
            const { texture, framebuffer } = level.scratch;
            level.scratch.texture = level.texture;
            level.scratch.framebuffer = level.framebuffer;
            level.texture = texture;
            level.framebuffer = framebuffer;
            pyramid.push(level);
            w = Math.max(1, Math.round(w / 2));
            h = Math.max(1, Math.round(h / 2));
        }
    }

    async function loadWallpaper(url: string) {
        wallpaperUrl = url;
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = url;
        try {
            await image.decode();
        } catch {
            return;
        }
        if (disposed || wallpaperUrl !== url) return;
        const texture = gl!.createTexture()!;
        gl!.bindTexture(gl!.TEXTURE_2D, texture);
        gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.SRGB8_ALPHA8, gl!.RGBA, gl!.UNSIGNED_BYTE, image);
        gl!.generateMipmap(gl!.TEXTURE_2D);
        for (const [k, v] of [[gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR], [gl!.TEXTURE_MAG_FILTER, gl!.LINEAR], [gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE], [gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE]]) gl!.texParameteri(gl!.TEXTURE_2D, k, v);
        if (wallpaper) gl!.deleteTexture(wallpaper);
        wallpaper = texture;
        imageSize = [image.naturalWidth, image.naturalHeight];
        pyramidKey = '';
        updateActive();
        request();
    }

    function useMaterial(next: GlassMaterial) {
        let compiled: Program;
        try {
            compiled = compile(gl!, glassShader(next, source, program ? programHeader(program, programInputs) : ''));
            if (program?.passes && !runner) runner = createPassRunner(gl!, program);
        } catch (error) {
            console.error(error);
            return;
        }
        if (glassProgram) gl!.deleteProgram(glassProgram.program);
        glassProgram = compiled;
        material = next;
        materialValues = readParams(getComputedStyle(app), material.params);
        updateActive();
        request();
    }

    function readProgramValues(style: CSSStyleDeclaration) {
        const values = readParams(style, programParams);
        for (const p of program?.params ?? []) values[p.key] = Math.min(programNumber(p.max, Infinity), Math.max(programNumber(p.min, -Infinity), values[p.key]));
        return values;
    }

    async function loadInputImages() {
        for (const input of new Set([...programInputs, ...(program?.passes ?? []).flatMap((p) => p.inputs ?? [])])) {
            if (!input.startsWith('image:')) continue;
            const key = input.slice(6);
            const url = options.images?.[key];
            if (!url) continue;
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.src = url;
            try {
                await image.decode();
            } catch {
                continue;
            }
            if (disposed) return;
            const texture = gl!.createTexture()!;
            gl!.bindTexture(gl!.TEXTURE_2D, texture);
            gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, gl!.RGBA, gl!.UNSIGNED_BYTE, image);
            gl!.generateMipmap(gl!.TEXTURE_2D);
            for (const [k, v] of [[gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR], [gl!.TEXTURE_MAG_FILTER, gl!.LINEAR], [gl!.TEXTURE_WRAP_S, gl!.REPEAT], [gl!.TEXTURE_WRAP_T, gl!.REPEAT]]) gl!.texParameteri(gl!.TEXTURE_2D, k, v);
            inputImages[key] = texture;
            request();
        }
    }

    function wantsPointer() {
        return params.pointerLight > 0 || !!program?.uses?.includes('pointer') || !!material.pointer?.(materialValues);
    }

    function deckScroll() {
        if (!program?.uses?.includes('scroll')) return 0;
        return (app.querySelector('.deck') as HTMLElement | null)?.scrollLeft ?? 0;
    }

    function surfaces(dpr: number, vw: number, vh: number) {
        const rects: number[] = [];
        const clips: number[] = [];
        const radii: number[] = [];
        const anchors: number[] = [];
        let deck: Element | null = null;
        let scroller: DOMRect | undefined;
        let clip = [0, 0, vw, vh];
        let anchor = [0, 0];
        for (const el of app.querySelectorAll<HTMLElement>(SURFACE_SELECTOR)) {
            if (el.closest(OVERLAY_SELECTOR)) {
                if (el.hasAttribute('data-glass-drawn')) el.removeAttribute('data-glass-drawn');
                continue;
            }
            const outer = el.parentElement?.closest(SURFACE_SELECTOR);
            if (outer) {
                const drawn = outer.hasAttribute('data-glass-drawn');
                if (drawn !== el.hasAttribute('data-glass-drawn')) el.toggleAttribute('data-glass-drawn', drawn);
                continue;
            }
            const style = getComputedStyle(el);
            const before = getComputedStyle(el, '::before');
            const drawn = [style.backdropFilter, before.display === 'none' ? '' : before.backdropFilter].every((v) => v === 'none' || v === '');
            if (drawn !== el.hasAttribute('data-glass-drawn')) el.toggleAttribute('data-glass-drawn', drawn);
            if (!drawn) continue;
            const r = el.getBoundingClientRect();
            const owner = el.closest('.deck');
            if (owner !== deck || !scroller) {
                deck = owner;
                scroller = deck?.getBoundingClientRect();
                clip = scroller ? [scroller.left, scroller.top, scroller.right, scroller.bottom] : [0, 0, vw, vh];
                anchor = deck && scroller ? [(deck.scrollLeft - scroller.left) * dpr, (deck.scrollTop - scroller.top) * dpr] : [0, 0];
            }
            if (r.width < 1 || r.height < 1 || r.right <= clip[0] || r.left >= clip[2] || r.bottom <= clip[1] || r.top >= clip[3]) continue;
            const left = r.left <= 2 ? -200 : r.left;
            const top = r.top <= 2 ? -200 : r.top;
            const right = r.right >= vw - 2 ? vw + 200 : r.right;
            const bottom = r.bottom >= vh - 2 ? vh + 200 : r.bottom;
            rects.push(left * dpr, top * dpr, (right - left) * dpr, (bottom - top) * dpr);
            clips.push(...clip.map((v) => v * dpr));
            radii.push((Number.parseFloat(style.borderTopLeftRadius) || 0) * dpr);
            anchors.push(anchor[0], anchor[1]);
            if (radii.length === MAX_SURFACES) break;
        }
        return { rects, clips, radii, anchors };
    }

    function draw() {
        frame = 0;
        if (!active || (source.image && !wallpaper) || !glassProgram) return;
        const now = performance.now();
        if (source.animated && now - lastDraw < FRAME_MS - 2 && settle === 0 && lastDraw > 0) {
            animate();
            return;
        }
        lastDraw = now;
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const vw = canvas.clientWidth || innerWidth;
        const vh = canvas.clientHeight || innerHeight;
        const width = Math.round(vw * dpr);
        const height = Math.round(vh * dpr);
        if (surface.width !== width || surface.height !== height) {
            surface.width = width;
            surface.height = height;
        }
        if (source.image) buildPyramid(width, height);
        const { rects, clips, radii, anchors } = surfaces(dpr, vw, vh);
        const signature = `${width}x${height}|${rects.join(',')}|${radii.join(',')}`;
        const p = pointer && wantsPointer() ? [pointer[0] * dpr, pointer[1] * dpr] : [-1, -1];
        const time = reducedMotion.matches ? 40 : (performance.now() - startTime) / 1000;
        const delta = Math.max(0, time - lastTime);
        lastTime = time;
        frameCount++;
        const scroll = deckScroll();
        const advance = !throttlePasses || lastAdvance === 0 || now - lastAdvance >= FRAME_MS - 2;
        if (advance) {
            lastAdvance = now;
            passFrame++;
        }
        const passDelta = advance ? Math.max(0, time - passTime) : 0;
        if (advance) passTime = time;
        const passTextures = runner?.render({ time, delta: passDelta, frame: passFrame, width, height, dpr, dark, pointer: [p[0], p[1]], scroll, values: programValues, images: inputImages, advance }) ?? {};
        pass(glassProgram, null, (u) => {
            if (source.image) {
                bind(0, wallpaper!);
                gl!.uniform1i(u('uSharp'), 0);
                pyramid.forEach((level, i) => {
                    bind(i + 1, level.texture);
                    gl!.uniform1i(u(`uL${i}`), i + 1);
                });
            }
            gl!.uniform1f(u('uTime'), time);
            gl!.uniform1f(u('uDelta'), delta);
            gl!.uniform1f(u('uFrame'), frameCount);
            gl!.uniform1f(u('uScroll'), scroll);
            programInputs.forEach((input, i) => {
                const name = input.startsWith('image:') ? input.slice(6) : input;
                const texture = input.startsWith('image:') ? inputImages[name] : passTextures[name];
                gl!.activeTexture(gl!.TEXTURE0 + 8 + i);
                gl!.bindTexture(gl!.TEXTURE_2D, texture ?? null);
                gl!.uniform1i(u(name), 8 + i);
            });
            for (const [key, value] of Object.entries(programValues)) gl!.uniform1f(u(uniformName(key)), value);
            gl!.uniform2f(u('uRes'), width, height);
            gl!.uniform2f(u('uImg'), imageSize[0], imageSize[1]);
            gl!.uniform2f(u('uPointer'), p[0], p[1]);
            gl!.uniform1i(u('uCount'), radii.length);
            rectData.fill(0).set(rects);
            clipData.fill(0).set(clips);
            radiusData.fill(0).set(radii);
            anchorData.fill(0).set(anchors);
            gl!.uniform4fv(u('uRect'), rectData);
            gl!.uniform4fv(u('uClip'), clipData);
            gl!.uniform1fv(u('uRadius'), radiusData);
            gl!.uniform2fv(u('uAnchor'), anchorData);
            gl!.uniform1f(u('uDpr'), dpr);
            gl!.uniform1f(u('uSigma0'), 3.4);
            gl!.uniform1f(u('uDark'), dark ? 1 : 0);
            gl!.uniform1f(u('uRefraction'), params.refraction);
            gl!.uniform1f(u('uBevel'), params.bevel);
            gl!.uniform1f(u('uIor'), params.ior);
            gl!.uniform1f(u('uRadial'), params.radial);
            gl!.uniform1f(u('uLens'), params.lens);
            gl!.uniform1f(u('uRipple'), params.ripple);
            gl!.uniform1f(u('uFrost'), params.frost);
            gl!.uniform1f(u('uSaturation'), params.saturation);
            gl!.uniform1f(u('uDispersion'), params.dispersion);
            gl!.uniform1f(u('uAdapt'), params.adapt);
            gl!.uniform1f(u('uSpecular'), params.specular);
            gl!.uniform1f(u('uPointerLight'), params.pointerLight);
            gl!.uniform1f(u('uShadow'), params.shadow);
            gl!.uniform1f(u('uBound'), params.bound);
            for (const [key, value] of Object.entries(materialValues)) gl!.uniform1f(u(uniformName(key)), value);
        });
        const image = offscreen ? offscreen.transferToImageBitmap() : canvas;
        paintCovers(dpr, vw, image);
        if (presenter) presenter.transferFromImageBitmap(image as ImageBitmap);
        if (signature !== lastSignature) settle = SETTLE_FRAMES;
        lastSignature = signature;
        if (settle > 0) {
            settle--;
            request();
        } else animate();
    }

    function animate() {
        if (source.animated && !reducedMotion.matches && !document.hidden) request();
    }

    type Cover = { root: HTMLElement; canvas: HTMLCanvasElement; deck: HTMLElement | null; animation: Animation | null; range: number; width: number; left: number };
    const covers = new Map<HTMLElement, Cover>();
    const narrow = matchMedia('(max-width: 767px)');
    const canPan = typeof ScrollTimeline === 'function';
    let panDeck: HTMLElement | null = null;
    let panTimeline: ScrollTimeline | null = null;

    function makeCover(deck: HTMLElement | null): Cover {
        const canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        if (!deck) {
            canvas.className = 'glass-cover';
            return { root: canvas, canvas, deck, animation: null, range: -1, width: -1, left: Number.NaN };
        }
        const root = document.createElement('div');
        root.className = 'glass-cover glass-cover--pan';
        root.setAttribute('aria-hidden', 'true');
        canvas.className = 'glass-cover__strip';
        canvas.width = 0;
        canvas.height = 0;
        root.append(canvas);
        return { root, canvas, deck, animation: null, range: -1, width: -1, left: Number.NaN };
    }

    function dropCover(cover: Cover) {
        cover.animation?.cancel();
        cover.root.remove();
    }

    function pan(cover: Cover, deck: HTMLElement, el: HTMLElement, r: DOMRect, deckRect: DOMRect) {
        if (panDeck !== deck || !panTimeline) {
            panDeck = deck;
            panTimeline = new ScrollTimeline({ source: deck, axis: 'x' });
        }
        const range = deck.scrollWidth - deck.clientWidth;
        const keyframes = [{ transform: 'translateX(0px)' }, { transform: `translateX(${range}px)` }];
        if (!cover.animation || cover.animation.timeline !== panTimeline) {
            cover.animation?.cancel();
            cover.animation = cover.canvas.animate(keyframes, { timeline: panTimeline, fill: 'both', easing: 'linear' });
            cover.animation.ready.then(request, () => {});
            cover.range = range;
        } else if (cover.range !== range) {
            (cover.animation.effect as KeyframeEffect).setKeyframes(keyframes);
            cover.range = range;
        }
        const width = deck.clientWidth;
        if (cover.width !== width) {
            cover.width = width;
            cover.canvas.style.width = `${width}px`;
        }
        const left = deckRect.left + deck.clientLeft - (r.left + el.clientLeft) - deck.scrollLeft;
        if (!(Math.abs(left - cover.left) <= .01)) {
            cover.left = left;
            cover.canvas.style.left = `${left}px`;
        }
        return cover.canvas.getBoundingClientRect();
    }

    function paintCovers(dpr: number, vw: number, image: CanvasImageSource) {
        const seen = new Set<HTMLElement>();
        const panning = canPan && narrow.matches;
        let deckRect: DOMRect | null = null;
        for (const el of app.querySelectorAll<HTMLElement>(COVER_SELECTOR)) {
            const host = el.parentElement?.closest<HTMLElement>(SURFACE_SELECTOR);
            if (host && !host.hasAttribute('data-glass-drawn')) continue;
            if (getComputedStyle(el).position === 'static') continue;
            const parent = host?.parentElement;
            const deck = panning && parent?.classList.contains('deck') ? parent : null;
            const r = el.getBoundingClientRect();
            const visible = r.width >= 1 && r.height >= 1 && r.right > 0 && r.left < vw;
            if (!visible && !deck) continue;
            seen.add(el);
            let cover = covers.get(el);
            if (!cover || cover.root.parentElement !== el || cover.deck !== deck) {
                if (cover) dropCover(cover);
                cover = makeCover(deck);
                el.prepend(cover.root);
                covers.set(el, cover);
            }
            if (deck) deckRect ??= deck.getBoundingClientRect();
            const box = deck ? pan(cover, deck, el, r, deckRect!) : r;
            if (!visible) {
                if (cover.canvas.width !== 0) {
                    cover.canvas.width = 0;
                    cover.canvas.height = 0;
                }
                if (el.hasAttribute('data-glass-covered')) el.removeAttribute('data-glass-covered');
                continue;
            }
            if (!el.hasAttribute('data-glass-covered')) el.setAttribute('data-glass-covered', '');
            const w = Math.max(1, Math.round(box.width * dpr));
            const h = Math.max(1, Math.round(box.height * dpr));
            if (cover.canvas.width !== w || cover.canvas.height !== h) {
                cover.canvas.width = w;
                cover.canvas.height = h;
            }
            cover.canvas.getContext('2d')?.drawImage(image, Math.round(box.left * dpr), Math.round(box.top * dpr), w, h, 0, 0, w, h);
        }
        for (const [el, cover] of covers) {
            if (!seen.has(el)) {
                dropCover(cover);
                covers.delete(el);
                el.removeAttribute('data-glass-covered');
            }
        }
    }
    function clearCovers() {
        for (const [el, cover] of covers) {
            dropCover(cover);
            el.removeAttribute('data-glass-covered');
        }
        covers.clear();
    }

    function request() {
        if (!frame && !disposed) frame = requestAnimationFrame(draw);
    }

    function updateActive() {
        const next = (!source.image || !!wallpaper) && !!glassProgram && !gl!.isContextLost() && !blocked.some((m) => m.matches);
        if (next === active) return;
        active = next;
        app.classList.toggle(ACTIVE_CLASS, active);
        canvas.hidden = !active;
        if (active) request();
        else {
            clearCovers();
            for (const el of app.querySelectorAll('[data-glass-drawn]')) el.removeAttribute('data-glass-drawn');
        }
    }

    function refresh() {
        const style = getComputedStyle(app);
        params = readGlassParams(style);
        materialValues = readParams(style, material.params);
        programValues = readProgramValues(style);
        dark = app.classList.contains('darkmode');
        const name = program?.material ? 'program' : readMaterialName(style);
        if (name !== requestedMaterial) {
            requestedMaterial = name;
            const loading = program?.material ? Promise.resolve<GlassMaterial>({ glsl: program.material.glsl, params: {} }) : loadMaterial(name);
            void loading.then((next) => {
                if (!disposed && requestedMaterial === name) useMaterial(next);
            });
        }
        const url = readWallpaperUrl(style);
        if (url && url !== wallpaperUrl) void loadWallpaper(url);
        request();
    }

    const onScroll = (e: Event) => {
        if (e.target instanceof Element && e.target.querySelector(`:scope > ${SURFACE_SELECTOR}`)) request();
    };
    const onPointer = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || !wantsPointer()) return;
        pointer = [e.clientX, e.clientY];
        request();
    };
    const onLost = (e: Event) => {
        e.preventDefault();
        updateActive();
    };

    const attributes = new MutationObserver(refresh);
    attributes.observe(app, { attributes: true, attributeFilter: ['class', 'style'] });
    const resize = new ResizeObserver(request);
    const structure = new MutationObserver(watch);
    function watch() {
        structure.disconnect();
        resize.disconnect();
        for (const el of [app, ...app.querySelectorAll('.wrap, .main, .deck, .deck-columns')]) structure.observe(el, { childList: true });
        for (const el of [document.documentElement, ...app.querySelectorAll(SURFACE_SELECTOR)]) resize.observe(el);
        request();
    }
    watch();
    for (const m of blocked) m.addEventListener('change', updateActive);
    addEventListener('resize', request);
    document.addEventListener('visibilitychange', request);
    reducedMotion.addEventListener('change', request);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    addEventListener('pointermove', onPointer, { passive: true });
    surface.addEventListener('webglcontextlost', onLost);

    canvas.hidden = true;
    app.prepend(canvas);
    refresh();
    void loadInputImages();

    return () => {
        disposed = true;
        if (frame) cancelAnimationFrame(frame);
        attributes.disconnect();
        structure.disconnect();
        resize.disconnect();
        for (const m of blocked) m.removeEventListener('change', updateActive);
        removeEventListener('resize', request);
        document.removeEventListener('visibilitychange', request);
        reducedMotion.removeEventListener('change', request);
        document.removeEventListener('scroll', onScroll, { capture: true });
        removeEventListener('pointermove', onPointer);
        surface.removeEventListener('webglcontextlost', onLost);
        app.classList.remove(ACTIVE_CLASS);
        for (const el of app.querySelectorAll('[data-glass-drawn]')) el.removeAttribute('data-glass-drawn');
        clearCovers();
        runner?.dispose();
        canvas.remove();
        gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
}
