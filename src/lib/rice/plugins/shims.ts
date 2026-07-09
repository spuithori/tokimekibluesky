export const RUNTIME_GLOBAL = '__TOKIMEKI_RICE_RUNTIME__';

const IDENT_RE = /^[A-Za-z_$][\w$]*$/;

export function generateShimSource(specifier: string, keys: string[], hasDefault: boolean): string {
    const named = keys.filter((key) => key !== 'default' && IDENT_RE.test(key));
    const lines = [`const m = globalThis[${JSON.stringify(RUNTIME_GLOBAL)}].get(${JSON.stringify(specifier)});`];
    named.forEach((key, i) => {
        lines.push(`const _e${i} = m[${JSON.stringify(key)}];`);
    });
    if (named.length > 0) {
        lines.push(`export { ${named.map((key, i) => `_e${i} as ${key}`).join(', ')} };`);
    }
    if (hasDefault) {
        lines.push('export default m.default;');
    }
    return lines.join('\n');
}

const shimUrls = new Map<string, string>();

export function shimUrlFor(specifier: string, mod: object): string {
    let url = shimUrls.get(specifier);
    if (!url) {
        const source = generateShimSource(specifier, Object.keys(mod), 'default' in mod);
        url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
        shimUrls.set(specifier, url);
    }
    return url;
}
