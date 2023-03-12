import { v4 as uuidv4 } from 'uuid';
import { TRANSLATOR_API_KEY, TRANSLATOR_LOCATION } from '$env/static/private';

async function translator(text = '', to = 'ja') {
    const response = await fetch("https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=" + to, {
        method: 'post',
        headers: {
            'Ocp-Apim-Subscription-Key': TRANSLATOR_API_KEY,
            'Ocp-Apim-Subscription-Region': TRANSLATOR_LOCATION,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuidv4().toString()
        },
        body: JSON.stringify([{
            'text': text
        }]),
        responseType: 'json'
    })

    return response.json();
}

export async function POST({ request }) {
    if (request.method === 'POST') {
        const textObj = await request.json();
        return new Response(JSON.stringify(await translator(textObj.text)), { status: 200 });
    }
}
