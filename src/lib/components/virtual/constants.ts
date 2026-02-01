/** Maximum number of items to scan when detecting a prepend shift. */
export const PREPEND_SEARCH_LIMIT = 50;

/** Time window (ms) to consider the user actively scrolling. */
export const SCROLL_VELOCITY_THRESHOLD_MS = 150;

/** Maximum correction passes for scroll anchor adjustments. */
export const CORRECTION_MAX_PASSES = 3;

/** Drift threshold (px) for coarse anchor corrections (quickPrepend). */
export const DRIFT_THRESHOLD_COARSE = 0.5;

/** Drift threshold (px) for fine anchor corrections (finalCorrect). */
export const DRIFT_THRESHOLD_FINE = 0.1;

/** Drift threshold (px) for lightweight position corrections. */
export const DRIFT_THRESHOLD_POSITION = 1;

/** Drift threshold (px) for scrollToIndex corrections. */
export const DRIFT_THRESHOLD_SCROLL = 2;

/** Number of items to render when virtualization is disabled. */
export const FALLBACK_RENDER_COUNT = 20;

/** Extra buffer items added beyond normal buffer for scrollToIndex / restore. */
export const SCROLLTO_EXTRA_BUFFER = 10;

/** Heights map is pruned when its size exceeds items.length * this factor. */
export const HEIGHT_PRUNE_FACTOR = 2;

/** Minimum pixel change to consider a height update significant. */
export const HEIGHT_CHANGE_THRESHOLD = 2;

/** Default estimated height for unmeasured items. */
export const DEFAULT_ITEM_HEIGHT = 100;
