import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

async function subscription(subscription: any, did: string, language: string, notifications: string) {
    const addDatabase = async () => {
        const { error } = await supabase
            .from('v2-notification')
            .upsert(
                {
                    subscription: subscription,
                    accounts: did,
                    language: language,
                    notifications: notifications,
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

        await subscription(textObj.subscription, textObj.did, textObj.language, textObj.notifications);

        return new Response('200', { status: 200 });
    }
}