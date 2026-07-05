interface JankRecord {
    at: string;
    kind: 'main-frame-gap' | 'scroll-stream-gap' | 'first-scroll-latency' | 'loaf-block' | 'event-timing';
    gapMs: number;
    idleBeforeMs: number;
    target: string;
    scrollTop: number | null;
    runningAnimations: { name: string; target: string }[];
    pendingImages: number;
    recentLoafs: { dur: number; blocking: number; scripts: string[] }[];
    recentLongtasks: number[];
    heapMB: number | null;
    dpr: number;
}

export function initJankProbe(mode: string = '1') {
    const flags = new Set(mode.split(','));
    const withDetectors = flags.has('1') || flags.has('noraf');
    const withRafLoop = flags.has('1') || flags.has('raf');

    if (flags.has('heartbeat')) {
        const el = document.createElement('div');
        el.style.cssText =
            'position:fixed;left:0;top:0;width:1px;height:1px;pointer-events:none;opacity:0.01;z-index:2147483647;will-change:transform;';
        document.body.appendChild(el);
        el.animate(
            [{ transform: 'translateX(0px)' }, { transform: 'translateX(0.5px)' }],
            { duration: 1000, iterations: Infinity },
        );
        console.info('[jankProbe] heartbeat: コンポジタ専用1pxアニメ常駐(メインスレッド負荷ゼロのキープウォーム候補)');
    }

    if (withRafLoop && !withDetectors) {
        const keepAlive = () => {
            requestAnimationFrame(keepAlive);
        };
        requestAnimationFrame(keepAlive);
        console.info('[jankProbe] mode=raf: rAF常時ループのみ(検出なし・マスク剤の単離テスト)');
        return;
    }

    if (!withDetectors) {
        return;
    }

    const log: JankRecord[] = [];
    (window as any).__jankLog = log;

    const loafs: { ts: number; dur: number; blocking: number; scripts: string[] }[] = [];
    const longtasks: { ts: number; dur: number }[] = [];

    try {
        new PerformanceObserver((list) => {
            for (const e of list.getEntries() as any[]) {
                loafs.push({
                    ts: e.startTime,
                    dur: Math.round(e.duration),
                    blocking: Math.round(e.blockingDuration ?? 0),
                    scripts: (e.scripts ?? []).map(
                        (s: any) => `${s.invoker ?? ''}@${(s.sourceURL ?? '').split('/').slice(-1)[0]}:${s.sourceFunctionName ?? ''}`,
                    ),
                });
                if (loafs.length > 20) loafs.shift();
                if (e.duration > 100) {
                    report('loaf-block', e.duration, lastScrollTarget);
                }
            }
        }).observe({ type: 'long-animation-frame', buffered: true } as any);
    } catch {}

    try {
        new PerformanceObserver((list) => {
            for (const e of list.getEntries() as any[]) {
                if (e.duration > 100 && /wheel|pointer|touch|mouse/.test(e.name)) {
                    report('event-timing', e.duration, e.target ?? lastScrollTarget);
                }
            }
        }).observe({ type: 'event', durationThreshold: 96, buffered: true } as any);
    } catch {}

    try {
        new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
                longtasks.push({ ts: e.startTime, dur: Math.round(e.duration) });
                if (longtasks.length > 20) longtasks.shift();
            }
        }).observe({ type: 'longtask', buffered: true });
    } catch {}

    let lastWheel = 0;
    let burstStartIdle = 0;
    let lastScrollEvt = 0;
    let lastScrollTarget: EventTarget | null = null;
    let lastReport = 0;

    function describeTarget(t: EventTarget | null): string {
        if (!(t instanceof Element)) return String(t);
        const cls = typeof t.className === 'string' ? t.className.split(' ').slice(0, 3).join('.') : '';
        const heading = t.closest?.('.deck-row-wrap')?.querySelector('.deck-heading')?.textContent?.trim().slice(0, 30) ?? '';
        return `${t.tagName.toLowerCase()}.${cls}${heading ? ` [${heading}]` : ''}`;
    }

    function report(kind: JankRecord['kind'], gapMs: number, target: EventTarget | null) {
        const now = performance.now();
        if (now - lastReport < 250) return;
        lastReport = now;
        const idleBeforeMs = Math.round(burstStartIdle);
        requestAnimationFrame(() => {
            let runningAnimations: { name: string; target: string }[] = [];
            try {
                runningAnimations = document
                    .getAnimations()
                    .filter((a) => a.playState === 'running')
                    .slice(0, 15)
                    .map((a: any) => ({
                        name: a.animationName ?? a.transitionProperty ?? a.constructor.name,
                        target: describeTarget(a.effect?.target ?? null),
                    }));
            } catch {}
            const record: JankRecord = {
                at: new Date().toISOString(),
                kind,
                gapMs: Math.round(gapMs * 10) / 10,
                idleBeforeMs,
                target: describeTarget(target),
                scrollTop: target instanceof Element ? Math.round((target as HTMLElement).scrollTop) : null,
                runningAnimations,
                pendingImages: document.querySelectorAll('img.lazy-image:not(.loaded)').length,
                recentLoafs: loafs.slice(-3).map(({ dur, blocking, scripts }) => ({ dur, blocking, scripts })),
                recentLongtasks: longtasks.slice(-3).map((t) => t.dur),
                heapMB: (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1048576) : null,
                dpr: window.devicePixelRatio,
            };
            log.push(record);
            if (log.length > 100) log.shift();
            console.warn(`[JANK ${kind}] gap=${record.gapMs}ms idle前=${record.idleBeforeMs}ms 対象=${record.target}`, record);
        });
    }

    let burstFirstWheel = 0;
    let awaitingFirstScroll = false;

    window.addEventListener(
        'wheel',
        (e) => {
            const now = performance.now();
            const inputDelay = now - e.timeStamp;
            if (inputDelay > 100) {
                report('event-timing', inputDelay, e.target);
            }
            const sinceLast = now - Math.max(lastWheel, lastScrollEvt);
            if (sinceLast > 1000) {
                burstStartIdle = sinceLast;
                burstFirstWheel = e.timeStamp;
                awaitingFirstScroll = true;
            }
            lastWheel = now;
        },
        { passive: true, capture: true },
    );

    window.addEventListener(
        'scroll',
        (e) => {
            const now = performance.now();
            if (awaitingFirstScroll) {
                awaitingFirstScroll = false;
                const latency = now - burstFirstWheel;
                if (latency > 100) {
                    report('first-scroll-latency', latency, e.target);
                }
            } else {
                const gap = now - lastScrollEvt;
                const wheelActive = now - lastWheel < 800;
                if (wheelActive && lastScrollTarget === e.target && gap > 48 && gap < 2000) {
                    report('scroll-stream-gap', gap, e.target);
                }
            }
            lastScrollEvt = now;
            lastScrollTarget = e.target;
        },
        { passive: true, capture: true },
    );

    if (withRafLoop) {
        let lastFrame = performance.now();
        const frameLoop = (now: number) => {
            const gap = now - lastFrame;
            lastFrame = now;
            if (gap > 40 && now - lastWheel < 500) {
                report('main-frame-gap', gap, lastScrollTarget);
            }
            requestAnimationFrame(frameLoop);
        };
        requestAnimationFrame(frameLoop);
    }

    console.info(`[jankProbe] mode=${mode} 有効(rAFループ=${withRafLoop ? 'あり(ジャンクを覆い隠す可能性)' : 'なし(非干渉検出)'})。全記録: copy(JSON.stringify(window.__jankLog, null, 2)) / 無効化: localStorage.removeItem("jankProbe")`);
}
