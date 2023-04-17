import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

async function subscription(subscription, did) {
    const addDatabase = async () => {
        const { error } = await supabase
            .from('notification')
            .insert(
                {
                    subscription: subscription,
                    did: did,
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

        await subscription(textObj.subscription, textObj.did);

        // await subscription(subscription, did);
        return new Response('200', { status: 200 });
    }
}