export function fuzzyScore(query: string, target: string): number {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    if (q.length === 0) return 0;
    if (q.length > t.length) return -Infinity;

    let score = 0;
    let targetIndex = 0;
    let previousMatch = -1;
    for (const char of q) {
        const found = t.indexOf(char, targetIndex);
        if (found === -1) return -Infinity;
        score += 1;
        if (found === previousMatch + 1) score += 2;
        if (found === 0) score += 3;
        previousMatch = found;
        targetIndex = found + 1;
    }
    score -= (t.length - q.length) * 0.01;
    return score;
}

export interface FuzzyMatchResult {
    score: number;
    positions: number[];
}

export function fuzzyMatch(query: string, target: string): FuzzyMatchResult | null {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    if (q.length === 0) return { score: 0, positions: [] };
    if (q.length > t.length) return null;

    let score = 0;
    let targetIndex = 0;
    let previousMatch = -1;
    const positions: number[] = [];
    for (const char of q) {
        const found = t.indexOf(char, targetIndex);
        if (found === -1) return null;
        score += 1;
        if (found === previousMatch + 1) score += 2;
        if (found === 0) score += 3;
        positions.push(found);
        previousMatch = found;
        targetIndex = found + 1;
    }
    score -= (t.length - q.length) * 0.01;
    return { score, positions };
}

export interface HighlightSegment {
    text: string;
    hit: boolean;
}

export function toSegments(title: string, positions: number[]): HighlightSegment[] {
    if (positions.length === 0) return [{ text: title, hit: false }];
    const hits = new Set(positions);
    const segments: HighlightSegment[] = [];
    for (let i = 0; i < title.length; i++) {
        const hit = hits.has(i);
        const last = segments[segments.length - 1];
        if (last && last.hit === hit) {
            last.text += title[i];
        } else {
            segments.push({ text: title[i], hit });
        }
    }
    return segments;
}

export function fuzzyFilter<T>(query: string, items: T[], getText: (item: T) => string): T[] {
    if (query.trim() === '') return items;
    return items
        .map((item) => ({ item, score: fuzzyScore(query, getText(item)) }))
        .filter(({ score }) => score > -Infinity)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item);
}
