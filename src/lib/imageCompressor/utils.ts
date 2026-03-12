export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read blob as data URL'));
        reader.readAsDataURL(blob);
    });
}

export function calcTargetDimensions(
    srcWidth: number,
    srcHeight: number,
    maxWidthOrHeight: number,
): { width: number; height: number } {
    if (srcWidth <= maxWidthOrHeight && srcHeight <= maxWidthOrHeight) {
        return { width: srcWidth, height: srcHeight };
    }
    const ratio = Math.min(maxWidthOrHeight / srcWidth, maxWidthOrHeight / srcHeight);
    return {
        width: Math.round(srcWidth * ratio),
        height: Math.round(srcHeight * ratio),
    };
}
