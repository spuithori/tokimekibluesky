const MAX_ENTRIES = 300;
const WIDTH_TOLERANCE = 1;

const heights = new Map<string, { width: number; height: number }>();

export function getXEmbedHeight(uri: string, width: number): number | undefined {
    const entry = heights.get(uri);
    if (!entry || Math.abs(entry.width - width) > WIDTH_TOLERANCE) {
        return undefined;
    }
    heights.delete(uri);
    heights.set(uri, entry);
    return entry.height;
}

export function setXEmbedHeight(uri: string, width: number, height: number): void {
    if (!uri || !(width > 0) || !(height > 0)) {
        return;
    }
    heights.delete(uri);
    heights.set(uri, { width, height });
    if (heights.size > MAX_ENTRIES) {
        heights.delete(heights.keys().next().value!);
    }
}

export function clearXEmbedHeights(): void {
    heights.clear();
}
