const STORAGE_KEY = 'vlTimelineItemHeight';
const DEFAULT_ESTIMATE = 240;
const MIN_HEIGHT = 40;
const MAX_HEIGHT = 2000;
const MIN_SAMPLES = 3;
const MIN_CHANGE = 8;

let estimate: number | undefined;

function isPlausible(value: number): boolean {
    return Number.isFinite(value) && value >= MIN_HEIGHT && value <= MAX_HEIGHT;
}

export function getTimelineItemHeightEstimate(): number {
    if (estimate === undefined) {
        estimate = DEFAULT_ESTIMATE;
        try {
            const stored = Number(localStorage.getItem(STORAGE_KEY));
            if (isPlausible(stored)) {
                estimate = stored;
            }
        } catch {
        }
    }
    return estimate;
}

export function reportTimelineItemHeight(average: number, count: number): void {
    if (count < MIN_SAMPLES || !isPlausible(average)) {
        return;
    }

    const next = Math.round(getTimelineItemHeightEstimate() * 0.7 + average * 0.3);
    if (Math.abs(next - getTimelineItemHeightEstimate()) < MIN_CHANGE) {
        return;
    }

    estimate = next;
    try {
        localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
    }
}
