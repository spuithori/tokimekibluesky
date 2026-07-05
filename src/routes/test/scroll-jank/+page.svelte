<script lang="ts">
    interface Variant {
        radius: 'none' | 'scroller' | 'wrapper' | 'paint' | 'sibling';
        radiusPx: number;
        sticky: boolean;
        nestedRadius: boolean;
        willChange: boolean;
        containPaint: boolean;
        opaque: boolean;
        clipPath: boolean;
        scrollbars: boolean;
        heavy: boolean;
    }

    let variant = $state<Variant>({
        radius: 'none',
        radiusPx: 18,
        sticky: true,
        nestedRadius: true,
        willChange: false,
        containPaint: false,
        opaque: true,
        clipPath: false,
        scrollbars: false,
        heavy: false,
    });

    let frameDeltas: number[] = [];
    let sampling = false;

    function startSampler() {
        frameDeltas = [];
        sampling = true;
        let last = performance.now();
        const tick = (now: number) => {
            if (!sampling) return;
            frameDeltas.push(now - last);
            last = now;
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    function stopSampler() {
        sampling = false;
        return frameDeltas.slice(1);
    }

    if (typeof window !== 'undefined') {
        (window as any).__jankTest = {
            ready: true,
            setVariant(v: Partial<Variant>) {
                variant = { ...variant, ...v };
            },
            startSampler,
            stopSampler,
            colRect() {
                const el = document.querySelectorAll('.col')[1];
                return el ? el.getBoundingClientRect().toJSON() : null;
            },
            colScrollTop() {
                const el = document.querySelectorAll('.col')[1] as HTMLElement;
                return el ? el.scrollTop : null;
            },
        };
    }

    const cols = Array.from({ length: 5 }, (_, i) => i);
    const posts = Array.from({ length: 80 }, (_, i) => i);

    interface ScrollStartRecord {
        at: string;
        maxFrameMs: number;
    }

    let hudFps = $state(0);
    let hudMax1s = $state(0);
    let scrollStarts = $state<ScrollStartRecord[]>([]);

    let lastScrollTs = 0;
    let pendingStart: { until: number; max: number } | null = null;

    function handleAnyScroll() {
        const now = performance.now();
        if (now - lastScrollTs > 500) {
            if (pendingStart) {
                scrollStarts = [...scrollStarts.slice(-9), { at: new Date().toLocaleTimeString(), maxFrameMs: Math.round(pendingStart.max * 10) / 10 }];
            }
            pendingStart = { until: now + 250, max: 0 };
        }
        lastScrollTs = now;
    }

    $effect(() => {
        let on = true;
        let last = performance.now();
        const window1s: number[] = [];
        const tick = (now: number) => {
            if (!on) return;
            const delta = now - last;
            last = now;
            window1s.push(delta);
            while (window1s.length > 60) window1s.shift();
            hudFps = Math.round(1000 / (window1s.reduce((a, b) => a + b, 0) / window1s.length));
            hudMax1s = Math.round(Math.max(...window1s) * 10) / 10;
            if (pendingStart) {
                if (now <= pendingStart.until) {
                    pendingStart.max = Math.max(pendingStart.max, delta);
                } else {
                    scrollStarts = [...scrollStarts.slice(-9), { at: new Date().toLocaleTimeString(), maxFrameMs: Math.round(pendingStart.max * 10) / 10 }];
                    pendingStart = null;
                }
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        return () => {
            on = false;
        };
    });
</script>

<div class="panel">
    <div class="hud">
        <span class="hud__fps">{hudFps} fps</span>
        <span class="hud__max" class:hud__max--bad={hudMax1s > 32}>max {hudMax1s}ms</span>
    </div>

    <label>radius:
        <select bind:value={variant.radius}>
            <option value="none">none</option>
            <option value="scroller">scroller (clip)</option>
            <option value="wrapper">wrapper (clip)</option>
            <option value="paint">paint (親・no clip)</option>
            <option value="sibling">sibling (兄弟装飾・非祖先)</option>
        </select>
    </label>
    <label>px <input type="range" min="0" max="40" bind:value={variant.radiusPx}> {variant.radiusPx}</label>
    <label><input type="checkbox" bind:checked={variant.sticky}> sticky header</label>
    <label><input type="checkbox" bind:checked={variant.nestedRadius}> nested radius</label>
    <label><input type="checkbox" bind:checked={variant.scrollbars}> custom scrollbars</label>
    <label><input type="checkbox" bind:checked={variant.heavy}> heavy paint</label>
    <label><input type="checkbox" bind:checked={variant.willChange}> will-change</label>
    <label><input type="checkbox" bind:checked={variant.containPaint}> contain:paint</label>
    <label><input type="checkbox" bind:checked={variant.opaque}> opaque bg</label>
    <label><input type="checkbox" bind:checked={variant.clipPath}> clip-path代替</label>

    <div class="starts">
        <strong>scroll starts (max frame ms)</strong>
        {#each [...scrollStarts].reverse() as s (s.at + s.maxFrameMs)}
            <div class="starts__row" class:starts__row--bad={s.maxFrameMs > 32}>{s.at} — {s.maxFrameMs}ms</div>
        {/each}
    </div>
</div>

<div
    class="hwrap"
    onscrollcapture={handleAnyScroll}
    class:hwrap--radius={variant.radius === 'wrapper' && !variant.clipPath}
    class:hwrap--clippath={variant.radius === 'wrapper' && variant.clipPath}
    class:hwrap--paint={variant.radius === 'paint'}
    class:hwrap--sibling={variant.radius === 'sibling'}
    style:--r="{variant.radiusPx}px"
>
    {#if variant.radius === 'sibling'}
        <div class="hbg"></div>
    {/if}
    <div
        class="hscroll"
        class:hscroll--radius={variant.radius === 'scroller' && !variant.clipPath}
        class:hscroll--clippath={variant.radius === 'scroller' && variant.clipPath}
        class:hscroll--willchange={variant.willChange}
        class:hscroll--contain={variant.containPaint}
        class:hscroll--opaque={variant.opaque}
        class:hscroll--scrollbars={variant.scrollbars}
    >
        {#each cols as c (c)}
            <div class="col" class:col--willchange={variant.willChange} class:col--scrollbars={variant.scrollbars}>
                {#if variant.sticky}
                    <div class="head">Column {c}</div>
                {/if}
                {#each posts as p (p)}
                    <div class="card" class:card--radius={variant.nestedRadius} class:card--heavy={variant.heavy}>
                        <div class="avatar" class:avatar--heavy={variant.heavy}></div>
                        <div class="body">
                            <strong>post {c}-{p}</strong>
                            <p>柊の垣根の向こうで椋鳥が鳴いている。畑のトマトがようやく色づいてきた。今年は雨が多かったけれど、味は濃くなりそうだ。</p>
                        </div>
                    </div>
                {/each}
            </div>
        {/each}
    </div>
</div>

<style>
    :global(body) {
        margin: 0;
        background: #b9b4a2;
        font-family: sans-serif;
    }

    .hwrap {
        margin: 24px;
        height: calc(100dvh - 48px);
    }

    .panel {
        position: fixed;
        top: 8px;
        right: 8px;
        z-index: 100;
        width: 240px;
        padding: 10px;
        border-radius: 8px;
        background: rgba(30, 34, 28, 0.92);
        color: #eee;
        font-size: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .panel label {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .hud {
        display: flex;
        gap: 10px;
        font-size: 15px;
        font-weight: bold;
        margin-bottom: 4px;
    }

    .hud__max--bad {
        color: #ff7d6b;
    }

    .starts {
        margin-top: 6px;
        border-top: 1px solid #555;
        padding-top: 6px;
        max-height: 180px;
        overflow-y: auto;
    }

    .starts__row--bad {
        color: #ff7d6b;
        font-weight: bold;
    }

    .hwrap--radius {
        border-radius: var(--r);
        overflow: clip;
    }

    .hwrap--clippath {
        clip-path: inset(0 round var(--r));
    }

    .hwrap--paint {
        border-radius: var(--r);
        background: #f2efe2;
    }

    .hwrap--paint .hscroll {
        background: transparent;
    }

    .hwrap--sibling {
        position: relative;
        isolation: isolate;
    }

    .hbg {
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        border-radius: var(--r);
        background: #f2efe2;
    }

    .hwrap--sibling .hscroll {
        background: transparent;
    }

    .hscroll {
        display: flex;
        gap: 10px;
        padding: 8px;
        height: 100%;
        box-sizing: border-box;
        overflow-x: auto;
        overflow-y: hidden;
        background: rgba(250, 247, 236, 0.55);
    }

    .hscroll--opaque {
        background: #f2efe2;
    }

    .hscroll--radius {
        border-radius: var(--r);
    }

    .hscroll--clippath {
        clip-path: inset(0 round var(--r));
    }

    .hscroll--willchange {
        will-change: transform;
    }

    .hscroll--contain {
        contain: paint;
    }

    .col {
        flex: 0 0 340px;
        overflow-y: scroll;
        background: #fbf8ef;
        border: 1px solid #d5d8bd;
    }

    .col--willchange {
        will-change: transform;
    }

    .head {
        position: sticky;
        top: 0;
        z-index: 1;
        height: 44px;
        line-height: 44px;
        padding: 0 12px;
        background: #faf7ec;
        border-bottom: 1px solid #d5d8bd;
        font-weight: bold;
    }

    .card {
        display: flex;
        gap: 8px;
        padding: 10px;
        border-bottom: 1px solid #e4e0cd;
        background: #fbf8ef;
    }

    .card--radius {
        border-radius: 12px;
        overflow: clip;
    }

    .avatar {
        flex: 0 0 42px;
        height: 42px;
        border-radius: 50%;
        background: linear-gradient(135deg, #7ba05b, #4e7d4a);
    }

    .body p {
        margin: 4px 0 0;
        font-size: 13px;
        color: #33402e;
    }

    .card--heavy {
        box-shadow: 0 2px 10px rgba(46, 58, 41, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.7);
        background-image: linear-gradient(180deg, #fdfbf3, #f4f0df);
    }

    .avatar--heavy {
        background: radial-gradient(circle at 30% 30%, #a4c48a, #4e7d4a 60%, #2e3a29);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    }

    .col--scrollbars {
        scrollbar-color: #d5d8bd #f2efe2;

        &::-webkit-scrollbar {
            width: 6px;
        }

        &::-webkit-scrollbar-thumb {
            background: #d5d8bd;
        }

        &::-webkit-scrollbar-track {
            background: #f2efe2;
        }
    }

    .hscroll--scrollbars {
        &::-webkit-scrollbar {
            height: 8px;
        }

        &::-webkit-scrollbar-thumb {
            background: #d5d8bd;
        }

        &::-webkit-scrollbar-track {
            background: #f2efe2;
        }
    }
</style>
