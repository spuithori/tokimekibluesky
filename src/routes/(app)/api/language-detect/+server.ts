import { detectAll } from 'tinyld';
import type { Config } from '@sveltejs/adapter-vercel';

async function languageDetect(text = '') {
    const detect = detectAll(text);
    const filtered = detect
        .filter(item => item.accuracy > 0.2)
        .slice(0, 3);

    return filtered.length ? filtered : (detect[0] || []);
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