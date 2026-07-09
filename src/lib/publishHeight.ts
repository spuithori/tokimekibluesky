import { clampWidth } from './deckWidth';

export const PUBLISH_EDITOR_MIN = 44;
export const PUBLISH_EDITOR_MAX = 800;

export function clampPublishEditorHeight(px: number): number {
    return clampWidth(px, PUBLISH_EDITOR_MIN, PUBLISH_EDITOR_MAX);
}
