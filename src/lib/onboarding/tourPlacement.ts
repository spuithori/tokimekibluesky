export interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export interface Size {
    width: number;
    height: number;
}

export type TourSide = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface Placement {
    top: number;
    left: number;
    side: TourSide;
    arrowOffset: number;
}

const GAP = 14;
const MARGIN = 12;

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function spotlightRect(target: Rect, padding: number): Rect {
    return {
        top: target.top - padding,
        left: target.left - padding,
        width: target.width + padding * 2,
        height: target.height + padding * 2,
    };
}

export function placeTooltip(target: Rect | null, tooltip: Size, viewport: Size): Placement {
    if (!target) {
        return {
            top: (viewport.height - tooltip.height) / 2,
            left: (viewport.width - tooltip.width) / 2,
            side: 'center',
            arrowOffset: 0,
        };
    }

    const spaceBelow = viewport.height - (target.top + target.height);
    const spaceAbove = target.top;
    const spaceRight = viewport.width - (target.left + target.width);
    const spaceLeft = target.left;

    const fitsBelow = spaceBelow >= tooltip.height + GAP + MARGIN;
    const fitsAbove = spaceAbove >= tooltip.height + GAP + MARGIN;
    const fitsRight = spaceRight >= tooltip.width + GAP + MARGIN;
    const fitsLeft = spaceLeft >= tooltip.width + GAP + MARGIN;

    const targetCenterX = target.left + target.width / 2;
    const targetCenterY = target.top + target.height / 2;

    let side: TourSide;
    if (viewport.width > 767 && (fitsRight || fitsLeft) && target.width < tooltip.width) {
        side = fitsRight ? 'right' : 'left';
    } else if (fitsBelow) {
        side = 'bottom';
    } else if (fitsAbove) {
        side = 'top';
    } else if (fitsRight) {
        side = 'right';
    } else if (fitsLeft) {
        side = 'left';
    } else {
        side = 'bottom';
    }

    let top: number;
    let left: number;

    if (side === 'bottom' || side === 'top') {
        left = clamp(targetCenterX - tooltip.width / 2, MARGIN, Math.max(MARGIN, viewport.width - tooltip.width - MARGIN));
        top = side === 'bottom'
            ? target.top + target.height + GAP
            : target.top - tooltip.height - GAP;
        top = clamp(top, MARGIN, Math.max(MARGIN, viewport.height - tooltip.height - MARGIN));
    } else {
        top = clamp(targetCenterY - tooltip.height / 2, MARGIN, Math.max(MARGIN, viewport.height - tooltip.height - MARGIN));
        left = side === 'right'
            ? target.left + target.width + GAP
            : target.left - tooltip.width - GAP;
        left = clamp(left, MARGIN, Math.max(MARGIN, viewport.width - tooltip.width - MARGIN));
    }

    const arrowOffset = side === 'bottom' || side === 'top'
        ? clamp(targetCenterX - left, 18, tooltip.width - 18)
        : clamp(targetCenterY - top, 18, tooltip.height - 18);

    return { top, left, side, arrowOffset };
}
