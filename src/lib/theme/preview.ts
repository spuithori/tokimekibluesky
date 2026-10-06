import type { Attachment } from 'svelte/attachments';

export function previewSrc(blob: Blob | undefined, fallback?: string): Attachment<HTMLImageElement> {
    return (img) => {
        if (!blob) {
            if (fallback) img.src = fallback;
            return;
        }
        const url = URL.createObjectURL(blob);
        img.src = url;
        return () => URL.revokeObjectURL(url);
    };
}
