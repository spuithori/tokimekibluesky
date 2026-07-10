export type Level = {
    index: number;
    width?: number;
    height?: number;
    bitrate: number;
    codecs: string;
    uri: string;
};

type Segment = { uri: string; duration: number };
type MediaPlaylist = { segments: Segment[]; duration: number };
type Transmuxed = { init: Uint8Array<ArrayBuffer>; data: Uint8Array<ArrayBuffer>; type: string };

const FORWARD_BUFFER_GOAL = 15;
const BACK_BUFFER_KEEP = 10;
const MAX_BUFFER_HOLE = 0.5;
const AUDIO_CODEC = 'mp4a.40.2';
const MAX_TRANSMUX_FAIL_STREAK = 3;

function resolveUrl(base: string, relative: string): string {
    return new URL(relative, base).href;
}

function parseAttributes(input: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const re = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(input))) {
        attrs[m[1]] = m[2].replace(/^"|"$/g, '');
    }
    return attrs;
}

function parseMaster(text: string, masterUrl: string): Level[] {
    const lines = text.split(/\r?\n/);
    const levels: Level[] = [];
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].startsWith('#EXT-X-STREAM-INF:')) continue;
        const uriLine = lines[i + 1]?.trim();
        if (!uriLine || uriLine.startsWith('#')) continue;
        const attrs = parseAttributes(lines[i].slice('#EXT-X-STREAM-INF:'.length));
        const res = attrs['RESOLUTION']?.split('x');
        levels.push({
            index: 0,
            width: res ? parseInt(res[0], 10) : undefined,
            height: res ? parseInt(res[1], 10) : undefined,
            bitrate: parseInt(attrs['BANDWIDTH'] || '0', 10),
            codecs: attrs['CODECS'] || 'avc1.42E01E',
            uri: resolveUrl(masterUrl, uriLine),
        });
    }
    levels.sort((a, b) => a.bitrate - b.bitrate);
    levels.forEach((level, index) => { level.index = index; });
    return levels;
}

function parseMedia(text: string, playlistUrl: string): MediaPlaylist {
    const lines = text.split(/\r?\n/);
    const segments: Segment[] = [];
    let duration = 0;
    let pending = 0;
    for (const raw of lines) {
        const line = raw.trim();
        if (line.startsWith('#EXTINF:')) {
            pending = parseFloat(line.slice('#EXTINF:'.length));
        } else if (line && !line.startsWith('#')) {
            segments.push({ uri: resolveUrl(playlistUrl, line), duration: pending });
            duration += pending;
            pending = 0;
        }
    }
    return { segments, duration };
}

function videoCodecOf(codecs: string): string {
    return codecs.split(',').map((c) => c.trim()).find((c) => c.startsWith('avc')) || codecs;
}

export class BlueskyHls {
    levels: Level[] = [];
    onLevels: ((levels: Level[], currentLevel: number) => void) | null = null;
    onError: ((err: unknown) => void) | null = null;

    private video: HTMLVideoElement;
    private worker: Worker | null = null;
    private workerSeq = 0;
    private workerPending = new Map<number, (result: Transmuxed | null) => void>();

    private mediaSource: MediaSource | null = null;
    private sourceBuffer: SourceBuffer | null = null;
    private objectUrl: string | null = null;
    private sbCodec = '';

    private requestedLevel = -1;
    private activeLevel = 0;
    private playlists = new Map<number, MediaPlaylist>();
    private segments: Segment[] = [];
    private segmentStarts: number[] = [];
    private totalDuration = 0;

    private session = 0;
    private nextSegIdx = 0;
    private sessionFirstAppend = false;
    private pendingOffset = 0;
    private endRequested = false;
    private transmuxFailStreak = 0;

    private appendQueue: { offset?: number; bytes?: Uint8Array<ArrayBuffer> }[] = [];

    private loading = false;
    private destroyed = false;
    private switching = false;
    private bandwidth = 1_500_000;
    private abort = new AbortController();

