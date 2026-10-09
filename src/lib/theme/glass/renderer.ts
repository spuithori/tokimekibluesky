import { BLUR, DOWN, GLASS_PARAMS, MAP, MAX_SURFACES, PYRAMID_LEVELS, VERTEX, glassShader, type GlassParam } from './shader';

export const SURFACE_SELECTOR = '[data-glass-surface]';
export const COVER_SELECTOR = '[data-glass-cover]';
export const OVERLAY_SELECTOR = '[data-glass-overlay]';
export const ACTIVE_CLASS = 'glass-webgl';

type Program = { program: WebGLProgram; uniform: (name: string) => WebGLUniformLocation | null };
type Target = { texture: WebGLTexture; framebuffer: WebGLFramebuffer; width: number; height: number };
type Level = Target & { scratch: Target };

const SETTLE_FRAMES = 6;

export function readGlassParams(style: CSSStyleDeclaration): Record<GlassParam, number> {
    const out = {} as Record<GlassParam, number>;
    for (const [key, { token, value }] of Object.entries(GLASS_PARAMS) as Array<[GlassParam, { token: string; value: number }]>) {
        const raw = Number.parseFloat(style.getPropertyValue(token));
        out[key] = Number.isFinite(raw) ? raw : value;
    }
    return out;
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
export function startGlass(app: HTMLElement): () => void {
    const canvas = document.createElement('canvas');
    canvas.className = 'glass-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl) return () => {};
    const hdr = !!gl.getExtension('EXT_color_buffer_float');

    let glassProgram: Program, mapProgram: Program, downProgram: Program, blurProgram: Program;
    try {
        glassProgram = compile(gl, glassShader());
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
        gl!.viewport(0, 0, target ? target.width : canvas.width, target ? target.height : canvas.height);
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
    }

    function surfaces(dpr: number, vw: number, vh: number) {
        const rects: number[] = [];
        const clips: number[] = [];
        const radii: number[] = [];
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
            const scroller = el.closest('.deck')?.getBoundingClientRect();
            const clip = scroller ? [scroller.left, scroller.top, scroller.right, scroller.bottom] : [0, 0, vw, vh];
            if (r.width < 1 || r.height < 1 || r.right <= clip[0] || r.left >= clip[2] || r.bottom <= clip[1] || r.top >= clip[3]) continue;
            const left = r.left <= 2 ? -200 : r.left;
            const top = r.top <= 2 ? -200 : r.top;
            const right = r.right >= vw - 2 ? vw + 200 : r.right;
            const bottom = r.bottom >= vh - 2 ? vh + 200 : r.bottom;
            rects.push(left * dpr, top * dpr, (right - left) * dpr, (bottom - top) * dpr);
            clips.push(...clip.map((v) => v * dpr));
            radii.push((Number.parseFloat(style.borderTopLeftRadius) || 0) * dpr);
            if (radii.length === MAX_SURFACES) break;
        }
        return { rects, clips, radii };
    }

    function draw() {
        frame = 0;
        if (!active || !wallpaper) return;
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const vw = canvas.clientWidth || innerWidth;
        const vh = canvas.clientHeight || innerHeight;
        const width = Math.round(vw * dpr);
        const height = Math.round(vh * dpr);
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        buildPyramid(width, height);
        const { rects, clips, radii } = surfaces(dpr, vw, vh);
        const signature = `${width}x${height}|${rects.join(',')}|${radii.join(',')}`;
        const p = pointer && params.pointerLight > 0 ? [pointer[0] * dpr, pointer[1] * dpr] : [-1, -1];
        pass(glassProgram, null, (u) => {
            bind(0, wallpaper!);
            gl!.uniform1i(u('uSharp'), 0);
            pyramid.forEach((level, i) => {
                bind(i + 1, level.texture);
                gl!.uniform1i(u(`uL${i}`), i + 1);
            });
            gl!.uniform2f(u('uRes'), width, height);
            gl!.uniform2f(u('uImg'), imageSize[0], imageSize[1]);
            gl!.uniform2f(u('uPointer'), p[0], p[1]);
            gl!.uniform1i(u('uCount'), radii.length);
            gl!.uniform4fv(u('uRect'), new Float32Array([...rects, ...new Array(MAX_SURFACES * 4 - rects.length).fill(0)]));
            gl!.uniform4fv(u('uClip'), new Float32Array([...clips, ...new Array(MAX_SURFACES * 4 - clips.length).fill(0)]));
            gl!.uniform1fv(u('uRadius'), new Float32Array([...radii, ...new Array(MAX_SURFACES - radii.length).fill(0)]));
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
        });
        paintCovers(dpr, vw);
        if (signature !== lastSignature) settle = SETTLE_FRAMES;
        lastSignature = signature;
        if (settle > 0) {
            settle--;
            request();
        }
    }

    const covers = new Map<HTMLElement, HTMLCanvasElement>();
    function paintCovers(dpr: number, vw: number) {
        const seen = new Set<HTMLElement>();
        for (const el of app.querySelectorAll<HTMLElement>(COVER_SELECTOR)) {
            const host = el.parentElement?.closest(SURFACE_SELECTOR);
            if (host && !host.hasAttribute('data-glass-drawn')) continue;
            if (getComputedStyle(el).position === 'static') continue;
            const r = el.getBoundingClientRect();
            if (r.width < 1 || r.height < 1 || r.right <= 0 || r.left >= vw) continue;
            seen.add(el);
            if (!el.hasAttribute('data-glass-covered')) el.setAttribute('data-glass-covered', '');
            let cover = covers.get(el);
            if (!cover || cover.parentElement !== el) {
                cover = document.createElement('canvas');
                cover.className = 'glass-cover';
                cover.setAttribute('aria-hidden', 'true');
                el.prepend(cover);
                covers.set(el, cover);
            }
            const w = Math.max(1, Math.round(r.width * dpr));
            const h = Math.max(1, Math.round(r.height * dpr));
            if (cover.width !== w || cover.height !== h) {
                cover.width = w;
                cover.height = h;
            }
            cover.getContext('2d')?.drawImage(canvas, Math.round(r.left * dpr), Math.round(r.top * dpr), w, h, 0, 0, w, h);
        }
        for (const [el, cover] of covers) {
            if (!seen.has(el)) {
                cover.remove();
                covers.delete(el);
                el.removeAttribute('data-glass-covered');
            }
        }
    }
    function clearCovers() {
        for (const [el, cover] of covers) {
            cover.remove();
            el.removeAttribute('data-glass-covered');
        }
        covers.clear();
    }

    function request() {
        if (!frame && !disposed) frame = requestAnimationFrame(draw);
    }

    function updateActive() {
        const next = !!wallpaper && !gl!.isContextLost() && !blocked.some((m) => m.matches);
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
        dark = app.classList.contains('darkmode');
        const url = readWallpaperUrl(style);
        if (url && url !== wallpaperUrl) void loadWallpaper(url);
        request();
    }

    const onScroll = (e: Event) => {
        if (e.target instanceof Element && e.target.querySelector(`:scope > ${SURFACE_SELECTOR}`)) request();
    };
    const onPointer = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || params.pointerLight <= 0) return;
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
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    addEventListener('pointermove', onPointer, { passive: true });
    canvas.addEventListener('webglcontextlost', onLost);

    canvas.hidden = true;
    app.prepend(canvas);
    refresh();

    return () => {
        disposed = true;
        if (frame) cancelAnimationFrame(frame);
        attributes.disconnect();
        structure.disconnect();
        resize.disconnect();
        for (const m of blocked) m.removeEventListener('change', updateActive);
        removeEventListener('resize', request);
        document.removeEventListener('scroll', onScroll, { capture: true });
        removeEventListener('pointermove', onPointer);
        canvas.removeEventListener('webglcontextlost', onLost);
        app.classList.remove(ACTIVE_CLASS);
        for (const el of app.querySelectorAll('[data-glass-drawn]')) el.removeAttribute('data-glass-drawn');
        clearCovers();
        canvas.remove();
        gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
}
