import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

async function fetchThemes(code = null, ids = null) {
    const supabase = createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            global: {
                headers: {'code': code},
            }
        }
    );

    const query = supabase
        .from('themes')
        .select()
    
    if (ids) {
        query.in('id', ids)
    }

    if (code !== null) {
        query.eq('code', code)
    }

    const res = await query;
    return res.data;
}

export async function POST ({ request }) {
    if (request.method === 'POST') {
        const obj = await request.json();
        return new Response(JSON.stringify(await fetchThemes(obj.code)), { status: 200 });
    }
}