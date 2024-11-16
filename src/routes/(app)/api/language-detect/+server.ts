import { detectAll } from 'tinyld';
import type { Config } from '@sveltejs/adapter-vercel';

async function languageDetect(text = '') {
    let detect = detectAll(text);
    detect = detect.filter(item => item.accuracy > 0.3);
    return detect.slice(0, 3);
}

export async function POST ({ request }) {
    if (request.method === 'POST') {
        const textObj = await request.json();
        return new Response(JSON.stringify(await languageDetect(textObj.text)), { status: 200 });
    }
}

export const config: Config = {
    runtime: 'edge'
};