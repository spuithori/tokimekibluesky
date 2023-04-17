import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

async function subscription(subscription) {
    const deleteDatabase = async () => {
        const { error } = await supabase
            .from('notification')
            .delete()
            .eq('subscription', JSON.stringify(subscription));

        if (error) {
            console.log(error);
        }
    }

    await deleteDatabase();
}

export async function POST ({ request }) {
    if (request.method === 'POST') {
        const textObj = await request.json();

        await subscription(textObj.subscription);
        console.log('Subscription deleted.')

        return new Response('200', { status: 200 });
    }
}