    private recovering = false;
    private recoverCount = 0;
    private resumeSegIdx = 0;
    private pendingSeekTime = -1;
    private resumeWasPlaying = false;
    private lastRecoverTime = -1;

    constructor(video: HTMLVideoElement) {
        this.video = video;
        this.onUpdateEnd = this.onUpdateEnd.bind(this);
        this.onSourceOpen = this.onSourceOpen.bind(this);
        this.onSeeking = this.onSeeking.bind(this);
        this.onTimeUpdate = this.onTimeUpdate.bind(this);
        this.onWaiting = this.onWaiting.bind(this);
    }

    get currentLevel(): number {
        return this.requestedLevel === -1 ? -1 : this.activeLevel;
    }

    set currentLevel(index: number) {
        this.requestedLevel = index;
        if (index === -1) {
            const ideal = this.pickAutoLevel();
            if (ideal !== this.activeLevel) this.switchLevel(ideal);
        } else if (index !== this.activeLevel) {
            this.switchLevel(index);
        }
    }

    async loadSource(masterUrl: string): Promise<void> {
        try {
            this.worker = new Worker(new URL('./transmuxWorker.ts', import.meta.url), { type: 'module' });
            this.worker.onmessage = (event: MessageEvent) => {
                const { id, init, data, kind } = event.data;
                const resolve = this.workerPending.get(id);
                if (!resolve) return;
                this.workerPending.delete(id);
                resolve(init && data ? { init: new Uint8Array(init), data: new Uint8Array(data), type: kind } : null);
            };
            if (this.destroyed) return;

            const masterText = await this.fetchText(masterUrl);
            this.levels = parseMaster(masterText, masterUrl);
            if (this.levels.length === 0) {
                this.levels = [{ index: 0, bitrate: 0, codecs: 'avc1.42E01E', uri: masterUrl }];
            }

            this.activeLevel = this.pickAutoLevel();
            await this.applyPlaylist(this.activeLevel);
            if (this.destroyed) return;

            this.onLevels?.(this.levels, this.currentLevel);
            this.setupMediaSource();
        } catch (err) {
            if (!this.destroyed) this.onError?.(err);
        }
    }

