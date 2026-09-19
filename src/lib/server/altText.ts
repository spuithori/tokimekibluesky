import { createGateway, generateText, jsonSchema, Output } from 'ai';
import { aiFeature } from '$lib/ai-policy';

export const ALT_IMAGE_MAX_BYTES = 1024 * 1024;
export const ALT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALT_CATEGORIES = ['ocr', 'description'] as const;
export const ALT_LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/;

export type AltCategory = (typeof ALT_CATEGORIES)[number];

const ALT_FALLBACK_MODELS = ['openai/gpt-4o-mini'];

const ALT_TEXT_DESCRIPTIONS: Record<AltCategory, string> = {
    ocr: 'The text that appears in the image, exactly as written, line breaks preserved. Empty string when the image contains no text.',
    description: 'Alt text that describes the image for people who cannot see it, written in the requested language.',
};

function altSchema(category: AltCategory) {
    return jsonSchema<{ text: string }>({
        type: 'object',
        properties: { text: { type: 'string', description: ALT_TEXT_DESCRIPTIONS[category] } },
        required: ['text'],
        additionalProperties: false,
    });
}

export function altPrompt(category: AltCategory, language: string): string {
    return category === 'ocr'
        ? `Please perform OCR on the image. The language tag is ${language} . No introduction is necessary. Please focus solely on the results.`
        : `Please generate the image's alt text. The language tag is ${language} . No introduction is necessary. Please focus solely on the results.`;
}

export async function generateAltText(image: Uint8Array, mediaType: string, category: AltCategory, language: string, apiKey: string): Promise<string> {
    const gateway = createGateway({ apiKey });
    const result = await generateText({
        model: gateway(aiFeature('altText').model),
        output: Output.object({ schema: altSchema(category) }),
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: altPrompt(category, language) },
                    { type: 'file', mediaType, data: image },
                ],
            },
        ],
        abortSignal: AbortSignal.timeout(25000),
        providerOptions: {
            gateway: { zeroDataRetention: true, disallowPromptTraining: true, models: ALT_FALLBACK_MODELS },
        },
    });
    return result.output.text.trim();
}
