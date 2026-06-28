import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { read } from '$app/server';
import iconUrl from './music-note.png?url';
import type { RequestHandler } from './$types';

export const config = {
    runtime: 'nodejs24.x',
    maxDuration: 300,
    memory: 1769,
    split: true,
};

const MAX_DURATION_SEC = 180;
const MAX_INPUT_BYTES = 80 * 1000 * 1000;
const AUDIO_BITRATE = '320k';
const FPS = 20;

const AURORA_FILTER =
    "color=c=0x0a0e16:s=1280x720:r=20:d=2[bg];" +
    "color=c=black@0:s=1280x720:r=20:d=2,format=rgba,geq=r=139:g=92:b=246:a='st(1\\,380+45*sin(PI*T))\\;st(2\\,300+38*cos(PI*T))\\;235*exp(-((X-ld(1))*(X-ld(1))+(Y-ld(2))*(Y-ld(2)))/80000)'[b1];" +
    "color=c=black@0:s=1280x720:r=20:d=2,format=rgba,geq=r=56:g=132:b=255:a='st(1\\,900+42*sin(PI*T+2))\\;st(2\\,440+40*cos(PI*T+2))\\;235*exp(-((X-ld(1))*(X-ld(1))+(Y-ld(2))*(Y-ld(2)))/80000)'[b2];" +
    "color=c=black@0:s=1280x720:r=20:d=2,format=rgba,geq=r=34:g=211:b=238:a='st(1\\,700+40*sin(PI*T+4))\\;st(2\\,280+34*cos(PI*T+4))\\;150*exp(-((X-ld(1))*(X-ld(1))+(Y-ld(2))*(Y-ld(2)))/55000)'[b3];" +
    "[bg][b1]overlay[x1];[x1][b2]overlay[x2];[x2][b3]overlay,noise=alls=6:allf=t+u[aur];" +
    "[0]scale=260:260[ic];" +
    "[aur][ic]overlay=(W-w)/2:(H-h)/2,format=yuv420p[out]";

const ACCEPTED_MIME = new Set([
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/m4a',
    'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'application/ogg',
    'audio/flac', 'audio/x-flac', 'audio/webm',
]);

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function run(bin: string, args: string[]): Promise<{ stdout: Buffer; stderr: string }> {
    return new Promise((resolve, reject) => {
        const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const chunks: Buffer[] = [];
        let stderr = '';
        proc.stdout.on('data', (d: Buffer) => chunks.push(d));
        proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
        proc.on('error', reject);
        proc.on('close', (code) => {
            if (code === 0) resolve({ stdout: Buffer.concat(chunks), stderr });
            else reject(new Error(`${bin} exited ${code}: ${stderr.slice(-500)}`));
        });
    });
}

function jsonError(message: string, status: number): Response {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
}

export const OPTIONS: RequestHandler = () =>
    new Response(null, { status: 204, headers: CORS_HEADERS });

export const POST: RequestHandler = async ({ request }) => {
    if (!ffmpegPath) return jsonError('ffmpeg unavailable', 500);
    const ffprobePath = ffprobeStatic.path;

    let inputBytes: Buffer | undefined;
    let blobUrl: string | undefined;
    const contentType = (request.headers.get('content-type') || '').toLowerCase();

    try {
        if (contentType.includes('application/json')) {
            const body = await request.json();
            blobUrl = body?.blobUrl;
            if (!blobUrl || typeof blobUrl !== 'string') return jsonError('Missing blobUrl', 400);
            const res = await fetch(blobUrl);
            if (!res.ok) return jsonError('Failed to fetch blob', 400);
            inputBytes = Buffer.from(await res.arrayBuffer());
        } else {
            const mime = contentType.split(';')[0].trim();
            if (mime && !ACCEPTED_MIME.has(mime)) return jsonError('Unsupported audio type', 415);
            inputBytes = Buffer.from(await request.arrayBuffer());
        }
    } catch {
        return jsonError('Invalid request body', 400);
    }

    if (!inputBytes?.length) return jsonError('Empty audio', 400);
    if (inputBytes.length > MAX_INPUT_BYTES) return jsonError('Audio too large', 413);

    const dir = await mkdtemp(join(tmpdir(), 'a2v-'));
    const inputPath = join(dir, 'input');
    const iconPath = join(dir, 'icon.png');
    const loopPath = join(dir, 'loop.mp4');
    const loopFilterPath = join(dir, 'loop.filter');
    const outPath = join(dir, 'out.mp4');

    const deleteBlob = async () => {
        if (!blobUrl) return;
        try {
            const { del } = await import('@vercel/blob');
            await del(blobUrl);
        } catch (e) {
            console.error('blob del failed', e);
        }
    };
    const cleanupAll = async () => { try { await rm(dir, { recursive: true, force: true }); } catch {} };

    try {
        await writeFile(inputPath, inputBytes);

        const { stdout: probeOut } = await run(ffprobePath, [
            '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', inputPath,
        ]);
        const probe = JSON.parse(probeOut.toString() || '{}');
        const duration = Number(probe?.format?.duration);
        if (!Number.isFinite(duration) || duration <= 0) {
            await deleteBlob(); await cleanupAll();
            return jsonError('Could not read audio', 422);
        }
        if (duration > MAX_DURATION_SEC + 0.5) {
            await deleteBlob(); await cleanupAll();
            return jsonError('Audio exceeds 180 seconds', 422);
        }

        const tags = probe?.format?.tags || {};
        const title = String(tags.title || tags.TITLE || '').slice(0, 200);
        const artist = String(tags.artist || tags.ARTIST || tags.album_artist || '').slice(0, 200);
        const durationMs = Math.round(duration * 1000);

        const audioCodec = (probe.streams || []).find((s: any) => s.codec_type === 'audio')?.codec_name;
        const audioArgs = audioCodec === 'aac'
            ? ['-c:a', 'copy']
            : ['-c:a', 'aac', '-b:a', AUDIO_BITRATE];

        const iconBytes = Buffer.from(await read(iconUrl).arrayBuffer());
        await writeFile(iconPath, iconBytes);
        await writeFile(loopFilterPath, AURORA_FILTER);

        await run(ffmpegPath, [
            '-y', '-hide_banner', '-loglevel', 'error',
            '-i', iconPath,
            '-filter_complex_script', loopFilterPath,
            '-map', '[out]', '-r', String(FPS),
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-g', String(FPS * 2),
            loopPath,
        ]);

        await run(ffmpegPath, [
            '-y', '-hide_banner', '-loglevel', 'error',
            '-stream_loop', '-1', '-i', loopPath,
            '-i', inputPath,
            '-map', '0:v', '-map', '1:a',
            '-t', String(duration), '-shortest',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '30', '-pix_fmt', 'yuv420p', '-r', String(FPS),
            ...audioArgs,
            '-movflags', '+faststart',
            outPath,
        ]);

        await deleteBlob();

        const nodeStream = createReadStream(outPath);
        nodeStream.on('close', () => { void cleanupAll(); });
        nodeStream.on('error', () => { void cleanupAll(); });

        return new Response(Readable.toWeb(nodeStream) as unknown as ReadableStream, {
            headers: {
                ...CORS_HEADERS,
                'Content-Type': 'video/mp4',
                'X-Audio-Duration-Ms': String(durationMs),
                'X-Audio-Title': encodeURIComponent(title),
                'X-Audio-Artist': encodeURIComponent(artist),
                'Cache-Control': 'no-store',
            },
        });
    } catch (e) {
        console.error('audio-to-video failed', e);
        await deleteBlob(); await cleanupAll();
        return jsonError('Conversion failed', 500);
    }
};