    destroy(): void {
        this.destroyed = true;
        this.session++;
        this.abort.abort();
        this.video.removeEventListener('seeking', this.onSeeking);
        this.video.removeEventListener('timeupdate', this.onTimeUpdate);
        this.video.removeEventListener('waiting', this.onWaiting);
        if (this.sourceBuffer) {
            this.sourceBuffer.removeEventListener('updateend', this.onUpdateEnd);
            try {
                if (this.mediaSource && this.mediaSource.readyState === 'open') {
                    this.sourceBuffer.abort();
                }
            } catch {}
        }
        try {
            if (this.mediaSource && this.mediaSource.readyState === 'open') {
                this.mediaSource.endOfStream();
            }
        } catch {}
        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl);
            this.objectUrl = null;
        }
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.workerPending.clear();
        this.sourceBuffer = null;
        this.mediaSource = null;
        this.appendQueue = [];
    }

    private async fetchText(url: string): Promise<string> {
        const res = await fetch(url, { signal: this.abort.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        return res.text();
    }

    private async applyPlaylist(levelIdx: number): Promise<void> {
        let playlist = this.playlists.get(levelIdx);
        if (!playlist) {
            const text = await this.fetchText(this.levels[levelIdx].uri);
            playlist = parseMedia(text, this.levels[levelIdx].uri);
            this.playlists.set(levelIdx, playlist);
        }
        this.segments = playlist.segments;
        this.totalDuration = playlist.duration;
        this.segmentStarts = [];
        let acc = 0;
        for (const seg of this.segments) {
            this.segmentStarts.push(acc);
            acc += seg.duration;
        }
    }

    private pickAutoLevel(): number {
        let chosen = 0;
        for (let i = 0; i < this.levels.length; i++) {
            if (this.levels[i].bitrate <= this.bandwidth * 0.9) chosen = i;
        }
        return chosen;
    }

    private setupMediaSource(): void {
        this.mediaSource = new MediaSource();
        this.objectUrl = URL.createObjectURL(this.mediaSource);
        this.mediaSource.addEventListener('sourceopen', this.onSourceOpen, { once: true });
        this.video.addEventListener('seeking', this.onSeeking);
        this.video.addEventListener('timeupdate', this.onTimeUpdate);
        this.video.addEventListener('waiting', this.onWaiting);
        this.video.src = this.objectUrl;
    }

    private onSourceOpen(): void {
        if (this.destroyed || !this.mediaSource) return;
        try {
            if (this.totalDuration > 0) this.mediaSource.duration = this.totalDuration;
        } catch {}
        const segIdx = this.resumeSegIdx;
        this.resumeSegIdx = 0;
        this.startSession(segIdx);
    }

    private startSession(segIdx: number): void {
        this.session++;
        this.nextSegIdx = segIdx;
        this.sessionFirstAppend = true;
        this.pendingOffset = this.segmentStarts[segIdx] ?? 0;
        this.endRequested = false;
        this.transmuxFailStreak = 0;
        this.worker?.postMessage({ type: 'reset' });
        this.pump();
    }

    private transmuxOne(bytes: Uint8Array): Promise<Transmuxed | null> {
        return new Promise((resolve) => {
            if (!this.worker) { resolve(null); return; }
            const id = ++this.workerSeq;
            this.workerPending.set(id, resolve);
            const buffer = bytes.buffer as ArrayBuffer;
            this.worker.postMessage({ type: 'segment', id, bytes: buffer }, [buffer]);
        });
    }

    private bufferedAhead(): number {
        const buffered = this.sourceBuffer?.buffered;
        if (!buffered || buffered.length === 0) return 0;
        const t = this.video.currentTime;
        for (let i = 0; i < buffered.length; i++) {
            if (t >= buffered.start(i) - 0.5 && t <= buffered.end(i) + 0.5) {
                return buffered.end(i) - t;
            }
        }
        return 0;
    }

    private async pump(): Promise<void> {
        if (this.loading || this.destroyed || !this.worker || this.recovering || this.switching) return;
        if (!this.mediaSource || this.mediaSource.readyState === 'closed') return;
        if (this.video.error) { this.recover(); return; }
        if (this.nextSegIdx >= this.segments.length) {
            this.maybeEndOfStream();
            return;
        }
        if (this.sourceBuffer && this.bufferedAhead() >= FORWARD_BUFFER_GOAL) return;

        if (this.requestedLevel === -1 && this.appendQueue.length === 0) {
            const ideal = this.pickAutoLevel();
            if (ideal !== this.activeLevel) { this.switchLevel(ideal); return; }
        }

        this.loading = true;
        const session = this.session;
        const idx = this.nextSegIdx;
        try {
            const bytes = await this.fetchSegment(this.segments[idx].uri);
            if (this.destroyed || session !== this.session) return;

            const out = await this.transmuxOne(bytes);
            if (this.destroyed || session !== this.session) return;

            if (!out) {
                this.nextSegIdx = idx + 1;
                if (this.sessionFirstAppend) {
                    this.pendingOffset = this.segmentStarts[idx + 1] ?? this.pendingOffset;
                }
                if (++this.transmuxFailStreak === MAX_TRANSMUX_FAIL_STREAK) {
                    this.onError?.(new Error('transmux produced no output'));
                }
                return;
            }
            this.transmuxFailStreak = 0;

            if (!this.sourceBuffer) this.createSourceBuffer(out.type);

            if (this.sessionFirstAppend) {
                this.sessionFirstAppend = false;
                this.appendQueue.push({ offset: this.pendingOffset });
                this.appendQueue.push({ bytes: out.init });
            }
            this.appendQueue.push({ bytes: out.data });
            this.nextSegIdx = idx + 1;
            this.flushAppendQueue();
        } catch (err) {
            if (!this.destroyed && session === this.session) this.onError?.(err);
        } finally {
            this.loading = false;
            this.pump();
        }
    }

    private async fetchSegment(url: string): Promise<Uint8Array> {
        const start = performance.now();
        const res = await fetch(url, { signal: this.abort.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} for segment`);
        const buf = new Uint8Array(await res.arrayBuffer());
        const elapsed = (performance.now() - start) / 1000;
        if (elapsed > 0 && buf.byteLength > 0) {
            const sample = (buf.byteLength * 8) / elapsed;
            this.bandwidth = this.bandwidth * 0.6 + sample * 0.4;
        }
        return buf;
    }

    private createSourceBuffer(type: string): void {
        if (!this.mediaSource) return;
        const videoCodec = videoCodecOf(this.levels[this.activeLevel].codecs);
        const codec = type === 'combined' ? `${videoCodec},${AUDIO_CODEC}` : videoCodec;
        this.sbCodec = `video/mp4; codecs="${codec}"`;
        this.sourceBuffer = this.mediaSource.addSourceBuffer(this.sbCodec);
        this.sourceBuffer.addEventListener('updateend', this.onUpdateEnd);
    }

    private flushAppendQueue(): void {
        const sb = this.sourceBuffer;
        if (!sb || sb.updating || this.appendQueue.length === 0 || this.destroyed) return;
        if (this.video.error || !this.mediaSource || this.mediaSource.readyState === 'closed') {
            this.recover();
            return;
        }
        const item = this.appendQueue.shift()!;
        try {
            if (item.offset !== undefined) {
                sb.timestampOffset = item.offset;
                this.flushAppendQueue();
            } else if (item.bytes) {
                sb.appendBuffer(item.bytes);
            }
        } catch (err) {
            this.recover(err);
        }
    }

    private onUpdateEnd(): void {
        if (this.destroyed) return;
        this.maybeSeekAfterRecover();
        this.evictBackBuffer();
        this.flushAppendQueue();
        if (this.video.readyState <= 2) this.maybeJumpHole();
        this.pump();
    }

    private onWaiting(): void {
        this.maybeJumpHole();
    }

    private maybeJumpHole(): void {
        if (this.destroyed || this.video.seeking || this.video.paused) return;
        const t = this.video.currentTime;
        const buffered = this.video.buffered;
        for (let i = 0; i < buffered.length; i++) {
            const start = buffered.start(i);
            if (start > t && start - t <= MAX_BUFFER_HOLE) {
                this.video.currentTime = start + 0.01;
                return;
            }
        }
    }

    private maybeSeekAfterRecover(): void {
        if (this.pendingSeekTime < 0 || !this.sourceBuffer) return;
        const buffered = this.sourceBuffer.buffered;
        for (let i = 0; i < buffered.length; i++) {
            if (this.pendingSeekTime >= buffered.start(i) - 0.5 && this.pendingSeekTime <= buffered.end(i)) {
                const t = Math.max(this.pendingSeekTime, buffered.start(i));
                this.pendingSeekTime = -1;
                try { this.video.currentTime = t; } catch {}
                if (this.resumeWasPlaying) this.video.play().catch(() => {});
                return;
            }
        }
    }

    private recover(err?: unknown): void {
        if (this.recovering || this.destroyed) return;
        if (this.recoverCount >= 4) {
            if (err) this.onError?.(err);
            return;
        }
        this.recovering = true;
        this.recoverCount++;
        const resumeTime = this.video.currentTime || 0;
        this.lastRecoverTime = resumeTime;
        this.resumeWasPlaying = !this.video.paused;

        this.session++;
        this.appendQueue = [];
        this.loading = false;
        this.switching = false;
        this.endRequested = false;

        if (this.sourceBuffer) {
            try { this.sourceBuffer.removeEventListener('updateend', this.onUpdateEnd); } catch {}
            this.sourceBuffer = null;
        }
        this.video.removeEventListener('seeking', this.onSeeking);
        this.video.removeEventListener('timeupdate', this.onTimeUpdate);
        this.video.removeEventListener('waiting', this.onWaiting);
        if (this.objectUrl) {
            try { URL.revokeObjectURL(this.objectUrl); } catch {}
            this.objectUrl = null;
        }
        this.mediaSource = null;

        let segIdx = 0;
        for (let i = 0; i < this.segmentStarts.length; i++) {
            if (this.segmentStarts[i] <= resumeTime) segIdx = i;
        }
        this.resumeSegIdx = segIdx;
        this.pendingSeekTime = this.segmentStarts[segIdx] ?? 0;

        this.recovering = false;
        this.setupMediaSource();
    }

    private evictBackBuffer(): void {
        const sb = this.sourceBuffer;
        if (!sb || sb.updating || this.appendQueue.length > 0) return;
        const target = this.video.currentTime - BACK_BUFFER_KEEP;
        if (target <= 0 || sb.buffered.length === 0) return;
        const start = sb.buffered.start(0);
        if (target - start > 5) {
            try { sb.remove(start, target); } catch {}
        }
    }

    private maybeEndOfStream(): void {
        if (this.endRequested || !this.mediaSource || this.mediaSource.readyState !== 'open') return;
        if (this.sourceBuffer?.updating || this.appendQueue.length > 0) return;
        this.endRequested = true;
        try { this.mediaSource.endOfStream(); } catch {}
    }

    private async switchLevel(levelIdx: number): Promise<void> {
        if (this.destroyed || this.recovering || this.switching || levelIdx === this.activeLevel) return;
        this.switching = true;
        const session = this.session;
        const resumeIdx = this.nextSegIdx;
        const codecChanged =
            videoCodecOf(this.levels[levelIdx].codecs) !== videoCodecOf(this.levels[this.activeLevel].codecs);
        try {
            await this.applyPlaylist(levelIdx);
        } catch (err) {
            this.switching = false;
            if (!this.destroyed) this.onError?.(err);
            this.pump();
            return;
        }
        if (this.destroyed) { this.switching = false; return; }
        if (this.session !== session) {
            await this.applyPlaylist(this.activeLevel);
            this.switching = false;
            this.pump();
            return;
        }
        this.activeLevel = levelIdx;
        if (codecChanged && this.sourceBuffer && !this.sourceBuffer.updating) {
            const codec = `${videoCodecOf(this.levels[levelIdx].codecs)},${AUDIO_CODEC}`;
            try { this.sourceBuffer.changeType(`video/mp4; codecs="${codec}"`); } catch {}
        }
        this.appendQueue = [];
        this.onLevels?.(this.levels, this.currentLevel);
        this.switching = false;
        this.startSession(Math.min(resumeIdx, this.segments.length - 1));
    }

    private onSeeking(): void {
        if (this.destroyed || !this.sourceBuffer) return;
        const t = this.video.currentTime;
        const buffered = this.sourceBuffer.buffered;
        for (let i = 0; i < buffered.length; i++) {
            if (t >= buffered.start(i) - 0.5 && t <= buffered.end(i)) return;
        }
        let segIdx = 0;
        for (let i = 0; i < this.segmentStarts.length; i++) {
            if (this.segmentStarts[i] <= t) segIdx = i;
        }
        this.appendQueue = [];
        this.startSession(segIdx);
    }

    private onTimeUpdate(): void {
        if (this.lastRecoverTime >= 0 && this.video.currentTime > this.lastRecoverTime + 3) {
            this.recoverCount = 0;
            this.lastRecoverTime = -1;
        }
        if (!this.loading) this.pump();
    }
}
