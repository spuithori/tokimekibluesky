import { builtInThemes } from '$lib/builtInThemes';
import { themeInlineStyle } from '$lib/theme/inlineStyle';

export function defaultThemeInline(options: { colorId?: string; darkmode?: boolean } = {}): string {
    const theme = builtInThemes.find((t) => t.id === 'default');
    return themeInlineStyle(theme, {
        colorId: options.colorId ?? 'defaut-10',
        darkmode: options.darkmode ?? false,
    });
}
