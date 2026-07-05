export interface ThemeInlineOptions {
    colorId?: string;
    bubble?: boolean;
    darkmode?: boolean;
}

export function themeInlineStyle(theme: any, options: ThemeInlineOptions = {}): string {
    if (!theme) {
        return '';
    }

    let colorStyle = '';
    let bubbleStyle = '';
    let darkmodeStyle = '';

    if (theme.options?.colors && options.colorId) {
        const color = theme.options.colors.find((c: any) => c.id === options.colorId);
        if (color?.code) {
            colorStyle = color.code;
        }
    }

    if (options.bubble) {
        bubbleStyle = theme.options?.bubbleStyle || '';
    }

    if (options.darkmode) {
        darkmodeStyle = theme.options?.darkmodeStyle || '';
    }

    return theme.style + colorStyle + bubbleStyle + darkmodeStyle;
}
