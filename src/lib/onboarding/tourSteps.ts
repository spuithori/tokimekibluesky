export interface TourStep {
    id: string;
    target?: string;
    titleKey: string;
    bodyKey: string;
}

const ADD_COLUMN: TourStep = { id: 'add-column', target: '[data-tour="add-column"]', titleKey: 'tour_add_column_title', bodyKey: 'tour_add_column_body' };
const PUBLISH: TourStep = { id: 'publish', target: '[data-tour="publish"]', titleKey: 'tour_publish_title', bodyKey: 'tour_publish_body' };
const COLUMN_HEADER: TourStep = { id: 'column-header', target: '[data-tour="column-header"]', titleKey: 'tour_column_header_title', bodyKey: 'tour_column_header_body' };
const SETTINGS: TourStep = { id: 'settings', target: '[data-tour="settings"]', titleKey: 'tour_settings_title', bodyKey: 'tour_settings_body' };
const SWIPE: TourStep = { id: 'swipe', titleKey: 'tour_swipe_title', bodyKey: 'tour_swipe_body' };

export function tourStepsFor(mobile: boolean): TourStep[] {
    return mobile
        ? [ADD_COLUMN, SWIPE, PUBLISH, COLUMN_HEADER]
        : [ADD_COLUMN, PUBLISH, COLUMN_HEADER, SETTINGS];
}
