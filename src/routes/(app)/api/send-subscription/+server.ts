import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

async function subscription(subscription, did, language) {
    const addDatabase = async () => {
        const { error } = await supabase
            .from('v2-notification')
            .upsert(
                {
                    subscription: subscription,
                    accounts: did,
                    language: language,
                },
                {
                    onConflict: 'subscription',
                }
            )
            .single()

        if (error && error.code !== '23505') {
            console.log(error);
        }
    }

    await addDatabase();
}

export async function POST ({ request }) {
    if (request.method === 'POST') {
        const textObj = await request.json();
        // console.log(textObj);

        await subscription(textObj.subscription, textObj.did, textObj.language);

        // await subscription(subscription, did);
        return new Response('200', { status: 200 });
    }
}